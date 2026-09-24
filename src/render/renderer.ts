import {
  Camera,
  Color3,
  Color4,
  DynamicTexture,
  Effect,
  Engine,
  FreeCamera,
  Matrix,
  Mesh,
  MeshBuilder,
  Scene,
  ShaderMaterial,
  StandardMaterial,
  Texture,
  TransformNode,
  Vector3,
  type BaseTexture,
} from '@babylonjs/core';
import { angleOf, dot, normalize, type Vec2 } from '../game/math';
import type { GameEvent, Pose } from '../game/types';
import type { World } from '../game/world';
import {
  drawCrescent,
  drawGround,
  drawHeroPlaceholder,
  drawMissing,
  drawRadial,
  drawRing,
  drawTelegraph,
} from './textures';

export interface SpriteDef {
  /** Image dans public/sprites, ou null pour un dessin provisoire. */
  file: string | null;
  /** Hauteur à l'écran, en unités du monde. */
  height: number;
  /** Sens dans lequel regarde le sujet sur l'image. */
  facesRight: boolean;
  /** Hauteur de vol (feux follets). */
  lift?: number;
  /** Position fixe, pour les éléments de décor. */
  decor?: Vec2;
}

export type SpriteManifest = Record<string, SpriteDef>;

/** Ce que le rendu a besoin de savoir d'une entité à chaque image. */
interface Snapshot {
  pos: Vec2;
  facing: Vec2;
  radius: number;
  pose: Pose;
  /** Hauteur au-dessus du sol (sauts). */
  altitude: number;
  /** De 0 (vient d'apparaître) à 1. */
  spawn: number;
  /** Clignotement d'invulnérabilité. */
  blink: boolean;
}

interface SpriteEntry {
  texture: BaseTexture;
  aspect: number;
}

interface EntityView {
  node: TransformNode;
  sprite: Mesh;
  material: ShaderMaterial;
  shadow: Mesh;
  shadowMaterial: ShaderMaterial;
  def: SpriteDef;
  isPlayer: boolean;
  faceRight: boolean;
  flash: number;
  sx: number;
  sy: number;
  phase: number;
  dying: number;
}

interface Fx {
  mesh: Mesh;
  material: ShaderMaterial;
  age: number;
  life: number;
  update(progress: number, fx: Fx): void;
}

interface FloatingText {
  el: HTMLDivElement;
  pos: Vector3;
  age: number;
  life: number;
}

const PLAYER_ID = 0;
const PITCH = Math.atan(1 / Math.SQRT2); // 35,26° : isométrie vraie
const YAW = Math.PI / 4;
const CAMERA_DISTANCE = 40;
const VIEW_HALF_HEIGHT = 6;
const GROUND_SIZE = 44;
const PADDY_SIZE = 3;
const DEATH_TIME = 0.35;
// Les décalques au sol passent avant les sprites, triés entre eux de l'arrière vers l'avant.
const DECAL_ORDER = -100_000;
const SPRITE_ORDER = 10_000;

const WHITE = Color3.White();
const WINDUP_TINT = new Color3(1, 0.72, 0.66);
const STUN_TINT = new Color3(0.7, 0.82, 1);
const CHANNEL_TINT = new Color3(0.78, 1, 0.78);
const SPIRIT = new Color3(0.45, 0.95, 1);
const RAGE = new Color3(1, 0.6, 0.3);
const DANGER = new Color3(1, 0.22, 0.16);
const SLASH = new Color3(1, 0.97, 0.9);
const HEAL = new Color3(0.45, 1, 0.5);
const SHADOW_STRIKE = new Color3(0.22, 0.16, 0.32);
const DUST = new Color3(0.86, 0.78, 0.6);

function registerShaders(): void {
  if (Effect.ShadersStore.spriteVertexShader) return;
  Effect.ShadersStore.spriteVertexShader = `
    precision highp float;
    attribute vec3 position;
    attribute vec2 uv;
    uniform mat4 worldViewProjection;
    varying vec2 vUV;
    void main(void) {
      vUV = uv;
      gl_Position = worldViewProjection * vec4(position, 1.0);
    }`;
  // Teinte, éclair blanc à l'impact, transparence et miroir horizontal, sans éclairage : le rendu reste celui de l'image.
  Effect.ShadersStore.spriteFragmentShader = `
    precision highp float;
    varying vec2 vUV;
    uniform sampler2D textureSampler;
    uniform vec3 tint;
    uniform float flash;
    uniform float alpha;
    uniform float flipX;
    void main(void) {
      vec2 uv = vec2(mix(vUV.x, 1.0 - vUV.x, flipX), vUV.y);
      vec4 color = texture2D(textureSampler, uv);
      float a = color.a * alpha;
      if (a < 0.02) discard;
      gl_FragColor = vec4(mix(color.rgb * tint, vec3(1.0), flash), a);
    }`;
}

function spriteMaterial(scene: Scene, name: string, texture: BaseTexture): ShaderMaterial {
  const material = new ShaderMaterial(
    name,
    scene,
    { vertex: 'sprite', fragment: 'sprite' },
    {
      attributes: ['position', 'uv'],
      uniforms: ['worldViewProjection', 'tint', 'flash', 'alpha', 'flipX'],
      samplers: ['textureSampler'],
      needAlphaBlending: true,
    },
  );
  material.setTexture('textureSampler', texture);
  material.setColor3('tint', WHITE);
  material.setFloat('flash', 0);
  material.setFloat('alpha', 1);
  material.setFloat('flipX', 0);
  material.backFaceCulling = false;
  return material;
}

function loadTexture(scene: Scene, url: string): Promise<Texture> {
  return new Promise((resolve, reject) => {
    const texture: Texture = new Texture(
      url,
      scene,
      false,
      true,
      Texture.TRILINEAR_SAMPLINGMODE,
      () => resolve(texture),
      (message) => reject(new Error(message ?? url)),
    );
    texture.hasAlpha = true;
    texture.wrapU = Texture.CLAMP_ADDRESSMODE;
    texture.wrapV = Texture.CLAMP_ADDRESSMODE;
  });
}

/**
 * Affiche le monde en « fausse 3D » : caméra orthographique isométrique, sol de rizières,
 * et des images plates tournées vers la caméra. Un sprite pourra être remplacé par un modèle 3D
 * sans toucher à la logique du jeu.
 */
export class Renderer {
  readonly engine: Engine;
  private readonly scene: Scene;
  private readonly camera: FreeCamera;
  private readonly cameraOffset: Vector3;
  private readonly cameraTarget = Vector3.Zero();
  /** Directions « haut » et « droite » de l'écran, projetées au sol. */
  private readonly forward: Vec2;
  private readonly right: Vec2;
  private shake = 0;
  private time = 0;
  private readonly sprites = new Map<string, SpriteEntry>();
  private readonly fxTextures: Record<'shadow' | 'crescent' | 'ring' | 'telegraph', BaseTexture>;
  private readonly views = new Map<number, EntityView>();
  private dying: EntityView[] = [];
  private effects: Fx[] = [];
  /** Effets qui durent tant qu'un ennemi n'a pas fini son action : charge, soin, chute. */
  private readonly telegraphs = new Map<number, Fx>();
  private readonly channels = new Map<number, Fx>();
  private readonly landings = new Map<number, Fx>();
  private guardDecal: { mesh: Mesh; material: ShaderMaterial } | null = null;
  private guardPulse = 0;
  private texts: FloatingText[] = [];

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly overlay: HTMLElement,
    private readonly manifest: SpriteManifest,
    private readonly arenaHalfSize: number,
  ) {
    registerShaders();
    this.engine = new Engine(canvas, true, { stencil: false }, true);
    this.scene = new Scene(this.engine);
    this.scene.clearColor = Color4.FromHexString('#c3cbcfff');

    this.camera = new FreeCamera('camera', Vector3.Zero(), this.scene);
    this.camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
    this.camera.minZ = 0.1;
    this.camera.maxZ = 200;
    this.cameraOffset = new Vector3(
      -Math.cos(PITCH) * Math.sin(YAW),
      Math.sin(PITCH),
      -Math.cos(PITCH) * Math.cos(YAW),
    ).scale(CAMERA_DISTANCE);
    this.forward = normalize({ x: -this.cameraOffset.x, z: -this.cameraOffset.z });
    this.right = { x: this.forward.z, z: -this.forward.x };
    this.placeCamera(this.cameraTarget);
    this.fitView();
    window.addEventListener('resize', () => {
      this.engine.resize();
      this.fitView();
    });

    this.fxTextures = {
      shadow: this.canvasTexture('shadow', drawRadial()),
      crescent: this.canvasTexture('crescent', drawCrescent()),
      ring: this.canvasTexture('ring', drawRing()),
      telegraph: this.canvasTexture('telegraph', drawTelegraph()),
    };
  }

  async load(): Promise<void> {
    this.buildGround();
    await Promise.all(
      Object.entries(this.manifest).map(async ([name, def]) => {
        this.sprites.set(name, await this.loadSprite(name, def));
      }),
    );
    this.buildDecor();
    this.guardDecal = this.createDecal('guard', this.fxTextures.crescent, 2.6, 2.6, SPIRIT, 0.5, 0.03);
    this.guardDecal.mesh.isVisible = false;
  }

  /** Directions de l'écran au sol : ZQSD déplace le héros selon ces axes. */
  groundBasis(): { forward: Vec2; right: Vec2 } {
    return { forward: this.forward, right: this.right };
  }

  /** Point du sol sous le curseur (coordonnées CSS du canvas). */
  pickGround(cssX: number, cssY: number): Vec2 | null {
    const ratio = this.engine.getRenderWidth() / Math.max(1, this.canvas.clientWidth);
    const ray = this.scene.createPickingRay(cssX * ratio, cssY * ratio, Matrix.Identity(), this.camera);
    if (Math.abs(ray.direction.y) < 1e-6) return null;
    const t = -ray.origin.y / ray.direction.y;
    return { x: ray.origin.x + ray.direction.x * t, z: ray.origin.z + ray.direction.z * t };
  }

  sync(world: World, events: readonly GameEvent[], dt: number): void {
    this.time += dt;
    const player = world.player;
    const seen = new Set<number>([PLAYER_ID]);
    this.syncEntity(PLAYER_ID, 'heros', {
      pos: player.pos,
      facing: player.facing,
      radius: player.radius,
      pose: player.pose,
      altitude: 0,
      spawn: 1,
      blink: player.invulnerable > 0 && player.pose !== 'dash',
    }, dt);
    for (const enemy of world.enemies) {
      seen.add(enemy.id);
      this.syncEntity(enemy.id, enemy.kind, {
        pos: enemy.pos,
        facing: enemy.facing,
        radius: enemy.radius,
        pose: enemy.pose,
        altitude: enemy.altitude,
        spawn: enemy.spawnProgress,
        blink: false,
      }, dt);
    }
    for (const [id, view] of this.views) {
      if (seen.has(id)) continue;
      this.views.delete(id);
      view.dying = 0;
      this.dying.push(view);
    }

    this.updateGuard(player.pos, player.facing, player.pose, dt);
    for (const event of events) this.handle(event);
    this.updateDying(dt);
    this.updateEffects(dt);
    this.updateCamera(player.pos, dt);
    this.updateTexts(dt);
  }

  render(): void {
    this.scene.render();
  }

  /** Nettoie tout ce qui appartient à la partie terminée (le décor reste). */
  reset(): void {
    for (const view of [...this.views.values(), ...this.dying]) this.disposeView(view);
    this.views.clear();
    this.dying = [];
    for (const fx of this.effects) this.disposeFx(fx);
    this.effects = [];
    this.telegraphs.clear();
    this.channels.clear();
    this.landings.clear();
    for (const text of this.texts) text.el.remove();
    this.texts = [];
    this.shake = 0;
    this.cameraTarget.setAll(0);
  }

  // --- Entités -------------------------------------------------------------

  private syncEntity(id: number, spriteName: string, s: Snapshot, dt: number): void {
    let view = this.views.get(id);
    if (!view) {
      view = this.createView(id, spriteName, s.radius);
      this.views.set(id, view);
    }
    view.node.position.set(s.pos.x, 0, s.pos.z);

    // Miroir selon que l'entité regarde vers la gauche ou la droite de l'écran (avec une marge pour éviter le va-et-vient).
    const side = dot(s.facing, this.right);
    if (Math.abs(side) > 0.2) view.faceRight = side > 0;
    view.material.setFloat('flipX', view.faceRight === view.def.facesRight ? 0 : 1);

    // Une seule image par personnage : l'animation passe par l'écrasement, le tremblement et la teinte.
    const t = this.time + view.phase;
    let sx = 1;
    let sy = 1;
    let jitter = 0;
    let alpha = 1;
    let tint = WHITE;
    switch (s.pose) {
      case 'idle':
        sy = 1 + 0.015 * Math.sin(t * 3);
        break;
      case 'move': {
        const hop = Math.abs(Math.sin(t * 9));
        sy = 1 + 0.05 * hop;
        sx = 1 - 0.03 * hop;
        break;
      }
      case 'windup':
        sx = 1.1;
        sy = 0.9;
        if (!view.isPlayer) {
          jitter = (Math.random() - 0.5) * 0.08;
          tint = WINDUP_TINT;
        }
        break;
      case 'strike':
        sx = 0.92;
        sy = 1.1;
        break;
      case 'guard':
        sx = 1.06;
        sy = 0.94;
        break;
      case 'dash':
        sx = 1.18;
        sy = 0.88;
        if (view.isPlayer) alpha = 0.55;
        break;
      case 'stunned':
        sy = 1 + 0.05 * Math.sin(t * 12);
        tint = STUN_TINT;
        break;
      case 'channel':
        sx = sy = 1 + 0.06 * Math.sin(t * 14);
        tint = CHANNEL_TINT;
        break;
      case 'airborne':
        sx = 0.88;
        sy = 1.15;
        break;
    }
    const k = Math.min(1, dt * 18);
    view.sx += (sx - view.sx) * k;
    view.sy += (sy - view.sy) * k;
    const grow = 0.6 + 0.4 * s.spawn;
    view.sprite.scaling.set(view.sx * grow, view.sy * grow, 1);

    const lift = view.def.lift ?? 0;
    const hover = lift > 0 ? Math.sin(t * 4) * 0.12 : 0;
    view.sprite.position.set(this.right.x * jitter, lift + hover + s.altitude, this.right.z * jitter);

    if (s.blink) alpha *= Math.sin(this.time * 40) > 0 ? 1 : 0.45;
    view.flash = Math.max(0, view.flash - dt * 7);
    view.material.setFloat('flash', view.flash);
    view.material.setFloat('alpha', alpha * s.spawn);
    view.material.setColor3('tint', tint);

    // En l'air, l'ombre rétrécit et pâlit : c'est elle qui annonce où l'ennemi va retomber.
    const shadowScale = 1 / (1 + s.altitude * 0.2);
    view.shadow.scaling.set(shadowScale, 1, shadowScale);
    view.shadowMaterial.setFloat('alpha', 0.4 * s.spawn * Math.max(0.35, shadowScale));
    view.sprite.alphaIndex = SPRITE_ORDER - Math.round(dot(s.pos, this.forward) * 100);
  }

  private createView(id: number, spriteName: string, radius: number): EntityView {
    const def = this.manifest[spriteName];
    const entry = this.sprites.get(spriteName);
    if (!def || !entry) throw new Error(`Sprite inconnu : ${spriteName}`);
    const node = new TransformNode(`entity-${id}`, this.scene);
    const { sprite, material } = this.createSprite(`entity-${id}`, entry, def);
    sprite.parent = node;
    const shadowSize = radius * 2.6;
    const shadow = this.createDecal(`shadow-${id}`, this.fxTextures.shadow, shadowSize, shadowSize, Color3.Black(), 0.4, 0.01);
    shadow.mesh.parent = node;
    return {
      node,
      sprite,
      material,
      shadow: shadow.mesh,
      shadowMaterial: shadow.material,
      def,
      isPlayer: id === PLAYER_ID,
      faceRight: def.facesRight,
      flash: 0,
      sx: 1,
      sy: 1,
      phase: Math.random() * 10,
      dying: -1,
    };
  }

  /** Plan vertical tourné vers la caméra, dont l'origine est aux pieds du personnage. */
  private createSprite(name: string, entry: SpriteEntry, def: SpriteDef): { sprite: Mesh; material: ShaderMaterial } {
    const sprite = MeshBuilder.CreatePlane(name, { width: def.height * entry.aspect, height: def.height }, this.scene);
    sprite.bakeTransformIntoVertices(Matrix.Translation(0, def.height / 2, 0));
    sprite.billboardMode = Mesh.BILLBOARDMODE_ALL;
    sprite.isPickable = false;
    const material = spriteMaterial(this.scene, name, entry.texture);
    sprite.material = material;
    return { sprite, material };
  }

  private updateDying(dt: number): void {
    this.dying = this.dying.filter((view) => {
      view.dying += dt;
      const k = Math.min(1, view.dying / DEATH_TIME);
      view.material.setFloat('alpha', 1 - k);
      view.material.setFloat('flash', 1 - k);
      view.shadowMaterial.setFloat('alpha', 0.4 * (1 - k));
      view.sprite.scaling.set(1 + 0.3 * k, 1 - 0.6 * k, 1);
      if (k < 1) return true;
      this.disposeView(view);
      return false;
    });
  }

  private disposeView(view: EntityView): void {
    view.node.dispose();
    view.material.dispose();
    view.shadowMaterial.dispose();
  }

  // --- Effets --------------------------------------------------------------

  private handle(event: GameEvent): void {
    switch (event.type) {
      case 'swing':
        this.addFx({
          texture: this.fxTextures.crescent,
          pos: event.pos,
          dir: event.dir,
          width: event.range * 2,
          depth: event.range * 2,
          color: SLASH,
          life: 0.14,
          update: (k, fx) => {
            fx.material.setFloat('alpha', 0.9 * (1 - k));
            fx.mesh.scaling.setAll(0.85 + 0.2 * k);
          },
        });
        break;
      case 'enemyHit': {
        const view = this.views.get(event.id);
        if (view) view.flash = event.shielded ? 0.35 : 1;
        if (event.shielded) this.text(event.pos, 1.9, 'Bloqué', 'shield');
        else this.text(event.pos, 1.7, String(Math.round(event.amount)), 'dmg');
        this.addShake(event.shielded ? 0.25 : 0.15);
        break;
      }
      case 'playerHit': {
        const view = this.views.get(PLAYER_ID);
        if (view) view.flash = 1;
        this.text(event.pos, 2.1, `−${Math.round(event.amount)}`, 'hurt');
        this.addShake(0.5);
        break;
      }
      case 'guard':
        this.guardPulse = 1;
        this.text(event.pos, 2.2, `+${event.rage} rage`, 'rage');
        break;
      case 'parry':
        this.text(event.pos, 2.3, 'Coupelle renversée !', 'parry', 1.3);
        this.addFx(this.ringFx(event.pos, 3, SPIRIT, 0.4));
        this.addShake(0.4);
        break;
      case 'stun':
        if (event.reason === 'wall') this.text(event.pos, 2, 'Sonné !', 'stun');
        else if (event.reason === 'smash') this.text(event.pos, 2, 'Étourdi', 'stun');
        break;
      case 'telegraph': {
        this.endTracked(this.telegraphs, event.id);
        const center = {
          x: event.from.x + (event.dir.x * event.length) / 2,
          z: event.from.z + (event.dir.z * event.length) / 2,
        };
        const duration = event.duration;
        const fx = this.addFx({
          texture: this.fxTextures.telegraph,
          pos: center,
          dir: event.dir,
          width: event.length,
          depth: event.width,
          color: DANGER,
          life: duration + 1,
          y: 0.025,
          update: (_k, f) => f.material.setFloat('alpha', 0.4 + 0.6 * Math.min(1, f.age / duration)),
        });
        this.telegraphs.set(event.id, fx);
        break;
      }
      case 'chargeEnd':
        this.endTracked(this.telegraphs, event.id);
        break;
      case 'channel': {
        this.endTracked(this.channels, event.id);
        const duration = event.duration;
        const fx = this.addFx({
          ...this.ringFx(event.pos, event.radius * 2, HEAL, duration + 1),
          update: (_k, f) => {
            const ramp = Math.min(1, f.age / duration);
            f.mesh.scaling.setAll(0.3 + 0.7 * ramp);
            f.material.setFloat('alpha', 0.25 + 0.35 * ramp);
          },
        });
        this.channels.set(event.id, fx);
        break;
      }
      case 'channelEnd':
        this.endTracked(this.channels, event.id);
        if (event.healed) this.addFx(this.ringFx(event.pos, event.radius * 2, HEAL, 0.45));
        else this.text(event.pos, 1.6, 'Soin interrompu', 'stun');
        break;
      case 'heal':
        this.text(event.pos, 1.8, `+${Math.round(event.amount)}`, 'heal');
        break;
      case 'enemySwing':
        this.addFx({
          texture: this.fxTextures.crescent,
          pos: event.pos,
          dir: event.dir,
          width: event.range * 2,
          depth: event.range * 2,
          color: SHADOW_STRIKE,
          life: 0.2,
          update: (k, fx) => fx.material.setFloat('alpha', 0.85 * (1 - k)),
        });
        break;
      case 'jump': {
        this.endTracked(this.landings, event.id);
        const duration = event.duration;
        const fx = this.addFx({
          ...this.ringFx(event.target, event.radius * 2, DANGER, duration + 1),
          y: 0.025,
          update: (_k, f) => {
            // Le cercle se resserre jusqu'à la taille de la zone d'impact au moment de la chute.
            const ramp = Math.min(1, f.age / duration);
            f.mesh.scaling.setAll(1.6 - 0.6 * ramp);
            f.material.setFloat('alpha', 0.45 + 0.55 * ramp);
          },
        });
        this.landings.set(event.id, fx);
        break;
      }
      case 'land':
        this.endTracked(this.landings, event.id);
        this.addFx(this.ringFx(event.pos, event.radius * 2.4, DUST, 0.35));
        this.addShake(0.35);
        break;
      case 'smash':
        this.addFx(this.ringFx(event.pos, event.radius * 2, RAGE, 0.35));
        this.addShake(0.6);
        break;
      case 'death':
        for (const tracked of [this.telegraphs, this.channels, this.landings]) this.endTracked(tracked, event.id);
        break;
      case 'dodge':
      case 'wave':
      case 'end':
        break;
    }
  }

  /** Termine un effet suivi (annonce de charge, soin, zone de chute) dès que l'action est finie. */
  private endTracked(tracked: Map<number, Fx>, id: number): void {
    const fx = tracked.get(id);
    if (fx) fx.life = fx.age;
    tracked.delete(id);
  }

  private ringFx(pos: Vec2, size: number, color: Color3, life: number): Parameters<Renderer['addFx']>[0] {
    return {
      texture: this.fxTextures.ring,
      pos,
      dir: { x: 1, z: 0 },
      width: size,
      depth: size,
      color,
      life,
      update: (k, fx) => {
        fx.mesh.scaling.setAll(0.35 + 0.7 * k);
        fx.material.setFloat('alpha', 0.9 * (1 - k));
      },
    };
  }

  private addFx(options: {
    texture: BaseTexture;
    pos: Vec2;
    dir: Vec2;
    width: number;
    depth: number;
    color: Color3;
    life: number;
    y?: number;
    update: Fx['update'];
  }): Fx {
    const { mesh, material } = this.createDecal('fx', options.texture, options.width, options.depth, options.color, 1, options.y ?? 0.03);
    mesh.position.x = options.pos.x;
    mesh.position.z = options.pos.z;
    mesh.rotation.y = -angleOf(options.dir);
    mesh.alphaIndex = DECAL_ORDER + 2;
    const fx: Fx = { mesh, material, age: 0, life: options.life, update: options.update };
    fx.update(0, fx);
    this.effects.push(fx);
    return fx;
  }

  private updateEffects(dt: number): void {
    this.effects = this.effects.filter((fx) => {
      fx.age += dt;
      if (fx.age >= fx.life) {
        this.disposeFx(fx);
        return false;
      }
      fx.update(fx.age / fx.life, fx);
      return true;
    });
  }

  private disposeFx(fx: Fx): void {
    fx.mesh.dispose();
    fx.material.dispose();
  }

  /** Garde levée : un croissant bleu-esprit devant le héros. */
  private updateGuard(pos: Vec2, facing: Vec2, pose: Pose, dt: number): void {
    if (!this.guardDecal) return;
    this.guardPulse = Math.max(0, this.guardPulse - dt * 4);
    const { mesh, material } = this.guardDecal;
    mesh.isVisible = pose === 'guard';
    mesh.position.x = pos.x;
    mesh.position.z = pos.z;
    mesh.rotation.y = -angleOf(facing);
    material.setFloat('alpha', 0.45 + 0.45 * this.guardPulse);
  }

  /** Décalque posé à plat sur le sol (ombres, traînées, zones de danger). */
  private createDecal(
    name: string,
    texture: BaseTexture,
    width: number,
    depth: number,
    color: Color3,
    alpha: number,
    y: number,
  ): { mesh: Mesh; material: ShaderMaterial } {
    const mesh = MeshBuilder.CreateGround(name, { width, height: depth }, this.scene);
    mesh.position.y = y;
    mesh.isPickable = false;
    mesh.alphaIndex = DECAL_ORDER;
    const material = spriteMaterial(this.scene, name, texture);
    material.setColor3('tint', color);
    material.setFloat('alpha', alpha);
    material.disableDepthWrite = true;
    mesh.material = material;
    return { mesh, material };
  }

  // --- Décor et chargement -------------------------------------------------

  private buildGround(): void {
    const ground = MeshBuilder.CreateGround('ground', { width: GROUND_SIZE, height: GROUND_SIZE }, this.scene);
    const texture = this.canvasTexture('groundTexture', drawGround(2048, GROUND_SIZE, this.arenaHalfSize, PADDY_SIZE));
    texture.hasAlpha = false;
    const material = new StandardMaterial('groundMaterial', this.scene);
    material.diffuseTexture = texture;
    material.disableLighting = true;
    material.emissiveColor = WHITE;
    material.specularColor = Color3.Black();
    ground.material = material;
    ground.isPickable = false;
  }

  private buildDecor(): void {
    for (const [name, def] of Object.entries(this.manifest)) {
      const entry = this.sprites.get(name);
      if (!def.decor || !entry) continue;
      const { sprite } = this.createSprite(`decor-${name}`, entry, def);
      sprite.position.set(def.decor.x, 0, def.decor.z);
      sprite.alphaIndex = SPRITE_ORDER - Math.round(dot(def.decor, this.forward) * 100);
    }
  }

  private async loadSprite(name: string, def: SpriteDef): Promise<SpriteEntry> {
    if (def.file) {
      try {
        const texture = await loadTexture(this.scene, `${import.meta.env.BASE_URL}sprites/${def.file}`);
        const { width, height } = texture.getSize();
        return { texture, aspect: width / height };
      } catch {
        console.warn(`Sprite introuvable : ${def.file}. Un dessin provisoire le remplace.`);
      }
    }
    const canvas = name === 'heros' ? drawHeroPlaceholder() : drawMissing(name);
    return { texture: this.canvasTexture(name, canvas), aspect: canvas.width / canvas.height };
  }

  private canvasTexture(name: string, canvas: HTMLCanvasElement): DynamicTexture {
    const texture = new DynamicTexture(name, canvas, this.scene, true);
    texture.hasAlpha = true;
    texture.wrapU = Texture.CLAMP_ADDRESSMODE;
    texture.wrapV = Texture.CLAMP_ADDRESSMODE;
    texture.update();
    return texture;
  }

  // --- Caméra et textes ----------------------------------------------------

  private placeCamera(target: Vector3): void {
    this.camera.position.copyFrom(target).addInPlace(this.cameraOffset);
    this.camera.setTarget(target);
  }

  private fitView(): void {
    const aspect = this.engine.getRenderWidth() / Math.max(1, this.engine.getRenderHeight());
    this.camera.orthoTop = VIEW_HALF_HEIGHT;
    this.camera.orthoBottom = -VIEW_HALF_HEIGHT;
    this.camera.orthoLeft = -VIEW_HALF_HEIGHT * aspect;
    this.camera.orthoRight = VIEW_HALF_HEIGHT * aspect;
  }

  private updateCamera(target: Vec2, dt: number): void {
    const follow = 1 - Math.exp(-8 * dt);
    this.cameraTarget.x += (target.x - this.cameraTarget.x) * follow;
    this.cameraTarget.z += (target.z - this.cameraTarget.z) * follow;
    this.shake = Math.max(0, this.shake - dt * 2.5);
    const amplitude = this.shake * this.shake * 0.35;
    const jitter = new Vector3((Math.random() - 0.5) * amplitude, 0, (Math.random() - 0.5) * amplitude);
    this.placeCamera(this.cameraTarget.add(jitter));
  }

  private addShake(amount: number): void {
    this.shake = Math.min(1, Math.max(this.shake, amount));
  }

  private text(pos: Vec2, height: number, label: string, kind: string, life = 0.9): void {
    const el = document.createElement('div');
    el.className = `float ${kind}`;
    el.textContent = label;
    this.overlay.append(el);
    this.texts.push({ el, pos: new Vector3(pos.x + (Math.random() - 0.5) * 0.3, height, pos.z), age: 0, life });
  }

  private updateTexts(dt: number): void {
    const width = this.engine.getRenderWidth();
    const height = this.engine.getRenderHeight();
    const viewport = this.camera.viewport.toGlobal(width, height);
    const transform = this.scene.getTransformMatrix();
    const toCss = this.canvas.clientWidth / Math.max(1, width);
    this.texts = this.texts.filter((text) => {
      text.age += dt;
      if (text.age >= text.life) {
        text.el.remove();
        return false;
      }
      const rise = new Vector3(0, text.age * 0.9, 0);
      const screen = Vector3.Project(text.pos.add(rise), Matrix.Identity(), transform, viewport);
      text.el.style.transform = `translate(${screen.x * toCss}px, ${screen.y * toCss}px) translate(-50%, -50%)`;
      text.el.style.opacity = String(1 - (text.age / text.life) ** 2);
      return true;
    });
  }
}
