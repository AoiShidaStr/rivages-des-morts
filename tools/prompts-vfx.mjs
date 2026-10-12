// Prompts Nano Banana 2 des effets du combat (VFX), écrits par `npm run prompts-vfx` dans docs/prompts-vfx/ :
//   00-lisez-moi.md, puis un fichier par classe (01-guerrier.md … 05-sorcier.md) et 06-portail-jorogumo.md.
// Un effet = une planche de 16 images en grille 4 × 4 de cases carrées, dans une image carrée de 2 048 px si
// possible (cases de 512 px), lue de gauche à droite et de haut en bas. Fond noir pur : l'effet est dessiné comme
// de la lumière, et l'import changera le noir en transparence (luminance → alpha).
// Chaque planche porte le nom de l'effet du jeu qu'elle remplace (public/sprites/fx/<nom>.webp), ou un nom neuf
// quand le jeu n'a encore qu'un effet générique. Les prompts sont en anglais : Nano Banana les suit mieux ainsi.

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';

const OUT = new URL('../docs/prompts-vfx/', import.meta.url);

// ---------------------------------------------------------------------------------------------------------------
// Blocs communs

const LOOK =
  'Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, ' +
  'thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size ' +
  '(in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.';

const FIRE_LOOK =
  'Fire is the signature of this class and may be richer than the other effects: thick stylised layered flames (dark red at the edges, then orange, yellow and a white-hot core), ' +
  'bright glowing embers, a warm glow, like the fire mage of a MOBA, but still clean painted shapes, not a photographic fire.';

const BLACK =
  'Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. ' +
  'The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. ' +
  'Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.';

const CLEAN =
  'Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.';

const GRID =
  'Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). ' +
  'The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).';

const FRAMING = (center) =>
  `Every frame is drawn at the same scale with the same ${center} in every cell, so the frames line up perfectly when played. ` +
  'The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. ' +
  'Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.';

const VIEW = {
  // Décalques au sol : le moteur les projette sur le sol, ils doivent être dessinés vus de dessus.
  sol:
    'Seen from DIRECTLY ABOVE (top-down, orthographic view, no perspective): the effect lies flat on the ground, exactly like a decal seen from the sky, ' +
    'because the game engine projects it on the floor of the isometric arena itself. Circles are perfect circles, not ellipses.',
  debout:
    'Seen from the game camera: a slightly raised viewpoint about 35 degrees above the horizon, the effect standing upright and facing the viewer, ' +
    'like an effect that rises from the ground in an isometric action RPG. The base of the effect is at the bottom of the cell (about 90% of the cell height).',
};

const DIRECTION = {
  centre: 'The effect is centered on the hero, who stands at the exact center of the cell (the hero is NOT drawn).',
  droite:
    'The effect is directional: it points or travels toward the RIGHT of the image. The hero (not drawn) stands at the middle of the LEFT edge of the cell; the attack goes to the right.',
  projectile:
    'This is a projectile flying toward the RIGHT of the image: its head is on the right, its trail streams to the left. Keep the head at the same place in every frame (about 65% of the cell width, at mid-height): only the flames, trail and sparks move.',
  vise: 'The effect is centered on the aimed point, at the exact center of the cell.',
};

const TIMING = {
  once:
    'Played once, fast: frames 1 to 2 the effect appears (small, very bright, the anticipation); frames 3 to 6 the burst at its peak (largest, most saturated); ' +
    'frames 7 to 12 it breaks apart into shards, sparks or wisps and loses its color; frames 13 to 16 the last particles fade out; frame 16 is almost empty.',
  loop:
    'A seamless loop: frame 16 leads back to frame 1 without a jump. The effect keeps the same size and position in every frame; only its inner motion changes ' +
    '(rotation, flicker, drifting particles), so it can be played over and over.',
  hold:
    'Played once, then held: frames 1 to 4 the effect builds up; frames 5 to 12 it holds at full strength with small pulses; frames 13 to 16 it bursts and fades out.',
};

/** Couleurs de chaque classe : une seule teinte d'accent, le blanc au cœur (les mêmes que LIGHT dans tools/vfx.mjs). */
const PALETTE = {
  guerrier: 'Palette: white core, warm amber accent (#ffbf5e), deep orange shadows of light (#e0782f). Strength, impact, dust, stone.',
  lame: 'Palette: white core, violet accent (#b796ff), deep indigo light (#6c4fd6). Fast, sharp, silent, shadow and poison.',
  paladin: 'Palette: pure white core, pale gold accent (#ffe28f), deep gold light (#d6a73c). Sacred, solemn, protective light.',
  rodeur: 'Palette: white core, fresh leaf-green accent (#95e28c), deep forest-green light (#3f9a5a). Wind, precision, hunting.',
  sorcier: 'Palette: white-hot core, yellow (#ffe066), orange (#ff9a2e), deep red edges (#e2481c). Onmyoji fire magic.',
  jorogumo: 'Palette: crimson and vermilion (#e2481c), deep blood red (#7a1d0e), a few thin pale silver threads (#d8dde6). This is an enemy: red is reserved for enemy danger.',
};

// ---------------------------------------------------------------------------------------------------------------
// Les effets. `name` : fichier enregistré (et planche du jeu remplacée) ; `view` : sol ou debout ; `dir` : clé de
// DIRECTION ; `timing` : clé de TIMING ; `what` : ce que fait la compétence dans le jeu (en français, pour toi) ;
// `desc` : le dessin (en anglais).

const CLASSES = [
  {
    id: 'guerrier',
    title: 'Guerrier',
    theme: 'The Warrior: a heavy sword and a shield, brute strength, stone and dust.',
    effects: [
      { name: 'light-slash-guerrier-150', title: 'Attaque (coup d\'épée en arc)', what: 'Clic gauche : un coup d\'épée en arc devant le héros.', view: 'sol', dir: 'centre', timing: 'once',
        desc: 'a heavy sword swing: a thick crescent-shaped slash trail sweeping a 150-degree arc in front of the hero (the arc is centered on the right side of the cell, the hero at the center), thick at the head, tapering to a thin tail, a white core along the cutting edge, amber body, small stone chips and dust flung outward at the end' },
      { name: 'voie-garde-guerrier', title: 'Garde parfaite', what: 'Clic droit levé juste avant un coup : blocage parfait.', view: 'debout', dir: 'centre', timing: 'once',
        desc: 'a perfect block: a bright flash where a blow hits the raised shield, a short starburst of white and amber sparks, a half-ring shockwave that bursts outward from the impact point at chest height (center of the cell)' },
      { name: 'voie-fracas-guerrier', title: 'A — Frappe fracassante', what: 'A : gros coup de zone qui étourdit.', view: 'sol', dir: 'centre', timing: 'once',
        desc: 'the sword slammed into the ground: a cracked crater, jagged glowing amber cracks radiating outward, rock fragments thrown out, a ring of dust rolling outward close to the ground' },
      { name: 'voie-bond-guerrier', title: 'E — Bond (atterrissage)', what: 'E : le héros saute sur la zone visée et frappe en retombant.', view: 'sol', dir: 'centre', timing: 'once',
        desc: 'a heavy landing: a round shockwave ring of dust and amber light expanding from the landing point, a few short cracks, small debris bouncing outward' },
      { name: 'aura-state-rage', title: 'R — Frénésie (aura, boucle)', what: 'R : 6 s de coups bien plus rapides ; l\'aura entoure le héros.', view: 'debout', dir: 'centre', timing: 'loop',
        desc: 'a battle-frenzy aura around a standing hero (the hero is not drawn: leave his silhouette empty, about 40% of the cell width and 70% of its height, centered on the bottom): tongues of hot red-orange energy licking upward along the body, small sparks rising, a faint heat ring on the ground. Use deep red (#d9262c) and orange-red (#ff6a4a) instead of amber for this one' },
      { name: 'voie-cri-guerrier', title: 'Voie de la Fureur — Cri de guerre', what: 'F : un cri qui renforce le héros 6 s.', view: 'sol', dir: 'centre', timing: 'once',
        desc: 'a war cry: three concentric rings of jagged energy burst out from the hero one after the other, sharp spikes on the first ring, short radial speed lines, the rings widening and thinning as they fade' },
      { name: 'voie-seisme-guerrier', title: 'Voie du Démuni / du Cratère — Ruée, Vague de bouclier', what: 'F : onde autour du héros qui projette et étourdit.', view: 'sol', dir: 'centre', timing: 'once',
        desc: 'a shield slammed on the ground: the floor splits in a star of glowing amber cracks around the hero, chunks of rock jump out, a low ring of dust races outward to the edge of the cell' },
      { name: 'voie-tourbillon-guerrier', title: 'Voie de la Réplique — Spirale', what: 'F : le héros pivote, bouclier tendu, et fauche tout autour.', view: 'sol', dir: 'centre', timing: 'once',
        desc: 'a spinning sweep: one long thick crescent trail turning a full circle and a half around the hero, widening as it spins, a white edge and amber body, a faint motion veil following it, breaking into shards at the end' },
    ],
  },
  {
    id: 'lame',
    title: 'Lame',
    theme: 'The Blade: two short blades, speed, shadows, poison and critical strikes.',
    effects: [
      { name: 'light-slash-lame-180', title: 'Attaque (double coup de lames)', what: 'Clic gauche : un enchaînement rapide des deux lames.', view: 'sol', dir: 'centre', timing: 'once',
        desc: 'a fast double slash: two thin razor crescent trails crossing a 180-degree arc in front of the hero (arc centered on the right side of the cell), very thin and sharp, white edge and violet body, tiny violet shards' },
      { name: 'voie-fantome-lame', title: 'Clic droit — Frappe fantôme', what: 'Clic droit : le héros disparaît et réapparaît derrière l\'ennemi pour le frapper.', view: 'debout', dir: 'centre', timing: 'once',
        desc: 'a shadow step: a burst of violet shadow wisps and shards where the hero vanishes and reappears, a vertical tear of light that opens and snaps shut, then a quick sharp X-shaped cut flash' },
      { name: 'voie-marque-lame', title: 'A — Marque de mort (boucle)', what: 'A : 5 s, tous les coups sur l\'ennemi marqué sont critiques. Flotte au-dessus de l\'ennemi.', view: 'debout', dir: 'centre', timing: 'loop',
        desc: 'a death mark floating above an enemy: a small sharp violet sigil shaped like a crossed pair of blades inside a thin ring, slowly turning and pulsing, a few drifting violet sparks' },
      { name: 'voie-fumee-lame', title: 'E — Écran de fumée (boucle)', what: 'E : un nuage où le héros disparaît 2,5 s ; les yokai attaquent la fumée.', view: 'sol', dir: 'centre', timing: 'loop',
        desc: 'a round cloud of thick swirling smoke seen from above, painted in dim violet and grey-blue light (never black), slowly rolling and curling on itself, a few faint violet sparks inside' },
      { name: 'voie-nuee-lame', title: 'Nuées toxiques (nuage de poison, boucle)', what: 'Passif : l\'esquive laisse un nuage de poison.', view: 'sol', dir: 'centre', timing: 'loop',
        desc: 'a round cloud of poison seen from above: sickly green mist (#8fd65a with dim dark-green light) with a violet tint at the edges, slowly churning, tiny bubbles and droplets of venom glinting' },
      { name: 'voie-danse-lame', title: 'R — Danse des lames (bond)', what: 'R : le héros bondit d\'ennemi en ennemi en frappant chacun.', view: 'sol', dir: 'droite', timing: 'once',
        desc: 'a lightning-fast dash between two enemies: a long thin straight streak of violet light from the left edge to the right edge of the cell, with afterimage echoes, ending in a sharp cross-shaped cut flash on the right' },
      { name: 'voie-tourbillon-lame', title: 'Voies de l\'Ombre / de la Chair — Déferlante d\'ombres, Cercle de lames', what: 'F : les lames tournent autour du héros et coupent tout.', view: 'sol', dir: 'centre', timing: 'once',
        desc: 'a whirlwind of blades: two thin sharp crescent trails orbiting the hero for a turn and a half while spreading outward, white edges and violet bodies, a thin violet motion veil, ending in a ring of flying shards' },
      { name: 'voie-croc-lame', title: 'Voie de la Saignée — Croc lente', what: 'F : les lames balaient et ralentissent (venin).', view: 'sol', dir: 'centre', timing: 'once',
        desc: 'a venomous sweep: two crescent trails orbiting the hero, their outer edge lined with small sharp fang shapes, green venom droplets flung outward. Use venom green (#8fd65a) with a violet core' },
      { name: 'voie-croix-lame', title: 'Voie du Voile — Frappe rouge', what: 'F : les lames s\'ouvrent en croix.', view: 'sol', dir: 'centre', timing: 'once',
        desc: 'two huge diagonal cuts crossing in an X over the hero, drawn one after the other, then four shorter cuts in a star, a sharp flash at the crossing, shards flying. Use a violet-carmine (#d8649a) with a white core, never orange-red' },
    ],
  },
  {
    id: 'paladin',
    title: 'Paladin',
    theme: 'The Paladin: a war hammer and a large shield, sacred golden light, protection and healing.',
    effects: [
      { name: 'light-slash-paladin-150', title: 'Attaque (coup de marteau)', what: 'Clic gauche : un coup de marteau en arc.', view: 'sol', dir: 'centre', timing: 'once',
        desc: 'a heavy hammer swing: a wide thick crescent trail sweeping a 150-degree arc in front of the hero (arc centered on the right side of the cell), white edge, pale gold body, small golden motes at the end' },
      { name: 'voie-blocage-paladin', title: 'Clic droit — Bouclier levé (coup bloqué)', what: 'Clic droit tenu : chaque coup bloqué fait jaillir la lumière du bouclier.', view: 'debout', dir: 'centre', timing: 'once',
        desc: 'a blow stopped by a holy shield: a flash of white and gold light shaped like a curved shield surface at chest height, a burst of golden sparks and a small hexagonal light pattern rippling across it' },
      { name: 'voie-jugement-paladin', title: 'Jugement (onde sacrée)', what: 'Passif : ferveur pleine, le coup suivant libère une onde sacrée.', view: 'sol', dir: 'centre', timing: 'once',
        desc: 'a sacred shockwave: a perfect golden ring of light racing outward from the hero, with thin rays and a few small floating sacred glyphs on the ring, a white flash at the start' },
      { name: 'aura-loop', title: 'A — Aura de lumière (boucle)', what: 'A : 6 s, une aura suit le héros et soigne les alliés proches.', view: 'sol', dir: 'centre', timing: 'loop',
        desc: 'a healing aura around the hero: a thin bright golden circle on the ground with three bright sparks running along it, a very light golden veil inside, small motes of light rising' },
      { name: 'hammer', title: 'E — Marteau lancé (en vol, boucle)', what: 'E : le marteau part vers la souris et revient.', view: 'sol', dir: 'centre', timing: 'loop',
        desc: 'a spinning thrown war hammer seen from above, glowing with sacred light: the hammer itself painted (steel head, golden runes) turning a full turn over the 16 frames, a circular golden motion blur ring around it. The hammer is the only object allowed here' },
      { name: 'dome-aegis', title: 'R — Égide (dôme)', what: 'R : l\'Égide se pose sur un allié et retire 60 % de ses dégâts.', view: 'debout', dir: 'centre', timing: 'hold',
        desc: 'a protective dome appearing over an ally (not drawn): a translucent half-sphere of golden light built from thin hexagonal panels, forming from the ground up, a bright rim, a sacred sigil glowing on the ground under it' },
      { name: 'voie-cri-paladin', title: 'Voies du Serment / du Chantre — Onde du serment, Chant', what: 'F : un serment ou un chant qui renforce le héros.', view: 'sol', dir: 'centre', timing: 'once',
        desc: 'an oath of light: three thin golden rings expanding one after the other from the hero, twelve thin rays of light between them, a white flash at the center' },
      { name: 'voie-nova-paladin', title: 'Voies du Parjure / de l\'Évêque — Rupture, Jugement d\'armes', what: 'F : une onde sacrée fauche tout autour du héros.', view: 'sol', dir: 'centre', timing: 'once',
        desc: 'a breaking oath: a golden ring expands and cracks into six arcs, while twelve swords of light fall from outside the ring and plant themselves on it, pointing outward, then everything fades' },
    ],
  },
  {
    id: 'rodeur',
    title: 'Rôdeur',
    theme: 'The Ranger: a longbow, arrows, nets, wind and the hunt.',
    effects: [
      { name: 'projectile-rodeur', title: 'Flèche (en vol, boucle)', what: 'Clic gauche : une flèche.', view: 'sol', dir: 'projectile', timing: 'loop',
        desc: 'an arrow in flight seen from above: a thin painted arrow (shaft, small leaf-green fletching, sharp tip) with a very thin green-white wind streak trailing behind it. The arrow is the only object allowed here' },
      { name: 'projectile-rodeur-charge', title: 'Tir chargé (en vol, boucle)', what: 'Clic droit tenu puis relâché : une flèche chargée, plus forte et plus loin.', view: 'sol', dir: 'projectile', timing: 'loop',
        desc: 'a fully charged arrow in flight seen from above: the same arrow wrapped in a spiral of bright green wind, a longer white-green streak, small leaves of light peeling off the trail' },
      { name: 'voie-filet-rodeur', title: 'A — Flèche-filet', what: 'A : un filet s\'ouvre sur l\'ennemi touché et immobilise ceux autour.', view: 'sol', dir: 'vise', timing: 'once',
        desc: 'a hunting net bursting open seen from above: a round web of glowing pale green-white threads unfolding from the center in a fraction of a second, knots shining at the crossings, then the threads tighten' },
      { name: 'voie-chasse-rodeur', title: 'E — Marque du chasseur (boucle)', what: 'E : l\'ennemi marqué prend 30 % de dégâts en plus ; flotte au-dessus de lui.', view: 'debout', dir: 'centre', timing: 'loop',
        desc: 'a hunter\'s mark floating above an enemy: a green crosshair made of four arrowheads pointing to the center inside a thin ring, slowly turning and closing in, pulsing' },
      { name: 'voie-recul-rodeur', title: 'R — Recul', what: 'R : bond en arrière en tirant trois flèches.', view: 'sol', dir: 'droite', timing: 'once',
        desc: 'a backflip escape: a swirl of green wind and leaves at the left where the hero jumps away, and three thin bright arrow streaks fanning out toward the right' },
      { name: 'voie-volee-rodeur', title: 'Voie du Tireur — Volée perçante', what: 'F : six traits en éventail qui traversent tout.', view: 'sol', dir: 'droite', timing: 'once',
        desc: 'a piercing volley: six thin bright streaks fanning out from the left edge toward the right in a narrow fan, a burst of wind at the bow (left), the streaks stretching long and thin' },
      { name: 'voie-cri-rodeur', title: 'Voie de la Cuirasse — Souffle du chasseur', what: 'F : le héros inspire, +40 % de dégâts 6 s.', view: 'sol', dir: 'centre', timing: 'once',
        desc: 'a hunter\'s breath: curved gusts of green wind spiralling outward from the hero, a few leaves of light carried by them, a thin calm ring at the end' },
      { name: 'voie-couloir-rodeur', title: 'Voie de l\'Éclaireur — Le Couloir', what: 'F : un couloir posé au sol cloue les yokai 2 s et accélère les alliés.', view: 'sol', dir: 'vise', timing: 'hold',
        desc: 'a hunting ground trap seen from above: a circle of glowing green threads pinned by four small stakes of light, wind lines running across it, the threads pulsing while it holds' },
      { name: 'voie-argile-rodeur', title: 'Voie de la Vigie — Volée d\'argile', what: 'F : six traits d\'argile en éventail.', view: 'sol', dir: 'droite', timing: 'once',
        desc: 'a volley of clay: six streaks of baked clay light (#d29a62) fanning out from the left edge toward the right, small fragments of clay breaking off, a puff of ochre dust at the bow. Use clay ochre instead of green' },
    ],
  },
  {
    id: 'sorcier',
    title: 'Sorcier',
    theme: 'The Sorcerer: an onmyoji fire mage, paper talismans (ofuda), seals and meteors.',
    fire: true,
    effects: [
      { name: 'brand-fireball', title: 'Boule de feu (en vol, boucle)', what: 'Clic gauche : une salve de trois boules de feu guidées.', view: 'sol', dir: 'projectile', timing: 'loop',
        desc: 'a fireball in flight seen from above: a bright white-hot head, flames whipping backward into a comet tail, embers and a little dark-red smoke at the end of the tail' },
      { name: 'brand-orb', title: 'Voie de l\'Orbe — l\'orbe (en vol, boucle)', what: 'Clic gauche (voie de l\'Orbe) : un seul orbe, lent à revenir, qui efface ce qu\'il touche.', view: 'sol', dir: 'projectile', timing: 'loop',
        desc: 'a small sun in flight seen from above, the sun of Amaterasu: a round dense white-gold sphere with two plasma arcs turning inside, a thin bright ring around it like a sacred mirror, a crown of short flames turning around the sphere, only a very short trail of embers. Round and compact: it must look completely different from a comet-like fireball' },
      { name: 'brand-pop', title: 'Explosion au contact', what: 'La boule de feu éclate au contact.', view: 'debout', dir: 'centre', timing: 'once',
        desc: 'a small fire explosion at chest height: a hot white flash, tongues of flame bursting in all directions, embers flying, a puff of dark-red smoke rising at the end' },
      { name: 'brand-rune', title: 'Clic droit — Sceau (cercle qui se trace)', what: 'Clic droit : un sceau sous la souris explose au bout d\'1 s.', view: 'sol', dir: 'vise', timing: 'hold',
        desc: 'an onmyoji fire seal drawn on the ground: a circle of fire with a five-pointed star (seiman) and small talisman glyphs being traced line by line during frames 1 to 9, then the whole seal pulses brightly during frames 10 to 16' },
      { name: 'brand-pillar', title: 'Sceau — colonne de feu', what: 'L\'explosion du sceau.', view: 'debout', dir: 'centre', timing: 'once',
        desc: 'a pillar of fire erupting from the ground: a column of flames shooting up to the top of the cell, spiralling, then collapsing into embers and smoke' },
      { name: 'brand-ring', title: 'A — Bouclier de flammes (boucle)', what: 'A : un bouclier de feu autour du héros, qui brûle les yokai.', view: 'sol', dir: 'centre', timing: 'loop',
        desc: 'a ring of fire around the hero seen from above: a circle of flame tongues standing all around, turning slowly, a hot white rim, a faint warm glow inside' },
      { name: 'brand-trail', title: 'E — Fuite de feu (traînée)', what: 'E : le héros bondit en laissant une traînée qui brûle.', view: 'sol', dir: 'droite', timing: 'once',
        desc: 'a dash of fire: a long streak of flames from the left edge to the right edge, the flames rising behind the dash, embers scattering' },
      { name: 'brand-embers', title: 'Sol brûlant (boucle)', what: 'La traînée et la Colonne ardente laissent un sol brûlant.', view: 'sol', dir: 'centre', timing: 'loop',
        desc: 'a patch of burning ground seen from above: glowing molten cracks that pulse, small flames licking up here and there, sparks' },
      { name: 'brand-comet', title: 'R — Grand météore (chute)', what: 'R : un météore s\'écrase sous la souris au bout de 2 s.', view: 'debout', dir: 'centre', timing: 'once',
        desc: 'a meteor falling from the sky: a burning rock with a huge flaming tail coming down from the top of the cell to the bottom, slightly diagonal, hitting the ground in the last frames with a white flash' },
      { name: 'brand-scorch', title: 'Grand météore — impact au sol', what: 'L\'impact du météore.', view: 'sol', dir: 'centre', timing: 'once',
        desc: 'a meteor impact seen from above: a white-hot blast, a scorched crater with molten cracks, a ring of fire and smoke rushing outward, embers' },
      { name: 'voie-nova-sorcier', title: 'Voie de l\'Orbe — Déflagration', what: 'F : l\'orbe éclate autour du héros.', view: 'sol', dir: 'centre', timing: 'once',
        desc: 'a fire nova: a crown of flames bursting outward from the hero in a perfect ring, a white-hot flash at the start, embers scattering, the ring fading as it widens' },
      { name: 'voie-colonne-sorcier', title: 'Voie de l\'Embrasement — Colonne ardente', what: 'F : une colonne de feu s\'abat sous la souris, sol brûlant 3 s.', view: 'debout', dir: 'centre', timing: 'once',
        desc: 'a column of fire falling from the sky onto the ground: a thick vertical beam of flame crashing down, a burst of fire spreading at its base, then the column breaks into rising embers' },
      { name: 'voie-lanterne-sorcier', title: 'Voie du Lampion — Lampion', what: 'F : une lanterne posée sous la souris explose au bout d\'1 s.', view: 'debout', dir: 'centre', timing: 'hold',
        desc: 'a paper lantern (chochin) that drops into place, glows brighter and brighter from the inside with fire, swells and shakes, and bursts into flames in the last frames. The lantern itself is painted (pale paper, dark ribs drawn in dim brown light, the kanji 火 on it), the only object allowed here' },
      { name: 'voie-feuillage-sorcier', title: 'Voie de la Dryade — Sceau de vigueur', what: 'F : un cercle de vigueur qui soigne les héros et brûle les yokai.', view: 'sol', dir: 'vise', timing: 'hold',
        desc: 'a circle of vigour seen from above: a vine of jade light tracing a circle, leaves of light sprouting along it, small warm embers mixed with pale green petals rising. Use jade green (#6fcf8e) with a warm orange core for this one' },
    ],
  },
];

const PORTAIL = {
  id: 'jorogumo',
  title: 'Portail de Jorōgumo',
  theme: 'The portal to the lair of Jorogumo, the spider-woman yokai boss, inside a dark torii gate.',
  effects: [
    { name: 'portail-vortex', title: 'Vortex du portail (boucle)', what: 'Le vortex rouge qui tourne au milieu du torii du portail, sur l\'île. Seul le vortex : le torii reste celui de la planche actuelle.', view: 'debout', dir: 'centre', timing: 'loop',
      desc: 'ONLY the swirling vortex that fills the opening of a torii gate (do not draw the gate): an upright oval portal, taller than wide (width about 75% of its height), facing the viewer, ' +
        'a spiral of crimson and blood-red energy turning around a dark glowing heart (deep red light, never black), thin pale silver spider-silk threads caught in the spiral and stretched across it like a web, ' +
        'a few red motes drifting toward the center. The oval fills about 85% of the cell height, centered. It turns one full turn over the 16 frames' },
  ],
  extra: 'Attach the current portal sheet (decor_ile_portail.jpg) as a color and size reference: match the red of its vortex and the shape of the opening of the gate, but draw only the vortex.',
};

// ---------------------------------------------------------------------------------------------------------------
// Écriture

const VIEW_FR = { sol: 'au sol (vu de dessus)', debout: 'debout (vue du jeu)' };
const TIMING_FR = { once: 'jouée une fois', loop: 'boucle', hold: 'monte, tient, éclate' };
const CENTER_EN = { centre: 'center point', droite: 'origin on the left edge', projectile: 'head position', vise: 'center point' };

function prompt(group, fx, first) {
  const lines = [
    `A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). ${group.theme}`,
    `The effect: ${fx.desc}.`,
    GRID,
    TIMING[fx.timing],
    VIEW[fx.view],
    DIRECTION[fx.dir],
    FRAMING(CENTER_EN[fx.dir]),
    PALETTE[group.id],
    LOOK,
    ...(group.fire ? [FIRE_LOOK] : []),
    ...(first ? [] : [`The attached image is another effect of the same class: keep exactly the same art style, colors, level of detail and brightness, but draw the new effect described here.`]),
    ...(group.extra ? [group.extra] : []),
    BLACK,
    CLEAN,
  ];
  return lines.join('\n');
}

function section(group, index) {
  const folder = `vfx-2d/${group.id}`;
  let out = `# ${String(index).padStart(2, '0')} — ${group.title} : effets\n\n`;
  out += `Dans l'ordre : le premier effet sert ensuite de référence de style (à joindre) pour les suivants. Une conversation neuve par prompt.\n\n`;
  group.effects.forEach((fx, i) => {
    const ref = group.effects[0];
    out += `## ${fx.title}\n\n`;
    out += `${fx.what} — ${VIEW_FR[fx.view]}, ${TIMING_FR[fx.timing]}.\n\n`;
    out += `**Joindre :** ${i === 0 ? (group.extra ? '`decor_ile_portail.jpg`' : 'rien') : `\`${folder}/${ref.name}.png\``}. **Enregistrer :** \`${folder}/${fx.name}.png\`\n\n`;
    out += '```text\n' + prompt(group, fx, i === 0) + '\n```\n\n';
  });
  return out;
}

const README = `# Prompts des effets (VFX)

Écrits par \`npm run prompts-vfx\` (tools/prompts-vfx.mjs) : ne pas modifier à la main, changer le générateur.

## Le format

- **Une planche = un effet** : 16 images en grille **4 × 4**, image carrée **2 048 px** si possible (cases de 512 px), lue de gauche à droite puis de haut en bas.
- **Fond noir pur** : l'effet est dessiné comme de la lumière. L'import transformera le noir en transparence : tout ce qui est sombre dans l'effet disparaît, donc ni contour noir ni fumée noire (fumée et ombres en lumière colorée sombre).
- **Au sol ou debout** :
  - au sol (vu de dessus) : les effets posés par terre (arcs d'attaque, ondes, cercles, projectiles) — le moteur les projette lui-même sur le sol en perspective ;
  - debout (vue du jeu, caméra à 35°) : ce qui monte du sol (explosions, colonnes, auras, marques au-dessus des ennemis).
- **Sens** : un effet dirigé part vers la **droite** de l'image (le jeu le tourne vers la souris) ; un projectile a sa tête à droite.
- **Une couleur par classe**, blanc au cœur (les mêmes que les effets actuels) ; le vermillon reste réservé aux ennemis (le portail de Jorōgumo y a droit).
- **Noms** : chaque planche porte le nom de l'effet du jeu qu'elle remplace (\`public/sprites/fx/<nom>.webp\`), ou un nom neuf (\`voie-…\`) quand le jeu n'a encore qu'un effet générique.

## Où ranger

\`~/Pictures/game visual/vfx-2d/<classe>/<nom>.png\` (et \`vfx-2d/jorogumo/portail-vortex.png\`).

## Conseils Gemini

- Une conversation neuve par prompt ; joindre le premier effet de la classe pour garder le même style.
- Si Gemini dessine un personnage, une arme, un sol ou du texte : régénérer en rappelant « only the effect, on pure black ».
- Si les 16 images se ressemblent trop : redemander en insistant sur « every frame clearly different ».

## Fichiers

${CLASSES.map((c, i) => `- \`${String(i + 1).padStart(2, '0')}-${c.id}.md\` : ${c.title} (${c.effects.length} effets)`).join('\n')}
- \`06-portail-jorogumo.md\` : le vortex du portail de Jorōgumo
`;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const write = (name, text) => writeFileSync(new URL(name, OUT), text);
write('00-lisez-moi.md', README);
CLASSES.forEach((group, i) => write(`${String(i + 1).padStart(2, '0')}-${group.id}.md`, section(group, i + 1)));
write('06-portail-jorogumo.md', section(PORTAIL, 6));
const total = CLASSES.reduce((sum, c) => sum + c.effects.length, 0) + PORTAIL.effects.length;
console.log(`${total} prompts dans docs/prompts-vfx/`);
