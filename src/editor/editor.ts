// Éditeur d'animations du héros en pixel art (npm run dev, puis /editeur.html).
// On choisit une animation, une image, et on déplace à la souris les hanches, les pieds, les mains et la pointe
// de l'arme ; « Enregistrer » réécrit tools/pixel/heros-animations.json (serveur de développement, vite.config.ts).
// Le jeu, ouvert dans un autre onglet, se recharge avec les nouvelles poses.
import itemsJson from '../data/items.json';
import skillsJson from '../data/skills.json';
import source from '../../tools/pixel/heros-animations.json';
import { Canvas } from '../../tools/pixel/canvas.mjs';
import { hero, KIT_IDS, RACE_IDS } from '../../tools/pixel/heros.mjs';
import { h } from '../ui/dom';
import './editor.css';

interface Pose {
  duration?: number;
  lean?: number;
  body?: number[];
  head?: number;
  footF: number[];
  footB: number[];
  hand: number[];
  handB?: number[];
  blade: number;
  smear?: number[];
  draw?: boolean;
  cape?: number;
}
interface Animation {
  duration?: number;
  once?: boolean;
  poses: Pose[];
}
type Data = Record<string, string | Record<string, Animation>>;

const W = 56;
const H = 42;
const ZOOM = 11;
const HANDLE_RADIUS = 9;
/** Longueur du repère de l'arme, en pixels du personnage. */
const BLADE_REACH = 13;

const data = structuredClone(source) as Data;
const groups = Object.keys(data).filter((k) => typeof data[k] === 'object');
const items = itemsJson.items as Record<string, { name: string; slot?: string; tags?: string[] }>;
const WORN = ['arme', 'casque', 'plastron', 'jambieres', 'bottes', 'amulette'];
const SLOT_NAMES: Record<string, string> = { arme: 'Arme', casque: 'Casque', plastron: 'Plastron', jambieres: 'Jambières', bottes: 'Bottes', amulette: 'Amulette' };

const state = {
  race: RACE_IDS[0] as string,
  kit: KIT_IDS[0] as string,
  gear: { arme: skillsJson.classes.guerrier.weapon } as Record<string, string>,
  group: groups[0],
  anim: 'idle',
  frame: 0,
  onion: true,
  playing: true,
  dirty: false,
  /** Poignée tenue à la souris, ou dernière poignée touchée (les flèches du clavier la déplacent d'un pixel). */
  handle: null as string | null,
};

const animations = () => data[state.group] as Record<string, Animation>;
const current = () => animations()[state.anim];
const pose = () => current().poses[state.frame];

// --- Géométrie du pantin (mêmes calculs que tools/pixel/heros.mjs) ----------------------------------

function joints(p: Pose) {
  const hip = [28 + (p.body?.[0] ?? 0), 29 + (p.body?.[1] ?? 0)];
  const neck = [hip[0] + (p.lean ?? 0), hip[1] - 8];
  const shoulderF = [neck[0] + 3, neck[1] + 1];
  const shoulderB = [neck[0] - 3, neck[1] + 1];
  const hand = [shoulderF[0] + p.hand[0], shoulderF[1] + p.hand[1]];
  const rad = (p.blade * Math.PI) / 180;
  return {
    hip,
    shoulderF,
    shoulderB,
    footF: [hip[0] + p.footF[0], hip[1] + p.footF[1]],
    footB: [hip[0] + p.footB[0], hip[1] + p.footB[1]],
    hand,
    handB: p.handB ? [shoulderB[0] + p.handB[0], shoulderB[1] + p.handB[1]] : null,
    tip: [hand[0] + Math.cos(rad) * BLADE_REACH, hand[1] + Math.sin(rad) * BLADE_REACH],
  };
}

const HANDLES: { id: string; color: string; label: string }[] = [
  { id: 'hip', color: '#f3c84a', label: 'hanches' },
  { id: 'footF', color: '#e0554a', label: 'pied avant' },
  { id: 'footB', color: '#8e2c1f', label: 'pied arrière' },
  { id: 'hand', color: '#5fd0e0', label: 'main avant' },
  { id: 'handB', color: '#3f6fbf', label: 'main arrière' },
  { id: 'tip', color: '#ffffff', label: 'arme' },
];

/** Place la poignée `id` au pixel (x, y) du personnage. */
function moveHandle(id: string, x: number, y: number): void {
  const p = pose();
  const j = joints(p);
  const round = (v: number) => Math.round(v);
  if (id === 'hip') p.body = [round(x - 28), round(y - 29)];
  else if (id === 'footF') p.footF = [round(x - j.hip[0]), round(y - j.hip[1])];
  else if (id === 'footB') p.footB = [round(x - j.hip[0]), round(y - j.hip[1])];
  else if (id === 'hand') p.hand = [round(x - j.shoulderF[0]), round(y - j.shoulderF[1])];
  else if (id === 'handB') p.handB = [round(x - j.shoulderB[0]), round(y - j.shoulderB[1])];
  else if (id === 'tip') p.blade = Math.round((Math.atan2(y - j.hand[1], x - j.hand[0]) * 180) / Math.PI / 5) * 5;
  changed();
}

// --- Dessin ------------------------------------------------------------------------------------------

function drawPose(p: Pose): Canvas {
  const character = hero(state.race, state.kit, state.gear);
  const c = new Canvas(W, H);
  character.draw(c, p);
  c.outline(character.outline);
  return c;
}

function toImage(c: Canvas): HTMLCanvasElement {
  const el = document.createElement('canvas');
  el.width = c.width;
  el.height = c.height;
  el.getContext('2d')!.putImageData(new ImageData(c.data, c.width, c.height), 0, 0);
  return el;
}

const scene = h('canvas', { class: 'scene', width: String(W * ZOOM), height: String(H * ZOOM) });
const sceneCtx = scene.getContext('2d')!;

function drawScene(): void {
  const ctx = sceneCtx;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#c3cbcf';
  ctx.fillRect(0, 0, scene.width, scene.height);
  // Grille des pixels, et la ligne du sol sous les pieds au repos.
  ctx.strokeStyle = 'rgba(29, 34, 38, 0.07)';
  for (let x = 0; x <= W; x++) {
    ctx.beginPath();
    ctx.moveTo(x * ZOOM + 0.5, 0);
    ctx.lineTo(x * ZOOM + 0.5, scene.height);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * ZOOM + 0.5);
    ctx.lineTo(scene.width, y * ZOOM + 0.5);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(29, 34, 38, 0.18)';
  ctx.fillRect(0, 40 * ZOOM, scene.width, ZOOM);
  const poses = current().poses;
  if (state.onion && poses.length > 1) {
    ctx.globalAlpha = 0.28;
    ctx.drawImage(toImage(drawPose(poses[(state.frame + poses.length - 1) % poses.length])), 0, 0, scene.width, scene.height);
    ctx.globalAlpha = 1;
  }
  ctx.drawImage(toImage(drawPose(pose())), 0, 0, scene.width, scene.height);

  // Poignées : un rond par articulation qu'on peut tirer, reliées aux épaules et aux hanches.
  const j = joints(pose());
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  const link = (a: number[], b: number[]) => {
    ctx.beginPath();
    ctx.moveTo((a[0] + 0.5) * ZOOM, (a[1] + 0.5) * ZOOM);
    ctx.lineTo((b[0] + 0.5) * ZOOM, (b[1] + 0.5) * ZOOM);
    ctx.stroke();
  };
  link(j.hip, j.footF);
  link(j.hip, j.footB);
  link(j.shoulderF, j.hand);
  if (j.handB) link(j.shoulderB, j.handB);
  link(j.hand, j.tip);
  for (const handle of HANDLES) {
    const at = handlePos(handle.id);
    if (!at) continue;
    ctx.beginPath();
    ctx.arc((at[0] + 0.5) * ZOOM, (at[1] + 0.5) * ZOOM, handle.id === state.handle ? 7 : 5.5, 0, Math.PI * 2);
    ctx.fillStyle = handle.color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#1d2226';
    ctx.stroke();
  }
}

function handlePos(id: string): number[] | null {
  const j = joints(pose());
  return (j as unknown as Record<string, number[] | null>)[id] ?? null;
}

// --- Aperçu animé ------------------------------------------------------------------------------------

const preview = h('canvas', { class: 'preview', width: String(W * 4), height: String(H * 4) });
let previewStart = performance.now();

function drawPreview(now: number): void {
  const anim = current();
  const ctx = preview.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#c3cbcf';
  ctx.fillRect(0, 0, preview.width, preview.height);
  let index = state.frame;
  if (state.playing) {
    const durations = anim.poses.map((p) => (p.duration ?? anim.duration ?? 0.1) * 1000);
    const total = durations.reduce((a, b) => a + b, 0);
    let t = now - previewStart;
    // Une animation qui ne boucle pas marque une pause sur sa dernière image avant de recommencer.
    t = anim.once ? t % (total + 500) : t % total;
    index = anim.poses.length - 1;
    for (let i = 0; i < durations.length; i++) {
      if (t < durations[i]) {
        index = i;
        break;
      }
      t -= durations[i];
    }
  }
  ctx.drawImage(toImage(drawPose(anim.poses[index])), 0, 0, preview.width, preview.height);
  requestAnimationFrame(drawPreview);
}

// --- Interface ---------------------------------------------------------------------------------------

const status = h('span', { class: 'status' });
const sidebar = h('aside', { class: 'anims' });
const frames = h('div', { class: 'frames' });
const fields = h('div', { class: 'fields' });
const toolbar = h('div', { class: 'toolbar' });

function select(label: string, value: string, options: [string, string][], onchange: (v: string) => void): HTMLLabelElement {
  const el = h('select', { onchange: (e) => onchange((e.currentTarget as HTMLSelectElement).value) }, ...options.map(([v, text]) => h('option', { value: v, selected: v === value }, text)));
  return h('label', {}, h('span', {}, label), el);
}

function renderToolbar(): void {
  const gearSelects = WORN.map((slot) => {
    const owned = Object.entries(items).filter(([, def]) => def.slot === slot);
    return select(SLOT_NAMES[slot], state.gear[slot] ?? '', [['', '—'], ...owned.map(([id, def]): [string, string] => [id, def.name])], (v) => {
      if (v) state.gear[slot] = v;
      else delete state.gear[slot];
      refresh();
    });
  });
  toolbar.replaceChildren(
    select('Race', state.race, RACE_IDS.map((id: string): [string, string] => [id, (skillsJson.races as Record<string, { name: string }>)[id]?.name ?? id]), (v) => {
      state.race = v;
      refresh();
    }),
    select('Classe', state.kit, KIT_IDS.map((id: string): [string, string] => [id, (skillsJson.classes as Record<string, { name: string }>)[id]?.name ?? id]), (v) => {
      state.kit = v;
      state.gear.arme = (skillsJson.classes as Record<string, { weapon: string }>)[v]?.weapon ?? state.gear.arme;
      // La classe choisit ses animations : le Rôdeur tire à l'arc, les autres frappent.
      if (v === 'rodeur' && data.ranged) state.group = 'ranged';
      else if (state.group === 'ranged') state.group = 'melee';
      if (!animations()[state.anim]) state.anim = Object.keys(animations())[0];
      state.frame = 0;
      refresh();
    }),
    ...gearSelects,
  );
}

function renderSidebar(): void {
  sidebar.replaceChildren(
    ...groups.map((group) =>
      h(
        'div',
        { class: 'group' },
        h('h3', {}, group === 'melee' ? 'Mêlée' : group === 'ranged' ? 'Arc (Rôdeur)' : `Retouches : ${group}`),
        ...Object.entries(data[group] as Record<string, Animation>).map(([name, anim]) =>
          h(
            'button',
            {
              class: `anim${group === state.group && name === state.anim ? ' selected' : ''}`,
              onclick: () => {
                state.group = group;
                state.anim = name;
                state.frame = 0;
                previewStart = performance.now();
                refresh();
              },
            },
            name,
            h('small', {}, `${anim.poses.length} image${anim.poses.length > 1 ? 's' : ''}${anim.once ? ' · une fois' : ''}`),
          ),
        ),
      ),
    ),
  );
}

function renderFrames(): void {
  const poses = current().poses;
  frames.replaceChildren(
    ...poses.map((p, i) => {
      const thumb = toImage(drawPose(p));
      thumb.className = 'thumb';
      return h(
        'button',
        {
          class: `frame${i === state.frame ? ' selected' : ''}`,
          onclick: () => {
            state.frame = i;
            refresh();
          },
        },
        thumb,
        h('small', {}, String(i + 1)),
      );
    }),
    h(
      'div',
      { class: 'frame-actions' },
      h('button', { title: 'Dupliquer cette image', onclick: () => edit(() => poses.splice(state.frame + 1, 0, structuredClone(pose())), state.frame + 1) }, '+ Dupliquer'),
      h('button', { title: 'Supprimer cette image', disabled: poses.length < 2, onclick: () => edit(() => poses.splice(state.frame, 1), Math.max(0, state.frame - 1)) }, '− Supprimer'),
      h('button', { title: 'Reculer', disabled: state.frame === 0, onclick: () => edit(() => swap(poses, state.frame, state.frame - 1), state.frame - 1) }, '◀'),
      h('button', { title: 'Avancer', disabled: state.frame === poses.length - 1, onclick: () => edit(() => swap(poses, state.frame, state.frame + 1), state.frame + 1) }, '▶'),
    ),
  );
}

function swap<T>(list: T[], a: number, b: number): void {
  [list[a], list[b]] = [list[b], list[a]];
}

function edit(change: () => void, frame: number): void {
  change();
  state.frame = frame;
  changed();
}

function numberField(label: string, value: number | undefined, step: number, onchange: (v: number | undefined) => void, hint = ''): HTMLLabelElement {
  return h(
    'label',
    { title: hint },
    h('span', {}, label),
    h('input', {
      type: 'number',
      step: String(step),
      value: value === undefined ? '' : String(value),
      placeholder: '—',
      onchange: (e) => {
        const raw = (e.currentTarget as HTMLInputElement).value;
        onchange(raw === '' ? undefined : Number(raw));
      },
    }),
  );
}

function renderFields(): void {
  const anim = current();
  const p = pose();
  const set = <K extends keyof Pose>(key: K, v: Pose[K] | undefined) => {
    if (v === undefined) delete p[key];
    else p[key] = v;
    changed();
  };
  fields.replaceChildren(
    h('h3', {}, `${state.anim} · image ${state.frame + 1}`),
    numberField('Durée de l’animation (s)', anim.duration, 0.01, (v) => {
      anim.duration = v;
      changed();
    }),
    numberField('Durée de cette image (s)', p.duration, 0.01, (v) => set('duration', v), 'Vide : la durée de l’animation'),
    h(
      'label',
      { class: 'check' },
      h('input', {
        type: 'checkbox',
        checked: Boolean(anim.once),
        onchange: (e) => {
          if ((e.currentTarget as HTMLInputElement).checked) anim.once = true;
          else delete anim.once;
          changed();
        },
      }),
      'Jouée une fois (coup, esquive)',
    ),
    numberField('Buste penché', p.lean, 1, (v) => set('lean', v), 'Vers l’avant (+) ou l’arrière (−), en pixels'),
    numberField('Tête décalée', p.head, 1, (v) => set('head', v)),
    numberField('Cape au vent', p.cape, 1, (v) => set('cape', v), '0 : tombe droit ; 6 : flotte loin derrière'),
    numberField('Angle de l’arme (°)', p.blade, 5, (v) => set('blade', v ?? 0), '0 = devant, −90 = vers le haut, 90 = vers le bas'),
    numberField('Traînée : départ (°)', p.smear?.[0], 5, (v) => set('smear', v === undefined ? undefined : [v, p.smear?.[1] ?? p.blade])),
    numberField('Traînée : arrivée (°)', p.smear?.[1], 5, (v) => set('smear', v === undefined ? undefined : [p.smear?.[0] ?? p.blade, v])),
    h(
      'label',
      { class: 'check' },
      h('input', { type: 'checkbox', checked: Boolean(p.handB), onchange: (e) => set('handB', (e.currentTarget as HTMLInputElement).checked ? [0, 6] : undefined) }),
      'Main arrière placée à la main',
    ),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: Boolean(p.draw), onchange: (e) => set('draw', (e.currentTarget as HTMLInputElement).checked || undefined) }), 'Arc bandé (Rôdeur)'),
    h('p', { class: 'hint' }, 'Tire les ronds sur le personnage ; les flèches du clavier déplacent d’un pixel le dernier rond touché.'),
    h('div', { class: 'legend' }, ...HANDLES.map((handle) => h('span', {}, h('i', { style: `background:${handle.color}` }), handle.label))),
  );
}

function refresh(): void {
  renderToolbar();
  renderSidebar();
  renderFrames();
  renderFields();
  drawScene();
  status.textContent = state.dirty ? 'Modifications non enregistrées' : '';
}

function changed(): void {
  state.dirty = true;
  renderSidebar();
  renderFrames();
  renderFields();
  drawScene();
  status.textContent = 'Modifications non enregistrées';
}

async function save(): Promise<void> {
  status.textContent = 'Enregistrement…';
  try {
    const response = await fetch('/__editeur/animations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!response.ok) throw new Error(await response.text());
    state.dirty = false;
    status.textContent = 'Enregistré dans tools/pixel/heros-animations.json';
  } catch (error) {
    // Sans le serveur de développement, on copie le fichier dans le presse-papiers.
    await navigator.clipboard.writeText(`${JSON.stringify(data, null, 2)}\n`).catch(() => {});
    status.textContent = `Pas de serveur de développement (${error instanceof Error ? error.message : error}) : le JSON est copié dans le presse-papiers.`;
  }
}

// --- Souris et clavier -------------------------------------------------------------------------------

function pixelAt(e: PointerEvent): [number, number] {
  const rect = scene.getBoundingClientRect();
  return [((e.clientX - rect.left) / rect.width) * W - 0.5, ((e.clientY - rect.top) / rect.height) * H - 0.5];
}

scene.addEventListener('pointerdown', (e) => {
  const [x, y] = pixelAt(e);
  let best: string | null = null;
  let bestDistance = HANDLE_RADIUS / ZOOM + 0.6;
  for (const handle of HANDLES) {
    const at = handlePos(handle.id);
    if (!at) continue;
    const d = Math.hypot(at[0] - x, at[1] - y);
    if (d < bestDistance) {
      best = handle.id;
      bestDistance = d;
    }
  }
  state.handle = best;
  if (best) scene.setPointerCapture(e.pointerId);
  drawScene();
});
scene.addEventListener('pointermove', (e) => {
  if (!state.handle || !scene.hasPointerCapture(e.pointerId)) return;
  const [x, y] = pixelAt(e);
  moveHandle(state.handle, x, y);
});
scene.addEventListener('pointerup', (e) => {
  if (scene.hasPointerCapture(e.pointerId)) scene.releasePointerCapture(e.pointerId);
});
window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
  if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    void save();
    return;
  }
  const step = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
  if (!step || !state.handle) return;
  e.preventDefault();
  const at = handlePos(state.handle);
  if (!at) return;
  if (state.handle === 'tip') {
    pose().blade += (step[0] + step[1]) * 5;
    changed();
  } else {
    moveHandle(state.handle, at[0] + step[0], at[1] + step[1]);
  }
});
window.addEventListener('beforeunload', (e) => {
  if (state.dirty) e.preventDefault();
});

// Le fichier d'animations enregistré ne recharge pas l'éditeur : c'est lui qui en a la dernière version.
if (import.meta.hot) import.meta.hot.accept(['../../tools/pixel/heros-animations.json', '../../tools/pixel/heros.mjs'], () => {});

document.getElementById('editeur')!.append(
  h(
    'header',
    {},
    h('h1', {}, 'Animations du héros'),
    toolbar,
    h(
      'div',
      { class: 'actions' },
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: state.onion, onchange: (e) => ((state.onion = (e.currentTarget as HTMLInputElement).checked), drawScene()) }), 'Image précédente en transparence'),
      h('button', { class: 'primary', onclick: () => void save() }, 'Enregistrer (Ctrl + S)'),
      status,
    ),
  ),
  h(
    'div',
    { class: 'workspace' },
    sidebar,
    h('main', {}, scene, frames),
    h(
      'section',
      {},
      h('div', { class: 'preview-box' }, preview, h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: state.playing, onchange: (e) => ((state.playing = (e.currentTarget as HTMLInputElement).checked), (previewStart = performance.now())) }), 'Lecture')),
      fields,
    ),
  ),
);
refresh();
requestAnimationFrame(drawPreview);
