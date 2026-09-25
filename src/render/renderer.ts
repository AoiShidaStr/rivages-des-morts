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
  Quaternion,
  Scene,
  ShaderMaterial,
  StandardMaterial,
  Texture,
  TransformNode,
  Vector3,
  Vector4,
  type BaseTexture,
} from '@babylonjs/core';
import { Jorogumo } from '../game/enemies';
import { angleOf, dot, normalize, type Vec2 } from '../game/math';
import type { GameEvent, Pose } from '../game/types';
import type { Stump, World } from '../game/world';
import { frameAt, loadSheet, showFrame, type SheetAnimation } from './sheets';
import {
  drawCrescent,
  drawGround,
  drawHeroPlaceholder,
  drawJorogumo,
  drawJizo,
  drawJorogumoSpider,
  drawMissing,
  drawRadial,
  drawRing,
  drawSpider,
  drawStump,
  drawTelegraph,
  drawWeb,
} from './textures';

/** Dessins provisoires, utilisés tant que l'image détourée n'est pas dans public/sprites. */
const PLACEHOLDERS: Record<string, () => HTMLCanvasElement> = {
  heros: drawHeroPlaceholder,
  jizo: drawJizo,
  jorogumo: drawJorogumo,
  jorogumoAraignee: drawJorogumoSpider,
  araignee: drawSpider,
  souche: drawStump,
};

export interface SpriteDef {
  /** Image dans public/sprites, ou null pour un dessin provisoire. */
  file: string | null;
  /**
   * Planche animée (JSON « Array » d'Aseprite dans public/sprites, l'image à côté), prioritaire sur `file` ;
   * chaque tag porte le nom d'une posture (idle, move, strike…). Les planches peintes montées par
   * `npm run planches` se dimensionnent d'après `height` ; pour une planche en pixel art, `sheet.height`
   * est la hauteur d'une image entière de la planche, marges comprises.
   */
  sheet?: { file: string; height?: number };
  /** Hauteur à l'écran, en unités du monde. */
  height: number;
  /** Sens dans lequel regarde le sujet sur l'image. */
  facesRight: boolean;
  /** Hauteur de vol (feux follets). */
  lift?: number;
  /** Position fixe, pour les éléments de décor (une liste pour en poser plusieurs). */
  decor?: Vec2 | Vec2[];
  /** Décor de l'île : dessin provisoire (src/render/pixelArt.ts) affiché si l'image manque. */
  placeholder?: string;
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
  /** Frénésie : le héros rougeoie. */
  aura?: boolean;
  /** Ennemi d'élite (niveau de donjon élevé). */
  elite?: boolean;
  /** Âme liée de l'Invocateur : bleue et translucide, elle pâlit avec sa vigueur (de 1 à 0). */
  spirit?: number;
}

interface SpriteEntry {
  texture: BaseTexture;
  aspect: number;
  /** Hauteur à l'écran, en unités du monde. */
  height: number;
  /** Sens du sujet sur l'image (les planches regardent toujours vers la droite). */
  facesRight: boolean;
  /** Hauteur de l'image sous les pieds (marge d'une case de planche) : le sprite descend d'autant. */
  below?: number;
  anim?: SheetAnimation;
}

interface EntityView {
  spriteName: string;
  node: TransformNode;
  sprite: Mesh;
  material: ShaderMaterial;
  shadow: Mesh;
  shadowMaterial: ShaderMaterial;
  def: SpriteDef;
  isPlayer: boolean;
  /** Sens dans lequel l'entité regarde à l'écran, et celui du sujet sur son image. */
  faceRight: boolean;
  imageFacesRight: boolean;
  flash: number;
  sx: number;
  sy: number;
  phase: number;
  dying: number;
  /** Animation en cours sur une planche : posture jouée et temps écoulé depuis son début. */
  animTag: string;
  animTime: number;
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
/** Posture de repli quand une planche n'a pas d'animation pour la posture demandée. */
const FALLBACK_POSE: Partial<Record<Pose, Pose>> = {
  dash: 'move',
  airborne: 'move',
  channel: 'windup',
  guard: 'idle',
  stunned: 'idle',
};
export const PITCH = Math.atan(1 / Math.SQRT2); // 35,26° : isométrie vraie
export const YAW = Math.PI / 4;
export const CAMERA_DISTANCE = 40;
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
const SILK = new Color3(0.93, 0.95, 0.98);
const FIRE = new Color3(1, 0.55, 0.2);
const FRENZY_TINT = new Color3(1, 0.7, 0.6);
const ELITE_TINT = new Color3(1, 0.62, 0.38);
const ELITE_SCALE = 1.22;
const STORM = new Color3(0.8, 0.9, 1);
const SPIRIT_TINT = new Color3(0.55, 0.95, 1.1);
const CLAY = new Color3(0.78, 0.55, 0.35);
const DIVINE = new Color3(1, 0.86, 0.45);
/** Épaisseur des fils tracés entre la Jorōgumo et le joueur. */
const THREAD_WIDTH = 0.05;

export function registerShaders(): void {
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
    uniform vec4 frameRect;
    void main(void) {
      vec2 uv = frameRect.xy + vec2(mix(vUV.x, 1.0 - vUV.x, flipX), vUV.y) * frameRect.zw;
      vec4 color = texture2D(textureSampler, uv);
      float a = color.a * alpha;
      if (a < 0.02) discard;
      gl_FragColor = vec4(mix(color.rgb * tint, vec3(1.0), flash), a);
    }`;
}

export function spriteMaterial(scene: Scene, name: string, texture: BaseTexture): ShaderMaterial {
  const material = new ShaderMaterial(
    name,
    scene,
    { vertex: 'sprite', fragment: 'sprite' },
    {
      attributes: ['position', 'uv'],
      uniforms: ['worldViewProjection', 'tint', 'flash', 'alpha', 'flipX', 'frameRect'],
      samplers: ['textureSampler'],
      needAlphaBlending: true,
    },
  );
  material.setTexture('textureSampler', texture);
  material.setColor3('tint', WHITE);
  material.setFloat('flash', 0);
  material.setFloat('alpha', 1);
  material.setFloat('flipX', 0);
  material.setVector4('frameRect', new Vector4(0, 0, 1, 1));
  material.backFaceCulling = false;
  return material;
}

export function loadTexture(scene: Scene, url: string, pixelated = false): Promise<Texture> {
  return new Promise((resolve, reject) => {
    // Le pixel art garde des pixels nets : pas de mipmaps ni de lissage.
    const texture: Texture = new Texture(
      url,
      scene,
      pixelated,
      true,
      pixelated ? Texture.NEAREST_SAMPLINGMODE : Texture.TRILINEAR_SAMPLINGMODE,
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
  private readonly fxTextures: Record<'shadow' | 'crescent' | 'sweep' | 'ring' | 'telegraph' | 'web', BaseTexture>;
  private readonly views = new Map<number, EntityView>();
  private dying: EntityView[] = [];
  private effects: Fx[] = [];
  /** Effets qui durent tant qu'un ennemi n'a pas fini son action : charge, soin, chute. */
  private readonly telegraphs = new Map<number, Fx>();
  private readonly channels = new Map<number, Fx>();
  private readonly landings = new Map<number, Fx>();
  private readonly snares = new Map<number, Fx>();
  /** Halos des âmes au sol, en attente d'être liées. */
  private readonly souls = new Map<number, Fx>();
  private guardDecal: { mesh: Mesh; material: ShaderMaterial } | null = null;
  private readonly webs = new Map<number, { mesh: Mesh; material: ShaderMaterial }>();
  private stumpViews: { stumps: readonly Stump[]; meshes: { dispose(): void }[] } = { stumps: [], meshes: [] };
  private readonly threads: { pull: Mesh; pullMaterial: StandardMaterial; drag: Mesh };
  private guardPulse = 0;
  private texts: FloatingText[] = [];

  constructor(
    readonly engine: Engine,
    private readonly canvas: HTMLCanvasElement,
    private readonly overlay: HTMLElement,
    private readonly manifest: SpriteManifest,
    private readonly arenaHalfSize: number,
  ) {
    registerShaders();
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
      sweep: this.canvasTexture('sweep', drawCrescent(256, 300)),
      ring: this.canvasTexture('ring', drawRing()),
      telegraph: this.canvasTexture('telegraph', drawTelegraph()),
      web: this.canvasTexture('web', drawWeb()),
    };
    this.threads = this.createThreads();
  }

  async load(): Promise<void> {
    await this.buildGround();
    // Toile peinte si elle existe, sinon le dessin provisoire du constructeur.
    const web = await loadTexture(this.scene, `${import.meta.env.BASE_URL}sprites/toile.png`).catch(() => null);
    if (web) this.fxTextures.web = web;
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
      altitude: player.altitude,
      spawn: 1,
      blink: player.invulnerable > 0 && player.pose !== 'dash',
      aura: player.frenzy > 0 || player.transformed > 0,
    }, dt);
    for (const enemy of world.enemies) {
      seen.add(enemy.id);
      this.syncEntity(enemy.id, enemy.sprite, {
        pos: enemy.pos,
        facing: enemy.facing,
        radius: enemy.radius,
        pose: enemy.pose,
        altitude: enemy.altitude,
        spawn: enemy.spawnProgress,
        blink: false,
        elite: enemy.elite,
      }, dt);
    }
    for (const summon of world.summons) {
      seen.add(summon.id);
      this.syncEntity(summon.id, summon.kind, {
        pos: summon.pos,
        facing: summon.facing,
        radius: summon.radius,
        pose: summon.pose,
        altitude: 0,
        spawn: summon.spawnProgress,
        blink: false,
        aura: world.choir > 0,
        spirit: summon.vigor,
      }, dt);
    }
    for (const [id, view] of this.views) {
      if (seen.has(id)) continue;
      this.views.delete(id);
      view.dying = 0;
      this.dying.push(view);
    }

    this.updateGuard(player.pos, player.facing, player.pose, dt);
    this.syncStumps(world.stumps);
    this.syncWebs(world);
    this.syncThreads(world);
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
    this.snares.clear();
    this.souls.clear();
    for (const text of this.texts) text.el.remove();
    this.texts = [];
    for (const web of this.webs.values()) this.disposeFx(web);
    this.webs.clear();
    this.syncStumps([]);
    this.shake = 0;
    this.cameraTarget.setAll(0);
  }

  // --- Entités -------------------------------------------------------------

  private syncEntity(id: number, spriteName: string, s: Snapshot, dt: number): void {
    let view = this.views.get(id);
    if (view && view.spriteName !== spriteName) {
      // Changement de forme (la Jorōgumo révèle son corps d'araignée) : on refait la vue.
      this.disposeView(view);
      view = undefined;
    }
    if (!view) {
      view = this.createView(id, spriteName, s.radius);
      this.views.set(id, view);
    }
    view.node.position.set(s.pos.x, 0, s.pos.z);

    // Miroir selon que l'entité regarde vers la gauche ou la droite de l'écran (avec une marge pour éviter le va-et-vient).
    const side = dot(s.facing, this.right);
    if (Math.abs(side) > 0.2) view.faceRight = side > 0;
    view.material.setFloat('flipX', view.faceRight === view.imageFacesRight ? 0 : 1);

    // Une planche animée joue l'animation de la posture ; sinon, une seule image que l'on anime
    // par l'écrasement, le tremblement et la teinte.
    const anim = this.sprites.get(spriteName)?.anim;
    if (anim) this.playSheet(view, anim, s.pose, dt);
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
    if (anim) {
      // Les poses dessinées remplacent l'écrasement ; seul l'étourdi garde un léger tangage.
      sx = 1;
      if (s.pose !== 'stunned') sy = 1;
    }
    if (s.aura && tint === WHITE) {
      tint = FRENZY_TINT;
      sy *= 1 + 0.03 * Math.sin(t * 16);
    }
    // Élite : plus grande, et une lueur rouge doré qui pulse.
    if (s.elite && tint === WHITE) tint = Color3.Lerp(WHITE, ELITE_TINT, 0.65 + 0.35 * Math.sin(t * 5));
    // Âme liée : toujours bleue, plus vive pendant le Chœur, de plus en plus pâle avant de s'effacer.
    if (s.spirit !== undefined) {
      tint = s.aura ? Color3.Lerp(SPIRIT_TINT, WHITE, 0.3 + 0.3 * Math.sin(t * 10)) : SPIRIT_TINT;
      alpha *= 0.35 + 0.4 * s.spirit;
    }
    const k = Math.min(1, dt * 18);
    view.sx += (sx - view.sx) * k;
    view.sy += (sy - view.sy) * k;
    const grow = (0.6 + 0.4 * s.spawn) * (s.elite ? ELITE_SCALE : 1);
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
    const { sprite, material } = this.createSprite(`entity-${id}`, entry);
    sprite.parent = node;
    const shadowSize = radius * 2.6;
    const shadow = this.createDecal(`shadow-${id}`, this.fxTextures.shadow, shadowSize, shadowSize, Color3.Black(), 0.4, 0.01);
    shadow.mesh.parent = node;
    return {
      spriteName,
      node,
      sprite,
      material,
      shadow: shadow.mesh,
      shadowMaterial: shadow.material,
      def,
      isPlayer: id === PLAYER_ID,
      faceRight: entry.facesRight,
      imageFacesRight: entry.facesRight,
      flash: 0,
      sx: 1,
      sy: 1,
      phase: Math.random() * 10,
      dying: -1,
      animTag: '',
      animTime: 0,
    };
  }

  /** Choisit l'image de la planche pour la posture en cours. */
  private playSheet(view: EntityView, anim: SheetAnimation, pose: Pose, dt: number): void {
    // Une posture sans animation dessinée retombe sur la plus proche, puis sur l'attente.
    const tagName = [pose, FALLBACK_POSE[pose], 'idle'].find((name) => name && anim.tags.has(name)) ?? '';
    if (tagName !== view.animTag) {
      view.animTag = tagName;
      view.animTime = 0;
    } else {
      view.animTime += dt;
    }
    showFrame(view.material, anim, frameAt(anim, tagName, view.animTime));
  }

  /** Plan vertical tourné vers la caméra, dont l'origine est aux pieds du personnage. */
  private createSprite(name: string, entry: SpriteEntry): { sprite: Mesh; material: ShaderMaterial } {
    const sprite = MeshBuilder.CreatePlane(name, { width: entry.height * entry.aspect, height: entry.height }, this.scene);
    sprite.bakeTransformIntoVertices(Matrix.Translation(0, entry.height / 2 - (entry.below ?? 0), 0));
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

  // --- Arène du boss : souches, toiles et fils -------------------------------

  /** Les souches changent seulement au début d'une vague : on refait tout quand la liste change. */
  private syncStumps(stumps: readonly Stump[]): void {
    if (stumps === this.stumpViews.stumps) return;
    for (const mesh of this.stumpViews.meshes) mesh.dispose();
    const meshes: { dispose(): void }[] = [];
    const def = this.manifest.souche;
    const entry = this.sprites.get('souche');
    stumps.forEach((stump, i) => {
      if (!def || !entry) return;
      const { sprite, material } = this.createSprite(`stump-${i}`, entry);
      sprite.position.set(stump.pos.x, 0, stump.pos.z);
      sprite.alphaIndex = SPRITE_ORDER - Math.round(dot(stump.pos, this.forward) * 100);
      const size = stump.radius * 2.8;
      const shadow = this.createDecal(`stump-shadow-${i}`, this.fxTextures.shadow, size, size, Color3.Black(), 0.45, 0.01);
      shadow.mesh.position.x = stump.pos.x;
      shadow.mesh.position.z = stump.pos.z;
      meshes.push(sprite, material, shadow.mesh, shadow.material);
    });
    this.stumpViews = { stumps, meshes };
  }

  private syncWebs(world: World): void {
    const burnTime = world.cfg.webs.burnTime;
    const seen = new Set<number>();
    for (const web of world.webs) {
      seen.add(web.id);
      let view = this.webs.get(web.id);
      if (!view) {
        const size = web.radius * 2;
        view = this.createDecal(`web-${web.id}`, this.fxTextures.web, size, size, SILK, 0.8, 0.02);
        view.mesh.position.x = web.pos.x;
        view.mesh.position.z = web.pos.z;
        view.mesh.rotation.y = Math.random() * Math.PI * 2;
        view.mesh.alphaIndex = DECAL_ORDER + 1;
        this.webs.set(web.id, view);
      }
      const grow = Math.min(1, web.age / 0.3);
      if (web.burning === null) {
        view.mesh.scaling.setAll(0.4 + 0.6 * grow);
        view.material.setFloat('alpha', 0.75 * grow);
      } else {
        const k = Math.min(1, web.burning / burnTime);
        view.material.setColor3('tint', FIRE);
        view.material.setFloat('alpha', 0.95 * (1 - k));
        view.material.setFloat('flash', 0.3 * Math.abs(Math.sin(this.time * 30)));
        view.mesh.scaling.setAll(1 + 0.15 * k);
      }
    }
    for (const [id, view] of this.webs) {
      if (seen.has(id)) continue;
      this.disposeFx(view);
      this.webs.delete(id);
    }
  }

  /** Deux fils : celui qui la suspend au plafond, et celui qu'elle tend vers le joueur. */
  private createThreads(): { pull: Mesh; pullMaterial: StandardMaterial; drag: Mesh } {
    const material = (name: string, color: Color3): StandardMaterial => {
      const m = new StandardMaterial(name, this.scene);
      m.disableLighting = true;
      m.emissiveColor = color;
      m.alpha = 0.9;
      return m;
    };
    const cylinder = (name: string, m: StandardMaterial): Mesh => {
      const mesh = MeshBuilder.CreateCylinder(name, { height: 1, diameter: THREAD_WIDTH, tessellation: 6 }, this.scene);
      mesh.material = m;
      mesh.isPickable = false;
      mesh.isVisible = false;
      mesh.rotationQuaternion = Quaternion.Identity();
      mesh.alphaIndex = SPRITE_ORDER * 2;
      return mesh;
    };
    const pullMaterial = material('threadPull', SILK);
    return { pull: cylinder('threadPull', pullMaterial), pullMaterial, drag: cylinder('threadDrag', material('threadDrag', SILK)) };
  }

  private syncThreads(world: World): void {
    const { pull, pullMaterial, drag } = this.threads;
    const boss = world.enemies.find((e): e is Jorogumo => e instanceof Jorogumo && !e.dead);
    pull.isVisible = false;
    drag.isVisible = false;
    if (!boss) return;
    // Le sprite fait face à la caméra : le milieu de son corps se trouve le long de l'axe « haut » de la caméra.
    const view = this.views.get(boss.id);
    const bodyHeight = view ? view.sprite.getBoundingInfo().boundingBox.extendSize.y * 0.9 : 1;
    const anchor = new Vector3(boss.pos.x, boss.altitude, boss.pos.z).addInPlace(this.camera.getDirection(Vector3.Up()).scale(bodyHeight));
    if (boss.altitude > 0.3) {
      drag.isVisible = true;
      this.stretch(drag, anchor, new Vector3(boss.pos.x, boss.altitude + 20, boss.pos.z));
    }
    const thread = boss.thread;
    if (thread) {
      const player = world.player;
      pull.isVisible = true;
      // Visé, le fil est rouge et clignote ; tendu, il est blanc et épais.
      pullMaterial.emissiveColor = thread.taut ? SILK : Math.sin(this.time * 25) > 0 ? DANGER : SILK;
      pull.scaling.x = pull.scaling.z = thread.taut ? 2 : 1;
      this.stretch(pull, anchor, new Vector3(player.pos.x, 0.9, player.pos.z));
    }
  }

  /** Place un cylindre de hauteur 1 entre deux points. */
  private stretch(mesh: Mesh, from: Vector3, to: Vector3): void {
    const delta = to.subtract(from);
    const len = delta.length();
    mesh.position.copyFrom(from.add(to).scale(0.5));
    mesh.scaling.y = len;
    const axis = delta.scale(1 / Math.max(1e-6, len));
    const up = Vector3.Up();
    const cross = Vector3.Cross(up, axis);
    const angle = Math.acos(Math.max(-1, Math.min(1, Vector3.Dot(up, axis))));
    if (cross.lengthSquared() < 1e-8) mesh.rotationQuaternion = Quaternion.Identity();
    else mesh.rotationQuaternion = Quaternion.RotationAxis(cross.normalize(), angle);
  }

  // --- Effets --------------------------------------------------------------

  private handle(event: GameEvent): void {
    switch (event.type) {
      case 'swing': {
        // Coup circulaire : un croissant presque fermé tourne autour du héros. Sinon, le croissant de l'arc visé.
        const full = event.arcDeg >= 360;
        const start = -angleOf(event.dir);
        this.addFx({
          texture: full ? this.fxTextures.sweep : this.fxTextures.crescent,
          pos: event.pos,
          dir: event.dir,
          width: event.range * 2,
          depth: event.range * 2,
          color: SLASH,
          life: full ? 0.18 : 0.14,
          update: (k, fx) => {
            fx.material.setFloat('alpha', 0.9 * (1 - k));
            fx.mesh.scaling.setAll(0.85 + 0.2 * k);
            if (full) fx.mesh.rotation.y = start - k * Math.PI;
          },
        });
        break;
      }
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
        else if (event.reason === 'smash' || event.reason === 'bond') this.text(event.pos, 2, 'Étourdi', 'stun');
        else if (event.reason === 'snare') this.text(event.pos, 2, 'Pris dans le fil', 'parry');
        else if (event.reason === 'snag') {
          this.text(event.pos, 2.6, 'Le fil s’accroche !', 'parry', 1.6);
          this.addFx(this.ringFx(event.pos, 4, SILK, 0.5));
          this.addShake(0.8);
        }
        break;
      case 'bossPhase':
        this.addShake(0.5);
        break;
      case 'webBurn':
        this.addFx(this.ringFx(event.pos, event.radius * 2.2, FIRE, 0.5));
        break;
      case 'bite':
        this.text(event.pos, 2.4, 'Morsure', 'hurt');
        this.addShake(0.4);
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
      case 'bondLand':
        this.addFx(this.ringFx(event.pos, event.radius * 2, RAGE, 0.35));
        this.addFx(this.ringFx(event.pos, event.radius * 2.6, DUST, 0.45));
        this.addShake(0.45);
        break;
      case 'frenzy':
        this.text(event.pos, 2.3, 'Frénésie !', 'rage', 1.2);
        this.addFx(this.ringFx(event.pos, 2.4, RAGE, 0.4));
        break;
      case 'lightning':
        this.addFx(this.ringFx(event.pos, 1.8, STORM, 0.22));
        this.addShake(0.2);
        break;
      case 'bearSkin':
        this.text(event.pos, 2.4, 'Peau d’ours !', 'parry', 1.5);
        this.addFx(this.ringFx(event.pos, 3.2, RAGE, 0.5));
        this.addShake(0.6);
        break;
      case 'snareSet': {
        const fx = this.addFx({
          texture: this.fxTextures.web,
          pos: event.pos,
          dir: { x: 1, z: 0 },
          width: event.radius * 2,
          depth: event.radius * 2,
          color: SILK,
          life: 60,
          y: 0.022,
          update: (_k, f) => f.material.setFloat('alpha', Math.min(0.7, f.age * 4)),
        });
        this.snares.set(event.id, fx);
        break;
      }
      case 'snareEnd':
        this.endTracked(this.snares, event.id);
        break;
      case 'clayShell':
        this.text(event.pos, 2.3, 'Carapace d’argile', 'shield', 1.1);
        this.addFx(this.ringFx(event.pos, 2.4, CLAY, 0.35));
        break;
      case 'divineBlood':
        this.text(event.pos, 2.5, 'Sang divin !', 'parry', 1.6);
        this.addFx(this.ringFx(event.pos, 3.4, DIVINE, 0.6));
        this.addShake(0.6);
        break;
      case 'transform':
        this.text(event.pos, 2.5, 'Sang yokai !', 'rage', 1.4);
        this.addFx(this.ringFx(event.pos, 3, RAGE, 0.5));
        this.addShake(0.4);
        break;
      case 'soulSet': {
        // Le halo d'une âme au sol respire doucement tant qu'on peut la lier.
        const fx = this.addFx({
          ...this.ringFx(event.pos, 1.4, SPIRIT, 60),
          y: 0.024,
          update: (_k, f) => {
            f.mesh.scaling.setAll(0.85 + 0.15 * Math.sin(f.age * 5));
            f.material.setFloat('alpha', Math.min(0.85, f.age * 4) * (0.6 + 0.3 * Math.sin(f.age * 5)));
          },
        });
        this.souls.set(event.id, fx);
        break;
      }
      case 'soulEnd':
        this.endTracked(this.souls, event.id);
        break;
      case 'bind':
        this.text(event.pos, 2, 'Âme liée', 'parry');
        this.addFx(this.ringFx(event.pos, 2.4, SPIRIT, 0.45));
        break;
      case 'bindFail':
        this.text(event.pos, 2.3, 'Aucune âme à portée', 'stun', 0.8);
        break;
      case 'recall':
        this.addFx(this.ringFx(event.pos, 2, SPIRIT, 0.3));
        break;
      case 'sacrifice':
        this.addFx(this.ringFx(event.pos, event.radius * 2, SPIRIT, 0.4));
        this.addFx(this.ringFx(event.pos, event.radius * 2.6, SHADOW_STRIKE, 0.5));
        this.addShake(0.6);
        break;
      case 'choir':
        this.text(event.pos, 2.3, 'Chœur spectral', 'parry', 1.2);
        this.addFx(this.ringFx(event.pos, event.radius * 2, SPIRIT, 0.6));
        break;
      case 'summonHit': {
        const view = this.views.get(event.id);
        if (view) view.flash = 1;
        this.text(event.pos, 1.8, `−${Math.round(event.amount)}`, 'soul');
        break;
      }
      case 'summonFade':
        if (event.broken) {
          this.text(event.pos, 2, 'Âme brisée', 'soul', 1.1);
          this.addFx(this.ringFx(event.pos, 1.8, SPIRIT, 0.35));
        }
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

  private disposeFx(fx: { mesh: Mesh; material: ShaderMaterial }): void {
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

  /** Sol peint (sols/rizieres.jpg, cadré comme le dessin provisoire) s'il existe, sinon le dessin. */
  private async buildGround(): Promise<void> {
    const ground = MeshBuilder.CreateGround('ground', { width: GROUND_SIZE, height: GROUND_SIZE }, this.scene);
    const painted = await loadTexture(this.scene, `${import.meta.env.BASE_URL}sprites/sols/rizieres.jpg`).catch(() => null);
    const texture = painted ?? this.canvasTexture('groundTexture', drawGround(2048, GROUND_SIZE, this.arenaHalfSize, PADDY_SIZE));
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
      const spots = Array.isArray(def.decor) ? def.decor : [def.decor];
      spots.forEach((spot, i) => {
        const { sprite } = this.createSprite(`decor-${name}-${i}`, entry);
        sprite.position.set(spot.x, 0, spot.z);
        sprite.alphaIndex = SPRITE_ORDER - Math.round(dot(spot, this.forward) * 100);
      });
    }
  }

  private async loadSprite(name: string, def: SpriteDef): Promise<SpriteEntry> {
    if (def.sheet) {
      try {
        return { ...(await loadSheet(this.scene, def.sheet.file, def.height, def.sheet.height)), facesRight: true };
      } catch {
        console.warn(`Planche introuvable : ${def.sheet.file}. L'image fixe la remplace.`);
      }
    }
    if (def.file) {
      try {
        const texture = await loadTexture(this.scene, `${import.meta.env.BASE_URL}sprites/${def.file}`);
        const { width, height } = texture.getSize();
        return { texture, aspect: width / height, height: def.height, facesRight: def.facesRight };
      } catch {
        console.warn(`Sprite introuvable : ${def.file}. Un dessin provisoire le remplace.`);
      }
    }
    const canvas = PLACEHOLDERS[name]?.() ?? drawMissing(name);
    return { texture: this.canvasTexture(name, canvas), aspect: canvas.width / canvas.height, height: def.height, facesRight: def.facesRight };
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
