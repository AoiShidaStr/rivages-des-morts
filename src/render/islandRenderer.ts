import {
  Camera,
  Color3,
  Color4,
  DynamicTexture,
  Engine,
  FreeCamera,
  Matrix,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Texture,
  Vector3,
  type BaseTexture,
  type ShaderMaterial,
} from '@babylonjs/core';
import { toWorld, type Island } from '../game/island';
import { dot, normalize, type Vec2 } from '../game/math';
import { drawIslandGround, drawProp } from './pixelArt';
import { CAMERA_DISTANCE, PITCH, YAW, loadTexture, registerShaders, spriteMaterial, type SpriteDef, type SpriteManifest } from './renderer';
import { frameAt, loadSheet, showFrame, type SheetAnimation } from './sheets';
import { drawRadial, drawRing } from './textures';

/** Assez grand pour que la caméra ne voie jamais le bord du sol, même au bout du ponton. */
const WORLD_SIZE = 84;
const PIXELS_PER_UNIT = 6;
const VIEW_HALF_HEIGHT = 7;
const SPRITE_ORDER = 10_000;
const MARKER_HEIGHT_MARGIN = 0.45;

interface SpriteEntry {
  texture: BaseTexture;
  aspect: number;
  /** Hauteur de l'image dans le monde (une case entière pour une planche). */
  height: number;
  /** Taille du sujet dans le monde : c'est elle que règle la hauteur donnée dans island.json. */
  body: number;
  /** Hauteur de l'image sous les pieds : le sprite descend d'autant. */
  below: number;
  facesRight: boolean;
  anim?: SheetAnimation;
}

interface Billboard {
  sprite: string;
  mesh: Mesh;
  material: ShaderMaterial;
  shadow: Mesh;
  entry: SpriteEntry;
  phase: number;
  faceRight: boolean;
  animTag: string;
  animTime: number;
}

/** Marqueur « ! » ou « ? » au-dessus d'un PNJ qui a quelque chose de nouveau à dire. */
interface Marker {
  el: HTMLDivElement;
  anchor: Vector3;
}

/**
 * Rendu de l'île d'exploration : sol en pixel art, décors, PNJ et héros en images tournées vers la caméra.
 * Même caméra isométrique que les combats, pour que le passage de l'un à l'autre reste naturel.
 */
export class IslandRenderer {
  private readonly scene: Scene;
  private readonly camera: FreeCamera;
  private readonly cameraOffset: Vector3;
  private readonly cameraTarget = Vector3.Zero();
  readonly forward: Vec2;
  readonly right: Vec2;
  private readonly sprites = new Map<string, SpriteEntry>();
  private readonly npcs = new Map<string, Billboard>();
  /** Décors animés (cascade, portail…), qui bouclent sur leur animation d'attente. */
  private readonly animatedProps: Billboard[] = [];
  private player: Billboard | null = null;
  private highlight: { mesh: Mesh; material: ShaderMaterial } | null = null;
  private shadowTexture!: BaseTexture;
  private readonly markers = new Map<string, Marker>();
  private time = 0;

  constructor(
    private readonly engine: Engine,
    private readonly canvas: HTMLCanvasElement,
    private readonly overlay: HTMLElement,
    private readonly manifest: SpriteManifest,
  ) {
    registerShaders();
    this.scene = new Scene(engine);
    this.scene.clearColor = Color4.FromHexString('#c3cbcfff');
    this.camera = new FreeCamera('islandCamera', Vector3.Zero(), this.scene);
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
    this.fitView();
    window.addEventListener('resize', () => this.fitView());
  }

  async load(island: Island): Promise<void> {
    this.shadowTexture = this.canvasTexture('islandShadow', drawRadial(), false);
    await this.buildGround(island);
    await Promise.all(
      Object.entries(this.manifest).map(async ([name, def]) => {
        const entry = await this.loadEntry(name, def);
        if (entry) this.sprites.set(name, entry);
      }),
    );
    for (const prop of island.data.props) {
      const entry = this.entryFor(prop.sprite, prop.height);
      if (!entry) continue;
      const view = this.billboard(`prop-${prop.sprite}-${prop.u}`, entry, toWorld(prop), prop.solid ?? 0, prop.sprite);
      if (entry.anim) this.animatedProps.push(view);
    }
    this.player = this.billboard('player', this.required('heros'), island.player.pos, 0.4, 'heros');
    const ring = this.createGroundDecal('highlight', this.canvasTexture('islandRing', drawRing(), true), 1.6, new Color3(1, 0.85, 0.55), 0.75);
    ring.mesh.isVisible = false;
    this.highlight = ring;
  }

  /** Change l'apparence du héros (race et classe) ; sans planche, il garde l'image par défaut. */
  setHero(sprite: string): void {
    const old = this.player;
    if (!old || old.sprite === sprite) return;
    const entry = this.entryFor(sprite) ?? this.required('heros');
    const pos = { x: old.mesh.position.x, z: old.mesh.position.z };
    this.disposeBillboard(old);
    this.player = this.billboard('player', entry, pos, 0.4, sprite);
  }

  /** Point de vue du menu principal : la caméra dérive lentement au-dessus du village. */
  focus(target: Vec2, dt: number, snap = false): void {
    const follow = snap ? 1 : 1 - Math.exp(-6 * dt);
    this.cameraTarget.x += (target.x - this.cameraTarget.x) * follow;
    this.cameraTarget.z += (target.z - this.cameraTarget.z) * follow;
    this.camera.position.copyFrom(this.cameraTarget).addInPlace(this.cameraOffset);
    this.camera.setTarget(this.cameraTarget);
  }

  sync(island: Island, targetId: string | null, markers: ReadonlyMap<string, string>, dt: number, showPlayer = true): void {
    this.time += dt;
    const visible = island.interactables();
    const seen = new Set<string>();
    for (const it of visible) {
      if (!it.sprite) continue;
      seen.add(it.def.id);
      let view = this.npcs.get(it.def.id);
      if (view && view.sprite !== it.sprite) {
        // L'objet a changé d'apparence (lanterne allumée) : on refait son image.
        this.disposeBillboard(view);
        view = undefined;
      }
      if (!view) {
        const entry = this.entryFor(it.sprite);
        if (!entry) continue;
        view = this.billboard(`npc-${it.def.id}`, entry, it.pos, it.def.solid ?? 0.3, it.sprite);
        this.npcs.set(it.def.id, view);
      }
      // Les PNJ se tournent vers le héros quand il approche.
      const toPlayer = { x: island.player.pos.x - it.pos.x, z: island.player.pos.z - it.pos.z };
      if (Math.hypot(toPlayer.x, toPlayer.z) < 4) this.face(view, toPlayer);
      // Une planche animée respire d'elle-même ; une image fixe s'étire un peu.
      if (view.entry.anim) this.play(view, 'idle', dt);
      else view.mesh.scaling.set(1, 1 + 0.012 * Math.sin((this.time + view.phase) * 2.5), 1);
    }
    for (const view of this.animatedProps) this.play(view, 'idle', dt);
    for (const [id, view] of this.npcs) {
      if (seen.has(id)) continue;
      this.disposeBillboard(view);
      this.npcs.delete(id);
    }

    if (this.player) {
      const p = island.player;
      this.player.mesh.position.set(p.pos.x, 0, p.pos.z);
      this.player.shadow.position.set(p.pos.x, 0.01, p.pos.z);
      this.player.mesh.isVisible = showPlayer;
      this.player.shadow.isVisible = showPlayer;
      this.face(this.player, p.facing);
      if (this.player.entry.anim) {
        this.play(this.player, p.moving ? 'move' : 'idle', dt);
      } else {
        const hop = p.moving ? Math.abs(Math.sin(this.time * 9)) : 0;
        this.player.mesh.scaling.set(1 - 0.03 * hop, 1 + 0.05 * hop + 0.012 * Math.sin(this.time * 3), 1);
      }
      this.player.mesh.alphaIndex = SPRITE_ORDER - Math.round(dot(p.pos, this.forward) * 100);
    }

    const target = targetId ? visible.find((it) => it.def.id === targetId) : undefined;
    if (this.highlight) {
      this.highlight.mesh.isVisible = Boolean(target) && showPlayer;
      if (target) {
        this.highlight.mesh.position.set(target.pos.x, 0.02, target.pos.z);
        this.highlight.material.setFloat('alpha', 0.55 + 0.25 * Math.sin(this.time * 5));
      }
    }
    this.syncMarkers(visible.map((it) => ({ id: it.def.id, pos: it.pos, sprite: it.sprite })), markers);
  }

  render(): void {
    this.scene.render();
  }

  // --- Construction ----------------------------------------------------------

  /** Sol peint (sols/ile.jpg, recalé sur le tracé de island.json) s'il existe, sinon le dessin en pixel art. */
  private async buildGround(island: Island): Promise<void> {
    const ground = MeshBuilder.CreateGround('islandGround', { width: WORLD_SIZE, height: WORLD_SIZE }, this.scene);
    const painted = await loadTexture(this.scene, `${import.meta.env.BASE_URL}sprites/sols/ile.jpg`).catch(() => null);
    const texture = painted ?? this.canvasTexture('islandGroundTexture', drawIslandGround(island.data, WORLD_SIZE, PIXELS_PER_UNIT), true);
    texture.hasAlpha = false;
    const material = new StandardMaterial('islandGroundMaterial', this.scene);
    material.diffuseTexture = texture;
    material.disableLighting = true;
    material.emissiveColor = Color3.White();
    material.specularColor = Color3.Black();
    ground.material = material;
    ground.isPickable = false;
  }

  /** Planche animée, image peinte, ou à défaut le dessin provisoire désigné par `placeholder`. */
  private async loadEntry(name: string, def: SpriteDef): Promise<SpriteEntry | null> {
    const base = `${import.meta.env.BASE_URL}sprites/`;
    if (def.sheet) {
      try {
        const sheet = await loadSheet(this.scene, def.sheet.file, def.height, def.sheet.height);
        return { ...sheet, body: def.height, facesRight: true };
      } catch {
        console.warn(`Planche introuvable : ${def.sheet.file}. L'image fixe la remplace.`);
      }
    }
    if (def.file) {
      try {
        const texture = await loadTexture(this.scene, `${base}${def.file}`);
        const { width, height } = texture.getSize();
        return { texture, aspect: width / height, height: def.height, body: def.height, below: 0, facesRight: def.facesRight };
      } catch {
        console.warn(`Sprite de l'île introuvable : ${def.file}.${def.placeholder ? ' Le dessin provisoire le remplace.' : ''}`);
      }
    }
    return def.placeholder ? this.pixelEntry(name, def.placeholder, def.height) : null;
  }

  private pixelEntry(key: string, drawingName: string, height: number): SpriteEntry | null {
    const drawing = drawProp(drawingName);
    if (!drawing) return null;
    return {
      texture: this.canvasTexture(key, drawing, true),
      aspect: drawing.width / drawing.height,
      height,
      body: height,
      below: 0,
      facesRight: true,
    };
  }

  /** `height` (island.json) règle la taille du sujet ; une planche garde ses proportions de case. */
  private entryFor(sprite: string, height?: number): SpriteEntry | null {
    if (sprite.startsWith('px:')) {
      const key = `${sprite}@${height ?? 1}`;
      const cached = this.sprites.get(key);
      if (cached) return cached;
      const entry = this.pixelEntry(key, sprite.slice(3), height ?? 1);
      if (entry) this.sprites.set(key, entry);
      return entry;
    }
    const entry = this.sprites.get(sprite);
    if (!entry || !height) return entry ?? null;
    const k = height / entry.body;
    return { ...entry, height: entry.height * k, body: height, below: entry.below * k };
  }

  private required(name: string): SpriteEntry {
    const entry = this.entryFor(name);
    if (!entry) throw new Error(`Sprite de l'île introuvable : ${name}`);
    return entry;
  }

  private billboard(name: string, entry: SpriteEntry, pos: Vec2, radius: number, sprite: string): Billboard {
    const mesh = MeshBuilder.CreatePlane(name, { width: entry.height * entry.aspect, height: entry.height }, this.scene);
    mesh.bakeTransformIntoVertices(Matrix.Translation(0, entry.height / 2 - entry.below, 0));
    mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
    mesh.isPickable = false;
    mesh.position.set(pos.x, 0, pos.z);
    mesh.alphaIndex = SPRITE_ORDER - Math.round(dot(pos, this.forward) * 100);
    const material = spriteMaterial(this.scene, name, entry.texture);
    mesh.material = material;
    const size = Math.max(0.8, radius * 2.8);
    const shadow = this.createGroundDecal(`${name}-shadow`, this.shadowTexture, size, Color3.Black(), 0.35).mesh;
    shadow.position.set(pos.x, 0.01, pos.z);
    const phase = Math.random() * 10;
    const view = { sprite, mesh, material, shadow, entry, phase, faceRight: entry.facesRight, animTag: '', animTime: 0 };
    // Les décors animés identiques (lanternes) ne battent pas tous en même temps.
    if (entry.anim) this.play(view, 'idle', phase);
    return view;
  }

  private play(view: Billboard, tag: string, dt: number): void {
    const anim = view.entry.anim;
    if (!anim) return;
    const name = anim.tags.has(tag) ? tag : 'idle';
    if (name !== view.animTag) {
      view.animTag = name;
      view.animTime = 0;
    }
    view.animTime += dt;
    showFrame(view.material, anim, frameAt(anim, name, view.animTime));
  }

  private disposeBillboard(view: Billboard): void {
    view.mesh.dispose();
    view.material.dispose();
    view.shadow.material?.dispose();
    view.shadow.dispose();
  }

  private face(view: Billboard, dir: Vec2): void {
    const side = dot(dir, this.right);
    if (Math.abs(side) > 0.2) view.faceRight = side > 0;
    view.material.setFloat('flipX', view.faceRight === view.entry.facesRight ? 0 : 1);
  }

  private createGroundDecal(name: string, texture: BaseTexture, size: number, color: Color3, alpha: number): { mesh: Mesh; material: ShaderMaterial } {
    const mesh = MeshBuilder.CreateGround(name, { width: size, height: size }, this.scene);
    mesh.isPickable = false;
    mesh.alphaIndex = -100_000;
    const material = spriteMaterial(this.scene, name, texture);
    material.setColor3('tint', color);
    material.setFloat('alpha', alpha);
    material.disableDepthWrite = true;
    mesh.material = material;
    return { mesh, material };
  }

  /** Pixel art : pas de lissage ni de mipmaps. */
  private canvasTexture(name: string, canvas: HTMLCanvasElement, pixelated: boolean): DynamicTexture {
    const texture = new DynamicTexture(
      name,
      canvas,
      this.scene,
      !pixelated,
      pixelated ? Texture.NEAREST_SAMPLINGMODE : Texture.TRILINEAR_SAMPLINGMODE,
    );
    texture.hasAlpha = true;
    texture.wrapU = Texture.CLAMP_ADDRESSMODE;
    texture.wrapV = Texture.CLAMP_ADDRESSMODE;
    texture.update();
    return texture;
  }

  private fitView(): void {
    const aspect = this.engine.getRenderWidth() / Math.max(1, this.engine.getRenderHeight());
    this.camera.orthoTop = VIEW_HALF_HEIGHT;
    this.camera.orthoBottom = -VIEW_HALF_HEIGHT;
    this.camera.orthoLeft = -VIEW_HALF_HEIGHT * aspect;
    this.camera.orthoRight = VIEW_HALF_HEIGHT * aspect;
  }

  // --- Marqueurs de quête ------------------------------------------------------

  private syncMarkers(visible: { id: string; pos: Vec2; sprite?: string }[], wanted: ReadonlyMap<string, string>): void {
    for (const [id, marker] of this.markers) {
      if (wanted.has(id) && visible.some((v) => v.id === id)) continue;
      marker.el.remove();
      this.markers.delete(id);
    }
    const width = this.engine.getRenderWidth();
    const height = this.engine.getRenderHeight();
    const viewport = this.camera.viewport.toGlobal(width, height);
    const transform = this.scene.getTransformMatrix();
    const toCss = this.canvas.clientWidth / Math.max(1, width);
    // « Haut » de l'écran dans le monde : c'est l'axe le long duquel se dressent les sprites.
    const up = new Vector3(Math.sin(PITCH) * this.forward.x, Math.cos(PITCH), Math.sin(PITCH) * this.forward.z);
    for (const v of visible) {
      const symbol = wanted.get(v.id);
      if (!symbol) continue;
      let marker = this.markers.get(v.id);
      if (!marker) {
        const el = document.createElement('div');
        el.className = 'quest-marker';
        this.overlay.append(el);
        const spriteHeight = v.sprite ? (this.entryFor(v.sprite)?.height ?? 1.5) : 1.5;
        marker = { el, anchor: new Vector3(v.pos.x, 0, v.pos.z).addInPlace(up.scale(spriteHeight + MARKER_HEIGHT_MARGIN)) };
        this.markers.set(v.id, marker);
      }
      marker.el.textContent = symbol;
      const bob = Math.sin(this.time * 4) * 3;
      const screen = Vector3.Project(marker.anchor, Matrix.Identity(), transform, viewport);
      marker.el.style.transform = `translate(${screen.x * toCss}px, ${screen.y * toCss + bob}px) translate(-50%, -100%)`;
    }
  }

  /** Retire les marqueurs HTML (passage au donjon). */
  hideMarkers(): void {
    for (const marker of this.markers.values()) marker.el.remove();
    this.markers.clear();
  }
}
