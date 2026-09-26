import { Engine } from '@babylonjs/core';
import './style.css';
import './ui/ui.css';
import { App } from './app';
import { catalog, content } from './content';
import enemies from './data/enemies.json';
import player from './data/player.json';
import sprites from './data/sprites.json';
import type { GameConfig } from './game/config';
import { Island } from './game/island';
import { Progress } from './game/progress';
import { Input } from './input';
import { Hud } from './render/hud';
import { IslandRenderer } from './render/islandRenderer';
import { Renderer, styleManifest, type SpriteManifest } from './render/renderer';
import { ART_STYLE } from './style';

// L'arène (salles, souches, pêchers) change avec le donjon : celle des Rizières noyées sert de base.
const config: GameConfig = {
  ...content.dungeons.rizieres.arena,
  player: player as GameConfig['player'],
  enemies: enemies as GameConfig['enemies'],
};

/** `?vague=7` lance directement le donjon à la septième vague (le boss), pour tester sans passer par l'île. */
const params = new URLSearchParams(location.search);
const devWave = params.has('vague') ? Math.max(0, Number(params.get('vague')) - 1) || 0 : null;
/** `?vague=1&niveau=40` : même chose, au niveau de donjon 40 ; `&donjon=palais` : dans le Palais d'Izanami. */
const devLevel = params.has('niveau') ? Number(params.get('niveau')) || 1 : null;
const devDungeon = params.get('donjon') ?? 'rizieres';

function element<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Élément #${id} introuvable dans index.html`);
  return el as T;
}

async function start(): Promise<void> {
  const canvas = element<HTMLCanvasElement>('game');
  const overlay = element('overlay');
  const engine = new Engine(canvas, true, { stencil: false }, true);
  const progress = Progress.load(catalog);
  const island = new Island(content.island, progress);
  // Style graphique (src/style.ts) : en pixel art, l'écran est agrandi sans lissage.
  document.documentElement.dataset.style = ART_STYLE;
  const dungeonRenderer = new Renderer(engine, canvas, overlay, styleManifest(sprites as SpriteManifest), config.arenaHalfSize);
  const islandRenderer = new IslandRenderer(engine, canvas, overlay, styleManifest(content.islandSprites));
  await Promise.all([dungeonRenderer.load(), islandRenderer.load(island)]);

  const app = new App({
    engine,
    input: new Input(canvas),
    islandRenderer,
    dungeonRenderer,
    hud: new Hud(element('hud')),
    config,
    progress,
    island,
    uiRoot: element('ui'),
    devWave,
    devLevel,
    devDungeon,
  });
  app.start();

  // Accès à la partie depuis la console du navigateur, en développement seulement.
  if (import.meta.env.DEV) Object.assign(window, { rdm: app.debug() });
}

start().catch((error: unknown) => {
  console.error(error);
  element('overlay').textContent = `Le jeu n'a pas pu démarrer : ${error instanceof Error ? error.message : String(error)}`;
});
