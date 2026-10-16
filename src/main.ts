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
import { loadKeyboardLayout } from './keys';
import { loadingDone, loadingFailed, loadingStep } from './loading';
import { openSaves, takeNotice } from './net/account';
import { chooseNetwork } from './net/transport';
import { heroSprite, withHeroSprites } from './render/heroes';
import { Hud } from './render/hud';
import { IslandRenderer } from './render/islandRenderer';
import { Renderer, type SpriteManifest } from './render/renderer';

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
/** `?coop=2` ou `?coop=3` : un ou deux alliés joués par l'ordinateur descendent avec le héros (test de la coop sans réseau). */
const devCoop = Math.max(1, Math.min(3, Number(params.get('coop')) || 1));
/** `?duel` (tests) : un duel contre une ombre jouée par l'ordinateur, dès le chargement ; `?duel=lame` choisit sa classe. */
const devDuel = params.has('duel') ? params.get('duel') ?? '' : null;

/** Renvoie le manifeste des sprites avec les planches d'animation appropriées (planches peintes). */
function spriteManifest(base: SpriteManifest): SpriteManifest {
  return withHeroSprites(base, Object.keys(content.skills.races), Object.keys(content.skills.classes));
}

function element<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Élément #${id} introuvable dans index.html`);
  return el as T;
}

async function start(): Promise<void> {
  loadingStep('Le passeur détache sa barque…', 0.3);
  // Avant toute interface : les touches s'affichent selon le clavier du joueur.
  await loadKeyboardLayout();
  const canvas = element<HTMLCanvasElement>('game');
  const overlay = element('overlay');
  // Sans anticrénelage (MSAA) : sur des images peintes, il ne lisse presque rien, et il coûtait plus de la moitié du
  // temps de la carte graphique sur une puce Intel.
  // La densité de l'écran est gérée par la résolution adaptative (render/resolution.ts), pas par Babylon.
  const engine = new Engine(canvas, false, { stencil: false }, false);
  // Avec le serveur du jeu, les personnages peuvent vivre sur un compte : on les recopie avant de charger le dernier joué.
  const network = chooseNetwork(params);
  const notices: string[] = [];
  const accounts = network === 'serveur';
  loadingStep('Les âmes retrouvent leur nom…', 0.35);
  const { store, account } = await openSaves(accounts, (text) => notices.push(text));
  const notice = takeNotice();
  if (notice) notices.push(notice);
  const progress = Progress.load(catalog, store);
  const island = new Island(content.island, progress);
  const dungeonRenderer = new Renderer(engine, canvas, overlay, spriteManifest(sprites as SpriteManifest), config.arenaHalfSize);
  const islandRenderer = new IslandRenderer(engine, canvas, overlay, spriteManifest(content.islandSprites as SpriteManifest));
  // Seule la planche du héros de la sauvegarde se charge avec le reste ; les autres races et classes, à la demande.
  const hero = heroSprite(progress.state.hero);
  dungeonRenderer.setHero(hero);
  islandRenderer.setHero(hero);
  loadingStep('L’île du Yomi sort de la brume…', 0.45);
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
    devCoop,
    devDuel,
    network,
    account,
    accounts,
    notices,
  });
  app.start();
  loadingDone();

  // Accès à la partie depuis la console du navigateur, en développement seulement.
  if (import.meta.env.DEV) Object.assign(window, { rdm: app.debug() });
  // L'éditeur de carte (editeur.html) a enregistré island.json : le jeu se recharge avec la nouvelle île.
  import.meta.hot?.on('editeur:ile', () => location.reload());
}

start().catch((error: unknown) => {
  console.error(error);
  loadingFailed();
  element('overlay').textContent = `Le jeu n'a pas pu démarrer : ${error instanceof Error ? error.message : String(error)}`;
});
