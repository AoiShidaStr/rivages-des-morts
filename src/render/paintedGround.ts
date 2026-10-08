import {
  Color3,
  DynamicTexture,
  Effect,
  MeshBuilder,
  ShaderMaterial,
  StandardMaterial,
  Texture,
  type Mesh,
  type Scene,
} from '@babylonjs/core';
import { noise } from './noise';

/**
 * Sol peint assemblé par le jeu : des textures peintes qui se répètent (herbe, chemin, sable…), mêlées selon des
 * masques calculés à partir du tracé de la carte, puis peintes une fois pour toutes au chargement dans quelques
 * grandes images. À l'écran, le sol ne coûte qu'une lecture de texture par pixel, comme une image unique ; l'eau
 * est animée par une couche légère posée dessus (`PaintedWater`).
 */

/** Grille de calcul des masques, plus grossière que les images peintes (les masques sont lissés à l'agrandissement). */
export class Grid {
  readonly w: number;
  readonly h: number;

  constructor(
    readonly minX: number,
    readonly maxX: number,
    readonly minZ: number,
    readonly maxZ: number,
    /** Cases par unité du monde. */
    readonly ppu: number,
  ) {
    this.w = Math.round((maxX - minX) * ppu);
    this.h = Math.round((maxZ - minZ) * ppu);
  }

  /** Centre de la case (i, j) ; la ligne 0 est en haut de l'image, au z le plus grand (comme CreateGround). */
  x(i: number): number {
    return this.minX + (i + 0.5) / this.ppu;
  }

  z(j: number): number {
    return this.maxZ - (j + 0.5) / this.ppu;
  }

  layer(): Float32Array {
    return new Float32Array(this.w * this.h);
  }
}

export interface GroundLayer {
  /** Poids de 0 à 1 dans chaque case de la grille. */
  weight: Float32Array;
  /** Image qui se répète, ou à défaut une couleur unie. */
  texture?: HTMLImageElement | HTMLCanvasElement;
  /** Taille d'une répétition, en unités du monde. */
  tile?: number;
  /** Rotation de la texture (radians), pour aligner un motif sur l'écran. */
  rotate?: number;
  color?: string;
  /** Couleur multipliée sur la texture (assombrir, accorder à la palette). */
  tint?: string;
  alpha?: number;
  blend?: GlobalCompositeOperation;
}

export interface GroundShadow {
  x: number;
  z: number;
  /** Demi-axes de l'ellipse, en unités du monde (le long de x et de z). */
  rx: number;
  rz: number;
  alpha: number;
}

export interface GroundPaint {
  grid: Grid;
  /** Couleur de fond de chaque case (r, g, b de 0 à 255), sous toutes les couches : la mer, la brume. */
  base: Uint8ClampedArray;
  layers: GroundLayer[];
  shadows?: GroundShadow[];
  /** Couleur au-delà de la grille (la brume). */
  outside: string;
  /** Pixels des images peintes par unité du monde. */
  ppu: number;
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = url;
  return img.decode().then(() => img);
}

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const el = document.createElement('canvas');
  el.width = w;
  el.height = h;
  const ctx = el.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D indisponible');
  return [el, ctx];
}

/** Image en niveaux de gris d'un masque (blanc : poids 1), à la taille de la grille. */
function maskCanvas(grid: Grid, weight: Float32Array): HTMLCanvasElement {
  const [el, ctx] = canvas(grid.w, grid.h);
  const image = ctx.createImageData(grid.w, grid.h);
  for (let k = 0; k < weight.length; k++) {
    const a = Math.round(Math.min(1, Math.max(0, weight[k])) * 255);
    image.data[k * 4] = 255;
    image.data[k * 4 + 1] = 255;
    image.data[k * 4 + 2] = 255;
    image.data[k * 4 + 3] = a;
  }
  ctx.putImageData(image, 0, 0);
  return el;
}

/** Taille des images peintes : une image par carré, les carrés hors champ ne sont pas dessinés. */
const CHUNK_PIXELS = 1024;

export class PaintedGround {
  private constructor(
    private readonly meshes: Mesh[],
    private readonly materials: StandardMaterial[],
  ) {}

  static build(scene: Scene, name: string, paint: GroundPaint): PaintedGround {
    const { grid, ppu } = paint;
    const chunkSize = CHUNK_PIXELS / ppu;
    const cols = Math.ceil((grid.maxX - grid.minX) / chunkSize);
    const rows = Math.ceil((grid.maxZ - grid.minZ) / chunkSize);

    // Fond et masques, à la taille de la grille : agrandis (et lissés) au moment de peindre chaque carré.
    const [baseEl, baseCtx] = canvas(grid.w, grid.h);
    const baseImage = baseCtx.createImageData(grid.w, grid.h);
    for (let k = 0; k < grid.w * grid.h; k++) {
      baseImage.data.set(paint.base.subarray(k * 3, k * 3 + 3), k * 4);
      baseImage.data[k * 4 + 3] = 255;
    }
    baseCtx.putImageData(baseImage, 0, 0);
    const masks = paint.layers.map((layer) => maskCanvas(grid, layer.weight));
    const [layerEl, layerCtx] = canvas(CHUNK_PIXELS, CHUNK_PIXELS);

    const meshes: Mesh[] = [];
    const materials: StandardMaterial[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x0 = grid.minX + col * chunkSize;
        const z1 = grid.maxZ - row * chunkSize;
        const [el, ctx] = canvas(CHUNK_PIXELS, CHUNK_PIXELS);
        ctx.imageSmoothingQuality = 'high';
        // Partie de la grille couverte par ce carré.
        const sx = (x0 - grid.minX) * grid.ppu;
        const sy = (grid.maxZ - z1) * grid.ppu;
        const sw = chunkSize * grid.ppu;
        // Le dernier carré dépasse la grille : ce qui est au-delà prend la couleur du fond le plus proche du bord.
        ctx.fillStyle = paint.outside;
        ctx.fillRect(0, 0, CHUNK_PIXELS, CHUNK_PIXELS);
        ctx.drawImage(baseEl, sx, sy, sw, sw, 0, 0, CHUNK_PIXELS, CHUNK_PIXELS);

        paint.layers.forEach((layer, k) => {
          layerCtx.globalCompositeOperation = 'source-over';
          layerCtx.globalAlpha = 1;
          layerCtx.clearRect(0, 0, CHUNK_PIXELS, CHUNK_PIXELS);
          if (layer.texture) {
            const pattern = layerCtx.createPattern(layer.texture, 'repeat');
            if (!pattern) return;
            // Motif accroché au monde : il se raccorde d'un carré à l'autre.
            const scale = ((layer.tile ?? 4) * ppu) / layer.texture.width;
            pattern.setTransform(
              new DOMMatrix()
                .translate(-x0 * ppu, z1 * ppu)
                .rotate(((layer.rotate ?? 0) * 180) / Math.PI)
                .scale(scale),
            );
            layerCtx.fillStyle = pattern;
          } else {
            layerCtx.fillStyle = layer.color ?? '#000';
          }
          layerCtx.fillRect(0, 0, CHUNK_PIXELS, CHUNK_PIXELS);
          if (layer.tint) {
            layerCtx.globalCompositeOperation = 'multiply';
            layerCtx.fillStyle = layer.tint;
            layerCtx.fillRect(0, 0, CHUNK_PIXELS, CHUNK_PIXELS);
          }
          layerCtx.globalCompositeOperation = 'destination-in';
          layerCtx.drawImage(masks[k], sx, sy, sw, sw, 0, 0, CHUNK_PIXELS, CHUNK_PIXELS);
          ctx.globalCompositeOperation = layer.blend ?? 'source-over';
          ctx.globalAlpha = layer.alpha ?? 1;
          ctx.drawImage(layerEl, 0, 0);
        });

        // Ombres douces des décors posés au sol.
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = 1;
        for (const s of paint.shadows ?? []) {
          const cx = (s.x - x0) * ppu;
          const cy = (z1 - s.z) * ppu;
          const rx = s.rx * ppu;
          const ry = s.rz * ppu;
          if (cx + rx < 0 || cy + ry < 0 || cx - rx > CHUNK_PIXELS || cy - ry > CHUNK_PIXELS) continue;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(1, ry / rx);
          const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
          gradient.addColorStop(0, `rgba(40, 50, 60, ${s.alpha})`);
          gradient.addColorStop(0.55, `rgba(40, 50, 60, ${s.alpha * 0.6})`);
          gradient.addColorStop(1, 'rgba(40, 50, 60, 0)');
          ctx.fillStyle = gradient;
          ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
          ctx.restore();
        }

        const texture = new DynamicTexture(`${name}-${col}-${row}`, el, scene, true, Texture.TRILINEAR_SAMPLINGMODE);
        texture.wrapU = Texture.CLAMP_ADDRESSMODE;
        texture.wrapV = Texture.CLAMP_ADDRESSMODE;
        texture.hasAlpha = false;
        texture.update();
        const mesh = MeshBuilder.CreateGround(`${name}-${col}-${row}`, { width: chunkSize, height: chunkSize }, scene);
        mesh.position.set(x0 + chunkSize / 2, 0, z1 - chunkSize / 2);
        mesh.isPickable = false;
        mesh.freezeWorldMatrix();
        const material = new StandardMaterial(`${name}-${col}-${row}`, scene);
        material.diffuseTexture = texture;
        material.disableLighting = true;
        material.emissiveColor = Color3.White();
        material.specularColor = Color3.Black();
        material.freeze();
        mesh.material = material;
        meshes.push(mesh);
        materials.push(material);
      }
    }
    return new PaintedGround(meshes, materials);
  }

  dispose(): void {
    for (const mesh of this.meshes) mesh.dispose();
    for (const material of this.materials) material.dispose(true, true);
  }
}

// --- Eau animée -------------------------------------------------------------

function registerWaterShader(): void {
  if (Effect.ShadersStore.paintedWaterVertexShader) return;
  Effect.ShadersStore.paintedWaterVertexShader = `
    precision highp float;
    attribute vec3 position;
    attribute vec2 uv;
    uniform mat4 world;
    uniform mat4 viewProjection;
    varying vec2 vUV;
    varying vec2 vPos;
    void main(void) {
      vec4 p = world * vec4(position, 1.0);
      vUV = uv;
      vPos = p.xz;
      gl_Position = viewProjection * p;
    }`;
  // Deux bruits qui glissent en sens contraires : là où ils se croisent, de fins reflets qui ondulent ; là où ils
  // montent ensemble, une houle un peu plus sombre.
  Effect.ShadersStore.paintedWaterFragmentShader = `
    precision highp float;
    varying vec2 vUV;
    varying vec2 vPos;
    uniform sampler2D mask;
    uniform sampler2D ripples;
    uniform float time;
    uniform vec3 glint;
    uniform vec3 shade;
    void main(void) {
      float m = texture2D(mask, vUV).a;
      if (m < 0.02) discard;
      vec2 p = vPos * 0.07;
      float a = texture2D(ripples, p + vec2(time * 0.016, time * 0.010)).r;
      float b = texture2D(ripples, p * 1.33 + vec2(0.37 - time * 0.012, 0.11 + time * 0.015)).r;
      float line = (1.0 - smoothstep(0.0, 0.03, abs(a - b))) * smoothstep(0.35, 0.6, a);
      float swell = smoothstep(0.55, 0.8, (a + b) * 0.5);
      float lit = 0.16 * line;
      float dark = 0.12 * swell * (1.0 - line);
      float alpha = m * (lit + dark);
      gl_FragColor = vec4((glint * lit + shade * dark) / max(lit + dark, 0.001), alpha);
    }`;
}

/** Bruit lisse qui se répète sans couture, pour les reflets de l'eau. */
function rippleCanvas(size: number): HTMLCanvasElement {
  const [el, ctx] = canvas(size, size);
  const image = ctx.createImageData(size, size);
  const period = 8;
  // Bruit de valeur périodique : les coins de la grille se répètent tous les `period` carreaux.
  const wrapped = (x: number, y: number) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const h = (i: number, j: number) => noise(((i % period) + period) % period * 7.13, ((j % period) + period) % period * 3.71);
    const u = fx * fx * (3 - 2 * fx);
    const v = fy * fy * (3 - 2 * fy);
    const a = h(ix, iy);
    const b = h(ix + 1, iy);
    const c = h(ix, iy + 1);
    const d = h(ix + 1, iy + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const fx = (x / size) * period;
      const fy = (y / size) * period;
      const n = (wrapped(fx, fy) * 2 + wrapped(fx * 2, fy * 2)) / 3;
      const k = (y * size + x) * 4;
      image.data[k] = image.data[k + 1] = image.data[k + 2] = Math.round(n * 255);
      image.data[k + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return el;
}

export class PaintedWater {
  private readonly mesh: Mesh;
  private readonly material: ShaderMaterial;
  private readonly textures: DynamicTexture[];
  private time = 0;

  /** `weight` : présence de l'eau (0 à 1) dans chaque case de la grille ; les reflets s'y dessinent. */
  constructor(scene: Scene, name: string, grid: Grid, weight: Float32Array, glint = new Color3(0.9, 0.96, 1), shade = new Color3(0.1, 0.18, 0.24)) {
    registerWaterShader();
    const mask = new DynamicTexture(`${name}-mask`, maskCanvas(grid, weight), scene, false, Texture.BILINEAR_SAMPLINGMODE);
    mask.wrapU = Texture.CLAMP_ADDRESSMODE;
    mask.wrapV = Texture.CLAMP_ADDRESSMODE;
    mask.update();
    const ripples = new DynamicTexture(`${name}-ripples`, rippleCanvas(128), scene, true, Texture.TRILINEAR_SAMPLINGMODE);
    ripples.wrapU = Texture.WRAP_ADDRESSMODE;
    ripples.wrapV = Texture.WRAP_ADDRESSMODE;
    ripples.update();
    this.textures = [mask, ripples];

    this.mesh = MeshBuilder.CreateGround(name, { width: grid.maxX - grid.minX, height: grid.maxZ - grid.minZ }, scene);
    this.mesh.position.set((grid.minX + grid.maxX) / 2, 0.004, (grid.minZ + grid.maxZ) / 2);
    this.mesh.isPickable = false;
    this.mesh.freezeWorldMatrix();
    // Dessinée avant les ombres et les personnages.
    this.mesh.alphaIndex = -200_000;
    this.material = new ShaderMaterial(name, scene, { vertex: 'paintedWater', fragment: 'paintedWater' }, {
      attributes: ['position', 'uv'],
      uniforms: ['world', 'viewProjection', 'time', 'glint', 'shade'],
      samplers: ['mask', 'ripples'],
      needAlphaBlending: true,
    });
    this.material.setTexture('mask', mask);
    this.material.setTexture('ripples', ripples);
    this.material.setFloat('time', 0);
    this.material.setColor3('glint', glint);
    this.material.setColor3('shade', shade);
    this.material.disableDepthWrite = true;
    this.material.checkReadyOnlyOnce = true;
    this.mesh.material = this.material;
  }

  update(dt: number): void {
    this.time += dt;
    this.material.setFloat('time', this.time);
  }

  dispose(): void {
    this.mesh.dispose();
    this.material.dispose();
    for (const texture of this.textures) texture.dispose();
  }
}
