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
import type { DungeonStyle } from '../content';
import { angleOf, dot, normalize, type Vec2 } from '../game/math';
import type { GameEvent, MarkKind, Pose } from '../game/types';
import type { PeachView, ProjectileView, StumpView, WorldView } from '../game/view';
import { REVIVE_TIME } from '../game/world';
import { isHeroVariant } from './heroes';
import { frameAt, loadSheet, showFrame, type SheetAnimation } from './sheets';
import {
  drawArrow,
  drawCrescent,
  drawGround,
  drawHammer,
  drawSeal,
  drawHeroPlaceholder,
  drawJorogumo,
  drawJizo,
  drawJorogumoSpider,
  drawMissing,
  drawPeachTree,
  drawRadial,
  drawRing,
  drawSpider,
  drawStreak,
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
  pecher: () => drawPeachTree(true),
  pecherNu: () => drawPeachTree(false),
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
  /** Marque de la Lame ou du Rôdeur : un anneau tourne sous l'ennemi. */
  mark?: MarkKind | null;
  /** Lame invisible : on ne voit plus qu'une ombre. */
  hidden?: boolean;
  /** Coop : héros à terre, grisé et couché, en attendant qu'un allié le relève. */
  downed?: boolean;
  /** Regard d'Izanami (de 0 à 1) : plus on la regarde, plus elle rougeoie. */
  glare?: number;
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
  /** Anneau des marques, créé à la première marque. */
  markRing?: { mesh: Mesh; material: ShaderMaterial };
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
  vx: number;
  kind: string;
  age: number;
  life: number;
}

const PLAYER_ID = 0;
/** Coop : les vues des alliés prennent ces identifiants (et en dessous), loin de ceux des ennemis et des effets. */
const ALLY_ID = -1_000_000_000;
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
/** Sceau du Sorcier : rouge vermillon des ofuda. */
const SEAL = new Color3(1, 0.35, 0.25);
const FRENZY_TINT = new Color3(1, 0.7, 0.6);
const ELITE_TINT = new Color3(1, 0.62, 0.38);
const ELITE_SCALE = 1.22;
const GLARE_TINT = new Color3(1, 0.42, 0.48);
const PEACH = new Color3(1, 0.72, 0.62);
const STORM = new Color3(0.8, 0.9, 1);
const CLAY = new Color3(0.78, 0.55, 0.35);
const DIVINE = new Color3(1, 0.86, 0.45);
const SMOKE = new Color3(0.16, 0.14, 0.22);
const HIDDEN_TINT = new Color3(0.45, 0.4, 0.6);
const DRAW = new Color3(0.85, 1, 0.6);
const MARK_COLORS: Record<MarkKind, Color3> = {
  death: new Color3(0.85, 0.2, 0.45),
  hunt: new Color3(1, 0.6, 0.3),
};
/**
 * Hauteur de visée : la poitrine des personnages. La souris vise ce plan plutôt que le sol : en vue
 * isométrique, le sol sous le curseur est 1,3 m derrière le corps que l'on pointe.
 */
export const AIM_HEIGHT = 0.9;
/** Hauteur de vol des flèches et du marteau : celle de la visée, pour qu'ils passent sous le curseur. */
const PROJECTILE_HEIGHT = AIM_HEIGHT;
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
  private readonly fxTextures: Record<
    'shadow' | 'crescent' | 'sweep' | 'ring' | 'telegraph' | 'web' | 'streak' | 'arrow' | 'hammer' | 'seal',
    BaseTexture
  >;
  private readonly views = new Map<number, EntityView>();
  private dying: EntityView[] = [];
  private effects: Fx[] = [];
  /** Effets qui durent tant qu'un ennemi n'a pas fini son action : charge, soin, chute. */
  private readonly telegraphs = new Map<number, Fx>();
  private readonly channels = new Map<number, Fx>();
  private readonly landings = new Map<number, Fx>();
  private readonly snares = new Map<number, Fx>();
  /** Sorcier : sceaux et météores annoncés au sol, braises de la Fuite de feu et du Sol brûlant. */
  private readonly blasts = new Map<number, Fx>();
  private readonly embers = new Map<number, Fx>();
  /** Flèches, marteau et boules de feu en vol. */
  private readonly projectiles = new Map<number, { mesh: Mesh; material: ShaderMaterial; anim?: SheetAnimation; animTime: number }>();
  /** Aura du Paladin et nuage de la Lame : créés au premier usage, masqués ensuite. */
  /** Aura de lumière et nuage de fumée de chaque héros (coop : un par héros). */
  private readonly auraDecals = new Map<number, { mesh: Mesh; material: ShaderMaterial }>();
  /** Bouclier de flammes du Sorcier, un par héros. */
  private readonly wardDecals = new Map<number, { mesh: Mesh; material: ShaderMaterial }>();
  private readonly smokeDecals = new Map<number, { mesh: Mesh; material: ShaderMaterial }>();
  /** Coop : les autres héros, leur planche et l'étiquette à leur nom. */
  private allies: { sprite: string; name: string; label: HTMLElement }[] = [];
  /** Le héros de ce joueur (0 en solo et pour l'hôte, sa place pour un invité). */
  private localId = 0;
  /** Étiquette « à terre » du héros de ce joueur. */
  private downLabel: HTMLElement | null = null;
  /** Visée du tir chargé du Rôdeur : elle s'allonge et s'éclaire à mesure que l'arc se bande. */
  private aimDecal: { mesh: Mesh; material: ShaderMaterial } | null = null;
  private guardDecal: { mesh: Mesh; material: ShaderMaterial } | null = null;
  private readonly webs = new Map<number, { mesh: Mesh; material: ShaderMaterial }>();
  private stumpViews: { stumps: readonly StumpView[]; meshes: { dispose(): void }[] } = { stumps: [], meshes: [] };
  /** Pêchers de l'arène d'Izanami : l'arbre en fruit et l'arbre nu, l'un ou l'autre visible. */
  private peachViews: { trees: readonly PeachView[]; views: { ripe: Mesh; bare: Mesh }[]; meshes: { dispose(): void }[] } = {
    trees: [],
    views: [],
    meshes: [],
  };
  /** Décor autour de l'arène, propre à chaque donjon ; les planches animées (lanternes) y tournent en boucle. */
  private decor: { meshes: { dispose(): void }[]; animated: { material: ShaderMaterial; anim: SheetAnimation; time: number }[] } = {
    meshes: [],
    animated: [],
  };
  private groundMaterial: StandardMaterial | null = null;
  private readonly threads: { pull: Mesh; pullMaterial: StandardMaterial; drag: Mesh };
  private guardPulse = 0;
  /** Croissants des coups, un par largeur d'arc (le nodachi à 150°, le kanabō à 200°…). */
  private readonly arcTextures = new Map<number, BaseTexture>();
  /** Repère au sol : la forme du prochain coup d'arme, tournée vers la souris. */
  private attackGuide: { mesh: Mesh; material: ShaderMaterial; key: string } | null = null;
  private texts: FloatingText[] = [];
  /** Sprite du héros : sa race et sa classe (src/render/heroes.ts). */
  private heroSprite = 'heros';
  /** Le héros demandé, affiché dès que sa planche est chargée. */
  private wantedHero = 'heros';
  private readonly heroLoads = new Map<string, Promise<void>>();
  /** Planches de héros remplacées : libérées une fois la vue du héros refaite (voir sync). */
  private retiredHeroTextures: BaseTexture[] = [];

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
      streak: this.canvasTexture('streak', drawStreak()),
      arrow: this.canvasTexture('arrow', drawArrow()),
      hammer: this.canvasTexture('hammer', drawHammer()),
      seal: this.canvasTexture('seal', drawSeal()),
    };
    this.threads = this.createThreads();
  }

  async load(): Promise<void> {
    await this.buildGround();
    // Toile peinte si elle existe, sinon le dessin provisoire du constructeur.
    const web = await loadTexture(this.scene, `${import.meta.env.BASE_URL}sprites/toile.png`).catch(() => null);
    if (web) this.fxTextures.web = web;
    // Les planches des héros des autres races et classes ne se chargent qu'à la demande (setHero) :
    // chacune pèse plusieurs dizaines de Mo en mémoire graphique.
    await Promise.all([
      ...Object.entries(this.manifest)
        .filter(([name]) => !isHeroVariant(name))
        .map(async ([name, def]) => {
          this.sprites.set(name, await this.loadSprite(name, def));
        }),
      ...(isHeroVariant(this.wantedHero) ? [this.loadHero(this.wantedHero)] : []),
    ]);
    this.guardDecal = this.createDecal('guard', this.fxTextures.crescent, 2.6, 2.6, SPIRIT, 0.5, 0.03);
    this.guardDecal.mesh.isVisible = false;
  }

  /**
   * Change l'apparence du héros. Sa planche se charge à la première demande (on peut l'appeler avant `load`
   * pour qu'elle arrive avec le reste) ; en attendant, il garde l'apparence précédente.
   */
  setHero(sprite: string): void {
    this.wantedHero = this.manifest[sprite] ? sprite : 'heros';
    if (this.sprites.has(this.wantedHero)) this.showHero(this.wantedHero);
    // Le héros de base arrive avec les autres sprites (load) ; les autres races et classes, à la demande.
    else if (isHeroVariant(this.wantedHero)) void this.loadHero(this.wantedHero);
  }

  /** Coop : les autres héros de la partie, dans l'ordre (le deuxième, puis le troisième). */
  setAllies(allies: { sprite: string; name: string }[]): void {
    for (const ally of this.allies) ally.label.remove();
    this.downLabel?.remove();
    this.downLabel = null;
    this.allies = allies.map((ally) => {
      const sprite = this.manifest[ally.sprite] ? ally.sprite : 'heros';
      if (isHeroVariant(sprite)) void this.loadHero(sprite);
      const label = document.createElement('div');
      label.className = 'ally-label';
      this.overlay.append(label);
      return { sprite, name: ally.name, label };
    });
  }

  private loadHero(name: string): Promise<void> {
    if (this.sprites.has(name)) return Promise.resolve();
    let pending = this.heroLoads.get(name);
    if (!pending) {
      pending = this.loadSprite(name, this.manifest[name]).then((entry) => {
        this.sprites.set(name, entry);
        this.heroLoads.delete(name);
        if (this.wantedHero === name) this.showHero(name);
      });
      this.heroLoads.set(name, pending);
    }
    return pending;
  }

  /** Affiche le héros `name` et libère la planche d'un héros d'une autre race ou classe qui ne sert plus. */
  private showHero(name: string): void {
    const previous = this.heroSprite;
    this.heroSprite = name;
    if (previous !== name && isHeroVariant(previous) && !this.allies.some((a) => a.sprite === previous)) {
      const entry = this.sprites.get(previous);
      this.sprites.delete(previous);
      if (entry) this.retiredHeroTextures.push(entry.texture);
    }
  }

  /** Directions de l'écran au sol : ZQSD déplace le héros selon ces axes. */
  groundBasis(): { forward: Vec2; right: Vec2 } {
    return { forward: this.forward, right: this.right };
  }

  /** Point sous la souris (coordonnées CSS du canvas) sur le plan horizontal à `height` au-dessus du sol (0 : le sol), ramené au sol. */
  pickGround(cssX: number, cssY: number, height = 0): Vec2 | null {
    // Babylon attend des pixels CSS et les multiplie lui-même par la densité de l'écran (zoom Windows à 125 %,
    // écran Retina…) : on ne corrige que l'écart restant, si le canvas était étiré en CSS. Multiplier aussi par la
    // densité ici décalait la visée d'autant, de plus en plus loin du coin haut gauche de l'écran.
    const ratio = (this.engine.getRenderWidth() / Math.max(1, this.canvas.clientWidth)) * this.engine.getHardwareScalingLevel();
    const ray = this.scene.createPickingRay(cssX * ratio, cssY * ratio, Matrix.Identity(), this.camera);
    if (Math.abs(ray.direction.y) < 1e-6) return null;
    const t = (height - ray.origin.y) / ray.direction.y;
    return { x: ray.origin.x + ray.direction.x * t, z: ray.origin.z + ray.direction.z * t };
  }

  sync(world: WorldView, events: readonly GameEvent[], dt: number): void {
    this.time += dt;
    const player = world.player;
    this.localId = player.id;
    const seen = new Set<number>([PLAYER_ID]);
    this.syncEntity(PLAYER_ID, this.heroSprite, {
      pos: player.pos,
      facing: player.facing,
      radius: player.radius,
      pose: player.dead ? 'stunned' : player.pose,
      altitude: player.altitude,
      spawn: 1,
      blink: player.invulnerable > 0 && player.pose !== 'dash' && !player.dead,
      downed: player.dead,
      aura: player.frenzy > 0 || player.transformed > 0,
      hidden: player.hidden > 0,
    }, dt);
    this.syncAllies(world, seen, dt);
    // La vue du héros vient d'être refaite avec sa nouvelle planche : l'ancienne peut partir.
    for (const texture of this.retiredHeroTextures) texture.dispose();
    this.retiredHeroTextures = [];
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
        mark: enemy.mark,
        glare: enemy.gaze,
      }, dt);
    }
    for (const [id, view] of this.views) {
      if (seen.has(id)) continue;
      this.views.delete(id);
      view.dying = 0;
      this.dying.push(view);
    }

    this.updateGuard(player.pos, player.facing, player.pose, dt);
    this.syncAttackGuide(world);
    this.syncProjectiles(world.projectiles, dt);
    this.syncAura(world);
    this.syncWard(world);
    this.syncSmoke(world);
    this.syncAim(world);
    this.syncStumps(world.stumps);
    this.syncPeaches(world.peaches);
    for (const d of this.decor.animated) {
      d.time += dt;
      showFrame(d.material, d.anim, frameAt(d.anim, 'idle', d.time));
    }
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
    this.blasts.clear();
    this.embers.clear();
    for (const view of this.projectiles.values()) this.disposeFx(view);
    this.projectiles.clear();
    for (const decal of [...this.auraDecals.values(), ...this.wardDecals.values(), ...this.smokeDecals.values()]) decal.mesh.isVisible = false;
    this.setAllies([]);
    if (this.aimDecal) this.aimDecal.mesh.isVisible = false;
    if (this.attackGuide) this.attackGuide.mesh.isVisible = false;
    for (const text of this.texts) text.el.remove();
    this.texts = [];
    for (const web of this.webs.values()) this.disposeFx(web);
    this.webs.clear();
    this.syncStumps([]);
    this.syncPeaches([]);
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
        // Le kodama qui soigne vibre et verdit ; le héros qui bande son arc garde ses couleurs.
        sx = sy = 1 + 0.06 * Math.sin(t * 14);
        if (!view.isPlayer) tint = CHANNEL_TINT;
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
    // Izanami regardée : elle rougeoie à mesure que sa colère monte.
    if (s.glare && tint === WHITE) tint = Color3.Lerp(WHITE, GLARE_TINT, s.glare * (0.8 + 0.2 * Math.sin(t * 12)));
    // Invisible (Écran de fumée) : une silhouette sombre, à peine visible.
    if (s.hidden) {
      tint = HIDDEN_TINT;
      alpha *= 0.3;
    }
    if (s.downed) {
      tint = HIDDEN_TINT;
      alpha *= 0.6;
      sx *= 1.25;
      sy *= 0.45;
    }
    this.updateMarkRing(view, s.mark ?? null, s.radius, t);
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
    view.markRing?.material.dispose();
  }

  /** Anneau qui tourne sous un ennemi marqué, de la couleur de sa marque. */
  private updateMarkRing(view: EntityView, mark: MarkKind | null, radius: number, t: number): void {
    if (!mark && !view.markRing) return;
    if (!view.markRing) {
      const size = radius * 3;
      view.markRing = this.createDecal(`mark-${view.node.name}`, this.fxTextures.ring, size, size, WHITE, 0.8, 0.026);
      view.markRing.mesh.parent = view.node;
      view.markRing.mesh.alphaIndex = DECAL_ORDER + 3;
    }
    const { mesh, material } = view.markRing;
    mesh.isVisible = mark !== null;
    if (!mark) return;
    material.setColor3('tint', MARK_COLORS[mark]);
    material.setFloat('alpha', 0.65 + 0.25 * Math.sin(t * 6));
    mesh.rotation.y = t * 2;
    mesh.scaling.setAll(mark === 'death' ? 1.1 + 0.08 * Math.sin(t * 8) : 1);
  }

  // --- Classes : projectiles, aura, fumée ------------------------------------

  /** Flèches, marteau et boules de feu : un décalque qui vole à hauteur de poitrine, dans le sens de sa course. */
  private syncProjectiles(projectiles: readonly ProjectileView[], dt: number): void {
    const seen = new Set<number>();
    for (const p of projectiles) {
      seen.add(p.id);
      let view = this.projectiles.get(p.id);
      if (!view) {
        const hammer = p.kind === 'hammer';
        const fire = p.kind === 'fireball';
        const arrow = p.kind === 'arrow';
        const fxName = fire ? 'fxFireballSorcier' : arrow ? (p.full ? 'fxProjectileRodeurCharge' : 'fxProjectileRodeur') : '';
        const effect = fxName ? this.sprites.get(fxName) : undefined;
        const texture = effect?.texture ?? (hammer ? this.fxTextures.hammer : p.kind === 'net' ? this.fxTextures.web : fire ? this.fxTextures.shadow : this.fxTextures.arrow);
        const [width, depth] = hammer
          ? [1.2, 1.2]
          : p.kind === 'net'
            ? [0.8, 0.8]
            : fire
              ? [1.4, 0.8]
              : arrow
                ? (p.full ? [1.65, 0.85] : [1.25, 0.62])
                : [1.1, 0.22];
        const color = effect ? WHITE : fire ? FIRE : p.full ? DRAW : WHITE;
        view = {
          ...this.createDecal(`projectile-${p.id}`, texture, width, depth, color, 1, PROJECTILE_HEIGHT),
          anim: effect?.anim,
          animTime: 0,
        };
        view.mesh.alphaIndex = SPRITE_ORDER * 2;
        this.projectiles.set(p.id, view);
      }
      view.mesh.position.x = p.pos.x;
      view.mesh.position.z = p.pos.z;
      if (view.anim) {
        view.animTime += dt;
        showFrame(view.material, view.anim, frameAt(view.anim, 'flight', view.animTime));
      }
      // Le marteau et le filet tournoient ; les projectiles dirigés suivent leur course.
      if (p.kind === 'arrow' || p.kind === 'fireball') view.mesh.rotation.y = -angleOf(p.dir);
      else view.mesh.rotation.y += dt * (p.kind === 'hammer' ? 18 : 6);
    }
    for (const [id, view] of this.projectiles) {
      if (seen.has(id)) continue;
      this.disposeFx(view);
      this.projectiles.delete(id);
    }
  }

  /**
   * Coop : les autres héros. Chacun a son sprite et une étiquette à son nom ; à terre, l'étiquette dit
   * qu'il faut le relever et montre où en est la relève.
   */
  private syncAllies(world: WorldView, seen: Set<number>, dt: number): void {
    const me = world.player;
    world.players.filter((hero) => hero !== me).forEach((hero, i) => {
      const ally = this.allies[i];
      if (!ally) return;
      const id = ALLY_ID - hero.id;
      seen.add(id);
      this.syncEntity(id, this.sprites.has(ally.sprite) ? ally.sprite : 'heros', {
        pos: hero.pos,
        facing: hero.facing,
        radius: hero.radius,
        pose: hero.dead ? 'stunned' : hero.pose,
        altitude: hero.altitude,
        spawn: 1,
        blink: hero.invulnerable > 0 && hero.pose !== 'dash' && !hero.dead,
        downed: hero.dead,
        aura: hero.frenzy > 0 || hero.transformed > 0,
        hidden: hero.hidden > 0,
      }, dt);
      const hp = Math.max(0, hero.hp / hero.cfg.maxHp);
      ally.label.textContent = hero.dead ? `${ally.name} · à terre ${reviveText(hero.revive)}` : ally.name;
      ally.label.classList.toggle('down', hero.dead);
      ally.label.style.setProperty('--hp', String(hp));
      this.placeLabel(ally.label, hero.pos, 2.9);
    });
    // Le héros de ce joueur, à terre : un allié peut venir le relever.
    if (world.players.length > 1 && me.dead) {
      if (!this.downLabel) {
        this.downLabel = document.createElement('div');
        this.downLabel.className = 'ally-label down';
        this.overlay.append(this.downLabel);
      }
      this.downLabel.textContent = `À terre : un allié peut te relever ${reviveText(me.revive)}`;
      this.placeLabel(this.downLabel, me.pos, 2.9);
    } else if (this.downLabel) {
      this.downLabel.remove();
      this.downLabel = null;
    }
  }

  /** Place une étiquette HTML au-dessus d'un point du sol. */
  private placeLabel(el: HTMLElement, pos: Vec2, height: number): void {
    const width = this.engine.getRenderWidth();
    const viewport = this.camera.viewport.toGlobal(width, this.engine.getRenderHeight());
    const screen = Vector3.Project(new Vector3(pos.x, height, pos.z), Matrix.Identity(), this.scene.getTransformMatrix(), viewport);
    const toCss = this.canvas.clientWidth / Math.max(1, width);
    el.style.transform = `translate(${screen.x * toCss}px, ${screen.y * toCss}px) translate(-50%, -100%)`;
  }

  /** Aura de lumière du Paladin : un anneau doré qui suit chaque héros qui l'a lancée, et respire. */
  private syncAura(world: WorldView): void {
    for (const hero of world.players) {
      const active = hero.aura > 0;
      let decal = this.auraDecals.get(hero.id);
      if (!active && !decal) continue;
      if (!decal) {
        decal = this.createDecal(`aura-${hero.id}`, this.fxTextures.ring, 2, 2, DIVINE, 0.7, 0.025);
        decal.mesh.alphaIndex = DECAL_ORDER + 1;
        this.auraDecals.set(hero.id, decal);
      }
      const { mesh, material } = decal;
      mesh.isVisible = active;
      if (!active) continue;
      const radius = hero.cfg.paladin.aura.radius;
      mesh.position.x = hero.pos.x;
      mesh.position.z = hero.pos.z;
      mesh.scaling.setAll(radius * (1 + 0.03 * Math.sin(this.time * 4)));
      // Elle pâlit pendant sa dernière seconde.
      material.setFloat('alpha', 0.55 * Math.min(1, hero.aura) + 0.15 * Math.sin(this.time * 6));
    }
  }

  /** Bouclier de flammes du Sorcier : un anneau de feu qui suit le héros tant qu'il tient, et vacille. */
  private syncWard(world: WorldView): void {
    for (const hero of world.players) {
      const active = hero.ward > 0 && !hero.dead;
      let decal = this.wardDecals.get(hero.id);
      if (!active && !decal) continue;
      if (!decal) {
        decal = this.createDecal(`ward-${hero.id}`, this.fxTextures.ring, 2, 2, FIRE, 0.8, 0.03);
        decal.mesh.alphaIndex = DECAL_ORDER + 1;
        this.wardDecals.set(hero.id, decal);
      }
      const { mesh, material } = decal;
      mesh.isVisible = active;
      if (!active) continue;
      mesh.position.x = hero.pos.x;
      mesh.position.z = hero.pos.z;
      mesh.scaling.setAll(hero.cfg.sorcier.ward.radius * (1 + 0.06 * Math.sin(this.time * 11)));
      material.setFloat('alpha', 0.6 * Math.min(1, hero.ward * 2) + 0.2 * Math.sin(this.time * 17));
    }
  }

  /**
   * Visée du Rôdeur : un trait part de sa poitrine vers la souris, jusqu'où ira la flèche. Il vole à la hauteur
   * des flèches, donc passe sous le curseur. Discret au repos, il s'allonge et s'éclaire pendant le tir chargé.
   */
  private syncAim(world: WorldView): void {
    const player = world.player;
    const k = player.drawProgress;
    const shown = player.cfg.kit === 'rodeur' && player.pose !== 'dash' && player.pose !== 'airborne' && !player.dead;
    if (!shown && !this.aimDecal) return;
    if (!this.aimDecal) {
      this.aimDecal = this.createDecal('aim', this.fxTextures.streak, 1, 0.35, DRAW, 0.6, PROJECTILE_HEIGHT);
      this.aimDecal.mesh.alphaIndex = DECAL_ORDER + 2;
    }
    const { mesh, material } = this.aimDecal;
    mesh.isVisible = shown;
    if (!shown) return;
    const charged = player.cfg.ranger.charged;
    const reach = player.cfg.attack.range * (1 + (charged.rangeFactor - 1) * k);
    const dir = player.facing;
    mesh.position.x = player.pos.x + (dir.x * reach) / 2;
    mesh.position.z = player.pos.z + (dir.z * reach) / 2;
    mesh.rotation.y = -angleOf(dir);
    mesh.scaling.x = reach;
    mesh.scaling.z = k > 0 ? 1 : 0.6;
    material.setColor3('tint', k >= 1 ? WHITE : DRAW);
    material.setFloat('alpha', k >= 1 ? 0.75 + 0.2 * Math.sin(this.time * 20) : k > 0 ? 0.25 + 0.4 * k : 0.16);
  }

  /** Nuage de l'Écran de fumée, là où les yokai croient trouver la Lame. */
  private syncSmoke(world: WorldView): void {
    for (const hero of world.players) {
      const smoke = hero.smoke;
      let decal = this.smokeDecals.get(hero.id);
      if (!smoke && !decal) continue;
      if (!decal) {
        decal = this.createDecal(`smoke-${hero.id}`, this.fxTextures.shadow, 2, 2, SMOKE, 0.6, 0.04);
        decal.mesh.alphaIndex = DECAL_ORDER + 1;
        this.smokeDecals.set(hero.id, decal);
      }
      const { mesh, material } = decal;
      mesh.isVisible = smoke !== null;
      if (!smoke) continue;
      mesh.position.x = smoke.pos.x;
      mesh.position.z = smoke.pos.z;
      mesh.scaling.setAll(smoke.cloud * 1.2 * (1 + 0.06 * Math.sin(this.time * 3)));
      mesh.rotation.y = this.time * 0.4;
      material.setFloat('alpha', 0.85 * Math.min(1, hero.hidden * 2));
    }
  }

  // --- Arène du boss : souches, toiles et fils -------------------------------

  /** Les souches changent seulement au début d'une vague : on refait tout quand la liste change. */
  private syncStumps(stumps: readonly StumpView[]): void {
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

  /** Les pêchers changent seulement au début d'une vague : l'arbre en fruit ou l'arbre nu selon la pêche. */
  private syncPeaches(trees: readonly PeachView[]): void {
    if (trees !== this.peachViews.trees) {
      for (const mesh of this.peachViews.meshes) mesh.dispose();
      const meshes: { dispose(): void }[] = [];
      const views: { ripe: Mesh; bare: Mesh }[] = [];
      const ripeEntry = this.sprites.get('pecher');
      const bareEntry = this.sprites.get('pecherNu');
      trees.forEach((tree, i) => {
        if (!ripeEntry || !bareEntry) return;
        const order = SPRITE_ORDER - Math.round(dot(tree.pos, this.forward) * 100);
        const ripe = this.createSprite(`peach-${i}`, ripeEntry);
        const bare = this.createSprite(`peach-bare-${i}`, bareEntry);
        for (const { sprite } of [ripe, bare]) {
          sprite.position.set(tree.pos.x, 0, tree.pos.z);
          sprite.alphaIndex = order;
        }
        const size = tree.radius * 3;
        const shadow = this.createDecal(`peach-shadow-${i}`, this.fxTextures.shadow, size, size, Color3.Black(), 0.45, 0.01);
        shadow.mesh.position.x = tree.pos.x;
        shadow.mesh.position.z = tree.pos.z;
        views.push({ ripe: ripe.sprite, bare: bare.sprite });
        meshes.push(ripe.sprite, ripe.material, bare.sprite, bare.material, shadow.mesh, shadow.material);
      });
      this.peachViews = { trees, views, meshes };
    }
    trees.forEach((tree, i) => {
      const view = this.peachViews.views[i];
      if (!view) return;
      view.ripe.isVisible = tree.ripe;
      view.bare.isVisible = !tree.ripe;
    });
  }

  private syncWebs(world: WorldView): void {
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

  private syncThreads(world: WorldView): void {
    const { pull, pullMaterial, drag } = this.threads;
    const boss = world.enemies.find((e) => e.kind === 'jorogumo' && !e.dead);
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
      // En coop, le fil va vers le héros qu'elle poursuit, pas forcément celui de ce joueur.
      const prey = world.preyOf(boss.id);
      const player = world.players.find((h) => h.id === prey) ?? world.player;
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
        // Estoc : un trait droit devant le héros.
        if (event.shape === 'line') {
          this.addFx({
            texture: this.fxTextures.streak,
            pos: { x: event.pos.x + (event.dir.x * event.range) / 2, z: event.pos.z + (event.dir.z * event.range) / 2 },
            dir: event.dir,
            width: event.range * 1.1,
            depth: (event.width ?? 0.8) * 1.3,
            color: SLASH,
            life: 0.13,
            update: (k, fx) => {
              fx.material.setFloat('alpha', 0.95 * (1 - k));
              fx.mesh.scaling.x = 0.7 + 0.3 * k;
            },
          });
          break;
        }
        // Coup circulaire : un croissant presque fermé tourne autour du héros. Sinon, le croissant de l'arc de l'arme.
        const full = event.arcDeg >= 360;
        const start = -angleOf(event.dir);
        this.addFx({
          texture: this.arcTexture(event.arcDeg),
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
        else if (event.crit) this.text(event.pos, 2, `${Math.round(event.amount)} !`, 'crit');
        else this.text(event.pos, 1.7, String(Math.round(event.amount)), 'dmg');
        this.addShake(event.shielded ? 0.25 : event.crit ? 0.3 : 0.15);
        break;
      }
      case 'playerHit': {
        const mine = event.hero === this.localId;
        const view = this.views.get(mine ? PLAYER_ID : ALLY_ID - event.hero);
        if (view) view.flash = event.blocked ? 0.4 : 1;
        // Ce qui passe la garde se lit plus discrètement qu'un coup reçu de plein fouet.
        this.text(event.pos, 2.1, `−${Math.round(event.amount)}`, event.blocked ? 'shield' : 'hurt');
        // Seuls les coups reçus par son propre héros secouent l'écran.
        if (mine) this.addShake(event.blocked ? 0.2 : 0.5);
        break;
      }
      case 'heroDown':
        this.text(event.pos, 2.4, event.hero === this.localId ? 'À terre !' : 'Allié à terre !', 'hurt', 1.4);
        break;
      case 'heroRevived':
        this.text(event.pos, 2.4, 'Relevé !', 'heal', 1.4);
        break;
      case 'guard':
        this.guardPulse = 1;
        this.text(event.pos, 2.2, 'Paré', 'shield');
        break;
      case 'parry':
        this.text(event.pos, 2.3, 'Coupelle renversée !', 'parry', 1.3);
        this.addFx(this.ringFx(event.pos, 3, SPIRIT, 0.4));
        this.addShake(0.4);
        break;
      case 'stance':
        this.text(event.pos, 2.2, event.stance === 'offensive' ? 'Offensive' : 'Garde', 'stun', 0.7);
        break;
      case 'aegis':
        this.text(event.pos, 2.4, event.on ? 'Égide' : 'Égide retirée', 'parry', 0.9);
        break;
      case 'bleed':
        this.text(event.pos, 2.1, 'Saignement', 'rage', 0.8);
        break;
      case 'counter':
        this.text(event.pos, 2.4, 'Riposte !', 'parry', 1);
        this.addFx(this.ringFx(event.pos, 2.2, SPIRIT, 0.3));
        break;
      case 'slow':
        this.text(event.pos, 2, 'Ralenti', 'stun', 0.8);
        break;
      case 'stun':
        if (event.reason === 'wall') this.text(event.pos, 2, 'Sonné !', 'stun');
        else if (event.reason === 'smash' || event.reason === 'bond') this.text(event.pos, 2, 'Étourdi', 'stun');
        else if (event.reason === 'snare') this.text(event.pos, 2, 'Pris dans le fil', 'parry');
        else if (event.reason === 'net') this.text(event.pos, 2, 'Pris au filet', 'parry');
        else if (event.reason === 'daze') this.text(event.pos, 2, 'Étourdi', 'stun');
        else if (event.reason === 'peach') {
          this.text(event.pos, 2.8, 'Repoussée !', 'parry', 1.6);
          this.addFx(this.ringFx(event.pos, 4, PEACH, 0.5));
        } else if (event.reason === 'snag') {
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
      case 'peach': {
        // La pêche file du pêcher jusqu'à Izanami.
        const dir = { x: event.to.x - event.from.x, z: event.to.z - event.from.z };
        const len = Math.hypot(dir.x, dir.z);
        if (len > 0.1) {
          this.addFx({
            texture: this.fxTextures.streak,
            pos: { x: (event.from.x + event.to.x) / 2, z: (event.from.z + event.to.z) / 2 },
            dir,
            width: len,
            depth: 0.9,
            color: PEACH,
            life: 0.45,
            update: (k, fx) => fx.material.setFloat('alpha', 0.9 * (1 - k)),
          });
        }
        this.addFx(this.ringFx(event.to, 3.2, PEACH, 0.5));
        this.text(event.from, 2.8, 'Pêche d’Izanagi !', 'parry', 1.4);
        this.addShake(0.5);
        break;
      }
      case 'wrath':
        this.addFx(this.ringFx(event.pos, event.radius * 2.2, DANGER, 0.5));
        this.addFx(this.ringFx(event.pos, event.radius * 2.8, SHADOW_STRIKE, 0.6));
        this.text(event.pos, 3, 'Colère d’Izanami !', 'hurt', 1.3);
        this.addShake(0.8);
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
        // Rayon nul : l'annonce a été annulée (colère d'Izanami interrompue), rien ne tombe.
        if (event.radius <= 0) break;
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
      case 'guardBreak':
        this.text(event.pos, 2.3, 'Garde brisée', 'hurt', 1.2);
        this.addShake(0.35);
        break;
      case 'perfectGuard':
        // Blocage parfait : un éclair blanc autour du bouclier, et un mot au-dessus du texte de la garde.
        this.text(event.pos, 2.8, 'Parfait !', 'parry', 1);
        this.addFx(this.ringFx(event.pos, 2.2, DIVINE, 0.25));
        if (event.hero === this.localId) this.addShake(0.3);
        break;
      case 'guardNova':
        this.text(event.pos, 2.6, 'Onde de lumière', 'light', 1.2);
        this.addFx(this.ringFx(event.pos, event.radius * 2.4, DIVINE, 0.5));
        this.addShake(0.4);
        break;
      case 'divineAegis':
        this.text(event.pos, 2.5, 'Égide divine !', 'parry', 1.6);
        this.addFx(this.ringFx(event.pos, 3.4, DIVINE, 0.6));
        this.addShake(0.6);
        break;
      case 'transform':
        this.text(event.pos, 2.5, 'Sang yokai !', 'rage', 1.4);
        this.addFx(this.ringFx(event.pos, 3, RAGE, 0.5));
        this.addShake(0.4);
        break;
      case 'blast': {
        // Sceau : le seiman se trace et s'éclaire jusqu'à l'explosion. Météore : un cercle de feu qui se resserre.
        const duration = event.delay;
        const seal = event.kind === 'seal';
        const fx = this.addFx({
          texture: seal ? this.fxTextures.seal : this.fxTextures.ring,
          pos: event.pos,
          dir: { x: 1, z: 0 },
          width: event.radius * 2,
          depth: event.radius * 2,
          color: seal ? SEAL : FIRE,
          life: duration + 1,
          y: 0.026,
          update: (_k, f) => {
            const ramp = Math.min(1, f.age / Math.max(0.01, duration));
            if (seal) f.mesh.rotation.y = f.age * 1.5;
            else f.mesh.scaling.setAll(1.5 - 0.5 * ramp);
            f.material.setFloat('alpha', 0.35 + 0.65 * ramp);
          },
        });
        this.blasts.set(event.id, fx);
        if (!seal) this.text(event.pos, 2.6, 'Météore !', 'rage', 1.2);
        break;
      }
      case 'blastEnd': {
        this.endTracked(this.blasts, event.id);
        const meteor = event.kind === 'meteor';
        const wrath = meteor ? this.sprites.get('fxFireWrathSorcier') : undefined;
        if (wrath?.anim) {
          const life = 0.4;
          this.addFx({
            texture: wrath.texture,
            pos: event.pos,
            dir: { x: 1, z: 0 },
            width: event.radius * 2.2,
            depth: event.radius * 2.2,
            color: WHITE,
            life,
            y: 0.035,
            update: (k, fx) => {
              showFrame(fx.material, wrath.anim!, frameAt(wrath.anim!, 'wrath', k * life));
              fx.material.setFloat('alpha', 0.95 * (1 - k));
            },
          });
        }
        this.addFx(this.ringFx(event.pos, event.radius * 2.2, FIRE, meteor ? 0.6 : 0.35));
        this.addFx(this.ringFx(event.pos, event.radius * (meteor ? 2.8 : 1.6), meteor ? DUST : SEAL, meteor ? 0.7 : 0.3));
        this.addShake(meteor ? 0.9 : 0.25);
        break;
      }
      case 'ember': {
        const life = event.life;
        const fx = this.addFx({
          texture: this.fxTextures.shadow,
          pos: event.pos,
          dir: { x: 1, z: 0 },
          width: event.radius * 2,
          depth: event.radius * 2,
          color: FIRE,
          life: life + 1,
          y: 0.024,
          update: (_k, f) => f.material.setFloat('alpha', Math.min(0.75, f.age * 6, (life - f.age) * 1.5) * (0.75 + 0.25 * Math.sin(f.age * 13))),
        });
        this.embers.set(event.id, fx);
        break;
      }
      case 'emberEnd':
        this.endTracked(this.embers, event.id);
        break;
      case 'dome': {
        // Bâton de Susanoo : un anneau de feu qui palpite autour du Sorcier tant que le dôme tient.
        const life = event.life;
        const fx = this.addFx({
          texture: this.fxTextures.ring,
          pos: event.pos,
          dir: { x: 1, z: 0 },
          width: event.radius * 2,
          depth: event.radius * 2,
          color: FIRE,
          life: life + 1,
          y: 0.03,
          update: (_k, f) => f.material.setFloat('alpha', Math.min(0.85, f.age * 4, (life - f.age) * 1.5) * (0.7 + 0.3 * Math.sin(f.age * 6))),
        });
        this.embers.set(event.id, fx);
        this.text(event.pos, 2.6, 'Dôme de feu', 'rage', 1.2);
        break;
      }
      case 'ward':
        this.text(event.pos, 2.4, 'Bouclier de flammes', 'rage', 1.1);
        this.addFx(this.ringFx(event.pos, event.radius * 2.4, FIRE, 0.4));
        break;
      case 'wardEnd':
        this.addFx(this.ringFx(event.pos, 2, FIRE, 0.3));
        break;
      case 'flight': {
        const dir = { x: event.to.x - event.from.x, z: event.to.z - event.from.z };
        const len = Math.hypot(dir.x, dir.z);
        if (len < 0.1) break;
        this.addFx({
          texture: this.fxTextures.streak,
          pos: { x: (event.from.x + event.to.x) / 2, z: (event.from.z + event.to.z) / 2 },
          dir,
          width: len,
          depth: 0.9,
          color: FIRE,
          life: 0.35,
          update: (k, fx) => fx.material.setFloat('alpha', 0.85 * (1 - k)),
        });
        break;
      }
      case 'noMana':
        this.text(event.pos, 2.3, 'Pas assez de mana', 'stun', 0.7);
        break;
      case 'mark':
        if (event.mark === 'death') this.text(event.pos, 2.4, 'Marque de mort', 'mark', 1.2);
        else if (event.mark === 'hunt') this.text(event.pos, 2.4, 'Proie marquée', 'hunt', 1.1);
        else this.text(event.pos, 2.2, 'Marqué', 'mark', 0.7);
        this.addFx(this.ringFx(event.pos, 1.8, MARK_COLORS[event.mark], 0.3));
        break;
      case 'streak': {
        const dir = { x: event.to.x - event.from.x, z: event.to.z - event.from.z };
        const len = Math.hypot(dir.x, dir.z);
        if (len < 0.1) break;
        this.addFx({
          texture: this.fxTextures.streak,
          pos: { x: (event.from.x + event.to.x) / 2, z: (event.from.z + event.to.z) / 2 },
          dir,
          width: len,
          depth: 0.7,
          color: SHADOW_STRIKE,
          life: 0.3,
          update: (k, fx) => fx.material.setFloat('alpha', 0.85 * (1 - k)),
        });
        break;
      }
      case 'smoke':
        this.addFx(this.ringFx(event.pos, event.radius * 2.4, SMOKE, 0.5));
        this.text(event.pos, 2.3, 'Écran de fumée', 'mark', 1);
        break;
      case 'aura':
        this.addFx(this.ringFx(event.pos, event.radius * 2.4, DIVINE, 0.5));
        this.text(event.pos, 2.4, 'Aura de lumière', 'light', 1.1);
        break;
      case 'netBurst':
        this.addFx({
          texture: this.fxTextures.web,
          pos: event.pos,
          dir: { x: 1, z: 0 },
          width: event.radius * 2,
          depth: event.radius * 2,
          color: SILK,
          life: 0.9,
          y: 0.022,
          update: (k, fx) => {
            fx.mesh.scaling.setAll(0.5 + 0.5 * Math.min(1, k * 6));
            fx.material.setFloat('alpha', 0.85 * (1 - k * k));
          },
        });
        break;
      case 'loose':
        this.addFx(this.ringFx(event.pos, 1.6, DRAW, 0.25));
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

  /** Croissant d'un coup de `arcDeg` degrés (360 : le balayage qui tourne autour du héros). */
  private arcTexture(arcDeg: number): BaseTexture {
    if (arcDeg >= 360) return this.fxTextures.sweep;
    const deg = Math.round(arcDeg / 5) * 5;
    let texture = this.arcTextures.get(deg);
    if (!texture) {
      texture = this.canvasTexture(`arc-${deg}`, drawCrescent(256, deg));
      this.arcTextures.set(deg, texture);
    }
    return texture;
  }

  /**
   * Repère au sol, très discret : la forme du coup de l'arme (arc ou estoc), tournée vers la souris.
   * Le héros ne se tourne qu'à gauche ou à droite à l'écran : sans lui, on devine mal où partira le coup.
   * Il s'éclaire pendant l'élan. Rien pour le Rôdeur (il a sa visée) ni pour un coup à 360°.
   */
  private syncAttackGuide(world: WorldView): void {
    const player = world.player;
    const attack = player.cfg.attack;
    const thrust = attack.shape === 'line';
    const shown = player.cfg.kit !== 'rodeur' && (thrust || attack.arcDeg < 360) && player.pose !== 'dash' && player.pose !== 'airborne' && !player.dead;
    if (!shown && !this.attackGuide) return;
    const key = thrust ? 'line' : `arc-${attack.arcDeg}`;
    if (!this.attackGuide) {
      // Bleu-esprit, comme la garde : il se lit sur le vert des rizières comme sur le sol sombre du Palais.
      const decal = this.createDecal('attackGuide', this.fxTextures.streak, 1, 1, SPIRIT, 0.2, 0.022);
      decal.mesh.alphaIndex = DECAL_ORDER + 1;
      this.attackGuide = { ...decal, key: '' };
    }
    const guide = this.attackGuide;
    guide.mesh.isVisible = shown;
    if (!shown) return;
    if (guide.key !== key) {
      guide.material.setTexture('textureSampler', thrust ? this.fxTextures.streak : this.arcTexture(attack.arcDeg));
      guide.key = key;
    }
    const dir = player.facing;
    if (thrust) {
      guide.mesh.position.x = player.pos.x + (dir.x * attack.range) / 2;
      guide.mesh.position.z = player.pos.z + (dir.z * attack.range) / 2;
      guide.mesh.scaling.set(attack.range, 1, attack.width ?? 0.8);
    } else {
      guide.mesh.position.x = player.pos.x;
      guide.mesh.position.z = player.pos.z;
      guide.mesh.scaling.set(attack.range * 2, 1, attack.range * 2);
    }
    guide.mesh.rotation.y = -angleOf(dir);
    guide.material.setFloat('alpha', player.pose === 'windup' ? 0.7 : 0.35);
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
    // Sans éclairage, c'est la couleur émise qui module l'image du sol (blanc : l'image telle quelle).
    material.emissiveColor = WHITE;
    material.specularColor = Color3.Black();
    ground.material = material;
    ground.isPickable = false;
    this.groundMaterial = material;
  }

  /** Arène du donjon : teinte du sol, couleur de la brume, décor posé autour (src/data/dungeons.json). */
  setStyle(style: DungeonStyle): void {
    if (this.groundMaterial) this.groundMaterial.emissiveColor = new Color3(...style.ground);
    this.scene.clearColor = Color4.FromHexString(`${style.sky}ff`);
    for (const mesh of this.decor.meshes) mesh.dispose();
    const meshes: { dispose(): void }[] = [];
    const animated: { material: ShaderMaterial; anim: SheetAnimation; time: number }[] = [];
    style.decor.forEach((spot, i) => {
      const entry = this.sprites.get(spot.sprite);
      if (!entry) return;
      const { sprite, material } = this.createSprite(`decor-${spot.sprite}-${i}`, entry);
      sprite.position.set(spot.x, 0, spot.z);
      sprite.alphaIndex = SPRITE_ORDER - Math.round(dot(spot, this.forward) * 100);
      if (entry.anim) {
        const time = Math.random() * 2;
        showFrame(material, entry.anim, frameAt(entry.anim, 'idle', time));
        animated.push({ material, anim: entry.anim, time });
      }
      meshes.push(sprite, material);
    });
    this.decor = { meshes, animated };
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
    const vx = (Math.random() - 0.5) * (kind === 'crit' ? 0.7 : 0.4);
    this.texts.push({
      el,
      pos: new Vector3(pos.x + (Math.random() - 0.5) * 0.25, height, pos.z),
      vx,
      kind,
      age: 0,
      life,
    });
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
      const progress = text.age / text.life;
      // Trajectoire en léger arc ascendant
      const riseY = Math.sin(Math.min(1, progress * 1.5) * (Math.PI / 2)) * 1.05;
      const driftX = text.vx * Math.min(1, progress * 1.8);
      const worldPos = text.pos.add(new Vector3(driftX, riseY, 0));
      const screen = Vector3.Project(worldPos, Matrix.Identity(), transform, viewport);

      // Effet d'impact "pop" : grossissement rapide puis stabilisation
      let scale = 1;
      if (progress < 0.12) {
        const k = progress / 0.12;
        scale = text.kind === 'crit' ? 0.85 + 0.65 * k : 0.85 + 0.35 * k;
      } else if (progress < 0.28) {
        const k = (progress - 0.12) / 0.16;
        scale = text.kind === 'crit' ? 1.5 - 0.5 * k : 1.2 - 0.2 * k;
      }

      text.el.style.transform = `translate(${screen.x * toCss}px, ${screen.y * toCss}px) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
      text.el.style.opacity = String(Math.max(0, 1 - progress ** 2.2));
      return true;
    });
  }
}

/** Où en est la relève d’un héros à terre, en pour cent (vide tant que personne n’est à côté). */
function reviveText(revive: number): string {
  if (revive <= 0) return '';
  return `${Math.min(100, Math.round((revive / REVIVE_TIME) * 100))} %`;
}
