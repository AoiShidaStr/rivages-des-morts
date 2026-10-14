// Prompts Nano Banana 2 de la refonte 2D (voir docs/Charte 2D.md), écrits par `npm run prompts-2d` dans
// docs/prompts-2d/, un fichier par lot, dans l'ordre de travail (voir `LOTS`) :
//   01-izanami.md, 02-yokai-du-palais.md, 03-heros-<classe>.md, 04-yokai-des-rizieres.md, 05-jorogumo.md
//   chacun : la fiche de profil de chaque personnage, puis sa planche complète de profil ;
//   plus-tard/            les fiches et planches de face et de dos, et les fiches des autres races.
// Une planche complète = tout un personnage = 64 images en grille 8 × 8 de cases carrées, une ligne de 8 images
// par animation (ordre des lignes : `HERO_ROWS`, `CREATURE_ROWS`), dans une image carrée de 2 048 px si possible
// (cases de 256 px). Personnages chibi de 3 têtes (voir docs/Charte 2D.md, section 3).
// Les prompts sont en anglais : Nano Banana les suit mieux ainsi.

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';

const OUT = new URL('../docs/prompts-2d/', import.meta.url);

// ---------------------------------------------------------------------------------------------------------------
// Blocs communs

const LOOK =
  'Painted 2D chibi action-RPG sprite style: chibi proportions, soft painted gradients, ' +
  'clothing folds, motifs and accessories drawn clearly but simplified for a small sprite, a crisp dark ink-blue outline (about 2 px when the character is about 200 px tall, thinner on inner details), ' +
  'two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, ' +
  'character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. ' +
  'No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. ' +
  'Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.';

const NOFX =
  'No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, ' +
  'no text, no numbers, no labels, no drawn grid lines, no frame borders.';

const GREY = { name: 'medium grey', hex: '#8f8f8f' };
const MAGENTA = { name: 'pure magenta', hex: '#ff00ff' };
const bgText = (bg) => `Flat uniform ${bg.name} background (${bg.hex}), exactly the same color everywhere, no gradient, no vignette.`;

const PROPORTIONS_HERO =
  'Chibi proportions: the character is exactly 3 heads tall. A large head with big expressive eyes, broad shoulders so that every pose reads clearly, a compact body with short sturdy limbs, ' +
  'and the class weapon drawn oversized (clearly larger than life) so that it stays readable in a small sprite. ' +
  'Same art style and level of detail as our Hanyo complete sheets (attach one of them, for example the Hanyo Lame or Paladin sheet, as a style reference when it is not the character being drawn). ' +
  'Strong readable silhouette from far away.';

const VIEW = {
  profil: {
    label: 'profil',
    fiche: 'three-quarter side view facing right',
    ref: 'the LEFT figure of the attached turnaround (three-quarter side view, facing right)',
  },
  face: {
    label: 'face',
    fiche: 'three-quarter front view, facing the viewer and slightly toward the bottom-right of the image',
    ref: 'the MIDDLE figure of the attached turnaround (three-quarter front view)',
  },
  dos: {
    label: 'dos',
    fiche: 'three-quarter back view, seen from behind, turned slightly toward the upper-right of the image',
    ref: 'the RIGHT figure of the attached turnaround (three-quarter back view)',
  },
};

// ---------------------------------------------------------------------------------------------------------------
// Héros

const RACES = {
  einherjar: {
    name: 'Einherjar',
    text: 'Einherjar (Norse warrior fallen in battle): massive heavy build, very broad shoulders, long braids in the hair and beard, pale skin marked with old scars, a faint blue-grey death pallor around the eyes.',
  },
  oushebti: {
    name: 'Oushebti',
    text: 'Oushebti (animated Egyptian funerary statuette): the whole body is blue-green glazed clay or faience with fine painted cracks and small painted hieroglyphs, stiff statuette-like joints and posture, blank painted eyes with kohl lines, a striped Egyptian headdress.',
  },
  demidieu: {
    name: 'Demi-dieu',
    text: 'Demi-god (Greek): luminous warm golden skin, a thin solid golden ring floating behind the head as a discreet halo (drawn as a flat painted shape, not a glow), laurel details, the sign of the divine parent as a small lightning-bolt emblem on the clothing.',
  },
  hanyo: {
    name: 'Hanyō',
    text: 'Hanyō (human-yokai hybrid): pointed yokai ears and two small horns, bright pale-gold eyes (flat painted irises, no glow), thin facial markings, slightly clawed hands, dark hair.',
  },
};

// La classe est neutre culturellement (GDD) : c'est la race qui l'habille. Une tenue par race × classe.
/** Races dont les héros sont dessinés maintenant : la série du Yomi (tenues japonaises). Les autres races viennent ensuite. */
const PHASE1_RACES = ['hanyo'];

const OUTFITS = {
  einherjar: {
    guerrier: 'viking berserker gear: a mail shirt with iron shoulder plates, a bearskin or wolf-fur mantle, a studded leather belt, iron-banded bracers, fur-trimmed boots, bare head with braids or an open iron helmet',
    sorcier: 'Norse fire-seer robes: a long dark wool robe-dress with ember-red embroidered runes along the hem, a fur-trimmed hooded cloak, iron and amber charms and small rune stones hanging from knotted cords on the belt',
    lame: 'Norse raider skirmisher gear: a fitted dark leather jerkin and trousers with leg wraps, a hooded wolf-grey cloak, a cloth face scarf, leather bracers',
    paladin: 'Norse shield-wall guardian gear: a long pale linen tunic with gold bands and embroidered knotwork, a mail coif, a fur-trimmed cape, gold arm rings',
    rodeur: 'Norse hunter gear: a fur-lined hooded jerkin, leather trousers, fur boots, a wolf pelt over the shoulders, a leather quiver',
  },
  oushebti: {
    guerrier: 'Egyptian heavy warrior gear: a gilded scale cuirass, a striped shendyt kilt, a broad usekh collar, bronze bracers and greaves, a nemes-style helmet',
    sorcier: 'Egyptian fire priest robes: a long pleated linen robe dyed deep red over a white under-robe, a broad gold collar, a sash hung with small brazier-shaped amulets and rolled papyrus talismans, a gold circlet',
    lame: 'Egyptian assassin gear: dark linen wraps and a short dark kilt, a black headcloth, kohl-lined eyes, bronze armbands',
    paladin: 'Egyptian temple guardian gear: a white linen kilt and tunic with gold trim, a broad gold collar, a tall crown-like headdress, gold bracers',
    rodeur: 'Egyptian desert archer gear: a light linen kilt, a sun-bleached headcloth, leather straps and a quiver, bare arms with bronze bands',
  },
  demidieu: {
    guerrier: 'Greek hoplite gear: a bronze muscle cuirass with leather pteruges strips, greaves, a crested Corinthian helmet pushed up on the head, a short dark brown-red cloak',
    sorcier: 'Greek fire priest robes: a pleated chiton in deep red and black with a himation draped over one shoulder, a bronze flame-shaped brooch, a laurel wreath with ember-colored leaves',
    lame: 'Greek skirmisher gear: a short dark chiton with a leather harness, a dark hooded cloak, sandal-boots laced up to the knee',
    paladin: 'Greek temple guardian gear: a white chiton with gold meander-pattern trim, a gold pauldron, a laurel wreath, a gold-embroidered sash',
    rodeur: 'Greek hunter gear: a short tunic with leather straps, laced boots, a pelt over one shoulder, a short cape, a quiver',
  },
  hanyo: {
    guerrier: 'samurai-like gear: lacquered plate armor with large shoulder guards (sode), a layered skirt of plates (kusazuri), brown-red cord lacing, an open head with a headband',
    sorcier: 'fire onmyōji robes: a wide kariginu-style robe in vermilion and black with big sleeves, paper talismans (ofuda) tucked in the sash, small gold bells, a tall black eboshi hat',
    lame: 'shinobi-like gear: fitted dark clothes, wrapped arms and legs, a scarf and cloth mask, tabi boots',
    paladin: 'Japanese temple guardian gear: light cloth robes with gold trim and a sash, light armor pieces, a rope belt with paper shide streamers',
    rodeur: 'Japanese hunter gear: a light hemp tunic and hakama trousers, a straw hat or headband, a quiver (ebira), straw leggings',
  },
};

// `signature` : la ligne 4 (clic droit) ; `hold` : l'action se tient (garde, arc bandé) au lieu de se jouer d'un trait.
// `skill` : la ligne 5 (A et E), `ultimate` : la ligne 8. Le jeu y prend ses tags (voir docs/Charte 2D.md, section 4).
const CLASSES = {
  guerrier: {
    name: 'Guerrier',
    role: 'Guerrier (berserker): heavy partial armor covering the shoulders, chest and forearms, a huge weapon carried high over the shoulder, forward-leaning aggressive posture, muted dark brown-red accents (never bright red).',
    weapon: 'an oversized nodachi (a very long greatsword, longer than the character is tall), the starting weapon',
    gear: 'nodachi',
    idle: 'the tip of the nodachi rises slightly with the breath',
    windup: 'the nodachi is raised high above the head in both hands, the body coiled',
    strike: 'the nodachi slashes down and across in a wide arc, ending fully extended forward with the front knee bent',
    run: 'the nodachi carried high on the shoulder with one hand, the other arm swinging, the body leaning forward',
    signature: { name: 'Garde (clic droit)', hold: true, text: 'the nodachi held upright in front of the body in both hands, braced, feet planted wide' },
    skill: {
      name: 'Frappe fracassante (A) et Bond (E)',
      wind: 'crouches low, then leaps up with the nodachi lifted overhead in both hands',
      release: 'comes down and drives the nodachi into the ground in front with a mighty two-handed blow, the body bent over it',
    },
    ultimate: {
      name: 'Frénésie (R)',
      wind: 'hunches over, the hands clenched on the hilt, the shoulders rising, the face twisting with rage',
      release: 'a furious battle roar: the head thrown back, the mouth wide open, the chest out, the nodachi raised high in one hand, the hair flaring',
    },
  },
  sorcier: {
    name: 'Sorcier',
    role: 'Sorcier (fire onmyōji): a fire sorcerer-priest in layered robes with wide sleeves, paper talismans (ofuda) and small bells on the sash, a slender upright confident posture, vermilion and black accents with small gold details. The most fragile hero: no armor at all.',
    weapon: 'an oversized kagura-suzu bell wand (a handle with a big cluster of gold bells and long red and white ribbons) and paper talismans, the starting weapon',
    gear: 'bell wand and paper talismans',
    idle: 'the bells and ribbons sway with the breath, a paper talisman held between two fingers of the free hand',
    windup: 'the bell wand raised to shoulder height, the free hand drawn back with a paper talisman between two fingers',
    strike: 'the free hand flicks forward to throw the talisman, the bell wand swept forward, the body leaning into the throw (no visible fire)',
    run: 'the bell wand held low at the side, the wide sleeves and ribbons streaming back',
    signature: {
      name: 'Sceau (clic droit) et Bouclier de flammes (A)',
      hold: false,
      text: 'a casting gesture: a paper talisman flung down toward the ground in front, the bell wand raised high, the sleeves flaring (no fire drawn)',
    },
    skill: {
      name: 'Fuite de feu (E)',
      wind: 'crouches, the robe gathered, the weight thrown forward',
      release: 'a long low burst forward, almost flying, the robe, the sleeves and the ribbons streaming behind',
    },
    ultimate: {
      name: 'Météore (R)',
      wind: 'both arms rise high above the head, the bell wand pointing at the sky, the body stretching up onto the toes',
      release: 'both arms swing down toward a point on the ground in front, the body bent forward, the sleeves whipping (no fire drawn)',
    },
  },
  lame: {
    name: 'Lame',
    role: 'Lame (shadow assassin): a tight fitted dark outfit, low compact crouching posture, violet accents.',
    weapon: 'two oversized kunai held in a reverse grip, the starting weapon',
    gear: 'two large kunai',
    idle: 'the two kunai turn slightly in the reverse grip with the breath',
    windup: 'both kunai are drawn back crossed at the chest, the body dropping low',
    strike: 'the kunai slash out in a wide X-shaped sweep, one arm extended forward and the other swept back, ending in a low lunge',
    run: 'a low sprint, leaning far forward, the kunai held back along the forearms',
    signature: {
      name: 'Frappe fantôme (clic droit)',
      hold: false,
      text: 'a shadow step: drops into a crouch, bursts forward almost horizontal, then lands in a low stance with both kunai ready (the body stays solid: no shadow silhouette, no blur)',
    },
    skill: {
      name: 'Marque de mort (A) et Écran de fumée (E)',
      wind: 'reaches to the belt and pulls out a small round smoke bomb',
      release: 'throws the bomb down at its own feet and crouches low, half turned away, the scarf flying (no smoke drawn)',
    },
    ultimate: {
      name: 'Danse des lames (R)',
      wind: 'coils into a very low crouch, the kunai crossed behind the back',
      release: 'a whirling spin with both kunai extended, the body turning in the air, the scarf and the hair swirling (no trail drawn)',
    },
  },
  paladin: {
    name: 'Paladin',
    role: 'Paladin (solar rampart): light cloth with gold trim, a rampart posture, gold accents.',
    weapon: 'an oversized naginata (long curved polearm) and a large temple shield almost as tall as the character, the starting weapon',
    gear: 'naginata and large shield',
    idle: 'the naginata and the shield shift slightly with the breath',
    windup: 'the naginata is drawn back over the shoulder while the shield rises',
    strike: 'a wide sweeping slash then a lunging thrust, the naginata at full extension forward, the shield pulled back',
    run: 'the shield forward at chest height, the naginata held diagonally behind',
    signature: { name: 'Garde au bouclier (clic droit)', hold: true, text: 'the shield raised in front of the body, the character braced behind it, feet planted wide, the naginata held back' },
    skill: {
      name: 'Marteau lancé (E)',
      wind: 'draws a short war hammer from the belt and pulls it back behind the shoulder, the shield turned aside',
      release: 'hurls the hammer forward with the whole body, the throwing arm fully extended (the hammer has left the hand and is not drawn)',
    },
    ultimate: {
      name: 'Aura de lumière (A) et Égide (R)',
      wind: 'plants the naginata upright beside the body and raises the shield',
      release: 'stands tall like a rampart, the chest out, the free hand raised palm up toward the sky, the head lifted (no light drawn)',
    },
  },
  rodeur: {
    name: 'Rôdeur',
    role: 'Rôdeur (hunter): a light hunter outfit, a quiver on the back, a shooting-ready posture, green accents.',
    weapon: 'an oversized yumi (asymmetric longbow) much taller than the character, the starting weapon',
    gear: 'yumi and quiver',
    idle: 'the bowstring and the quiver strap move with the breath, the head scans slightly left and right',
    windup: 'an arrow is nocked and the bowstring is drawn back to the cheek, the bow arm extended',
    strike: 'the arrow is released: the bowstring snaps forward and the bow arm stays extended, no arrow in flight',
    run: 'a swift stalking run, the bow held low in one hand, the quiver bouncing',
    signature: {
      name: 'Tir chargé (clic droit)',
      hold: true,
      text: 'an arrow nocked and the bowstring drawn slowly all the way back past the cheek, the bow arm locked, the body leaning into the draw and trembling with tension (no glow)',
    },
    skill: {
      name: 'Flèche-filet (A) et Marque du chasseur (E)',
      wind: 'pulls a special arrow with a bundled net head from the quiver and nocks it',
      release: 'shoots it forward: the bowstring snaps, the bow arm extended (the arrow is not drawn in flight)',
    },
    ultimate: {
      name: 'Recul (R)',
      wind: 'crouches and springs backward into the air',
      release: 'in mid-air, leaping backward with the body arched, the bow drawn and released toward the front, then landing crouched',
    },
  },
};

// ---------------------------------------------------------------------------------------------------------------
// Ennemis et boss

// `wide` : la créature est plus large que haute, toutes ses planches passent en paysage.
// `bg` : fond de la planche (le magenta quand la créature est grise et se confondrait avec le fond gris).
const ENEMIES = {
  shikome: {
    name: 'Yomotsu-shikome',
    palaceOrder: 1,
    look: 'a Yomotsu-shikome, a fury of the Japanese underworld: a hunched hag-like creature with pale rotting grey-green skin, a huge mane of tangled black hair, hooked clawed hands, a wide grinning mouth with crooked teeth, ragged dark-purple funeral rags, long thin limbs, always ready to pounce.',
    idle: 'crouched low on all fours, swaying slowly, the hair and rags trembling, the head twitching',
    move: 'a fast scuttling crawl on all fours, hands and feet alternating, the hair streaming behind',
    windup: 'the body gathers into a tight ball, the hands and feet drawn under the chest, the back arched, the head low and the mouth open, ready to spring',
    strike: 'a long pounce: the body stretched out in the air, arms reaching forward with the claws spread, the mouth wide open',
    hit: 'the body is thrown sideways, the head snapping back, the hair whipping',
    death: 'collapses forward and flattens on the ground, the limbs curling in, the hair settling over the body',
    special: { name: 'sonnée (stunned)', loop: true, text: 'dazed on the ground after a failed pounce: the body sprawled, the head wobbling, the hands twitching weakly' },
  },
  ikazuchi: {
    name: 'Ikazuchi',
    palaceOrder: 2,
    look: 'an Ikazuchi, a small thunder spirit of the underworld born from the dead Izanami: a floating pale blue-white ghostly body shaped like a fat teardrop with a tiny grinning face, a short tail, two small stubby arms, a ring of small red-and-gold drums (tomoe drums) floating around its back, electric-blue markings on the body. It floats above the ground.',
    idle: 'floating and bobbing slowly up and down, the drums turning slowly around the body, the tail swaying',
    move: 'drifting sideways through the air with a rolling motion, the drums orbiting, the tail whipping',
    windup: 'rises higher, the arms lifted to the sky, the drums spinning faster around the body, the face in a wide grin',
    strike: 'snaps both arms down and points at the ground, the body jerking down, the drums flung outward',
    hit: 'jolted backward in the air, the body squashed, the drums scattering briefly then snapping back',
    death: 'the body shrinks and sinks down to the ground, the drums dropping and rolling, the face going blank',
    special: { name: 'disparition (vanish)', loop: false, text: 'the body tightens into a tiny dense ball, flattens, then snaps into a thin vertical streak (no light effect, only the body shape changes)' },
  },
  ikusa: {
    name: 'Guerrier du Yomi (Ikusa)',
    heads: 5,
    palaceOrder: 3,
    look: 'an Ikusa, a soldier of the undead army of the Yomi: a gaunt armored warrior in rotting ashigaru armor of dark brown lacquer plates and tattered cloth, a dented conical jingasa helmet, a hollow grey face with glowing pale eyes (flat painted), holding a very long spear (yari) in both hands, stiff disciplined posture.',
    idle: 'standing stiff at attention, the long spear upright beside the body, the head turning slightly, the cloth swaying',
    move: 'a heavy disciplined march, the spear held forward and low in both hands, the armor plates jolting with each step',
    windup: 'the spear is drawn back at the hip with the tip aimed forward, the body turned sideways and lowered, a long tense hold',
    strike: 'a long straight thrust: the spear at full extension forward, the front leg lunging, the rear leg stretched',
    hit: 'staggers back a step, the helmet tilting, the spear wobbling',
    death: 'the armor collapses: the knees give, the spear falls aside, the body folds and drops in a heap of plates and cloth',
  },
  hitodama: {
    name: 'Hitodama',
    look: 'a Hitodama (will-o-the-wisp): a small floating flame spirit shaped like a teardrop with a curling tail, a cold cyan-white body with a paler core, a simple dark face with two small eyes and a small mouth; it hovers above the ground. Drawn as a solid flat painted shape with a thin outline, not a glowing light.',
    idle: 'hovering and bobbing gently, the tail curling slowly, the body breathing in size',
    move: 'darting forward in short floating surges, the tail streaming behind, the body stretching then squashing',
    windup: 'shrinks and draws back, the tail coiling tight, the face angry',
    strike: 'lunges forward stretched long and thin, the tail trailing, the mouth open',
    hit: 'flattens and is knocked back, the face in a wince',
    death: 'shrinks, flickers smaller and smaller, the face fading into a tiny dot',
  },
  kodama: {
    name: 'Kodama',
    look: 'a Kodama (tree spirit): a small rounded pale-cream body with a big round head, hollow dark oval eyes and mouth, a tiny trunk-like body with small twig arms, soft moss-green patches and a small leaf on top of the head, child-sized and gentle.',
    idle: 'standing still and gently rocking side to side, the head tilting, the leaf on top trembling',
    move: 'a small hop-and-shuffle backward, keeping away: little hops with the arms swinging',
    windup: 'both twig arms raised, the head tipped back, swaying, ready to sing a healing chant',
    strike: 'the arms swept forward and down, the head nodding, the body bowing',
    hit: 'tumbles backward with the head rattling, the arms flung',
    death: 'the head rolls side to side, the body wilts, then crumbles into a small pile',
    special: { name: 'soin (heal channel)', loop: true, text: 'arms raised and swaying, the head tilted back and rocking, the body gently pulsing in size, a calm chanting pose' },
  },
  kappa: {
    name: 'Kappa',
    look: 'a Kappa (river yokai): a stocky green amphibian humanoid, a turtle-like shell on the back, a beak-like mouth, webbed hands and feet, a hollow water dish on top of the head with a small puddle of water (painted flat), wide shoulders and a squat body, cheerful but dangerous.',
    idle: 'standing braced, the shell hunched, the arms hanging, the head tilting, the water dish steady',
    move: 'a heavy waddling march, a wide stance, the shell rocking, the arms swinging',
    windup: 'lowers the head and shoulders like a bull, the shell tilted forward, the arms back, the feet digging in',
    strike: 'a full shoulder charge: the body stretched forward, head down, arms swept back, the shell high',
    hit: 'rocked back on the heels, the head snapping up, the water in the dish sloshing',
    death: 'the dish tips over and spills, the body tips, then tumbles onto the shell, the limbs curling up',
    special: { name: 'étourdi (stunned)', loop: true, text: 'dazed: the dish tipped and empty, swaying on the spot with the knees wobbling, the arms dangling, the eyes crossed' },
  },
  kappaRenforce: {
    name: 'Kappa renforcé',
    look: 'an armored elite Kappa: the same stocky green amphibian humanoid as a regular kappa but bigger and darker, wearing lacquered armor plates over the shell and shoulders, a battle scar, a spiked bracer, a hollow water dish with a puddle painted flat, heavier and angrier.',
    idle: 'braced with arms spread a little, the shell hunched, the chest heaving, the head swinging side to side',
    move: 'a heavy stamping march, a wide stance, the armor plates rattling, the arms swinging',
    windup: 'digs in and lowers the head like a bull, the armored shell tilted forward, the arms drawn back and fists clenched',
    strike: 'a chain of charges seen as one full charge pose: the body stretched forward, head down, the arms swept back, the shell high',
    hit: 'rocked back on the heels, the armor plates flashing with a dull shine, the head snapping up',
    death: 'the dish tips and spills, the armored body sways, then falls flat on the shell with the limbs spread',
    special: { name: 'étourdi (stunned)', loop: true, text: 'dazed: the dish tipped and empty, swaying on the spot with the knees wobbling, the arms dangling, the eyes crossed' },
  },
  kasaObake: {
    name: 'Kasa-obake',
    look: 'a Kasa-obake (haunted umbrella): an old paper-and-bamboo umbrella closed around a single large eye, with one thin leg ending in a wooden geta sandal, two thin arms, a long lolling tongue, worn patched paper in dull violet and cream.',
    idle: 'hopping in place on its single leg, the umbrella top swaying, the eye rolling, the tongue flapping',
    move: 'a bouncy hop on the single geta, the arms flailing for balance, the umbrella top tilting with each hop',
    windup: 'crouches down on the single leg, the umbrella top pulled back and folded, the eye wide open and fixed on the target',
    strike: 'leaps high: the whole body stretched up then coming down with the umbrella top spread wide and the leg kicking out, the tongue lashing',
    hit: 'knocked sideways, the umbrella top flapping open, the eye squeezed shut',
    death: 'the umbrella snaps shut and slumps, the leg folds, then the body falls flat, torn and still, the tongue hanging',
    special: { name: 'bond (airborne)', loop: true, text: 'in mid-air: the umbrella top half open and trembling, the leg tucked, the arms out, the eye looking down' },
  },
  oublie: {
    name: 'Oublié',
    heads: 5,
    bg: MAGENTA,
    look: 'an Oublié (Forgotten One): a tall thin figure in ragged grey-blue robes and a torn hood, a blank featureless white mask for a face with no eyes and no mouth, long thin arms and pale bony hands, a slightly bent posture, empty and sorrowful.',
    idle: 'standing slouched, the arms hanging, the head tilting slowly, the rags swaying',
    move: 'a slow dragging shuffle forward, the arms swinging loosely, the head drooping, the rags trailing',
    windup: 'the arms rise slowly forward and up, the fingers spread, the back arching, the head tilted back',
    strike: 'both arms swing down and forward in a heavy grab-and-slam, the body falling into it',
    hit: 'the head snaps to the side, the hood flaps, the body staggering back',
    death: 'the body goes limp, the knees fold, the robe collapses over the body on the ground and the mask drops aside',
  },
  araignee: {
    name: 'Petite araignée',
    wide: true,
    look: 'a small spider, one of the Jorōgumo\'s brood: a round pale-violet body with a cream hourglass-like pattern on the back, eight thin jointed legs, a cluster of small red-black eyes, fangs, sized to fit under the character\'s feet, seen slightly from above.',
    idle: 'standing on all eight legs, the body bobbing gently, the front legs raised and waving',
    move: 'a fast skittering scuttle, the legs moving in alternating groups of four, the body low',
    windup: 'rears up on the back legs, the front legs raised high and spread, the fangs open, the body trembling',
    strike: 'pounces forward: the body stretched low, the front legs thrust out, the fangs wide',
    hit: 'flipped sideways and knocked back, the legs flailing',
    death: 'rolls onto its back, the legs curling inward, then still',
  },
};

const BOSSES = {
  izanami: {
    name: 'Izanami, la dame voilée',
    look: 'Izanami the veiled lady, goddess of death, first phase: a tall pale woman in a white burial kimono (the white garment of the dead) with a wide obi, very long straight black hair hanging over her face so the face is hidden except a pale chin, a white triangular headband (hitaigami), long pale hands, bare feet, the hem of the kimono fading into thin pale mist shapes drawn as solid flat forms. Elegant, motionless, unsettling. About 3 meters tall in the game.',
    idle: 'standing very still, swaying almost imperceptibly, the hair and the hem of the kimono drifting, the head slightly bowed',
    move: 'a slow gliding walk, the feet barely visible under the kimono, the arms hanging, the hair swaying',
    windup: 'the arms spread wide and slowly rise, the head bowed, the hair falling forward, the body leaning in, ready to embrace',
    strike: 'the arms close in a wide sweeping embrace, the body lunging forward, the hair whipping, the hands clutching',
    hit: 'the head snaps back, the hair flying open for an instant, the body recoiling',
    death: 'the body sinks slowly to its knees and folds forward, the hair and kimono pooling on the ground',
    special: { name: 'invocation (summon)', loop: false, text: 'both arms raised to the sides with the palms up, the head lifted and the hair parting, the body rising onto the toes' },
  },
  izanamiRevelee: {
    name: 'Izanami, le vrai visage',
    look: 'Izanami revealed, second phase: the same tall figure in the same white burial kimono, but now torn open, the body rotting: grey-green decayed skin, exposed ribs and collarbones, a gaunt skeletal face with hollow eyes and a wide dark mouth, long black hair flowing back, eight small pale eel-like thunder-god shapes (the eight thunder gods) coiled around her shoulders, arms and waist as solid painted shapes. Terrifying but elegant. About 3 meters tall in the game.',
    idle: 'standing hunched, the body shuddering in small spasms, the head twitching, the thunder-god shapes writhing slowly on the body',
    move: 'a stalking lurching walk, the body leaning forward, the arms dangling, the head jerking, the hair dragging',
    windup: 'the body bends back and the arms thrown wide and up, the head tilted to the sky, the mouth open, the thunder-god shapes rearing up',
    strike: 'the arms slam down and forward, the body thrown into a lunge, the head snapping forward, the mouth wide, the thunder-god shapes lashing out',
    hit: 'the body is thrown back, the head snapping, the thunder-god shapes recoiling',
    death: 'the body convulses, collapses to the knees, then falls forward onto the ground, the thunder-god shapes going limp',
    special: { name: 'poursuite (chase leap)', loop: true, text: 'a predatory leap: the body in mid-air, stretched low, the arms reaching forward with the fingers spread, the hair streaming behind, the mouth open' },
  },
  jorogumo: {
    name: 'Jorōgumo, forme humaine',
    heads: 5,
    look: 'the Jorōgumo in her human form, the first boss: a beautiful and dangerous woman in a layered violet and black kimono decorated with spider-web patterns, an elaborate hairstyle with long spider-leg-shaped hairpins, pale skin with a faint web of dark lines on the neck and hands, a large folded folding fan (sensu) in her hand, a knowing cold smile. About 2.4 meters tall in the game.',
    idle: 'standing elegantly, the fan held folded at the chest, the sleeves and the hairpins swaying slightly, the head tilting',
    move: 'a graceful gliding walk in small steps, the kimono swaying, the fan held at the chest',
    windup: 'the fan is lifted and opened wide behind the head, the body turned half away and coiled, the other hand raised',
    strike: 'the fan sweeps out in a wide slashing arc in front of the body, the whole body turning into it, the sleeves trailing',
    hit: 'the head jerks aside, the fan flying open, the body recoiling',
    death: 'the body collapses to the knees, the fan drops, the hairpins scatter, and the body sags forward onto the ground',
    special: { name: 'appel des araignées (summon)', loop: false, text: 'the fan drawn open wide in front of the chest then snapped down toward the ground, the other hand pointing at the ground, the body leaning forward' },
  },
  jorogumoAraignee: {
    name: 'Jorōgumo, forme d\'araignée',
    heads: 5,
    wide: true,
    look: 'the Jorōgumo in her true spider form, the boss: a giant spider about 4 meters wide and 2.2 meters tall, a huge violet-black abdomen with a cream kimono-like web pattern, eight thick jointed legs with pale bands, the upper body of the woman from the first form rising from the front of the body (pale face, long black hair, the spider-leg hairpins), a cluster of small red eyes above her brow. Seen slightly from above.',
    idle: 'standing tall on all eight legs, the body breathing, the front legs lifting one after the other, the woman\'s torso swaying, the hair drifting',
    move: 'a heavy scuttling march, the eight legs alternating in two groups of four, the abdomen rocking, the torso leaning forward',
    windup: 'rears up on the rear legs, the front legs raised high and spread wide, the torso thrown back, the abdomen lowered',
    strike: 'a crushing charge: the front legs slammed forward, the body stretched low and long, the torso thrust out, the mouth open',
    hit: 'the body thrown sideways, the legs buckling, the torso jerking back',
    death: 'the legs give one by one, the body sinks, then rolls onto its back with the legs curling in over the belly',
    special: { name: 'au plafond (climbing up)', loop: true, text: 'climbing upward: the body tilted and stretched vertically, the front legs reaching up, the rear legs pushing, the torso looking down, the hair hanging' },
  },
};

// ---------------------------------------------------------------------------------------------------------------
// Planche complète : 8 lignes de 8 images, une ligne par animation. Chaque ligne : [première image, dernière, texte].

/** Une ligne de geste (compétence, ultime) : élan, tension, déclenchement, tenue, retour. */
const gesture = (wind, release, hold) => [
  [1, 2, `gathering: ${wind}`],
  [3, 4, 'the tension builds, the movement clearly progressing in every frame'],
  [5, hold ? 6 : 5, `RELEASE, the key pose: ${release}`],
  ...(hold ? [] : [[6, 6, 'the release pose held at full strength, the hair and cloth flaring']]),
  [7, 7, hold ? 'the release pose held at full strength, the hair and cloth flaring' : 'starting to recover'],
  [8, 8, 'back to the ready pose of the reference figure'],
];

/** Ordre des lignes des héros, le même pour toutes les classes : le jeu les lit dans cet ordre. */
const HERO_ROWS = [
  {
    fr: 'Attente',
    en: 'IDLE, a slow breathing loop',
    loop: true,
    beats: (c) => [
      [1, 2, 'the neutral ready pose of the reference figure, then the chest begins to swell'],
      [3, 4, `breathing in, up to the top of the breath: the shoulders and the head rise; ${c.idle}`],
      [5, 6, 'breathing out: the shoulders and the head sink, the knees give slightly, the hair and cloth sway the other way'],
      [7, 8, 'rising smoothly back toward frame 1; frame 8 is almost identical to frame 1'],
    ],
  },
  {
    fr: 'Course',
    en: 'RUN, a running cycle on the spot (movement with the ZQSD keys)',
    loop: true,
    beats: (c) =>
      [
        'contact: the right leg reaches forward, the left arm forward',
        'down: the right leg bends under the weight, the body at its lowest',
        'passing: the left leg swings forward past the right leg',
        'up: pushing off the right foot, the body at its highest',
        'contact: the left leg reaches forward, the right arm forward',
        'down: the left leg bends under the weight, the body at its lowest',
        'passing: the right leg swings forward past the left leg',
        'up: pushing off the left foot, the body at its highest',
      ].map((p, i) => [i + 1, i + 1, i === 0 ? `${p}; in every frame: ${c.run}` : p]),
  },
  {
    fr: 'Attaque principale (clic gauche)',
    en: 'MAIN ATTACK (left click), a single fast attack',
    loop: false,
    beats: (c) => [
      [1, 1, 'the ready pose of the reference figure, the weight shifting back'],
      [2, 3, `wind-up: ${c.windup}`],
      [4, 4, `the strike launches, very fast: ${c.strike}, on its way`],
      [5, 5, `IMPACT, the key frame of the attack: ${c.strike}, at full extension`],
      [6, 6, 'follow-through: the momentum carries the body past the impact'],
      [7, 8, 'recovery: back to the ready pose of the reference figure'],
    ],
  },
  {
    fr: 'Action défensive (clic droit)',
    en: 'RIGHT-CLICK ACTION',
    loop: false,
    name: (c) => c.signature.name,
    beats: (c) =>
      c.signature.hold
        ? [
            [1, 1, 'the ready pose of the reference figure'],
            [2, 3, `moving into position: ${c.signature.text}, on its way`],
            [4, 5, `the position fully reached: ${c.signature.text}`],
            [6, 8, 'the position held: only tiny movements of the hair and cloth; frames 6 to 8 are nearly identical'],
          ]
        : [
            [1, 2, 'anticipation: the character crouches slightly, loading the weight'],
            [3, 5, `the action, the body at a clearly different place in every frame: ${c.signature.text}`],
            [6, 6, 'end of the movement'],
            [7, 8, 'recovery: back to the ready pose of the reference figure'],
          ],
  },
  {
    fr: 'Compétences A et E',
    en: 'SKILL (A and E keys)',
    loop: false,
    name: (c) => c.skill.name,
    beats: (c) => gesture(c.skill.wind, c.skill.release, false),
  },
  {
    fr: 'Dégâts',
    en: 'HURT, being hit and recovering',
    loop: false,
    beats: (c) => [
      [1, 1, 'hit: the head snaps back, the torso recoils, the eyes squeezed shut'],
      [2, 3, 'maximum recoil: the body bent back, one foot sliding, the arms thrown out, the weapon still held'],
      [4, 5, 'staggering, fighting to keep balance'],
      [6, 8, `recovering, back to the ready pose of the reference figure, ${c.gear} in hand`],
    ],
  },
  {
    fr: 'Mort',
    en: 'DEATH',
    loop: false,
    beats: (c) => [
      [1, 1, 'the fatal hit: the head snaps back, the body recoils'],
      [2, 3, 'staggers backward, the grip on the weapon loosening'],
      [4, 5, `the knees buckle and the body falls, the ${c.gear} slipping from the hands`],
      [6, 6, `lands on the ground with a small bounce, the ${c.gear} fallen beside the body`],
      [7, 8, 'lies completely still; frames 7 and 8 are identical. Do not draw any dissolving or fading: the body stays solid'],
    ],
  },
  {
    fr: 'Compétence ultime (touche R)',
    en: 'ULTIMATE (R key)',
    loop: false,
    name: (c) => c.ultimate.name,
    beats: (c) => gesture(c.ultimate.wind, c.ultimate.release, true),
  },
];

/** Étourdissement générique des ennemis, quand leur geste propre n'en est pas un. */
const STUNNED = 'dazed on the spot: the body swaying, the head wobbling, the limbs dangling, the eyes unfocused';
const isStun = (special) => /stun|étourdi|sonnée/i.test(special?.name ?? '');

/** Ordre des lignes des ennemis et des boss : même logique que les héros (voir la charte, section 4). */
const CREATURE_ROWS = [
  {
    fr: 'Attente',
    en: 'IDLE, a slow loop',
    loop: true,
    beats: (c) => [
      [1, 2, `the neutral pose of the reference figure, then it starts to breathe: ${c.idle}`],
      [3, 4, 'breathing in: the body swells and rises, secondary parts (hair, cloth, limbs, tail) lifted'],
      [5, 6, 'breathing out: the body sinks, the secondary parts sway the other way'],
      [7, 8, 'rising smoothly back toward frame 1; frame 8 is almost identical to frame 1'],
    ],
  },
  {
    fr: 'Déplacement',
    en: 'MOVE, a locomotion cycle on the spot',
    loop: true,
    beats: (c) => [
      [1, 2, `first beat: ${c.move}; the body at its lowest position`],
      [3, 4, 'second beat: the body rising, the limbs or parts passing each other'],
      [5, 6, 'third beat: the mirror of the first beat (the opposite side or phase), the body at its lowest'],
      [7, 8, 'fourth beat: the body rising again, leading back to the start of the cycle'],
    ],
  },
  {
    fr: 'Attaque',
    en: 'ATTACK, a single attack',
    loop: false,
    beats: (c) => [
      [1, 1, 'the idle pose, tensing'],
      [2, 3, `wind-up: ${c.windup}`],
      [4, 4, `the strike launches, very fast: ${c.strike}, on its way`],
      [5, 5, `IMPACT, the key frame of the attack: ${c.strike}, at full extension`],
      [6, 6, 'follow-through: the momentum carries the body past the impact'],
      [7, 8, 'recovery: back to the idle pose of the reference figure'],
    ],
  },
  {
    fr: 'Anticipation (télégraphe)',
    en: 'TELEGRAPH, the wind-up that announces an attack, held',
    loop: false,
    beats: (c) => [
      [1, 2, `from the idle pose, the body starts to build tension: ${c.windup}`],
      [3, 6, 'growing more and more tense, the eyes or head fixed on the target'],
      [7, 8, 'frozen at maximum tension, trembling slightly; frames 7 and 8 are nearly identical'],
    ],
  },
  {
    fr: 'Étourdi',
    en: 'STUNNED, a dazed loop',
    loop: true,
    beats: (c) => [
      [1, 2, isStun(c.special) ? c.special.text : STUNNED],
      [3, 6, 'still dazed, swaying from one side to the other'],
      [7, 8, 'easing back toward frame 1, a seamless loop'],
    ],
  },
  {
    fr: 'Dégâts',
    en: 'HURT, being hit and recovering',
    loop: false,
    beats: (c) => [
      [1, 1, `hit: ${c.hit}`],
      [2, 3, 'maximum recoil, the body thrown off balance'],
      [4, 5, 'staggering, fighting to recover'],
      [6, 8, 'back to the idle pose of the reference figure'],
    ],
  },
  {
    fr: 'Mort',
    en: 'DEATH',
    loop: false,
    beats: (c) => [
      [1, 1, 'the fatal hit: the body recoils'],
      [2, 3, 'staggers, the strength draining'],
      [4, 5, `the collapse: ${c.death}`],
      [6, 6, 'the body hits the ground and settles with a small bounce'],
      [7, 8, 'lies completely still; frames 7 and 8 are identical. Do not draw any dissolving or fading: the body stays solid'],
    ],
  },
  {
    fr: 'Geste propre',
    en: 'SPECIAL',
    loop: (c) => Boolean(c.special && !isStun(c.special) && c.special.loop),
    name: (c) => (c.special && !isStun(c.special) ? c.special.name : 'second attack'),
    beats: (c) =>
      c.special && !isStun(c.special)
        ? [
            [1, 2, `the movement builds up: ${c.special.text}, first part`],
            [3, 6, `${c.special.text}, fully reached and sustained, with only small rhythmic movements`],
            [7, 8, c.special.loop ? 'easing back toward frame 1 of this row, a seamless loop' : 'easing back to the idle pose of the reference figure'],
          ]
        : [
            [1, 2, `a heavier version of the wind-up: ${c.windup}, pushed further`],
            [3, 4, `a heavier version of the strike: ${c.strike}`],
            [5, 5, 'IMPACT, the whole body thrown into the blow'],
            [6, 8, 'a slow recovery back to the idle pose'],
          ],
  },
];

// ---------------------------------------------------------------------------------------------------------------
// Construction des prompts

const COLUMNS = 8;

function checkBeats(beats, label) {
  let next = 1;
  for (const [from, to] of beats) {
    if (from !== next || to < from) throw new Error(`${label} : étapes discontinues à l'image ${from}`);
    next = to + 1;
  }
  if (next !== COLUMNS + 1) throw new Error(`${label} : les étapes s'arrêtent à l'image ${next - 1}`);
}

const frameRange = (from, to) => (from === to ? `frame ${from}` : `frames ${from} to ${to}`);

/**
 * Planche complète : 64 images, grille 8 × 8 de cases carrées, une ligne de 8 images par animation.
 * Avec 4 lignes (`rows`), la planche de 32 images en image 2:1 (format du 13 octobre 2026, voir LOT_4X8).
 */
function sheetPrompt({ intro, rows, ch, bg, label }) {
  const n = rows.length;
  const cells = n * COLUMNS;
  const heads = ch.heads ?? 3;
  const format = n === COLUMNS
    ? 'Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible).'
    : 'Output a landscape 2:1 image at the highest resolution available (2048 x 1024 px if possible).';
  const lines = [
    intro,
    `${format} The image is divided into an invisible grid of 8 columns x ${n} rows (${cells} equal square cells).`,
    `Each row is one animation of 8 frames, read left to right. The ${n} rows, from top to bottom, are always in this exact order:`,
  ];
  rows.forEach((row, r) => {
    const beats = row.beats(ch);
    checkBeats(beats, `${label}/ligne ${r + 1}`);
    const name = row.name ? ` — ${row.name(ch)}` : '';
    lines.push(
      `ROW ${r + 1}, ${row.en}${name}, ${(typeof row.loop === 'function' ? row.loop(ch) : row.loop) ? 'a seamless loop where frame 8 leads back to frame 1' : 'played once'}: ` +
        beats.map(([from, to, text]) => `${frameRange(from, to)}: ${text}`).join('; ') + '.',
    );
  });
  lines.push(
    'Each figure is centered in its own cell and drawn at the same scale in every cell of every row: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.',
    `The character stays exactly the same in all ${cells} frames: same ${heads === 3 ? 'chibi ' : ''}proportions (${heads} heads tall), same head size, same face, same outfit, same colors, same oversized weapon; only the pose changes.`,
    'Every row has exactly 8 frames: no empty cell, no extra frame, no row with fewer frames.',
    'DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, except where a held pose is asked for.',
    'DO NOT simply copy the reference figure into every cell.',
    'DO NOT change the camera angle, the facing direction or the design from one frame to the next.',
    'DO NOT move the character across the sheet: each frame stays centered in its own cell.',
    lookFor(heads),
    bgText(bg),
    NOFX,
  );
  return lines.join('\n');
}

const FICHE_OPEN = 'Character reference sheet for a 2D action RPG in which dead souls from every mythology fight across an archipelago of collapsed afterlives. ';

/** Fiche de profil, générée de zéro : un seul personnage, une seule vue. */
function fichePrompt({ subject, proportions, bg = GREY, wide = false, heads = 3 }) {
  return [
    `${FICHE_OPEN}One single character, shown once, full body, in ${VIEW.profil.fiche}. ${subject} Neutral calm idle stance.`,
    proportions,
    'The figure is large, about 85% of the image height, centered, with a wide empty margin around it.',
    wide ? 'Landscape 16:9 image at the highest resolution available.' : 'Portrait 3:4 image at the highest resolution available.',
    lookFor(heads),
    bgText(bg),
    NOFX,
  ].join('\n');
}

/** Fiche de face ou de dos, générée à partir de la fiche de profil jointe. */
function vueFichePrompt({ subject, view, bg = GREY, wide = false, heads = 3 }) {
  return [
    `The attached image is the reference sheet of our game character, a single figure seen in ${VIEW.profil.fiche}.`,
    `Draw the SAME character, alone, full body, in ${VIEW[view].fiche}: same design, proportions, outfit, colors, weapon and accessories, nothing added or removed, same scale and same neutral calm idle stance. Invent the details hidden in the attached view so that they stay consistent with the design. ${subject}`,
    'The figure is large, about 85% of the image height, centered, with a wide empty margin around it.',
    wide ? 'Landscape 16:9 image at the highest resolution available.' : 'Portrait 3:4 image at the highest resolution available.',
    lookFor(heads),
    bgText(bg),
    NOFX,
  ].join('\n');
}

const PROPORTIONS_CREATURE =
  'Same chibi rendering as the heroes, adapted to the anatomy of this creature: an oversized head (or face) with big expressive eyes, a compact body, exaggerated readable features. ' +
  'A humanoid creature is exactly 3 heads tall, like the heroes. A strong readable silhouette from far away, with a clean outline.';

/**
 * Personnages imposants (les deux formes de la Jorōgumo, l'ikusa, l'Oublié, le gardien errant : `heads: 5`) :
 * 5 têtes de haut au lieu des 3 des héros, pour qu'ils dominent l'écran.
 */
const TALL_HEADS = 5;
const PROPORTIONS_TALL =
  'Same painted rendering as the heroes, but NOT chibi: an imposing character, exactly 5 heads tall (the heroes are only 3 heads tall), ' +
  'a smaller head relative to a longer body and longer limbs, a towering silhouette that dominates the heroes, still with clear readable features. ' +
  'A creature that is not fully humanoid keeps these proportions for its human or humanoid parts. A strong readable silhouette from far away, with a clean outline.';
const lookFor = (heads) =>
  heads === TALL_HEADS
    ? LOOK.replace('Painted 2D chibi action-RPG sprite style: chibi proportions,', 'Painted 2D action-RPG sprite style, the same rendering as our chibi heroes but with taller, more imposing proportions (5 heads tall),')
    : LOOK;

const fence = (s) => ['```text', s, '```', ''].join('\n');

/** Introduction d'une planche complète : l'image jointe est la fiche de la vue. */
const sheetIntro = (vk, who, tail) =>
  `The attached image is the reference sheet of our game character: a single figure seen in ${VIEW[vk].fiche}.${who ? ' ' + who : ''}` +
  ` Draw the complete 2D sprite sheet of this exact character, all its animations on one image: ${tail}` +
  ' Every frame is drawn in that same view and camera angle, exactly like the reference figure.';

// ---------------------------------------------------------------------------------------------------------------
// Personnages, rangés en lots par ordre de travail

const heroSubject = (rk, race, ck, cls) =>
  `The character belongs to the ${race.name} race and the ${cls.name} class. BODY (the race): ${race.text} OUTFIT (follows the culture of the race, nothing from any other culture): ${OUTFITS[rk][ck]}. ROLE (the class): ${cls.role} WEAPON: ${cls.weapon}. The race decides the body, the face and the clothing culture; the class only decides the role, the posture, the silhouette, the accent color and the weapon.`;
const HERO_PROP = PROPORTIONS_HERO + ' All twenty heroes of the game share exactly the same total height.';
const BOSS_PROP = PROPORTIONS_CREATURE + ' A boss: the head and the weak point must be clearly readable.';

/** Un personnage = tout ce qu'il faut pour écrire sa fiche et sa planche complète. */
function hero(rk, ck) {
  const race = RACES[rk];
  const cls = CLASSES[ck];
  return {
    id: `${rk}-${ck}`,
    name: `${race.name} ${cls.name}`,
    subject: heroSubject(rk, race, ck, cls),
    proportions: HERO_PROP,
    bg: GREY,
    wide: false,
    rows: HERO_ROWS,
    data: cls,
    tail: `same face, chibi proportions, outfit, colors, ${cls.gear}, nothing added or removed.`,
    who: '',
    views: ['face', 'dos'],
  };
}
function creature(key, data, kind) {
  return {
    id: key,
    name: data.name,
    subject: `The character is ${data.look}`,
    proportions: data.heads === TALL_HEADS
      ? PROPORTIONS_TALL + (kind === 'boss' ? ' A boss: the head and the weak point must be clearly readable.' : '')
      : kind === 'boss' ? BOSS_PROP : PROPORTIONS_CREATURE,
    bg: data.bg ?? GREY,
    wide: !!data.wide,
    rows: CREATURE_ROWS,
    data,
    tail: `same design, ${data.heads === TALL_HEADS ? 'proportions (5 heads tall)' : 'chibi proportions'}, colors, nothing added or removed.${data.wide ? ' The creature is wider than tall: it uses the full width of each cell, at the same scale in every cell.' : ''}`,
    who: `The character is ${data.look}`,
    views: ['face'],
  };
}

/** Ordre des lignes d'une planche, en français, pour l'en-tête de chaque prompt. */
const rowList = (ch) => ch.rows.map((row, r) => `${r + 1} ${row.fr}${row.name ? ` : ${row.name(ch.data)}` : ''}`).join(' · ');

/** Écrit la fiche (de profil, de zéro, ou de face/dos à partir du profil) et la planche complète de chaque vue demandée. */
function characterSection(ch, views) {
  const out = [`## ${ch.name}`, ''];
  for (const vk of views) {
    const prompt = vk === 'profil'
      ? fichePrompt({ subject: ch.subject, proportions: ch.proportions, bg: ch.bg, wide: ch.wide, heads: ch.data.heads })
      : vueFichePrompt({ subject: ch.subject, view: vk, bg: ch.bg, wide: ch.wide, heads: ch.data.heads });
    out.push(
      `### ${ch.name} — fiche ${vk}`,
      '',
      vk === 'profil'
        ? `**Générer 2 ou 3 variantes** et garder la meilleure. **Enregistrer :** \`2d/${ch.id}/fiche-profil.png\``
        : `**Joindre :** \`2d/${ch.id}/fiche-profil.png\`. **Enregistrer :** \`2d/${ch.id}/fiche-${vk}.png\``,
      '',
      fence(prompt),
    );
    const sheet = sheetPrompt({ intro: sheetIntro(vk, ch.who, ch.tail), rows: ch.rows, ch: ch.data, bg: ch.bg, label: `${ch.id}/${vk}` });
    out.push(
      `### ${ch.name} — ${vk} — planche complète (8 × 8)`,
      '',
      `**Lignes :** ${rowList(ch)}.`,
      '',
      `**Joindre :** \`fiche-${vk}.png\`. **Enregistrer :** \`2d/${ch.id}/${vk}-planchecomplete.png\``,
      '',
      fence(sheet),
    );
  }
  return out.join('\n');
}

const NOW = ['profil'];

/** Le pêcher de l'arène d'Izanami : une image fixe, dans deux états. */
function pecherPrompts() {
  const base =
    'A single stylized peach tree for a 2D action RPG, the magic peach tree of the afterlife palace, seen from a slightly raised camera. A gnarled dark trunk, a round canopy of pink blossoms and pale green leaves, about 2.6 meters tall, drawn as one clean object centered in the image with a wide empty margin. ';
  const spec = [
    ['pecher', 'Pêcher mûr', 'Several large ripe peaches hang in the canopy, soft pink and gold, clearly readable from far away.'],
    ['pecherNu', 'Pêcher sans pêches', 'The same tree after the fruit has fallen: the same trunk and canopy, but no peaches at all, only blossoms.'],
  ];
  return spec.map(([id, title, state]) => ({
    id,
    title,
    prompt: [base + state, 'Square 1:1 image at the highest resolution available.', LOOK, bgText(GREY), NOFX].join('\n'),
  }));
}

const LOTS = [
  {
    file: '01-izanami.md',
    title: 'Lot 1 : Izanami (dans le jeu en planches 4 × 4, à refaire en 8 × 8 chibi)',
    intro: 'Les deux formes d\'Izanami, le boss du Palais. Le pêcher de son arène (décor, 2 états) est à la fin.',
    chars: [creature('izanami', BOSSES.izanami, 'boss'), creature('izanamiRevelee', BOSSES.izanamiRevelee, 'boss')],
    extra: () => ['## Pêcher de l\'arène (image fixe, 2 états)', '', ...pecherPrompts().flatMap((p) => [`### ${p.title}`, '', `**Enregistrer :** \`2d/${p.id}/${p.id}.png\``, '', fence(p.prompt)])].join('\n'),
  },
  {
    file: '02-yokai-du-palais.md',
    title: 'Lot 2 : yokai du Palais d\'Izanami (dans le jeu en planches 4 × 4, à refaire en 8 × 8 chibi)',
    intro: 'Shikome, ikazuchi et ikusa : les trois yokai du Palais.',
    chars: [creature('shikome', ENEMIES.shikome, 'enemy'), creature('ikazuchi', ENEMIES.ikazuchi, 'enemy'), creature('ikusa', ENEMIES.ikusa, 'enemy')],
  },
  ...Object.entries(CLASSES).map(([ck, cls], i) => ({
    file: `03-heros-${ck}.md`,
    title: `Lot 3 : héros ${cls.name} (série du Yomi, Hanyō)`,
    intro: 'Phase 1 : les tenues du Yomi, avec la race Hanyō. Les cinq Hanyō ont leur planche complète dans le jeu depuis octobre 2026 ; ces prompts servent à en refaire une au format standard. Les autres races viendront plus tard.',
    chars: [hero('hanyo', ck)],
    order: i,
  })),
  {
    file: '04-yokai-des-rizieres.md',
    title: 'Lot 4 : yokai des Rizières (déjà peints, à refaire pour l\'harmonie)',
    intro: 'Ces ennemis ont déjà des planches peintes dans le jeu. À refaire en dernier, pour que tout le bestiaire ait le même rendu que les nouveaux.',
    chars: ['hitodama', 'kodama', 'kappa', 'kappaRenforce', 'kasaObake', 'oublie', 'araignee'].map((k) => creature(k, ENEMIES[k], 'enemy')),
  },
  {
    file: '05-jorogumo.md',
    title: 'Lot 5 : Jorōgumo (boss déjà peint, à refaire pour l\'harmonie)',
    intro: 'Le premier boss a déjà ses planches peintes. À refaire en dernier, au format chibi 8 × 8 des autres personnages.',
    chars: [creature('jorogumo', BOSSES.jorogumo, 'boss'), creature('jorogumoAraignee', BOSSES.jorogumoAraignee, 'boss')],
  },
];

// ---------------------------------------------------------------------------------------------------------------
// Planches de 4 lignes (format du 13 octobre 2026) : image 2:1, 4 lignes de 8 cases carrées, une animation par ligne.
// Nano Banana tient mieux 32 images que 64. Un yokai tient sur une planche ; un héros ou un boss sur deux.

/** Le gardien errant de l'île (PNJ, dialogue « gardien ») : il n'avait jusqu'ici que l'image de l'Oublié. */
const GARDIEN = {
  name: 'Gardien errant',
  heads: 5,
  look:
    'the Wandering Guardian, a calm mysterious spirit who walks between the drowned rice fields of the dead and the island of the living: a tall gentle figure in a long shaggy straw rain cape (mino) over faded indigo robes, a very wide woven straw hat (sugegasa) that hides the upper face in shadow, two small pale calm eyes visible under the brim, a few rice stalks caught in the straw, a long weathered bamboo staff with a tiny bronze bell, and an ornate many-toothed wooden comb tucked at the belt (the comb of Izanagi). Serene, patient, ancient.',
  idle: 'standing perfectly still, both hands resting on the staff, the straw cape stirring, the hat tilting slowly, the tiny bell swaying',
};

/** Lignes propres au gardien : il attend, parle, offre le peigne et s'incline, et marche (il erre). */
const GARDIEN_ROWS = [
  CREATURE_ROWS[0],
  {
    fr: 'Parole',
    en: 'TALK, speaking calmly',
    loop: true,
    beats: () => [
      [1, 2, 'the idle pose, the head lifting slightly toward the listener'],
      [3, 4, 'the free hand rising in a slow open gesture, the hat tilting'],
      [5, 6, 'the hand turning palm up, the head nodding gently'],
      [7, 8, 'the hand lowering back toward the staff, leading back to frame 1'],
    ],
  },
  {
    fr: 'Offrande et salut',
    en: 'OFFERING AND BOW',
    loop: false,
    beats: () => [
      [1, 2, 'the free hand takes the ornate wooden comb from the belt'],
      [3, 4, 'the comb held out forward on the open palm, offered, the arm fully extended'],
      [5, 6, 'the hand empty, the guardian bowing deeply, the hat brim lowering in front of the face'],
      [7, 8, 'the deep bow held, motionless; frames 7 and 8 are identical'],
    ],
  },
  {
    fr: 'Marche',
    en: 'WALK, a slow wandering walk on the spot',
    loop: true,
    beats: () =>
      [
        'the right foot steps forward, the staff planted ahead',
        'the weight on the right foot, the body at its lowest',
        'the left foot passing, the cape swinging',
        'pushing off, the body at its highest',
        'the left foot steps forward, the staff planted again',
        'the weight on the left foot, the body at its lowest',
        'the right foot passing, the cape swinging the other way',
        'pushing off, leading back to frame 1',
      ].map((p, i) => [i + 1, i + 1, p]),
  },
];

/** Lignes propres aux planches 4 × 8 de la Jorōgumo : lancer de toile et transformation (humaine), charge (araignée). */
const WEB_ROW = {
  fr: 'Lancer de toile',
  en: 'WEB THROW',
  loop: false,
  beats: () => [
    [1, 2, 'the fan snapped shut, the free hand drawn back to the shoulder, the body coiling'],
    [3, 4, 'the arm thrusts forward, the fingers spreading, the body leaning into the throw'],
    [5, 5, 'RELEASE, the key pose: the arm fully extended toward the target, the palm open (no web drawn)'],
    [6, 6, 'the pose held, the sleeves flaring'],
    [7, 8, 'back to the idle pose of the reference figure'],
  ],
};
const TRANSFORM_ROW = {
  fr: 'Transformation',
  en: 'TRANSFORMATION into the spider form',
  loop: false,
  beats: () => [
    [1, 2, 'the head bowed, the arms crossed over the chest, the body trembling'],
    [3, 4, 'the back arching, the first long spider legs (violet-black with pale bands) bursting out from under the kimono'],
    [5, 6, 'eight spider legs spread wide around her, the body lifted off the ground on them, the arms flung open'],
    [7, 8, 'the spider legs planted, the body raised high, the fan opened above the head in a triumphant pose; frames 7 and 8 are nearly identical'],
  ],
};
const CHARGE_ROW = {
  fr: 'Charge',
  en: 'CHARGE, a fast rush forward',
  loop: false,
  beats: () => [
    [1, 2, 'crouching low, the legs gathered under the body, the woman\'s torso leaning forward'],
    [3, 6, 'rushing forward on all eight legs, the body stretched low and long, the legs in a clearly different position in every frame, the hair streaming back'],
    [7, 8, 'braking, the front legs digging in, back to the idle pose of the reference figure'],
  ],
};

/**
 * Ce qui manque au 13 octobre 2026. Chaque planche : son nom de fichier (à ranger dans ~/Pictures/gamevisual),
 * ses lignes, et le découpage attendu à l'import (tags de tools/planches.json).
 */
function lot4x8() {
  const C = CREATURE_ROWS;
  const H = HERO_ROWS;
  const sheet = (ch, file, rows, tags, second) => ({ ch, file, rows, tags, second });
  const items = [];
  const gardien = { ...creature('gardien-errant', GARDIEN, 'enemy'), rows: GARDIEN_ROWS, data: GARDIEN };
  items.push({
    ch: gardien,
    folder: 'ile',
    fiche: true,
    note: 'PNJ de l\'île : le jeu ne joue que l\'attente pour l\'instant ; la parole, le salut et la marche sont prêts pour la suite.',
    sheets: [sheet(gardien, 'gardien-errant-planche', GARDIEN_ROWS, 'idle · talk · bow · move')],
  });
  const human = creature('jorogumo-humaine', BOSSES.jorogumo, 'boss');
  items.push({
    ch: human,
    folder: 'yokai-des-rizière',
    fiche: true,
    note: 'À refaire en 5 têtes (les planches du 13 octobre sont en 3 têtes) : la fiche d\'abord, puis les deux planches. Pas d\'attente dessinée : le jeu prend la première image de la course.',
    sheets: [
      sheet(human, 'jorogumo-humaine-planche1', [C[1], C[2], C[3], C[7]], 'move · strike 4-8 · windup (télégraphe) · channel (appel des araignées)'),
      sheet(human, 'jorogumo-humaine-planche2', [C[4], C[5], WEB_ROW, TRANSFORM_ROW], 'stunned · hurt · web · transform (pas encore joués en jeu)', true),
    ],
  });
  const spider = creature('jorogumo-araignee', BOSSES.jorogumoAraignee, 'boss');
  items.push({
    ch: spider,
    folder: 'yokai-des-rizière',
    fiche: true,
    note: 'À refaire en 5 têtes pour le buste de la femme, comme sa forme humaine : la fiche, puis les deux planches (la planche 1 du 13 octobre est en 3 têtes).',
    sheets: [
      sheet(spider, 'jorogumo-araignee-planche1', [C[1], C[2], C[3], CHARGE_ROW], 'move · windup 1-3 / strike 4-8 · windup (télégraphe) · dash'),
      sheet(spider, 'jorogumo-araignee-planche2', [C[4], C[5], C[7], C[6]], 'stunned · hurt · airborne (au plafond) · death', true),
    ],
  });
  for (const k of ['hitodama', 'oublie', 'araignee', 'ikusa']) {
    const ch = creature(k, ENEMIES[k], 'enemy');
    const tall = ENEMIES[k].heads === TALL_HEADS;
    const garde = k === 'ikusa';
    items.push({
      ch,
      folder: garde ? 'yokai-palais' : 'yokai-des-rizière',
      fiche: true,
      note: (garde ? 'Le garde du Palais, à refaire en 5 têtes (la planche du 13 octobre est en 3 têtes). ' : tall ? 'En 5 têtes. ' : '') +
        'Pas d\'attente dessinée : le jeu prend la première image de la course.',
      file: garde ? 'garde' : k,
      sheets: [sheet(ch, `${garde ? 'garde' : k}-planche`, [C[1], C[2], C[6], C[4]], 'move · windup 1-3 / strike 4-8 · death · stunned')],
    });
  }
  for (const rk of ['einherjar', 'oushebti']) {
    for (const ck of ['sorcier', 'lame', 'paladin', 'rodeur']) {
      const ch = hero(rk, ck);
      items.push({
        ch,
        folder: 'heros',
        fiche: true,
        note: 'Tags par classe : docs/Charte 2D.md, section 4.',
        sheets: [
          sheet(ch, `${rk}-${ck}-planche1`, H.slice(0, 4), 'idle · move · windup 1-3 / strike 4-8 · clic droit'),
          sheet(ch, `${rk}-${ck}-planche2`, H.slice(4, 8), 'compétences · hurt · death · ultimate', true),
        ],
      });
    }
  }

  const out = [
    '# Lot 6 : ce qui manque (planches 4 × 8, format du 13 octobre 2026)',
    '',
    'Par ordre de priorité : le gardien errant (nouveau PNJ de l\'île), la Jorōgumo (ses deux formes), les yokai des Rizières pas encore refaits (hitodama, Oublié, petite araignée), le garde du Palais (ikusa), puis les héros Einherjar et Oushebti qui ne sont pas encore jouables (Sorcier, Lame, Paladin, Rôdeur). Déjà fait et gardé : kasa-obake.',
    '',
    '**Les personnages imposants font 5 têtes de haut** (gardien errant, Jorōgumo dans ses deux formes, Oublié, garde) ; les héros et les petits yokai restent en chibi de 3 têtes. Les planches du 13 octobre de la Jorōgumo et du garde, en 3 têtes, sont donc à refaire, en commençant par une nouvelle fiche de référence.',
    '',
    '**Format : image 2:1 (2 048 × 1 024 px si possible), 4 lignes de 8 cases carrées, une animation par ligne**, fond gris uni #8f8f8f (magenta #ff00ff pour l\'Oublié). Ranger chaque image dans `~/Pictures/gamevisual/<dossier>/` sous le nom indiqué. ' + REGLAGES,
    '',
    '**Si Nano Banana dessine une grille, du texte ou une ligne de plus ou de moins**, garder quand même l\'image : l\'import s\'adapte au nombre d\'images par ligne. Seuls le texte incrusté et les personnages qui débordent de leur case la rendent inutilisable.',
    '',
  ];
  for (const item of items) {
    const { ch } = item;
    out.push(`## ${ch.name}`, '', item.note, '');
    if (item.fiche) {
      out.push(
        `### ${ch.name} — fiche de référence`,
        '',
        `**Générer 2 ou 3 variantes** et garder la meilleure${ch.data.heads === TALL_HEADS ? ' (à refaire même si tu en as une : elle doit être en 5 têtes)' : ' (inutile si tu l\'as déjà)'}. **Enregistrer :** \`gamevisual/${item.folder}/${item.file ?? ch.id}-reference.jpg\``,
        '',
        fence(fichePrompt({ subject: ch.subject, proportions: ch.proportions, bg: ch.bg, wide: ch.wide, heads: ch.data.heads })),
      );
    }
    item.sheets.forEach((s, i) => {
      const intro = sheetIntro('profil', ch.who, ch.tail) +
        (s.second ? ' The second attached image is the first sheet of this same character: match its scale, design and colors exactly.' : '');
      out.push(
        `### ${ch.name} — planche${item.sheets.length > 1 || s.second ? ` ${s.second ? 2 : i + 1}` : ''}`,
        '',
        `**Lignes :** ${s.rows.map((row, r) => `${r + 1} ${row.fr}${row.name ? ` : ${row.name(ch.data)}` : ''}`).join(' · ')}. **Import :** ${s.tags}.`,
        '',
        `**Joindre :** la fiche de référence${s.second ? ' et la planche 1' : ''}. **Enregistrer :** \`gamevisual/${item.folder}/${s.file}.jpg\``,
        '',
        fence(sheetPrompt({ intro, rows: s.rows, ch: ch.data, bg: ch.bg, label: `${ch.id}/${s.file}` })),
      );
    });
  }
  return out.join('\n');
}

// ---------------------------------------------------------------------------------------------------------------
// Demi-dieux (14 octobre 2026) : une ligne par action réelle du jeu (clic gauche, clic droit, A, E, R, esquive, gestes
// des quatre Voies, Égide divine de la race, états propres comme la garde ou l'arc bandé), soit 16 lignes et 4 planches
// de 4 × 8 par classe. La Sorcière et la Lame sont des femmes. `tag` : le nom de l'animation à l'import ; les tags qui
// ne sont pas encore dans le jeu (types.ts, ArtPose) seront branchés à l'intégration.

/** Ligne d'attaque (élan sur les images 1 à 3, coup de 4 à 8), comme la ligne 3 des héros. */
const attackRow = (fr, en, tag, windup, strike) => ({
  fr, en, tag, loop: false,
  beats: () => [
    [1, 1, 'the ready pose of the reference figure, the weight shifting back'],
    [2, 3, `wind-up: ${windup}`],
    [4, 4, `the strike launches, very fast: ${strike}, on its way`],
    [5, 5, `IMPACT, the key frame of the attack: ${strike}, at full extension`],
    [6, 6, 'follow-through: the momentum carries the body past the impact'],
    [7, 8, 'recovery: back to the ready pose of the reference figure'],
  ],
});
/** Geste d'une compétence (élan, tension, déclenchement, retour) ; `hold` : la pose se tient. */
const gestureRow = (fr, en, tag, wind, release, hold = false) => ({ fr, en, tag, loop: false, beats: () => gesture(wind, release, hold) });
/** Pose tenue (garde, arc bandé) : elle se prend puis se garde tant que la touche est tenue. */
const holdRow = (fr, en, tag, text) => ({
  fr, en, tag, loop: false,
  beats: () => [
    [1, 1, 'the ready pose of the reference figure'],
    [2, 3, `moving into position: ${text}, on its way`],
    [4, 5, `the position fully reached: ${text}`],
    [6, 8, 'the position held: only tiny movements of the hair and cloth; frames 6 to 8 are nearly identical'],
  ],
});
/** Marche lente en boucle (bouclier levé, arc bandé, marche furtive). */
const walkRow = (fr, en, tag, every) => ({
  fr, en, tag, loop: true,
  beats: () =>
    [
      'the right foot steps forward', 'the weight on the right foot, the body at its lowest', 'the left foot passing', 'pushing off, the body at its highest',
      'the left foot steps forward', 'the weight on the left foot, the body at its lowest', 'the right foot passing', 'pushing off, leading back to frame 1',
    ].map((p, i) => [i + 1, i + 1, i === 0 ? `${p}; in every frame: ${every}` : p]),
});
/** Ligne libre : les étapes sont données telles quelles. */
const customRow = (fr, en, tag, loop, steps) => ({ fr, en, tag, loop, beats: () => steps });
/** Esquive (Espace) : une roulade rapide, propre à chaque classe. */
const dodgeRow = (text) => customRow('Esquive (Espace)', 'DODGE (Space key), a very fast evasive roll', 'dash', false, [
  [1, 1, 'the ready pose, the weight dropping'],
  [2, 3, `diving into the roll: ${text}`],
  [4, 5, 'rolling, tucked tight, the body at a clearly different angle in every frame'],
  [6, 6, 'coming out of the roll onto one knee'],
  [7, 8, 'rising back to the ready pose of the reference figure'],
]);
/** Lames ou arme tournées autour de soi : les ondes des Voies. */
const spinRow = (fr, en, tag, start, held) => customRow(fr, en, tag, false, [
  [1, 1, 'the ready pose of the reference figure'],
  [2, 2, `winding up: ${start}`],
  [3, 6, `a full spin on the spot, ${held}, the body turning through a whole circle (side, front, side, back), one quarter turn every frame`],
  [7, 7, 'the spin ends facing right again, the weapon extended'],
  [8, 8, 'back to the ready pose of the reference figure'],
]);
const DIVINE_ROW = (gear) => customRow('Égide divine (race, sous 35 % des PV)', 'DIVINE AEGIS (the demigod race power, when badly wounded)', 'aegis', false, [
  [1, 2, `badly hurt: kneeling, one hand on the ground, the ${gear} still held`],
  [3, 4, 'the head lifts and the floating golden ring behind the head grows larger, the body straightening'],
  [5, 6, 'standing tall again, the chest out, the arms opened, the golden ring large behind the head (flat painted, no glow)'],
  [7, 8, `back to the ready pose, the ${gear} raised, the ring back to its normal size`],
]);
const H = HERO_ROWS;
const tagged = (row, tag) => ({ ...row, tag });

const DEMIGOD_ROWS = {
  guerrier: (c) => [
    tagged(H[0], 'idle'), tagged(H[1], 'move'), tagged(H[2], 'windup 1-3 / strike 4-8'),
    holdRow('Garde (clic droit tenu)', 'GUARD (right click held)', 'guard', c.signature.text),
    customRow('Coup bloqué, blocage parfait', 'BLOCKED HIT', 'block', false, [
      [1, 1, 'the guard pose: the nodachi upright in front of the body'],
      [2, 2, 'IMPACT on the blade: the nodachi pushed back toward the chest, the feet sliding back'],
      [3, 4, 'absorbing the shock, the knees bent, the teeth clenched'],
      [5, 6, 'pushing back, the guard firm again'],
      [7, 8, 'back to the guard pose; frames 7 and 8 are nearly identical'],
    ]),
    dodgeRow('a shoulder roll, the nodachi held close along the back'),
    gestureRow('Frappe fracassante (A)', 'SMASH (A key)', 'smash', c.skill.wind, c.skill.release),
    customRow('Bond (E)', 'LEAP (E key), a jump onto the targeted spot', 'leap', false, [
      [1, 2, 'crouches deep, the nodachi held back in both hands'],
      [3, 4, 'springs high into the air, the knees tucked, the nodachi raised overhead'],
      [5, 5, 'at the top of the jump, the nodachi raised for the blow'],
      [6, 6, 'lands, driving the nodachi down into the ground in front'],
      [7, 8, 'rising from the landing crouch back to the ready pose'],
    ]),
    gestureRow('Frénésie (R)', 'FRENZY (R key)', 'ultimate', c.ultimate.wind, c.ultimate.release, true),
    gestureRow('Voie de la Fureur : Cri de guerre', 'WAR CRY', 'cry', 'fills the lungs, the fists clenched on the hilt, the shoulders rising', 'a war cry: the head thrust forward, the mouth wide open, both arms spread wide, the nodachi held out to the side', true),
    customRow('Voie du Démuni : Ruée', 'RUSH, a charge forward that sweeps everything', 'rush', false, [
      [1, 2, 'lowers the head and the shoulder, the nodachi held across the body'],
      [3, 6, 'charging forward shoulder first, the legs pumping, the body leaning far forward, a clearly different stride in every frame'],
      [7, 7, 'a wide sweeping slash at the end of the charge'],
      [8, 8, 'back to the ready pose of the reference figure'],
    ]),
    gestureRow('Voie du Cratère : Vague de bouclier', 'GROUND SLAM', 'slam', 'raises the nodachi flat and high in both hands, rising on the toes', 'slams the flat of the nodachi onto the ground in front, the knees bent deep, the whole body crushing down'),
    spinRow('Voie de la Réplique : Spirale', 'SPIRAL', 'spin', 'the body twisted, the nodachi held out low', 'the nodachi held out at arm length'),
    DIVINE_ROW(c.gear), tagged(H[5], 'hurt'), tagged(H[6], 'death'),
  ],
  sorcier: (c) => [
    tagged(H[0], 'idle'), tagged(H[1], 'move'), tagged(H[2], 'windup 1-3 / strike 4-8'),
    attackRow('Attaque, second coup (salves enchaînées)', 'MAIN ATTACK, SECOND HIT', 'strike2', 'the bell wand swung back over the shoulder, a new talisman drawn in the free hand', 'the bell wand flicked forward like a whip toward the target, the free hand following'),
    dodgeRow('a light quick roll, the sleeves and ribbons wrapped around the body'),
    gestureRow('Sceau (clic droit)', 'SEAL (right click)', 'seal', 'a paper talisman pinched between two fingers and raised to the lips, the bell wand drawn back', 'the talisman flung down onto the ground ahead, two fingers of the free hand pointing at the ground in a hand sign, the bell wand raised high (no seal drawn)'),
    gestureRow('Bouclier de flammes (A)', 'FLAME SHIELD (A key)', 'ward', 'the arms crossed over the chest, the bell wand held tight, the head bowed', 'the arms flung wide open, the chest out, the robe and the ribbons blown outward all around her (no fire drawn)', true),
    gestureRow('Fuite de feu (E)', 'FIRE FLIGHT (E key)', 'flight', c.skill.wind, c.skill.release),
    gestureRow('Grand météore (R)', 'GREAT METEOR (R key)', 'ultimate', c.ultimate.wind, c.ultimate.release, true),
    gestureRow('Voie de l\'Embrasement : Colonne ardente', 'BURNING COLUMN', 'column', 'the bell wand raised straight up toward the sky in both hands, the bells ringing', 'the bell wand brought down and pointed far ahead at the ground, the arm fully extended, the free hand pressed to the chest'),
    gestureRow('Voie du Lampion : Lampion', 'PAPER LANTERN', 'lantern', 'takes a small round paper lantern from the sash and holds it up in the palm', 'tosses the lantern underhand far ahead, the arm swung forward and up (the lantern has left the hand and is not drawn)'),
    gestureRow('Voie de l\'Orbe : Déflagration', 'BLAST', 'blast', 'hunches over, the arms crossed, the knees bent, gathering', 'bursts open: the arms and the bell wand flung out to the sides, the body thrown upright, the robe flared all around (no fire drawn)'),
    gestureRow('Voie de la Dryade : Sceau de vigueur', 'SEAL OF VIGOR', 'vigor', 'kneels on one knee, a talisman between two fingers', 'the palm pressed flat on the ground, the head bowed, the bell wand held upright in the other hand, calm, blessing', true),
    DIVINE_ROW(c.gear), tagged(H[5], 'hurt'), tagged(H[6], 'death'),
  ],
  lame: (c) => [
    tagged(H[0], 'idle'), tagged(H[1], 'move'), tagged(H[2], 'windup 1-3 / strike 4-8'),
    attackRow('Attaque, coup enchaîné (Enchaînement)', 'MAIN ATTACK, CHAINED HIT', 'strike2', 'the kunai pulled back at the hip, the body turning the other way', 'a quick reverse slash with the other kunai, then a stab forward, the body spinning half around'),
    dodgeRow('a fast low forward roll, the kunai held flat along the forearms, the scarf flying'),
    customRow('Frappe fantôme (clic droit)', 'PHANTOM STRIKE (right click)', 'ghost', false, [
      [1, 2, 'drops into a deep crouch, the kunai reversed, the eyes locked on the target'],
      [3, 4, 'gone in a burst: a long horizontal dive forward, the body almost flat, the scarf streaming (the body stays solid, no blur)'],
      [5, 5, 'reappears behind the target: a crouched landing, both kunai held back over the shoulder'],
      [6, 6, 'IMPACT: a backward double stab, both arms driven back'],
      [7, 8, 'rising back to the low ready pose of the reference figure'],
    ]),
    gestureRow('Marque de mort (A)', 'DEATH MARK (A key)', 'mark', 'raises one kunai before the eyes, the other hand on the hip', 'points the kunai straight at the target with a fully extended arm, a cold stare, the body sideways (no mark drawn)', true),
    gestureRow('Écran de fumée (E)', 'SMOKE SCREEN (E key)', 'smoke', c.skill.wind, c.skill.release),
    walkRow('Invisible dans la fumée : marche furtive', 'STEALTH WALK, hidden in the smoke', 'hiddenMove', 'a crouched tiptoe sneak, the body very low, both kunai held back along the forearms, the scarf over the face'),
    attackRow('Premier coup depuis l\'ombre', 'AMBUSH STRIKE from the shadows', 'ambush', 'rising from a crouch behind the target, both kunai raised high above the head', 'both kunai plunged down together in a savage double stab'),
    customRow('Danse des lames (R)', 'BLADE DANCE (R key), leaping from enemy to enemy', 'ultimate', true, [
      [1, 2, 'coils into a very low crouch, the kunai crossed behind the back'],
      [3, 4, 'leaps forward through the air, the body horizontal, both kunai extended'],
      [5, 5, 'lands with a double slash'],
      [6, 6, 'a spinning slash, the scarf and the hair whirling'],
      [7, 8, 'springs off again, crouched, toward the next target, leading back to frame 1'],
    ]),
    spinRow('Voies de l\'Ombre, de la Chair et de la Saignée : lames tournoyantes', 'WHIRLING BLADES', 'spin', 'crouched, both kunai held out to the sides', 'both kunai held out at arm length'),
    attackRow('Voie du Voile : Frappe rouge', 'CROSS SLASH', 'cross', 'both kunai crossed high above the head', 'both arms slash down and out in a wide X, ending low with the arms spread'),
    DIVINE_ROW(c.gear), tagged(H[5], 'hurt'), tagged(H[6], 'death'),
  ],
  paladin: (c) => [
    tagged(H[0], 'idle'), tagged(H[1], 'move'), tagged(H[2], 'windup 1-3 / strike 4-8'),
    holdRow('Bouclier levé (clic droit tenu)', 'SHIELD UP (right click held)', 'guard', c.signature.text),
    walkRow('Avancer bouclier levé', 'SHIELD WALK, advancing slowly behind the raised shield', 'guardMove', 'slow heavy steps, the large shield raised in front of the body, the naginata held back'),
    customRow('Garde brisée', 'GUARD BROKEN, stunned for a moment', 'guardBreak', false, [
      [1, 1, 'IMPACT on the shield: the guard shatters'],
      [2, 3, 'the shield knocked aside, the arm flung wide, the body thrown off balance'],
      [4, 6, 'staggered and dazed, the shield arm hanging, the body swaying'],
      [7, 8, 'recovering, raising the shield again'],
    ]),
    dodgeRow('a heavy shoulder roll, the shield on the back'),
    gestureRow('Aura de lumière (A)', 'AURA OF LIGHT (A key)', 'aura', c.ultimate.wind, c.ultimate.release, true),
    customRow('Marteau lancé (E)', 'THROWN HAMMER (E key), it flies out and comes back', 'hammer', false, [
      [1, 2, c.skill.wind],
      [3, 3, c.skill.release],
      [4, 5, 'the arm still extended, watching the throw, the hand open'],
      [6, 6, 'reaching out to catch the returning hammer'],
      [7, 7, 'catches the hammer with a jolt'],
      [8, 8, 'the hammer back at the belt, the ready pose of the reference figure'],
    ]),
    gestureRow('Égide (R)', 'AEGIS (R key), a protection laid on an ally', 'ultimate', 'raises the large shield high, the naginata drawn back', 'thrusts the free hand toward an ally ahead, palm open, laying a protective blessing, the shield held high (no light drawn)', true),
    gestureRow('Voie du Serment : Onde du serment', 'OATH', 'oath', 'kneels, the naginata planted, the head bowed, a hand on the heart', 'rises and lifts the naginata high toward the sky in a solemn vow', true),
    gestureRow('Voies du Parjure et de l\'Évêque : onde sacrée', 'HOLY WAVE', 'wave', 'raises the naginata high in both hands, the shield on the back', 'drives the butt of the naginata down into the ground, the body bent over it, the cloth flaring outward'),
    gestureRow('Voie du Chantre : Chant', 'CHANT', 'chant', 'draws a deep breath, one hand on the chest', 'sings: the head lifted, the mouth open, one arm stretched out toward an ally ahead', true),
    DIVINE_ROW(c.gear), tagged(H[5], 'hurt'), tagged(H[6], 'death'),
  ],
  rodeur: (c) => [
    tagged(H[0], 'idle'), tagged(H[1], 'move'), tagged(H[2], 'windup 1-3 / strike 4-8'),
    holdRow('Tir chargé : bander (clic droit tenu)', 'CHARGED SHOT, drawing (right click held)', 'channel', c.signature.text),
    walkRow('Marche lente, arc bandé', 'DRAWN WALK, slow steps with the bow fully drawn', 'channelMove', 'slow careful steps, the bow fully drawn and aimed forward, the bow arm locked'),
    customRow('Tir chargé : lâcher', 'CHARGED SHOT, release', 'loose', false, [
      [1, 1, 'fully drawn, trembling with tension'],
      [2, 2, 'RELEASE: the string snaps forward, the bow arm recoiling (no arrow drawn in flight)'],
      [3, 4, 'follow-through, the drawing hand flung back past the ear'],
      [5, 6, 'a heavy step back, the bow lowering'],
      [7, 8, 'back to the ready pose of the reference figure'],
    ]),
    dodgeRow('a quick sideways roll, the bow held close against the body'),
    gestureRow('Flèche-filet (A)', 'NET ARROW (A key)', 'net', c.skill.wind, c.skill.release),
    gestureRow('Marque du chasseur (E)', 'HUNTER\'S MARK (E key)', 'hunt', 'shades the eyes with the free hand, scanning ahead', 'points two fingers at the prey with a fully extended arm, the bow held low, a predator stare (no mark drawn)', true),
    customRow('Recul (R)', 'LEAP BACK (R key), firing three arrows', 'airborne', false, [
      [1, 2, 'crouches, an arrow nocked'],
      [3, 4, 'springs backward into the air, the body arching back'],
      [5, 6, 'in mid-air, still leaping backward, the bow drawn and loosed toward the front, then drawn again'],
      [7, 7, 'lands crouched, the bow raised'],
      [8, 8, 'back to the ready pose of the reference figure'],
    ]),
    gestureRow('Voies du Tireur et de la Vigie : volée en éventail', 'FAN VOLLEY', 'volley', 'draws several arrows at once from the quiver and nocks them fanned out on the string', 'releases them all at once, the bow tilted flat, the string snapped forward (no arrow drawn in flight)'),
    gestureRow('Voie de la Cuirasse : Souffle du chasseur', 'HUNTER\'S BREATH', 'breath', 'closes the eyes, a deep breath in, the chest rising, the bow held low', 'the eyes snap open, the body perfectly still and focused, the bow raised ready', true),
    gestureRow('Voie de l\'Éclaireur : Le Couloir', 'CORRIDOR', 'corridor', 'takes a marker stake with a long cloth streamer from the quiver', 'throws it far ahead to plant it in the ground, the arm fully extended (the stake has left the hand)'),
    DIVINE_ROW(c.gear), tagged(H[5], 'hurt'), tagged(H[6], 'death'),
  ],
};
const WOMEN = new Set(['sorcier', 'lame', 'rodeur']);

/**
 * Les trois héroïnes Demi-dieux reprennent la tenue et les accessoires de déesses choisies par Meven (14 octobre 2026) :
 * la Rôdeuse en Artémis, la Sorcière en Hestia, la Lame en Apaté. `fix` remplace dans les prompts les mots des
 * descriptions de classe (pensées pour la série du Yomi : grelots, talismans, kunai, écharpe) par leur équivalent.
 */
const PERSONAS = {
  rodeur: {
    goddess: 'Artémis',
    outfit:
      'inspired by the goddess Artemis: very long flowing wavy silver-white hair with soft lavender and pale pink tints; a thin gold circlet crown with curling gold branches set with a few translucent blue-green crystal leaves shaped like butterfly wings; ' +
      'a long flowing white and pale-cream draped chiton gown with loose sheer sleeves falling from the shoulders and faint pale gold embroidery near the hem, a modest neckline; ' +
      'gold shoulder clasps, a layered gold necklace, a small blue-green butterfly brooch at the chest, gold bands on the upper arms; small blue butterfly motifs painted on the cloth; a quiver of white-fletched arrows on the back',
    role: 'Rôdeur (huntress): a graceful, light-footed archer, a shooting-ready posture, soft aqua and pale gold accents.',
    weapon: 'an oversized elegant golden bow with curled ornate tips, much taller than the character, the starting weapon',
    gear: 'golden bow and quiver',
    fix: [],
  },
  sorcier: {
    goddess: 'Hestia',
    outfit:
      'inspired by the goddess Hestia: a big voluminous mass of dark curly hair piled high on the head, serene half-closed eyes and a calm smile; large round gold fan-shaped earrings; ' +
      'a gold collar necklace with a small ornate central clasp; a long white draped chiton gown held at both shoulders by gold clasps and gathered at the waist by a gold clasp, falling in soft folds to the feet, a modest neckline',
    role: 'Sorcier (priestess of the sacred hearth fire): a serene, upright posture, the hands often open, white and gold with warm ember accents. The most fragile hero: no armor at all.',
    weapon: 'none: she casts the fire with her bare hands, palms open, and wears only her gold jewelry',
    gear: 'gold jewelry',
    fix: [
      ['the bells and ribbons sway with the breath, a paper talisman held between two fingers of the free hand', 'the hands held open at the hips, palms up, the drapery swaying'],
      ['the bell wand raised to shoulder height, the free hand drawn back with a paper talisman between two fingers', 'one hand drawn back to the shoulder, palm open, the other hand forward'],
      ['the free hand flicks forward to throw the talisman, the bell wand swept forward, the body leaning into the throw (no visible fire)', 'the open palm thrust forward toward the target, the body leaning into it (no visible fire)'],
      ['the bell wand held low at the side, the wide sleeves and ribbons streaming back', 'the arms held slightly out, the drapery and the curls streaming back'],
      ['the bell wand swung back over the shoulder, a new talisman drawn in the free hand', 'the other hand swung back over the shoulder, palm open'],
      ['the bell wand flicked forward like a whip toward the target, the free hand following', 'the other palm swept forward toward the target in a wide arc'],
      ['the sleeves and ribbons wrapped around the body', 'the drapery wrapped around the body'],
      ['a paper talisman pinched between two fingers and raised to the lips, the bell wand drawn back', 'both hands cupped together before the lips, the eyes closed'],
      ['the talisman flung down onto the ground ahead, two fingers of the free hand pointing at the ground in a hand sign, the bell wand raised high (no seal drawn)', 'one open palm thrust down toward the ground ahead, the other hand raised high (no seal drawn)'],
      ['the bell wand held tight', 'the hands on the shoulders'],
      ['the robe and the ribbons', 'the drapery and the curls'],
      ['the robe, the sleeves and the ribbons', 'the drapery and the curls'],
      ['the bell wand pointing at the sky', 'both palms open toward the sky'],
      ['the bell wand raised straight up toward the sky in both hands, the bells ringing', 'both hands raised straight up toward the sky, palms together'],
      ['the bell wand brought down and pointed far ahead at the ground', 'one arm brought down and pointed far ahead at the ground'],
      ['a small round paper lantern from the sash', 'a small clay oil lamp from the waist clasp'],
      ['the lantern', 'the lamp'],
      ['the arms and the bell wand flung out', 'the arms flung out'],
      ['a talisman between two fingers', 'one hand on the heart'],
      ['the bell wand held upright in the other hand', 'the other hand raised, palm open'],
      ['the gold jewelry still held', 'the gold jewelry glinting'],
      ['the gold jewelry raised', 'both palms raised'],
      ['the weapon still held', 'the hands open'],
      ['the grip on the weapon loosening', 'the arms going limp'],
      ['the gold jewelry slipping from the hands', 'the arms falling loose'],
      ['the gold jewelry fallen beside the body', 'the drapery spread around the body'],
      [', gold jewelry in hand', ', the hands open'],
      ['same oversized weapon', 'same gold jewelry'],
      ['and the class weapon drawn oversized (clearly larger than life) so that it stays readable in a small sprite', 'and the gold jewelry drawn clearly so that it stays readable in a small sprite'],
    ],
  },
  lame: {
    goddess: 'Apaté',
    outfit:
      'inspired by the goddess Apate (deceit): very long straight silver-white hair; pale ice-blue eyes (flat painted, no glow); fine dark crack-like markings on one cheek, the neck and the collarbone; a spiky silver hair ornament above one ear; small silver earrings; ' +
      'an elegant long black gown slit for movement, with silver filigree like thorny branches across the shoulders and the bodice, a modest neckline, loose sheer black sleeves, black gloves to the elbow traced with silver filigree',
    role: 'Lame (shadow assassin): fast and deadly, a low compact crouching posture, black and silver accents.',
    weapon: 'two oversized slim silver daggers with ornate dark hilts and small crossguards, held in a reverse grip, the starting weapon',
    gear: 'two silver daggers',
    fix: [
      ['two large kunai', 'two silver daggers'],
      ['kunai', 'daggers'],
      ['the scarf and the hair whirling', 'the long hair and the sleeves whirling'],
      ['the scarf over the face', 'the head low'],
      ['the scarf streaming', 'the long hair streaming'],
      ['the scarf flying', 'the long hair flying'],
    ],
  },
};
const fixText = (text, fixes) => fixes.reduce((t, [from, to]) => t.split(from).join(to), text);

function lotDemiDieux() {
  const out = [
    '# Lot 8 : Demi-dieux, toutes les actions du jeu (planches 4 × 8)',
    '',
    'Une ligne par action réelle du jeu : attente, course, attaque (et son second coup quand la classe enchaîne), clic droit, esquive, A, E, R, le geste de chacune des quatre Voies (sous-classes), l\'Égide divine de la race, recul et mort, plus les états propres à la classe (garde tenue et coup bloqué, bouclier levé en marche et garde brisée, arc bandé en marche, marche furtive dans la fumée). Cela fait **16 lignes, soit 4 planches par classe**. **La Sorcière, la Lame et la Rôdeuse sont des femmes, habillées comme trois déesses : Hestia, Apaté et Artémis.**',
    '',
    '**Ordre :** la fiche de référence d\'abord (à refaire : genre et tenue changent), puis les planches 1 à 4. Pour les planches 2 à 4, **joindre la fiche et la planche 1** : Nano Banana garde ainsi la même échelle et le même dessin.',
    '',
    '**Format : image 2:1 (2 048 × 1 024 px si possible), 4 lignes de 8 cases carrées, une animation par ligne**, fond gris uni #8f8f8f, héros chibi de 3 têtes. Ranger chaque image dans `~/Pictures/gamevisual/heros/` sous le nom indiqué. ' + REGLAGES,
    '',
    '**Import :** le tag de chaque ligne est indiqué. Ceux que le jeu ne joue pas encore (Bond, Cri, Sceau, Fuite de feu, Marque, fumée, marteau, Voies…) seront branchés à l\'intégration ; en attendant, ces actions retombent sur les animations d\'aujourd\'hui.',
    '',
  ];
  for (const ck of ['guerrier', 'sorcier', 'lame', 'paladin', 'rodeur']) {
    const persona = PERSONAS[ck];
    const cls = persona ? { ...CLASSES[ck], role: persona.role, weapon: persona.weapon, gear: persona.gear } : CLASSES[ck];
    const base = hero('demidieu', ck);
    const ch = persona
      ? {
          ...base,
          subject: base.subject.replace(OUTFITS.demidieu[ck], persona.outfit).replace(CLASSES[ck].role, persona.role).replace(CLASSES[ck].weapon, persona.weapon),
          tail: base.tail.replace(CLASSES[ck].gear, persona.gear),
        }
      : base;
    const fix = (text) => (persona ? fixText(text, persona.fix) : text);
    const woman = WOMEN.has(ck);
    const subject = woman
      ? ch.subject.replace('BODY (the race):', 'GENDER: a woman, clearly female (face, figure, hair). BODY (the race):')
      : ch.subject;
    const title = ch.name.replace('Sorcier', 'Sorcière').replace('Rôdeur', 'Rôdeuse');
    const name = persona ? `${title} (femme, façon ${persona.goddess})` : ch.name;
    const rows = DEMIGOD_ROWS[ck](cls);
    if (rows.length !== 16) throw new Error(`${ck} : ${rows.length} lignes au lieu de 16`);
    out.push(`## ${name}`, '', `### ${name} — fiche de référence`, '', `**Générer 2 ou 3 variantes** et garder la meilleure. **Enregistrer :** \`gamevisual/heros/demi-dieu-${ck}-reference.jpg\``, '', fence(fix(fichePrompt({ subject, proportions: ch.proportions }))));
    for (let p = 0; p < 4; p++) {
      const sheetRows = rows.slice(p * 4, p * 4 + 4);
      const who = woman ? 'The character is a woman.' : '';
      const intro = sheetIntro('profil', who, ch.tail) +
        (p > 0 ? ' The second attached image is the first sheet of this same character: match its scale, design and colors exactly.' : '');
      out.push(
        `### ${name} — planche ${p + 1}`,
        '',
        `**Lignes :** ${sheetRows.map((row, r) => `${r + 1} ${row.fr} (\`${row.tag}\`)`).join(' · ')}.`,
        '',
        `**Joindre :** la fiche de référence${p > 0 ? ' et la planche 1' : ''}. **Enregistrer :** \`gamevisual/heros/demi-dieu-${ck}-planche${p + 1}.jpg\``,
        '',
        fence(fix(sheetPrompt({ intro, rows: sheetRows, ch: cls, bg: GREY, label: `demi-dieu-${ck}/planche${p + 1}` }))),
      );
    }
  }
  return out.join('\n');
}

// ---------------------------------------------------------------------------------------------------------------
// Fichiers

// Seul le dossier « plus-tard » est vidé : les fichiers écrits à la main à côté des lots (icônes…) restent.
rmSync(new URL('plus-tard/', OUT), { recursive: true, force: true });
mkdirSync(new URL('plus-tard/', OUT), { recursive: true });
const write = (name, text) => writeFileSync(new URL(name, OUT), text);

const REGLAGES =
  '**Aide de style (facultatif) :** joindre aussi une image de référence déjà réussie et ajouter au début du prompt : « Match the painting style of the second attached image. »';

let total = 0;
const count = (text) => (text.match(/^```text/gm) ?? []).length;

for (const lot of LOTS) {
  // Maintenant : fiche de profil + planche complète de profil.
  const body = [`# ${lot.title}`, '', lot.intro, '', '**Format : une planche complète par personnage, image carrée de 2 048 × 2 048 px si possible, 64 images en grille 8 × 8 (cases de 256 px), une ligne de 8 images par animation**, personnages chibi de 3 têtes, fond gris uni (magenta pour l\'Oublié). Ordre des lignes : [Charte 2D](../Charte%202D.md), section 4. ' + REGLAGES, ''];
  for (const ch of lot.chars) body.push(characterSection(ch, NOW));
  if (lot.extra) body.push(lot.extra());
  const text = body.join('\n');
  write(lot.file, text);
  total += count(text);

  // Plus tard : fiches et planches de face (et de dos pour les héros).
  const later = [`# ${lot.title} : face et dos (plus tard)`, '', 'À faire **après** validation de la planche complète de profil. Chaque fiche de face ou de dos se génère à partir de la **fiche de profil** jointe.', ''];
  for (const ch of lot.chars) later.push(characterSection(ch, ch.views));
  write(`plus-tard/${lot.file.replace(/^(\d+)-/, '$1-face-dos-')}`, later.join('\n'));
}

// Plus tard : les fiches de profil des autres races
{
  const out = ['# Fiches des autres races (plus tard)', '', 'Tenues nordique, égyptienne et grecque : à faire **après** la série du Yomi (voir [Charte 2D](../../Charte%202D.md), phase 2). Ces 15 héros seront de préférence obtenus en rhabillant les planches de la série du Yomi plutôt qu\'en redessinant chaque animation.', ''];
  for (const rk of Object.keys(RACES)) {
    if (PHASE1_RACES.includes(rk)) continue;
    for (const ck of Object.keys(CLASSES)) {
      const ch = hero(rk, ck);
      out.push(`### ${ch.name}`, '', `**Enregistrer :** \`2d/${ch.id}/fiche-profil.png\``, '', fence(fichePrompt({ subject: ch.subject, proportions: ch.proportions })));
    }
  }
  write('plus-tard/01-fiches-autres-races.md', out.join('\n'));
}

{
  const text = lot4x8();
  write('06-ce-qui-manque-4x8.md', text);
  total += count(text);
}
{
  const text = lotDemiDieux();
  write('08-demi-dieux-4x8.md', text);
  total += count(text);
}

console.log(`docs/prompts-2d/ écrit : ${total} prompts à faire maintenant (fiches et planches de profil).`);
