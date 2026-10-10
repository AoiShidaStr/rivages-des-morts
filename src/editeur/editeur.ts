import islandSpritesJson from '../data/islandSprites.json';
import { insidePolygon, type DecorItem, type IslandData, type Polygon, type ScreenPoint } from '../game/island';
import { autoDecor, decorName, HEIGHTS, MapImage, SIN, solidRadius, WalkField } from '../render/islandDecor';

/**
 * Éditeur de la carte de l'île (editeur.html, avec npm run dev) : on y déplace à la souris les zones de marche, les
 * obstacles, les zones nommées, les bâtiments, les PNJ et les décors, et on enregistre dans src/data/island.json.
 * Les images y sont dessinées à leur taille dans le jeu : ce qu'on voit est ce qu'on aura.
 */

interface SpriteDef {
  file: string | null;
  sheet?: { file: string; height?: number };
  height: number;
}
const MANIFEST = islandSpritesJson as Record<string, SpriteDef>;
const SPRITES = `${import.meta.env.BASE_URL}sprites/`;

type PolyLayer = 'walk' | 'blocks' | 'water' | 'groves';
type Layer = PolyLayer | 'areas' | 'props' | 'npcs' | 'decor' | 'solids';
const LAYERS: Record<Layer, { label: string; color: string }> = {
  walk: { label: 'Zones de marche', color: '#2bff7a' },
  blocks: { label: 'Obstacles (murs)', color: '#ff3b5c' },
  solids: { label: 'Collisions des objets', color: '#ff7b3b' },
  water: { label: 'Rizières et bassin', color: '#3db2ff' },
  groves: { label: 'Bosquets et plages', color: '#ffd93b' },
  areas: { label: 'Zones nommées (biomes)', color: '#ffffff' },
  props: { label: 'Bâtiments', color: '#ffaa33' },
  npcs: { label: 'PNJ et objets', color: '#ff55ee' },
  decor: { label: 'Décors', color: '#a8e05f' },
};
const POLY_NAMES: Record<string, string> = {
  walk: 'Zone de marche',
  blocks: 'Obstacle',
  groves: 'Bosquet',
  beaches: 'Plage',
  paddies: 'Eau des rizières',
  pool: 'Bassin de la cascade',
};

// --- État -------------------------------------------------------------------------

let data: IslandData;
/** Décors posés par le code, montrés tant que island.json n'a pas les siens (`decor`). */
let autoJson = '[]';
let auto: DecorItem[] = [];
let mapImage: HTMLImageElement;
let sampler: MapImage;
let field: WalkField | null = null;
let fieldStale = true;

type Point = { what: 'decor' | 'prop' | 'npc' | 'spawn' | 'exit' | 'area'; ref: ScreenPoint & Record<string, unknown> };
type Poly = { what: 'poly'; poly: Polygon; list: Polygon[] | null; layer: PolyLayer; name: string; vertex: number | null };
type Selection = Point | Poly | null;
let selection: Selection = null;

let undoStack: string[] = [];
let redoStack: string[] = [];
let dirty = false;
let visible: Record<Layer, boolean> = Object.fromEntries(Object.keys(LAYERS).map((k) => [k, true])) as Record<Layer, boolean>;
let opacity = 1;

/** Image à poser (palette) ou zone en cours de tracé. */
let placing: { kind: 'decor' | 'prop'; sprite: string } | null = null;
let tracing: { kind: 'walk' | 'blocks' | 'groves' | 'beaches'; points: Polygon } | null = null;

// Vue : point de l'image = (écran - pan) / zoom.
let zoom = 0.2;
let panX = 0;
let panY = 0;
let hover: ScreenPoint | null = null;

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
const $ = (id: string) => document.getElementById(id) as HTMLElement;

// --- Coordonnées ------------------------------------------------------------------

const W = () => data.map.width;
const H = () => data.map.width / SIN;
/** Pixels de l'image par unité du monde (à l'écran, en largeur comme en hauteur). */
const PX = () => mapImage.naturalWidth / W();
const toImage = (s: ScreenPoint): [number, number] => [(s.u / W() + 0.5) * mapImage.naturalWidth, (0.5 - s.v / H()) * mapImage.naturalHeight];
const fromImage = (x: number, y: number): ScreenPoint => ({ u: (x / mapImage.naturalWidth - 0.5) * W(), v: (0.5 - y / mapImage.naturalHeight) * H() });
const fromScreen = (x: number, y: number) => fromImage((x - panX) / zoom, (y - panY) / zoom);
const toScreenPx = (s: ScreenPoint): [number, number] => {
  const [x, y] = toImage(s);
  return [x * zoom + panX, y * zoom + panY];
};
const round = (n: number) => Math.round(n * 100) / 100;

// --- Images -----------------------------------------------------------------------

/** Une image dessinée debout, comme dans le jeu : sa hauteur dans le monde et ce qui dépasse sous le pied. */
interface Look {
  img: HTMLImageElement;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  /** Hauteur de l'image entière pour une hauteur de sujet de 1. */
  scale: number;
  /** Part de l'image sous le pied. */
  below: number;
  alpha?: Uint8ClampedArray;
}
const looks = new Map<string, Look | null>();
const pending = new Set<string>();

function loadImage(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = url;
  return img.decode().then(() => img);
}

/** L'image d'un décor (`ile/pin-tordu`) ou d'un sprite du manifeste (`@charon`), chargée à la demande. */
function look(key: string): Look | null {
  if (looks.has(key)) return looks.get(key) ?? null;
  if (!pending.has(key)) {
    pending.add(key);
    makeLook(key)
      .catch(() => null)
      .then((l) => {
        looks.set(key, l);
        redraw();
      });
  }
  return null;
}

async function makeLook(key: string): Promise<Look | null> {
  if (!key.startsWith('@')) {
    const img = await loadImage(`${SPRITES}decor/${key}.webp`);
    // Les décors gardent une petite marge sous le pied (decorSprites.ts).
    return { img, sx: 0, sy: 0, sw: img.naturalWidth, sh: img.naturalHeight, scale: 1, below: 0.02 };
  }
  const def = MANIFEST[key.slice(1)];
  if (!def) return null;
  if (def.sheet) {
    try {
      const sheet = await (await fetch(`${SPRITES}${def.sheet.file}`)).json();
      const dir = def.sheet.file.slice(0, def.sheet.file.lastIndexOf('/') + 1);
      const img = await loadImage(`${SPRITES}${dir}${sheet.meta.image}`);
      const f = sheet.frames[0].frame;
      const bodyPx: number | undefined = sheet.meta.bodyHeight;
      const anchor: { y: number } | undefined = sheet.meta.anchor;
      const scale = bodyPx ? f.h / bodyPx : (def.sheet.height ?? def.height) / def.height;
      return { img, sx: f.x, sy: f.y, sw: f.w, sh: f.h, scale, below: bodyPx && anchor ? (f.h - anchor.y) / f.h : 0 };
    } catch {
      // L'image fixe la remplace, comme dans le jeu.
    }
  }
  if (!def.file) return null;
  const img = await loadImage(`${SPRITES}${def.file}`);
  return { img, sx: 0, sy: 0, sw: img.naturalWidth, sh: img.naturalHeight, scale: 1, below: 0 };
}

/** Le pixel (x, y) de l'image est-il opaque ? Pour cliquer sur un arbre et non sur sa boîte. */
function opaqueAt(l: Look, x: number, y: number): boolean {
  if (!l.alpha) {
    const c = document.createElement('canvas');
    c.width = l.sw;
    c.height = l.sh;
    const g = c.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
    g.drawImage(l.img, l.sx, l.sy, l.sw, l.sh, 0, 0, l.sw, l.sh);
    const rgba = g.getImageData(0, 0, l.sw, l.sh).data;
    l.alpha = new Uint8ClampedArray(l.sw * l.sh);
    for (let i = 0; i < l.alpha.length; i++) l.alpha[i] = rgba[i * 4 + 3];
  }
  const i = Math.floor(y) * l.sw + Math.floor(x);
  return x >= 0 && y >= 0 && x < l.sw && y < l.sh && l.alpha[i] > 40;
}

// --- Ce qui se dessine debout -----------------------------------------------------

interface Standing {
  sel: Point;
  key: string | null;
  /** Hauteur du sujet dans le monde. */
  height: number;
  flip: boolean;
  label?: string;
}

const decorList = () => data.decor ?? auto;

function standing(): Standing[] {
  const list: Standing[] = [];
  if (visible.decor) {
    for (const d of decorList()) list.push({ sel: { what: 'decor', ref: d as unknown as Point['ref'] }, key: d.sprite, height: d.height, flip: !!d.flip });
  }
  if (visible.props) {
    for (const p of data.props) {
      list.push({ sel: { what: 'prop', ref: p as unknown as Point['ref'] }, key: `@${p.sprite}`, height: p.height ?? MANIFEST[p.sprite]?.height ?? 2, flip: false, label: p.sprite });
    }
  }
  if (visible.npcs) {
    for (const it of data.interactables) {
      list.push({
        sel: { what: 'npc', ref: it as unknown as Point['ref'] },
        key: it.sprite ? `@${it.sprite}` : null,
        height: MANIFEST[it.sprite ?? '']?.height ?? 1.5,
        flip: false,
        label: it.name,
      });
    }
  }
  // Du plus loin (en haut de l'écran) au plus proche.
  return list.sort((a, b) => b.sel.ref.v - a.sel.ref.v);
}

/** Rectangle de l'image d'un élément debout, en pixels de la carte. */
function spriteRect(s: Standing, l: Look) {
  const [x, y] = toImage(s.sel.ref);
  const h = s.height * l.scale * PX();
  const w = (h * l.sw) / l.sh;
  return { x: x - w / 2, y: y + h * l.below - h, w, h };
}

// --- Dessin -----------------------------------------------------------------------

let frameQueued = false;
function redraw(): void {
  if (frameQueued) return;
  frameQueued = true;
  requestAnimationFrame(() => {
    frameQueued = false;
    draw();
  });
}

function polygons(): Poly[] {
  const out: Poly[] = [];
  const add = (list: Polygon[] | null, poly: Polygon, layer: PolyLayer, name: string) => {
    if (visible[layer]) out.push({ what: 'poly', poly, list, layer, name, vertex: null });
  };
  for (const p of data.scenery.groves) add(data.scenery.groves, p, 'groves', 'groves');
  for (const p of data.scenery.beaches) add(data.scenery.beaches, p, 'groves', 'beaches');
  add(null, data.scenery.paddies, 'water', 'paddies');
  add(null, data.scenery.pool, 'water', 'pool');
  for (const p of data.walk) add(data.walk, p, 'walk', 'walk');
  for (const p of data.blocks) add(data.blocks, p, 'blocks', 'blocks');
  return out;
}

function draw(): void {
  const dpr = window.devicePixelRatio || 1;
  const { clientWidth: cw, clientHeight: ch } = canvas;
  if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#435058';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!data) return;
  // Dans l'espace de l'image.
  ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, dpr * panX, dpr * panY);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(mapImage, 0, 0);
  const line = 1 / zoom;

  for (const p of polygons()) {
    const sel = selection?.what === 'poly' && selection.poly === p.poly;
    pathPolygon(p.poly);
    ctx.fillStyle = hexAlpha(LAYERS[p.layer].color, sel ? 0.32 : 0.16);
    ctx.fill();
    ctx.lineWidth = (sel ? 3 : 1.6) * line;
    ctx.strokeStyle = LAYERS[p.layer].color;
    ctx.stroke();
  }

  if (visible.areas) {
    for (const a of data.areas) {
      const [x, y] = toImage(a);
      ctx.beginPath();
      ctx.ellipse(x, y, a.r * PX(), a.r * PX() * SIN, 0, 0, Math.PI * 2);
      ctx.setLineDash([8 * line, 6 * line]);
      ctx.lineWidth = (isSelected(a) ? 3 : 1.5) * line;
      ctx.strokeStyle = '#fff';
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  if (visible.solids) drawSolids(line);

  // Les images debout, du plus loin au plus proche.
  ctx.globalAlpha = opacity;
  for (const s of standing()) {
    const l = s.key ? look(s.key) : null;
    if (!l) continue;
    const r = spriteRect(s, l);
    if (s.flip) {
      ctx.save();
      ctx.translate(r.x + r.w / 2, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(l.img, l.sx, l.sy, l.sw, l.sh, -r.w / 2, r.y, r.w, r.h);
      ctx.restore();
    } else ctx.drawImage(l.img, l.sx, l.sy, l.sw, l.sh, r.x, r.y, r.w, r.h);
  }
  ctx.globalAlpha = 1;

  // Repères à l'écran (taille constante) : en pixels de l'écran.
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.font = '12px system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  if (visible.npcs) {
    for (const it of data.interactables) {
      marker(it, LAYERS.npcs.color, it.name);
      if (!it.sprite && it.reach) groundCircle(it, it.reach, LAYERS.npcs.color, true);
    }
    marker(data.spawn, '#33ffff', 'Départ');
    marker(data.dungeonExit, '#33ffff', 'Retour de donjon');
  }
  if (visible.props) for (const p of data.props) marker(p, LAYERS.props.color, p.sprite);
  if (visible.areas) {
    for (const a of data.areas) {
      const [x, y] = toScreenPx(a);
      label(a.name, x, y - a.r * PX() * SIN * zoom - 10, '#fff', true);
      handle(x, y, '#fff');
      if (isSelected(a)) {
        const [hx, hy] = toScreenPx({ u: a.u + a.r, v: a.v });
        handle(hx, hy, '#fff');
      }
    }
  }
  const sel = selection;
  if (sel?.what === 'poly') {
    sel.poly.forEach((p, i) => {
      const [x, y] = toScreenPx({ u: p[0], v: p[1] });
      handle(x, y, sel.vertex === i ? '#ffffff' : LAYERS[sel.layer].color, true);
    });
  } else if (sel) {
    const [x, y] = toScreenPx(sel.ref);
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    const s = standing().find((st) => st.sel.ref === sel.ref);
    const l = s?.key ? looks.get(s.key) : null;
    if (s && l) {
      const r = spriteRect(s, l);
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(r.x * zoom + panX, r.y * zoom + panY, r.w * zoom, r.h * zoom);
      ctx.setLineDash([]);
    }
  }
  if (tracing) {
    const color = tracing.kind === 'beaches' ? LAYERS.groves.color : LAYERS[tracing.kind as PolyLayer].color;
    const pts = tracing.points.map(([u, v]) => toScreenPx({ u, v }));
    if (hover) pts.push(toScreenPx(hover));
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.stroke();
    tracing.points.forEach(([u, v], i) => {
      const [x, y] = toScreenPx({ u, v });
      handle(x, y, i === 0 ? '#fff' : color, true);
    });
  }
}

function drawSolids(line: number): void {
  const circle = (s: ScreenPoint, r: number) => {
    const [x, y] = toImage(s);
    ctx.beginPath();
    ctx.ellipse(x, y, r * PX(), r * PX() * SIN, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  };
  ctx.fillStyle = hexAlpha(LAYERS.solids.color, 0.35);
  ctx.strokeStyle = LAYERS.solids.color;
  ctx.lineWidth = 1.5 * line;
  for (const p of data.props) if (p.solid) circle(p, p.solid);
  for (const it of data.interactables) if (it.solid) circle(it, it.solid);
  // Un décor ne bloque que s'il touche une zone de marche (islandDecor.ts, decorSolids).
  const f = walkField();
  for (const d of decorList()) {
    const r = solidRadius(d);
    if (r && (!f || f.at(d) > -r - 0.4)) circle(d, r);
  }
}

function walkField(): WalkField | null {
  if (fieldStale && !dragging) {
    field = new WalkField(data, W(), H());
    fieldStale = false;
  }
  return field;
}

function pathPolygon(poly: Polygon): void {
  ctx.beginPath();
  poly.forEach(([u, v], i) => {
    const [x, y] = toImage({ u, v });
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  });
  ctx.closePath();
}

function groundCircle(s: ScreenPoint, r: number, color: string, dashed: boolean): void {
  const [x, y] = toScreenPx(s);
  ctx.beginPath();
  ctx.ellipse(x, y, r * PX() * zoom, r * PX() * SIN * zoom, 0, 0, Math.PI * 2);
  if (dashed) ctx.setLineDash([4, 4]);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.setLineDash([]);
}

function marker(s: ScreenPoint, color: string, text: string): void {
  const [x, y] = toScreenPx(s);
  ctx.beginPath();
  ctx.moveTo(x, y - 6);
  ctx.lineTo(x + 6, y);
  ctx.lineTo(x, y + 6);
  ctx.lineTo(x - 6, y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#000';
  ctx.stroke();
  if (zoom > 0.12) label(text, x + 9, y, '#fff', false);
}

function label(text: string, x: number, y: number, color: string, centered: boolean): void {
  ctx.textAlign = centered ? 'center' : 'left';
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#000c';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function handle(x: number, y: number, color: string, square = false): void {
  ctx.beginPath();
  if (square) ctx.rect(x - 4.5, y - 4.5, 9, 9);
  else ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#000';
  ctx.stroke();
}

function hexAlpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

const isSelected = (ref: object) => !!selection && selection.what !== 'poly' && selection.ref === ref;

// --- Choisir ce qui est sous la souris ---------------------------------------------

type Hit = { sel: Selection; mode: 'point' | 'vertex' | 'radius' | 'poly' };

function hitTest(x: number, y: number): Hit | null {
  const near = (s: ScreenPoint, d = 8) => {
    const [sx, sy] = toScreenPx(s);
    return Math.hypot(sx - x, sy - y) <= d;
  };
  // 1. Sommets de la zone choisie, poignée du rayon d'une zone nommée.
  if (selection?.what === 'poly') {
    const i = selection.poly.findIndex(([u, v]) => near({ u, v }));
    if (i >= 0) return { sel: { ...selection, vertex: i }, mode: 'vertex' };
  }
  if (selection?.what === 'area') {
    const a = selection.ref as unknown as { u: number; v: number; r: number };
    if (near({ u: a.u + a.r, v: a.v })) return { sel: selection, mode: 'radius' };
  }
  // 2. Repères (PNJ, départ, bâtiments, centres des zones nommées).
  if (visible.npcs) {
    for (const s of [data.spawn, data.dungeonExit]) {
      if (near(s)) return { sel: { what: s === data.spawn ? 'spawn' : 'exit', ref: s as Point['ref'] }, mode: 'point' };
    }
    const it = data.interactables.find((i) => near(i));
    if (it) return { sel: { what: 'npc', ref: it as unknown as Point['ref'] }, mode: 'point' };
  }
  if (visible.props) {
    const p = data.props.find((i) => near(i));
    if (p) return { sel: { what: 'prop', ref: p as unknown as Point['ref'] }, mode: 'point' };
  }
  if (visible.areas) {
    const a = data.areas.find((i) => near(i));
    if (a) return { sel: { what: 'area', ref: a as unknown as Point['ref'] }, mode: 'point' };
  }
  // 3. Images : la plus proche devant, sur un pixel opaque.
  const [ix, iy] = [(x - panX) / zoom, (y - panY) / zoom];
  const list = standing();
  for (let k = list.length - 1; k >= 0; k--) {
    const s = list[k];
    const l = s.key ? looks.get(s.key) : null;
    if (!l) {
      if (near(s.sel.ref)) return { sel: s.sel, mode: 'point' };
      continue;
    }
    const r = spriteRect(s, l);
    if (ix < r.x || iy < r.y || ix > r.x + r.w || iy > r.y + r.h) continue;
    let fx = ((ix - r.x) / r.w) * l.sw;
    if (s.flip) fx = l.sw - fx;
    if (opaqueAt(l, fx, ((iy - r.y) / r.h) * l.sh)) return { sel: s.sel, mode: 'point' };
  }
  // 4. Zones : la choisie (pour la déplacer), sinon la plus petite sous la souris.
  const at = fromScreen(x, y);
  if (selection?.what === 'poly' && insidePolygon(at, selection.poly)) return { sel: { ...selection, vertex: null }, mode: 'poly' };
  const under = polygons()
    .filter((p) => insidePolygon(at, p.poly))
    .sort((a, b) => area(a.poly) - area(b.poly));
  if (under.length) return { sel: under[0], mode: 'poly' };
  return null;
}

function area(poly: Polygon): number {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += (poly[j][0] + poly[i][0]) * (poly[j][1] - poly[i][1]);
  return Math.abs(a / 2);
}

// --- Modifications ---------------------------------------------------------------

/** À appeler juste avant de modifier : mémorise l'état pour Ctrl+Z. */
function beginChange(): void {
  undoStack.push(JSON.stringify(data));
  if (undoStack.length > 200) undoStack.shift();
  redoStack = [];
  setDirty(true);
}

/** Modifier un décor fige les décors automatiques dans island.json : on les retouche un par un. */
function bakeDecor(): void {
  if (!data.decor) data.decor = auto;
}

function restore(json: string): void {
  data = JSON.parse(json);
  auto = JSON.parse(autoJson);
  selection = null;
  fieldStale = true;
  setDirty(true);
  refreshPanels();
  redraw();
}

function undo(): void {
  const prev = undoStack.pop();
  if (!prev) return;
  redoStack.push(JSON.stringify(data));
  restore(prev);
}

function redo(): void {
  const next = redoStack.pop();
  if (!next) return;
  undoStack.push(JSON.stringify(data));
  restore(next);
}

function setDirty(d: boolean): void {
  dirty = d;
  $('save').classList.toggle('dirty', d);
  $('save').textContent = d ? 'Enregistrer •' : 'Enregistré';
}

function message(text: string): void {
  $('message').textContent = text;
}

async function save(): Promise<void> {
  const response = await fetch('/__editeur/ile', { method: 'POST', body: JSON.stringify(data) });
  if (!response.ok) {
    message(`Échec de l'enregistrement : ${await response.text()}`);
    return;
  }
  setDirty(false);
  message('Enregistré dans src/data/island.json');
}

function deleteSelection(): void {
  const s = selection;
  if (!s) return;
  if (s.what === 'poly') {
    if (s.vertex !== null) {
      if (s.poly.length <= 3) return message('Une zone garde au moins 3 sommets.');
      beginChange();
      s.poly.splice(s.vertex, 1);
      selection = { ...s, vertex: null };
    } else {
      if (!s.list) return message("Cette zone ne se supprime pas, elle se retouche (les rizières et le bassin servent aux décors).");
      beginChange();
      s.list.splice(s.list.indexOf(s.poly), 1);
      selection = null;
    }
    fieldStale = true;
  } else if (s.what === 'decor') {
    beginChange();
    bakeDecor();
    data.decor?.splice(data.decor.indexOf(s.ref as unknown as DecorItem), 1);
    selection = null;
  } else if (s.what === 'prop') {
    beginChange();
    data.props.splice(data.props.indexOf(s.ref as unknown as IslandData['props'][number]), 1);
    selection = null;
  } else return message('Les PNJ, objets, zones nommées et le départ se déplacent mais ne se suppriment pas ici.');
  refreshPanels();
  redraw();
}

function duplicateSelection(): void {
  const s = selection;
  if (!s) return;
  beginChange();
  if (s.what === 'poly' && s.list) {
    const copy = s.poly.map(([u, v]) => [round(u + 1.5), round(v - 1.5)] as [number, number]);
    s.list.push(copy);
    selection = { ...s, poly: copy, vertex: null };
    fieldStale = true;
  } else if (s.what === 'decor') {
    bakeDecor();
    const copy = { ...(s.ref as unknown as DecorItem), u: round(s.ref.u + 1), v: round(s.ref.v - 0.6) };
    data.decor?.push(copy);
    selection = { what: 'decor', ref: copy as unknown as Point['ref'] };
  } else if (s.what === 'prop') {
    const copy = { ...(s.ref as unknown as IslandData['props'][number]), u: round(s.ref.u + 2), v: round(s.ref.v - 1) };
    data.props.push(copy);
    selection = { what: 'prop', ref: copy as unknown as Point['ref'] };
  } else {
    undoStack.pop();
    return;
  }
  refreshPanels();
  redraw();
}

function moveSelection(du: number, dv: number): void {
  const s = selection;
  if (!s) return;
  beginChange();
  if (s.what === 'decor') bakeDecor();
  if (s.what === 'poly') {
    const pts = s.vertex !== null ? [s.poly[s.vertex]] : s.poly;
    for (const p of pts) {
      p[0] = round(p[0] + du);
      p[1] = round(p[1] + dv);
    }
    fieldStale = true;
  } else {
    s.ref.u = round(s.ref.u + du);
    s.ref.v = round(s.ref.v + dv);
  }
  refreshPanels();
  redraw();
}

function resizeSelection(factor: number): void {
  const s = selection;
  if (!s || (s.what !== 'decor' && s.what !== 'prop')) return;
  beginChange();
  if (s.what === 'decor') bakeDecor();
  const ref = s.ref as unknown as { height?: number; sprite: string };
  ref.height = round((ref.height ?? MANIFEST[ref.sprite]?.height ?? 1) * factor);
  refreshPanels();
  redraw();
}

function flipSelection(): void {
  if (selection?.what !== 'decor') return;
  beginChange();
  bakeDecor();
  const d = selection.ref as unknown as DecorItem;
  if (d.flip) delete d.flip;
  else d.flip = true;
  redraw();
  refreshPanels();
}

function place(at: ScreenPoint): void {
  if (!placing) return;
  beginChange();
  if (placing.kind === 'decor') {
    bakeDecor();
    const d: DecorItem = { sprite: placing.sprite, u: round(at.u), v: round(at.v), height: HEIGHTS[decorName(placing.sprite)] ?? 1 };
    data.decor?.push(d);
    selection = { what: 'decor', ref: d as unknown as Point['ref'] };
  } else {
    const p = { sprite: placing.sprite, u: round(at.u), v: round(at.v), height: MANIFEST[placing.sprite].height };
    data.props.push(p);
    selection = { what: 'prop', ref: p as unknown as Point['ref'] };
  }
  refreshPanels();
  redraw();
}

function finishTrace(): void {
  if (!tracing) return;
  if (tracing.points.length >= 3) {
    beginChange();
    const list =
      tracing.kind === 'walk' ? data.walk : tracing.kind === 'blocks' ? data.blocks : tracing.kind === 'groves' ? data.scenery.groves : data.scenery.beaches;
    list.push(tracing.points);
    const layer: PolyLayer = tracing.kind === 'beaches' ? 'groves' : tracing.kind;
    selection = { what: 'poly', poly: tracing.points, list, layer, name: tracing.kind, vertex: null };
    fieldStale = true;
  }
  stopTrace();
  refreshPanels();
}

function stopTrace(): void {
  tracing = null;
  document.querySelectorAll('[data-trace]').forEach((b) => b.classList.remove('on'));
  redraw();
}

// --- Souris et clavier -----------------------------------------------------------

let dragging: { mode: Hit['mode'] | 'pan'; startX: number; startY: number; last: ScreenPoint; changed: boolean; panX: number; panY: number } | null = null;
let spaceDown = false;

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

canvas.addEventListener('mousedown', (e) => {
  canvas.focus();
  const x = e.offsetX;
  const y = e.offsetY;
  const at = fromScreen(x, y);
  const pan = () => (dragging = { mode: 'pan', startX: x, startY: y, last: at, changed: false, panX, panY });
  if (e.button !== 0 || spaceDown) return pan();
  if (tracing) {
    const first = tracing.points[0];
    if (first && tracing.points.length >= 3) {
      const [fx, fy] = toScreenPx({ u: first[0], v: first[1] });
      if (Math.hypot(fx - x, fy - y) < 9) return finishTrace();
    }
    tracing.points.push([round(at.u), round(at.v)]);
    return redraw();
  }
  if (placing) return place(at);
  const hit = hitTest(x, y);
  if (!hit) {
    selection = null;
    refreshPanels();
    redraw();
    return pan();
  }
  const already = sameSelection(hit.sel, selection);
  selection = hit.sel;
  refreshPanels();
  redraw();
  // Une zone ne se déplace en entier qu'une fois choisie : un clic dans la grande place ne la bouge pas.
  if (hit.mode === 'poly' && !already) return pan();
  dragging = { mode: hit.mode, startX: x, startY: y, last: at, changed: false, panX, panY };
});

function sameSelection(a: Selection, b: Selection): boolean {
  if (!a || !b) return false;
  if (a.what === 'poly' || b.what === 'poly') return a.what === 'poly' && b.what === 'poly' && a.poly === b.poly;
  return a.ref === b.ref;
}

window.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const at = fromScreen(x, y);
  hover = at;
  showCoords(at);
  if (tracing) redraw();
  if (!dragging) return;
  if (dragging.mode === 'pan') {
    panX = dragging.panX + x - dragging.startX;
    panY = dragging.panY + y - dragging.startY;
    return redraw();
  }
  if (!dragging.changed) {
    if (Math.hypot(x - dragging.startX, y - dragging.startY) < 3) return;
    dragging.changed = true;
    beginChange();
    if (selection?.what === 'decor') bakeDecor();
  }
  const du = at.u - dragging.last.u;
  const dv = at.v - dragging.last.v;
  dragging.last = at;
  const s = selection;
  if (!s) return;
  if (s.what === 'poly') {
    if (dragging.mode === 'vertex' && s.vertex !== null) {
      s.poly[s.vertex][0] = round(at.u);
      s.poly[s.vertex][1] = round(at.v);
    } else {
      for (const p of s.poly) {
        p[0] += du;
        p[1] += dv;
      }
    }
    fieldStale = true;
  } else if (dragging.mode === 'radius') {
    const a = s.ref as unknown as { u: number; v: number; r: number };
    a.r = round(Math.max(1, Math.hypot(at.u - a.u, (at.v - a.v) / SIN)));
  } else {
    s.ref.u = round(at.u);
    s.ref.v = round(at.v);
  }
  redraw();
});

window.addEventListener('mouseup', () => {
  if (!dragging) return;
  const { changed } = dragging;
  if (changed && selection?.what === 'poly') for (const p of selection.poly) [p[0], p[1]] = [round(p[0]), round(p[1])];
  dragging = null;
  if (changed) {
    refreshPanels();
    redraw();
  }
});

canvas.addEventListener('dblclick', (e) => {
  if (tracing) {
    // Le double-clic a posé deux fois le dernier point.
    tracing.points.pop();
    return finishTrace();
  }
  if (selection?.what !== 'poly') return;
  const poly = selection.poly;
  let best = -1;
  let bestD = 10;
  let bestT = 0;
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = toScreenPx({ u: poly[i][0], v: poly[i][1] });
    const [bx, by] = toScreenPx({ u: poly[(i + 1) % poly.length][0], v: poly[(i + 1) % poly.length][1] });
    const t = Math.max(0, Math.min(1, ((e.offsetX - ax) * (bx - ax) + (e.offsetY - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2 || 1)));
    const d = Math.hypot(e.offsetX - (ax + (bx - ax) * t), e.offsetY - (ay + (by - ay) * t));
    if (d < bestD) [best, bestD, bestT] = [i, d, t];
  }
  if (best < 0) return;
  beginChange();
  const [a, b] = [poly[best], poly[(best + 1) % poly.length]];
  poly.splice(best + 1, 0, [round(a[0] + (b[0] - a[0]) * bestT), round(a[1] + (b[1] - a[1]) * bestT)]);
  selection = { ...selection, vertex: best + 1 };
  fieldStale = true;
  refreshPanels();
  redraw();
});

canvas.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * 0.0015);
    const next = Math.min(4, Math.max(0.05, zoom * factor));
    panX = e.offsetX - ((e.offsetX - panX) * next) / zoom;
    panY = e.offsetY - ((e.offsetY - panY) * next) / zoom;
    zoom = next;
    redraw();
  },
  { passive: false },
);

window.addEventListener('keydown', (e) => {
  const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement;
  const ctrl = e.ctrlKey || e.metaKey;
  if (ctrl && e.key.toLowerCase() === 's') {
    e.preventDefault();
    void save();
    return;
  }
  if (typing) return;
  if (ctrl && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (e.shiftKey) redo();
    else undo();
  } else if (ctrl && e.key.toLowerCase() === 'y') {
    e.preventDefault();
    redo();
  } else if (ctrl && e.key.toLowerCase() === 'd') {
    e.preventDefault();
    duplicateSelection();
  } else if (e.key === ' ') {
    spaceDown = true;
    e.preventDefault();
  } else if (e.key === 'Escape') {
    if (tracing) stopTrace();
    else if (placing) setPlacing(null);
    else {
      selection = null;
      refreshPanels();
      redraw();
    }
  } else if (e.key === 'Enter') finishTrace();
  else if (e.key === 'Backspace' && tracing) {
    tracing.points.pop();
    redraw();
  } else if (e.key === 'Delete' || e.key === 'Backspace') deleteSelection();
  else if (e.key.toLowerCase() === 'f') flipSelection();
  else if (e.key === '+' || e.key === '=') resizeSelection(1.08);
  else if (e.key === '-' || e.key === '_') resizeSelection(1 / 1.08);
  else if (e.key.startsWith('Arrow')) {
    e.preventDefault();
    const step = e.shiftKey ? 1 : 0.1;
    const [du, dv] = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key] ?? [0, 0];
    moveSelection(du, dv);
  }
});
window.addEventListener('keyup', (e) => {
  if (e.key === ' ') spaceDown = false;
});
window.addEventListener('resize', redraw);
window.addEventListener('beforeunload', (e) => {
  if (dirty) e.preventDefault();
});

function showCoords(at: ScreenPoint): void {
  const px = (at.u / W() + 0.5) * 1024;
  const py = (0.5 - at.v / H()) * 1024;
  $('coords').textContent = `u ${at.u.toFixed(1)}  v ${at.v.toFixed(1)}   ·   pixel (sur 1024) ${px.toFixed(0)}, ${py.toFixed(0)}   ·   zoom ${Math.round(zoom * 100)} %`;
}

// --- Panneaux --------------------------------------------------------------------

function refreshPanels(): void {
  showSelection();
  showDecorState();
  const decor = decorList().length;
  $('counts').textContent = `${data.walk.length} zones de marche · ${data.blocks.length} obstacles · ${data.props.length} bâtiments · ${decor} décors`;
}

function field_(labelText: string, input: HTMLElement): HTMLElement {
  const row = document.createElement('div');
  row.className = 'field';
  const l = document.createElement('label');
  l.textContent = labelText;
  row.append(l, input);
  return row;
}

/** Champ numérique lié à `obj[key]` ; vide = supprimé (pour les champs facultatifs). */
function numberInput(obj: Record<string, unknown>, key: string, opts: { step?: number; optional?: boolean; bake?: boolean } = {}): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'number';
  input.step = String(opts.step ?? 0.1);
  input.value = obj[key] === undefined ? '' : String(obj[key]);
  input.addEventListener('change', () => {
    beginChange();
    if (opts.bake) bakeDecor();
    if (input.value === '' && opts.optional) delete obj[key];
    else if (input.value !== '') obj[key] = round(Number(input.value));
    fieldStale = true;
    refreshPanels();
    redraw();
  });
  return input;
}

function showSelection(): void {
  const box = $('props');
  box.replaceChildren();
  const s = selection;
  const note = (text: string) => {
    const p = document.createElement('p');
    p.className = 'note';
    p.textContent = text;
    box.append(p);
  };
  const title = (text: string) => {
    const h = document.createElement('div');
    h.style.cssText = 'font-weight:600;margin-bottom:4px';
    h.textContent = text;
    box.append(h);
  };
  if (placing) {
    title(`Poser : ${placing.sprite}`);
    note('Clique sur la carte pour poser cette image, autant de fois que tu veux. Échap pour arrêter.');
  }
  if (tracing) note('Clique les sommets de la nouvelle zone. Entrée pour la fermer, Retour arrière pour enlever le dernier point, Échap pour annuler.');
  if (!s) {
    if (!placing && !tracing) note('Clique sur un élément de la carte.');
    return;
  }
  if (s.what === 'poly') {
    title(POLY_NAMES[s.name] ?? s.name);
    note(`${s.poly.length} sommets. Glisse un sommet carré pour le déplacer, double-clique sur un bord pour en ajouter un, Suppr pour enlever le sommet choisi. Glisse l'intérieur pour déplacer toute la zone.`);
    if (s.layer === 'walk') note('Le héros marche dedans. Prévois au moins 0,7 de large dans les passages (son corps fait 0,35 de rayon).');
    if (s.layer === 'blocks') note('Le héros ne passe pas dedans, même au milieu d\'une zone de marche.');
    if (s.list) {
      const del = document.createElement('button');
      del.className = 'danger';
      del.textContent = 'Supprimer la zone';
      del.onclick = () => {
        selection = { ...s, vertex: null };
        deleteSelection();
      };
      box.append(del);
    }
    return;
  }
  const ref = s.ref as Record<string, unknown>;
  const bake = s.what === 'decor';
  if (s.what === 'decor') {
    title('Décor');
    const select = document.createElement('select');
    for (const name of allDecor) select.add(new Option(name, name, false, name === ref.sprite));
    select.onchange = () => {
      beginChange();
      bakeDecor();
      ref.sprite = select.value;
      redraw();
    };
    box.append(field_('Image', select));
  } else if (s.what === 'prop') {
    title('Bâtiment');
    const select = document.createElement('select');
    for (const name of propSprites()) select.add(new Option(name, name, false, name === ref.sprite));
    select.onchange = () => {
      beginChange();
      ref.sprite = select.value;
      redraw();
    };
    box.append(field_('Image', select));
  } else if (s.what === 'npc') {
    title(String(ref.name));
    note(`Identifiant : ${String(ref.id)}${ref.if ? ' — n\'apparaît que sous condition' : ''}`);
  } else if (s.what === 'area') {
    title('Zone nommée');
    const input = document.createElement('input');
    input.type = 'text';
    input.value = String(ref.name);
    input.onchange = () => {
      beginChange();
      ref.name = input.value;
      redraw();
    };
    box.append(field_('Nom', input));
    note(`Biome « ${String(ref.id)} » : la végétation automatique suit la zone la plus proche.`);
  } else {
    title(s.what === 'spawn' ? 'Départ du héros' : 'Retour de donjon');
  }
  box.append(field_('u (→)', numberInput(ref, 'u', { bake })), field_('v (↑)', numberInput(ref, 'v', { bake })));
  if (s.what === 'decor') {
    box.append(field_('Hauteur', numberInput(ref, 'height', { step: 0.05, bake })));
    const flip = document.createElement('input');
    flip.type = 'checkbox';
    flip.checked = !!ref.flip;
    flip.style.width = 'auto';
    flip.onchange = () => flipSelection();
    box.append(field_('Retourné (F)', flip));
    const r = solidRadius(ref as unknown as DecorItem);
    note(r ? `Bloque le héros dans un rayon de ${r.toFixed(2)} s'il touche une zone de marche.` : 'Se traverse (herbe, fleurs, petites pierres).');
  }
  if (s.what === 'prop') {
    box.append(field_('Hauteur', numberInput(ref, 'height', { step: 0.1, optional: true })));
    box.append(field_('Collision', numberInput(ref, 'solid', { step: 0.1, optional: true })));
    note('Collision : rayon où le héros ne passe pas (vide : aucune).');
  }
  if (s.what === 'npc') {
    box.append(field_('Collision', numberInput(ref, 'solid', { step: 0.05, optional: true })));
    box.append(field_('Portée', numberInput(ref, 'reach', { step: 0.1, optional: true })));
    note('Portée : distance d\'où l\'on peut parler ou interagir (vide : par défaut).');
  }
  if (s.what === 'area') box.append(field_('Rayon', numberInput(ref, 'r')));
  if (s.what === 'decor' || s.what === 'prop') {
    const row = document.createElement('div');
    row.className = 'row';
    const dup = document.createElement('button');
    dup.textContent = 'Dupliquer';
    dup.onclick = duplicateSelection;
    const del = document.createElement('button');
    del.className = 'danger';
    del.textContent = 'Supprimer';
    del.onclick = deleteSelection;
    row.append(dup, del);
    box.append(row);
  }
}

function showDecorState(): void {
  const box = $('decor-state');
  box.replaceChildren();
  const banner = document.createElement('div');
  banner.className = 'banner';
  banner.textContent = data.decor
    ? `${data.decor.length} décors posés à la main, enregistrés dans island.json.`
    : `${auto.length} décors posés automatiquement par le jeu. Dès que tu en modifies un, ils sont tous figés dans island.json et tu peux les retoucher un par un.`;
  box.append(banner);
  const row = document.createElement('div');
  row.className = 'row';
  const regen = document.createElement('button');
  regen.textContent = 'Régénérer automatiquement';
  regen.title = 'Repose tous les décors selon les zones actuelles (remplace les tiens)';
  regen.onclick = () => {
    if (data.decor && !confirm('Remplacer tous les décors par un nouveau placement automatique ?')) return;
    beginChange();
    data.decor = autoDecor({ ...data, decor: undefined }, sampler, new WalkField(data, W(), H()));
    selection = null;
    refreshPanels();
    redraw();
    message(`${data.decor.length} décors reposés automatiquement.`);
  };
  const clear = document.createElement('button');
  clear.className = 'danger';
  clear.textContent = 'Tout effacer';
  clear.title = 'Enlève tous les décors pour repartir de zéro';
  clear.onclick = () => {
    if (!confirm('Enlever tous les décors de l\'île ?')) return;
    beginChange();
    data.decor = [];
    selection = null;
    refreshPanels();
    redraw();
  };
  row.append(regen, clear);
  if (data.decor) {
    const back = document.createElement('button');
    back.textContent = 'Revenir au placement du jeu';
    back.title = 'Retire les décors de island.json : le jeu les repose lui-même à chaque chargement';
    back.onclick = () => {
      beginChange();
      delete data.decor;
      auto = JSON.parse(autoJson);
      selection = null;
      refreshPanels();
      redraw();
    };
    row.append(back);
  }
  box.append(row);
}

// --- Palette et calques ----------------------------------------------------------

let allDecor: string[] = [];
let tab: 'decor' | 'props' = 'decor';
const propSprites = () => Object.keys(MANIFEST).filter((k) => k !== 'heros');

function setPlacing(p: typeof placing): void {
  placing = p;
  if (p) stopTrace();
  canvas.style.cursor = p ? 'copy' : 'crosshair';
  showPalette();
  refreshPanels();
}

function showPalette(): void {
  const box = $('palette');
  box.replaceChildren();
  const query = ($('search') as HTMLInputElement).value.trim().toLowerCase();
  const names = tab === 'decor' ? allDecor : propSprites();
  for (const name of names.filter((n) => n.toLowerCase().includes(query))) {
    const tile = document.createElement('div');
    tile.className = 'tile';
    if (placing?.sprite === name) tile.classList.add('on');
    const img = document.createElement('img');
    img.loading = 'lazy';
    if (tab === 'decor') img.src = `${SPRITES}decor/${name}.webp`;
    else {
      const def = MANIFEST[name];
      if (def.file) img.src = `${SPRITES}${def.file}`;
      else if (def.sheet) img.src = `${SPRITES}${def.sheet.file.replace(/\.json$/, '.webp')}`;
      img.style.objectPosition = 'left';
    }
    const caption = document.createElement('span');
    caption.textContent = tab === 'decor' ? decorName(name) : name;
    tile.append(img, caption);
    tile.title = name;
    tile.onclick = () => setPlacing(placing?.sprite === name ? null : { kind: tab === 'decor' ? 'decor' : 'prop', sprite: name });
    box.append(tile);
  }
}

function showLayers(): void {
  const box = $('layers');
  box.replaceChildren();
  for (const [key, layer] of Object.entries(LAYERS) as [Layer, (typeof LAYERS)[Layer]][]) {
    const row = document.createElement('label');
    row.className = 'layer';
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = visible[key];
    check.onchange = () => {
      visible = { ...visible, [key]: check.checked };
      try {
        localStorage.setItem('editeur-calques', JSON.stringify(visible));
      } catch {
        // Sans stockage, les calques reviennent tous visibles au prochain chargement.
      }
      if (selection && !check.checked) selection = null;
      refreshPanels();
      redraw();
    };
    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.background = layer.color;
    row.append(check, swatch, document.createTextNode(layer.label));
    box.append(row);
  }
}

// --- Démarrage -------------------------------------------------------------------

async function start(): Promise<void> {
  message('Chargement de la carte…');
  try {
    const saved = JSON.parse(localStorage.getItem('editeur-calques') ?? 'null');
    if (saved) visible = { ...visible, ...saved };
  } catch {
    // Calques par défaut.
  }
  const [island, folders] = await Promise.all([
    fetch('/__editeur/ile').then((r) => r.json() as Promise<IslandData>),
    fetch('/__editeur/decors').then((r) => r.json() as Promise<Record<string, string[]>>),
  ]);
  data = island;
  allDecor = Object.entries(folders).flatMap(([folder, names]) => names.map((n) => `${folder}/${n}`));
  const url = `${SPRITES}${data.map.image}`;
  [mapImage, sampler] = await Promise.all([loadImage(url), MapImage.load(url, data.map.width)]);
  auto = data.decor ? [] : autoDecor(data, sampler, new WalkField(data, W(), H()));
  autoJson = JSON.stringify(auto);
  // Toute la carte dans la vue.
  zoom = Math.min(canvas.clientWidth / mapImage.naturalWidth, canvas.clientHeight / mapImage.naturalHeight) * 0.98;
  panX = (canvas.clientWidth - mapImage.naturalWidth * zoom) / 2;
  panY = (canvas.clientHeight - mapImage.naturalHeight * zoom) / 2;
  setDirty(false);
  showLayers();
  showPalette();
  refreshPanels();
  message('');
  redraw();
}

$('save').onclick = () => void save();
$('undo').onclick = undo;
$('redo').onclick = redo;
$('help-button').onclick = () => $('help').classList.toggle('open');
$('help-close').onclick = () => $('help').classList.remove('open');
($('opacity') as HTMLInputElement).oninput = (e) => {
  opacity = Number((e.target as HTMLInputElement).value);
  redraw();
};
$('search').oninput = showPalette;
document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b) => {
  b.onclick = () => {
    tab = b.dataset.tab as typeof tab;
    document.querySelectorAll('[data-tab]').forEach((o) => o.classList.toggle('on', o === b));
    showPalette();
  };
});
document.querySelectorAll<HTMLButtonElement>('[data-trace]').forEach((b) => {
  b.onclick = () => {
    const kind = b.dataset.trace as NonNullable<typeof tracing>['kind'];
    if (tracing?.kind === kind) return stopTrace();
    setPlacing(null);
    tracing = { kind, points: [] };
    selection = null;
    document.querySelectorAll('[data-trace]').forEach((o) => o.classList.toggle('on', o === b));
    refreshPanels();
    redraw();
  };
});
canvas.tabIndex = 0;

start().catch((error) => message(`Erreur : ${error}`));
