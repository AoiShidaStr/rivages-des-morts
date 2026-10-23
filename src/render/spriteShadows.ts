import { Constants, Effect, Mesh, ShaderMaterial, Vector4, type BaseTexture, type Scene } from '@babylonjs/core';
import { toScreen } from '../game/island';

/**
 * Ombres portées des objets debout sur l'île éclairée (décors, PNJ, héros) : une copie sombre de leur image, couchée
 * sur le sol à l'opposé de la lumière et étirée à la bonne longueur. Une pour le soleil (ou la lune), et une pour
 * chacune des trois lumières proches qui l'éclairent le plus (lanternes, forge, torche) : quatre au plus par objet.
 *
 * La copie reprend le maillage de l'objet : le shader le couche à ses pieds, comme une carte tournée face à la lumière,
 * chaque point avancé de sa hauteur fois la « portée » de la lumière (combien l'ombre avance par unité de hauteur). Une ombre noircit le sol une seule fois par
 * lumière : deux arbres côte à côte ne font pas une ombre plus noire là où leurs ombres du soleil se croisent (un bit
 * du tampon de stencil par lumière).
 */

const POINT_SHADOWS = 3;
/** Une ombre ne s'allonge pas au-delà de trois fois la hauteur de l'objet (soleil rasant, lanterne au ras du sol). */
const MAX_REACH = 3;
/** Le bit de stencil du soleil ; les lumières proches se partagent les sept autres. */
const SUN_BIT = 0x80;
/** Une lumière plus proche que ça est celle que porte l'objet (la lanterne, la torche du héros) : elle ne l'ombre pas. */
const OWN_LIGHT = 0.8;

/** Une lumière proche, dans le repère de la lumière (islandLighting.ts) : `power`, sa force fois sa luminance. */
export interface ShadowLight {
  u: number;
  v: number;
  h: number;
  r: number;
  power: number;
}

/** L'ombre d'un personnage ou d'un objet animé : suivre sa case de planche et son miroir. */
export interface ShadowCaster {
  setFrame(rect: readonly number[]): void;
  setFlip(flip: boolean): void;
  dispose(): void;
}

const VERTEX = `
precision highp float;
attribute vec3 position;
attribute vec2 uv;
attribute vec2 uv2;
uniform mat4 world;
uniform mat4 viewProjection;
// uPorte : en x, y l'avance de l'ombre (u, v) par unité de hauteur, en z son opacité, en w son fondu vers le bout
uniform vec4 uPorte;
varying vec2 vUV;
void main(void) {
  vUV = uv;
  vec4 W = world * vec4(position, 1.0);
  // Le pied de l'objet : l'origine de son maillage, ou (décors réunis) ce que donne uv2.
  vec2 C = (world * vec4(0.0, 0.0, 0.0, 1.0)).xz + uv2;
  // Comme le sprite éclairé : u, v à l'écran (vue à 35,26°).
  float u = dot(W.xz, vec2(0.707107, -0.707107));
  vec2 pied = vec2(dot(C, vec2(0.707107, -0.707107)), dot(C, vec2(0.707107, 0.707107)));
  // L'image est une carte plate : son ombre est celle de la carte tournée face à la lumière, sa largeur en travers
  // de l'ombre, sa hauteur couchée le long de l'ombre.
  float porte = length(uPorte.xy);
  vec2 dir = porte > 0.0001 ? uPorte.xy / porte : vec2(0.0, 1.0);
  vec2 s = pied + vec2(dir.y, -dir.x) * (u - pied.x) + uPorte.xy * (W.y * 1.5);
  gl_Position = viewProjection * vec4((s.x + s.y) * 0.707107, 0.004, (s.y - s.x) * 0.707107, 1.0);
}`;

const FRAGMENT = `
precision highp float;
varying vec2 vUV;
uniform sampler2D textureSampler;
uniform vec4 frameRect;
uniform float flipX;
uniform vec4 uPorte;
void main(void) {
  vec2 uv = frameRect.xy + vec2(mix(vUV.x, 1.0 - vUV.x, flipX), vUV.y) * frameRect.zw;
  if (texture2D(textureSampler, uv).a < 0.5) discard;
  // Un peu plus claire vers le bout, par paliers comme la lumière.
  float fondu = 1.0 - uPorte.w * floor(clamp(vUV.y, 0.0, 0.999) * 4.0) / 4.0;
  gl_FragColor = vec4(0.0, 0.0, 0.02, uPorte.z * fondu);
}`;

function registerShaders(): void {
  if (Effect.ShadersStore.islandShadowVertexShader) return;
  Effect.ShadersStore.islandShadowVertexShader = VERTEX;
  Effect.ShadersStore.islandShadowFragmentShader = FRAGMENT;
}

interface Slot {
  mesh: Mesh;
  material: ShaderMaterial;
  porte: Vector4;
}

interface Caster {
  mesh: Mesh;
  texture: BaseTexture;
  frame: Vector4;
  flip: number;
  materials: ShaderMaterial[];
  sun: Mesh | null;
  slots: Slot[];
  /** Le pied d'un décor, qui ne bouge pas (repère de la lumière). */
  foot: { u: number; v: number; h: number } | null;
}

export class SpriteShadows {
  private readonly casters = new Set<Caster>();
  private readonly statics: { mesh: Mesh; material: ShaderMaterial }[] = [];
  /** Partagée par toutes les ombres du soleil, changée sur place. */
  private readonly sunPorte = new Vector4();

  constructor(
    private readonly scene: Scene,
    private readonly heightAt: (s: { u: number; v: number }) => number,
  ) {
    registerShaders();
  }

  private material(name: string, texture: BaseTexture, porte: Vector4, frame: Vector4, bit: number): ShaderMaterial {
    const material = new ShaderMaterial(
      name,
      this.scene,
      { vertex: 'islandShadow', fragment: 'islandShadow' },
      {
        attributes: ['position', 'uv', 'uv2'],
        uniforms: ['world', 'viewProjection', 'frameRect', 'flipX', 'uPorte'],
        samplers: ['textureSampler'],
        needAlphaBlending: true,
      },
    );
    material.setTexture('textureSampler', texture);
    material.setVector4('frameRect', frame);
    material.setFloat('flipX', 0);
    material.setVector4('uPorte', porte);
    material.backFaceCulling = false;
    material.disableDepthWrite = true;
    material.depthFunction = Constants.ALWAYS;
    setBit(material, bit);
    return material;
  }

  /** Une copie du maillage, dessinée juste après le sol, sous tous les objets. */
  private copy(name: string, source: Mesh, material: ShaderMaterial, parent: Mesh | null): Mesh {
    const mesh = new Mesh(name, this.scene);
    source.geometry?.applyToMesh(mesh);
    mesh.parent = parent;
    mesh.material = material;
    mesh.isPickable = false;
    mesh.alphaIndex = -100_000;
    // Elle déborde de l'objet : la boîte de l'objet ne dit pas si on la voit.
    mesh.alwaysSelectAsActiveMesh = true;
    return mesh;
  }

  /**
   * Les ombres du soleil d'un groupe de décors fixes, réunis en un maillage aux sommets déjà placés dans le monde ; uv2 :
   * le pied (x, z) du décor de chaque sommet.
   */
  addStatic(name: string, merged: Mesh, texture: BaseTexture): void {
    const material = this.material(`${name}-ombre`, texture, this.sunPorte, new Vector4(0, 0, 1, 1), SUN_BIT);
    merged.material = material;
    merged.isPickable = false;
    merged.alphaIndex = -100_000;
    merged.alwaysSelectAsActiveMesh = true;
    merged.freezeWorldMatrix();
    this.statics.push({ mesh: merged, material });
  }

  /**
   * Un objet qui fait des ombres. `sun` : avec la sienne au soleil (sinon, elle est dans un groupe, addStatic) ;
   * `still` : un décor qui ne bouge pas. Les ombres des lumières proches ne se créent qu'à leur première utilité.
   */
  add(mesh: Mesh, texture: BaseTexture, sun: boolean, still: boolean): ShadowCaster {
    const caster: Caster = { mesh, texture, frame: new Vector4(0, 0, 1, 1), flip: 0, materials: [], sun: null, slots: [], foot: null };
    if (still) caster.foot = this.footOf(mesh);
    if (sun) {
      const material = this.material(`${mesh.name}-ombre`, texture, this.sunPorte, caster.frame, SUN_BIT);
      caster.materials.push(material);
      caster.sun = this.copy(`${mesh.name}-ombre`, mesh, material, mesh);
    }
    this.casters.add(caster);
    return {
      setFrame: (rect) => caster.frame.set(rect[0], rect[1], rect[2], rect[3]),
      setFlip: (flip) => {
        caster.flip = flip ? 1 : 0;
        for (const m of caster.materials) m.setFloat('flipX', caster.flip);
      },
      dispose: () => this.remove(caster),
    };
  }

  private footOf(mesh: Mesh): { u: number; v: number; h: number } {
    const s = toScreen({ x: mesh.position.x, z: mesh.position.z });
    const h = this.heightAt(s);
    return { u: s.u, v: s.v - Math.SQRT2 * h, h };
  }

  private remove(caster: Caster): void {
    if (!this.casters.delete(caster)) return;
    caster.sun?.dispose();
    for (const slot of caster.slots) slot.mesh.dispose();
    for (const material of caster.materials) material.dispose();
  }

  /**
   * Une fois par image. `sun` : direction vers le soleil ; `sunAlpha` : combien son ombre assombrit le sol ; `lights` :
   * les lumières proches allumées (au plus seize, dans l'ordre de leurs bits) ; `base` : la lumière au sol sans elles.
   */
  update(sun: readonly number[], sunAlpha: number, lights: readonly ShadowLight[], base: number): void {
    // L'ombre avance de -L.xy / L.z par unité de hauteur, à l'opposé du soleil.
    const z = Math.max(sun[2], 0.05);
    let px = -sun[0] / z;
    let py = -sun[1] / z;
    const reach = Math.hypot(px, py);
    if (reach > MAX_REACH) {
      px *= MAX_REACH / reach;
      py *= MAX_REACH / reach;
    }
    this.sunPorte.set(px, py, sunAlpha, 0.25);

    // Pour chaque objet, les trois lumières proches qui l'éclairent le plus ; `k` : avance de l'ombre par unité de
    // distance (une lumière haute la raccourcit).
    const best: { index: number; dx: number; dy: number; k: number; power: number }[] = [];
    for (const caster of this.casters) {
      const shown = caster.mesh.isVisible && caster.mesh.isEnabled();
      if (caster.sun) caster.sun.isVisible = shown && sunAlpha > 0.01;
      best.length = 0;
      if (shown && lights.length) {
        const foot = caster.foot ?? this.footOf(caster.mesh);
        lights.forEach((light, index) => {
          const dx = foot.u - light.u;
          const dy = foot.v - light.v;
          const dist = Math.hypot(dx, dy);
          if (dist < OWN_LIGHT || dist >= light.r) return;
          const a = 1 - dist / light.r;
          const power = light.power * a * a;
          if (power < 0.02) return;
          const elevation = Math.max(light.h - foot.h, 0.4);
          best.push({ index, dx, dy, k: Math.min(dist / elevation, MAX_REACH) / dist, power });
        });
        best.sort((a, b) => b.power - a.power);
      }
      for (let i = 0; i < POINT_SHADOWS; i++) {
        const pick = best[i];
        let slot = caster.slots[i];
        if (!pick) {
          if (slot) slot.mesh.isVisible = false;
          continue;
        }
        if (!slot) slot = this.slot(caster, i);
        const C = pick.power * 0.65;
        slot.porte.set(pick.dx * pick.k, pick.dy * pick.k, Math.min(0.65, (0.8 * C) / (C + base)), 0.6);
        setBit(slot.material, 1 << pick.index % 7);
        slot.mesh.isVisible = true;
      }
    }
  }

  private slot(caster: Caster, i: number): Slot {
    const porte = new Vector4();
    const name = `${caster.mesh.name}-ombre${i + 1}`;
    const material = this.material(name, caster.texture, porte, caster.frame, 1);
    material.setFloat('flipX', caster.flip);
    caster.materials.push(material);
    const slot = { mesh: this.copy(name, caster.mesh, material, caster.mesh), material, porte };
    caster.slots[i] = slot;
    return slot;
  }

  dispose(): void {
    for (const caster of [...this.casters]) this.remove(caster);
    for (const { mesh, material } of this.statics) {
      mesh.dispose();
      material.dispose();
    }
    this.statics.length = 0;
  }
}

/** Ne noircir que là où cette lumière n'a pas déjà fait d'ombre, et le marquer. */
function setBit(material: ShaderMaterial, bit: number): void {
  const s = material.stencil;
  if (s.enabled && s.funcRef === bit) return;
  s.enabled = true;
  s.func = Constants.NOTEQUAL;
  s.funcRef = bit;
  s.funcMask = bit;
  s.mask = bit;
  s.opStencilFail = Constants.KEEP;
  s.opDepthFail = Constants.KEEP;
  s.opStencilDepthPass = Constants.REPLACE;
}
