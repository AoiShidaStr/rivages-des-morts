import './style.css';
import dungeon from './data/dungeon.json';
import enemies from './data/enemies.json';
import player from './data/player.json';
import sprites from './data/sprites.json';
import type { GameConfig } from './game/config';
import { add, length, normalize, scale } from './game/math';
import type { InputFrame } from './game/types';
import { World } from './game/world';
import { Input } from './input';
import { Hud } from './render/hud';
import { Renderer, type SpriteManifest } from './render/renderer';

/** La simulation avance par pas fixes, quelle que soit la fréquence de l'écran. */
const STEP = 1 / 60;
const MAX_STEPS_PER_FRAME = 5;

const config: GameConfig = {
  arenaHalfSize: dungeon.arenaHalfSize,
  stumpRadius: dungeon.stumpRadius,
  webs: dungeon.webs,
  player,
  enemies,
  waves: dungeon.waves as GameConfig['waves'],
};

/** `?vague=7` commence directement à la septième vague (le boss), pour tester sans refaire tout le donjon. */
const startWave = Math.max(0, Number(new URLSearchParams(location.search).get('vague') ?? 1) - 1) || 0;

/** `?pixel=0` revient aux images peintes, pour comparer avec les planches en pixel art. */
function spriteManifest(): SpriteManifest {
  const manifest = sprites as SpriteManifest;
  if (new URLSearchParams(location.search).get('pixel') !== '0') return manifest;
  return Object.fromEntries(Object.entries(manifest).map(([name, def]) => [name, { ...def, sheet: undefined }]));
}

function element<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Élément #${id} introuvable dans index.html`);
  return el as T;
}

async function start(): Promise<void> {
  const canvas = element<HTMLCanvasElement>('game');
  const renderer = new Renderer(canvas, element('overlay'), spriteManifest(), config.arenaHalfSize);
  await renderer.load();
  const input = new Input(canvas);
  const hud = new Hud(element('hud'));
  let world = new World(config, startWave);

  const readInput = (): InputFrame => {
    const { forward, right } = renderer.groundBasis();
    const axis = input.moveAxis();
    let move = add(scale(right, axis.x), scale(forward, axis.y));
    if (length(move) > 1) move = normalize(move);
    const aim = renderer.pickGround(input.pointer.x, input.pointer.y) ?? add(world.player.pos, world.player.facing);
    return {
      move,
      aim,
      attackPressed: input.consumeClick(0),
      attackHeld: input.isButtonDown(0),
      blockHeld: input.isButtonDown(2),
      dodgePressed: input.consumeKey('Space'),
      smashPressed: input.consumeKey('KeyQ'), // touche A en AZERTY
    };
  };

  let last = performance.now();
  let accumulator = 0;
  renderer.engine.runRenderLoop(() => {
    const now = performance.now();
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;

    if (input.consumeKey('Enter') && world.state !== 'playing') {
      world = new World(config, startWave);
      renderer.reset();
      hud.reset();
    }

    accumulator += dt;
    let steps = 0;
    while (accumulator >= STEP && steps < MAX_STEPS_PER_FRAME) {
      world.update(STEP, readInput());
      accumulator -= STEP;
      steps++;
    }
    if (steps === MAX_STEPS_PER_FRAME) accumulator = 0;
    if (steps > 0) input.flush();

    const events = world.drainEvents();
    renderer.sync(world, events, dt);
    hud.update(world, events, dt);
    renderer.render();
  });

  // Accès à la partie depuis la console du navigateur, en développement seulement.
  if (import.meta.env.DEV) Object.assign(window, { rdm: { get world() { return world; } } });
}

start().catch((error: unknown) => {
  console.error(error);
  element('overlay').textContent = `Le jeu n'a pas pu démarrer : ${error instanceof Error ? error.message : String(error)}`;
});
