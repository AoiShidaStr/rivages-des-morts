// Prompts Nano Banana 2 de la refonte 2D (voir docs/Charte 2D.md), écrits par `npm run prompts-2d` dans
// docs/prompts-2d/, un fichier par lot, dans l'ordre de travail (voir `LOTS`) :
//   01-izanami.md, 02-yokai-du-palais.md, 03-heros-<classe>.md, 04-yokai-des-rizieres.md, 05-jorogumo.md
//   chacun : la fiche de profil de chaque personnage, puis ses planches de profil ;
//   plus-tard/            les fiches et planches de face et de dos, et les fiches des autres races.
// Une planche = une animation = 16 images en grille 4 × 4 de cases carrées, dans une image carrée
// (1 024 × 1 024 px : chaque case fait 256 px, la résolution retenue pour le jeu).
// Les prompts sont en anglais : Nano Banana les suit mieux ainsi.

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';

const OUT = new URL('../docs/prompts-2d/', import.meta.url);

// ---------------------------------------------------------------------------------------------------------------
// Blocs communs

const LOOK =
  'Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, ' +
  'clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), ' +
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
  'Realistic heroic proportions: the character is about 7 heads tall, slender and athletic, with a natural head size, and the weapon and class accessories at their real size but easy to read. ' +
  'Same art style and level of detail as our Hanyo Invocateur reference (attach heros-hanyo-invocateur.png as a style reference when it is not the character being drawn). ' +
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

const CLASSES = {
  guerrier: {
    name: 'Guerrier',
    role: 'Guerrier (berserker): heavy partial armor covering the shoulders, chest and forearms, a huge weapon carried high over the shoulder, forward-leaning aggressive posture, muted dark brown-red accents (never bright red).',
    weapon: 'a nodachi (very long greatsword), the starting weapon',
    gear: 'nodachi',
    idle: 'the tip of the nodachi rises slightly with the breath',
    windup: 'the nodachi is raised high above the head in both hands, the body coiled',
    strike: 'the nodachi slashes down and across in a wide arc, ending fully extended forward with the front knee bent',
    guard: 'the nodachi is held upright in front of the body, braced, feet planted wide',
    dodge: 'a low fast lunge forward, the body almost horizontal, the nodachi trailing behind',
    run: 'the nodachi carried high on the shoulder with one hand, the other arm swinging, the body leaning forward',
    skillWind: 'the nodachi is lifted overhead in both hands while the character inhales deeply and the stance widens',
    skillRelease: 'the nodachi is driven into the ground in front of the character with a mighty downward blow, both hands on the hilt, the body bent over it',
  },
  sorcier: {
    name: 'Sorcier',
    role: 'Sorcier (fire onmyōji): a fire sorcerer-priest in layered robes with wide sleeves, paper talismans (ofuda) and small bells on the sash, a slender upright confident posture, vermilion and black accents with small gold details. The most fragile hero: no armor at all.',
    weapon: 'a kagura-suzu bell wand (a short handle with a cluster of small gold bells and long red and white ribbons) and paper talismans, the starting weapon',
    gear: 'bell wand and paper talismans',
    idle: 'the bells and ribbons sway with the breath, a paper talisman held between two fingers of the free hand',
    windup: 'the bell wand raised to shoulder height, the free hand drawn back with a paper talisman between two fingers',
    strike: 'the free hand flicks forward to throw the talisman, the bell wand swept forward, the body leaning into the throw (no visible fire)',
    guard: 'the bell wand held across the chest, the free hand raised palm out, the feet planted',
    dodge: 'a quick backward hop, the body leaning away, the robe and ribbons flaring forward',
    run: 'the bell wand held low at the side, the wide sleeves and ribbons streaming back',
    skillWind: 'both hands rise together, the bell wand and a talisman lifted high above the head, the sleeves falling back',
    skillRelease: 'both arms swept down and forward toward the ground in front, as if drawing a circle on the floor, the body bent forward',
  },
  lame: {
    name: 'Lame',
    role: 'Lame (shadow assassin): a tight fitted dark outfit, low compact crouching posture, violet accents.',
    weapon: 'two oversized kunai held in a reverse grip, the starting weapon',
    gear: 'two large kunai',
    idle: 'the two kunai turn slightly in the reverse grip with the breath',
    windup: 'both kunai are drawn back crossed at the chest, the body dropping low',
    strike: 'the kunai slash out in a wide X-shaped sweep, one arm extended forward and the other swept back, ending in a low lunge',
    guard: 'crouched, both kunai crossed in front of the face',
    dodge: 'the character drops low and slides forward on one knee, one hand touching the ground',
    run: 'a low sprint, leaning far forward, the kunai held back along the forearms',
    skillWind: 'the body twists and drops into a very low crouch, the kunai crossed behind the back',
    skillRelease: 'a dash-through slash: the character lunges through an imaginary target in a long low stretched pose, the kunai swept forward, the torso half turned away',
  },
  paladin: {
    name: 'Paladin',
    role: 'Paladin (solar rampart): light cloth with gold trim, a rampart posture, gold accents.',
    weapon: 'a naginata (long curved polearm) and a large round temple shield, the starting weapon',
    gear: 'naginata and large shield',
    idle: 'the naginata and the shield shift slightly with the breath',
    windup: 'the naginata is drawn back over the shoulder while the shield rises',
    strike: 'a long lunging thrust, the naginata at full extension forward, the shield pulled back',
    guard: 'the shield is raised in front of the body, the character braced behind it, feet planted wide, the naginata held back',
    dodge: 'a shield charge forward, shoulder low, then a sudden stop',
    run: 'the shield forward at chest height, the naginata held diagonally behind',
    skillWind: 'the naginata is lifted overhead in both hands, then slammed down vertically',
    skillRelease: 'the naginata planted in front of the character, the shield raised beside it, the chest out, standing tall like a rampart',
  },
  rodeur: {
    name: 'Rôdeur',
    role: 'Rôdeur (hunter): a light hunter outfit, a quiver on the back, a shooting-ready posture, green accents.',
    weapon: 'a yumi (asymmetric longbow) taller than the character, the starting weapon',
    gear: 'yumi and quiver',
    idle: 'the bowstring and the quiver strap move with the breath, the head scans slightly left and right',
    windup: 'an arrow is nocked and the bowstring is drawn back to the cheek, the bow arm extended',
    strike: 'the arrow is released: the bowstring snaps forward and the bow arm stays extended, no arrow in flight',
    guard: 'crouched, the bow held across the body',
    dodge: 'an agile backward leap, knees tucked, the bow in hand',
    run: 'a swift stalking run, the bow held low in one hand, the quiver bouncing',
    skillWind: 'the character pulls three arrows from the quiver at once',
    skillRelease: 'a rapid volley: the bow raised at an angle, the string just released, the arm extended (no arrows visible)',
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
// Découpe des animations en 16 images : [première image, dernière image, description]

const GENERIC = {
  attente: (c) => [
    [1, 2, 'the neutral ready pose of the reference figure, then the chest begins to swell'],
    [3, 4, 'breathing in: the chest expands, the shoulders and the head rise slowly'],
    [5, 6, `top of the breath: the shoulders and head at their highest, the hair and cloth lifted slightly; ${c.idle}`],
    [7, 8, 'a tiny pause, then breathing out begins: the shoulders settle and the head tilts very slightly'],
    [9, 10, 'breathing out: the shoulders and the head sink, the knees give slightly, the hair and cloth sway the other way'],
    [11, 12, 'bottom of the breath: the body at its lowest, the weight shifted onto one foot'],
    [13, 14, 'the weight shifts back, the gaze moves a little, the hair and cloth settle'],
    [15, 16, 'rising smoothly back toward frame 1; frame 16 is almost identical to frame 1'],
  ],
  course: (c) => {
    const phases = [
      'contact: the right leg reaches forward and the heel touches the ground, the left leg stretched behind, the left arm forward',
      'down: the right leg bends under the weight, the body at its lowest',
      'passing: the left leg swings forward past the right leg, the body rising',
      'up: pushing off the right foot, the body at its highest, both feet almost off the ground',
      'contact: the left leg reaches forward and the heel touches the ground, the right leg stretched behind, the right arm forward',
      'down: the left leg bends under the weight, the body at its lowest',
      'passing: the right leg swings forward past the left leg, the body rising',
      'up: pushing off the left foot, the body at its highest, both feet almost off the ground',
    ];
    return phases.map((p, i) => [i * 2 + 1, i * 2 + 2, `${p}; ${c.run}`]);
  },
  attaque: (c) => [
    [1, 2, 'the ready pose of the reference figure; the weight shifts back onto the rear foot'],
    [3, 4, `wind-up: ${c.windup}, on its way`],
    [5, 6, `wind-up complete and held: ${c.windup}, held with a slight tremble`],
    [7, 8, `the strike launches, very fast, the body and the weapon at a clearly different place in every frame: ${c.strike}, on its way`],
    [9, 9, `IMPACT, the key frame of the attack: ${c.strike}, at full extension`],
    [10, 12, 'follow-through: the momentum carries the body past the impact, then slows down'],
    [13, 16, 'recovery: back to balance and to the ready pose of the reference figure; frame 16 is close to frame 1'],
  ],
  garde: (c) => [
    [1, 2, 'the ready pose of the reference figure'],
    [3, 4, `starting to move: ${c.guard}, one third of the way`],
    [5, 6, 'almost in guard, two thirds of the way'],
    [7, 10, `full guard reached, braced and firm: ${c.guard}`],
    [11, 16, 'the guard held: very slight breathing strain, only tiny movements of the hair and cloth; frames 11 to 16 are nearly identical'],
  ],
  esquive: (c) => [
    [1, 2, 'anticipation: the character crouches slightly, loading the weight'],
    [3, 4, 'push-off: the dodge begins, the body launching'],
    [5, 8, `mid-dodge, the fastest moment, the peak around frame 6: ${c.dodge}`],
    [9, 11, 'end of the movement: decelerating, still in motion'],
    [12, 13, 'landing: the knees bend to absorb the impact'],
    [14, 16, 'recovery: rising back to the ready pose of the reference figure; frame 16 is close to frame 1'],
  ],
  touche: (c) => [
    [1, 2, 'hit: the head snaps back, the torso recoils, the eyes squeezed shut'],
    [3, 5, 'maximum recoil: the body bent back, one foot sliding, the arms thrown out, the weapon still held'],
    [6, 8, 'staggering backward, fighting to keep balance'],
    [9, 12, 'recovering: straightening up, shaking it off'],
    [13, 16, `back to the ready pose of the reference figure, ${c.gear} in hand; frame 16 is close to frame 1`],
  ],
  mort: (c) => [
    [1, 2, 'the fatal hit: the head snaps back, the body recoils'],
    [3, 5, 'staggers backward, the grip on the weapon loosening'],
    [6, 8, `the knees buckle and the body sinks down, the ${c.gear} slipping from the hands`],
    [9, 11, 'falls to the ground'],
    [12, 14, `settles lying on the ground with a small bounce, the ${c.gear} fallen beside the body, the cloth settling`],
    [15, 16, 'lies completely still; frames 15 and 16 are identical. Do not draw any dissolving or fading: the body stays solid'],
  ],
  competence: (c) => [
    [1, 3, `gathering: the body coils, the eyes focused; ${c.skillWind}`],
    [4, 7, 'peak tension held with a slight tremble, everything ready to be released'],
    [8, 9, `RELEASE, the key pose of the skill: ${c.skillRelease}`],
    [10, 12, 'the release pose held at full strength, the hair and cloth flaring'],
    [13, 16, 'recovery: back to the ready pose of the reference figure; frame 16 is close to frame 1'],
  ],
};

const HERO_ANIMS = {
  attente: { fr: 'Attente', en: 'a slow idle breathing loop', loop: true, moves: 'The motion is subtle but clearly visible: over the loop, the top of the head moves down and up by about a quarter of a head height, and the shoulders, hands, weapon, hair and cloth move with it.' },
  course: { fr: 'Course', en: 'a running cycle on the spot', loop: true, moves: 'The character stays in place (no travelling across the cell). One full running cycle of 8 poses, each held for 2 frames; the legs and arms are in a different position in every pair of frames, the arms swinging opposite to the legs, the hair and cloth bouncing.' },
  attaque: { fr: 'Attaque', en: 'a single attack', loop: false, moves: 'The weapon and the arms are at a clearly different place in every frame, following one continuous path.' },
  garde: { fr: 'Garde', en: 'going into a defensive guard and holding it', loop: false, moves: 'The weapon, the arms and the stance change a little more in every frame until the guard is reached.' },
  esquive: { fr: 'Esquive', en: 'a quick dodge', loop: false, moves: 'The body is at a clearly different place and shape in every frame.' },
  touche: { fr: 'Touché', en: 'being hit and recovering', loop: false, moves: 'The body is at a clearly different place and shape in every frame.' },
  mort: { fr: 'Mort', en: 'a death animation', loop: false, moves: 'The body is at a clearly different place and shape in every frame until it lies still.' },
  competence: { fr: 'Compétence', en: 'a class skill pose', loop: false, moves: 'The body, the arms and the weapon are at a clearly different place in every frame.' },
};

// Scénarios des ennemis et des boss : le texte propre à la créature est glissé dans des étapes communes.
const CREATURE = {
  idle: (c) => [
    [1, 2, `the neutral pose of the reference figure, then it starts to breathe: ${c.idle}`],
    [3, 4, 'breathing in: the body swells and rises slightly'],
    [5, 6, 'top of the breath: the body at its highest, secondary parts (hair, cloth, limbs, tail) lifted'],
    [7, 8, 'a tiny pause, then breathing out begins'],
    [9, 10, 'breathing out: the body sinks, the secondary parts sway the other way'],
    [11, 12, 'bottom of the breath: the body at its lowest, the weight shifted'],
    [13, 14, 'the weight shifts back, the head or gaze moves a little, everything settles'],
    [15, 16, 'rising smoothly back toward frame 1; frame 16 is almost identical to frame 1'],
  ],
  move: (c) => [
    [1, 4, `locomotion cycle, first beat: ${c.move}; the body at its lowest position`],
    [5, 8, 'second beat: the body rising, the limbs or parts passing each other'],
    [9, 12, 'third beat: the mirror of the first beat (the opposite side or phase), the body at its lowest'],
    [13, 16, 'fourth beat: the body rising again, leading back to the start of the cycle'],
  ],
  windup: (c) => [
    [1, 4, `from the idle pose, the body starts to build tension: ${c.windup}, first third of the movement`],
    [5, 10, `${c.windup}, growing more and more tense`],
    [11, 14, 'maximum tension: the pose fully reached, the body trembling slightly, the eyes or head fixed on the target'],
    [15, 16, 'frozen at maximum tension; frames 15 and 16 are nearly identical'],
  ],
  attack: (c) => [
    [1, 2, 'starts from the pose of maximum tension'],
    [3, 5, `the strike launches, very fast, the body at a clearly different place in every frame: ${c.strike}, on its way`],
    [6, 6, `IMPACT, the key frame of the attack: ${c.strike}, at full extension`],
    [7, 10, 'follow-through: the momentum carries the body past the impact, then slows down'],
    [11, 16, 'recovery: back to the idle pose of the reference figure; frame 16 is close to the idle pose'],
  ],
  hit: (c) => [
    [1, 2, `hit: ${c.hit}`],
    [3, 5, 'maximum recoil, the body thrown off balance'],
    [6, 9, 'staggering, fighting to recover'],
    [10, 13, 'recovering, regaining the normal shape'],
    [14, 16, 'back to the idle pose of the reference figure; frame 16 is close to frame 1'],
  ],
  death: (c) => [
    [1, 2, 'the fatal hit: the body recoils'],
    [3, 6, 'staggers, the strength draining'],
    [7, 10, `the collapse: ${c.death}`],
    [11, 14, 'the body hits the ground and settles, a small bounce, secondary parts settling'],
    [15, 16, 'lies completely still; frames 15 and 16 are identical. Do not draw any dissolving or fading: the body stays solid'],
  ],
  special: (c) => [
    [1, 4, `the movement builds up: ${c.special.text}, first third`],
    [5, 12, `${c.special.text}, fully reached and sustained, with only small rhythmic movements`],
    [13, 16, c.special.loop ? 'easing back toward the first frame of this sheet, a seamless loop' : 'easing back to the idle pose of the reference figure; frame 16 is close to the idle pose'],
  ],
};

const CREATURE_ANIMS = [
  { key: 'idle', fr: 'Attente', en: 'a slow idle loop', loop: true, moves: 'The motion is subtle but clearly visible over the loop.' },
  { key: 'move', fr: 'Déplacement', en: 'a locomotion cycle on the spot', loop: true, moves: 'The character stays in place (no travelling across the cell).' },
  { key: 'windup', fr: 'Anticipation', en: 'the wind-up that telegraphs an attack', loop: false, moves: 'The body moves a little more in every frame toward the final tense pose.' },
  { key: 'attack', fr: 'Attaque', en: 'a single attack', loop: false, moves: 'The body is at a clearly different place in every frame, following one continuous path.' },
  { key: 'hit', fr: 'Touché', en: 'being hit and recovering', loop: false, moves: 'The body is at a clearly different place and shape in every frame.' },
  { key: 'death', fr: 'Mort', en: 'a death animation', loop: false, moves: 'The body is at a clearly different place and shape in every frame until it lies still.' },
];

// ---------------------------------------------------------------------------------------------------------------
// Construction des prompts

const FRAMES = 16;

function checkBeats(beats, label) {
  let next = 1;
  for (const [from, to] of beats) {
    if (from !== next || to < from) throw new Error(`${label} : étapes discontinues à l'image ${from}`);
    next = to + 1;
  }
  if (next !== FRAMES + 1) throw new Error(`${label} : les étapes s'arrêtent à l'image ${next - 1}`);
}

const frameRange = (from, to) => (from === to ? `Frame ${from}` : `Frames ${from} to ${to}`);

/** Planche d'animation : 16 images, grille 4 × 4 de cases carrées, dans une image carrée. */
function animationPrompt({ intro, beats, anim, bg, label }) {
  checkBeats(beats, label);
  const lines = [
    intro,
    'Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).',
    'The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.',
  ];
  for (const [from, to, text] of beats) lines.push(`${frameRange(from, to)}: ${text}.`);
  lines.push(anim.moves);
  lines.push(anim.loop ? 'It is a seamless loop: frame 16 leads smoothly back to frame 1.' : 'It plays once, from frame 1 to frame 16.');
  lines.push(
    'Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.',
    'The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.',
    'DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.',
    'DO NOT simply copy the reference figure into every cell.',
    'DO NOT change the camera angle, the facing direction or the design from one frame to the next.',
    'DO NOT move the character across the sheet: each frame stays centered in its own cell.',
    LOOK,
    bgText(bg),
    NOFX,
  );
  return lines.join('\n');
}

const FICHE_OPEN = 'Character reference sheet for a 2D action RPG in which dead souls from every mythology fight across an archipelago of collapsed afterlives. ';

/** Fiche de profil, générée de zéro : un seul personnage, une seule vue. */
function fichePrompt({ subject, proportions, bg = GREY, wide = false }) {
  return [
    `${FICHE_OPEN}One single character, shown once, full body, in ${VIEW.profil.fiche}. ${subject} Neutral calm idle stance.`,
    proportions,
    'The figure is large, about 85% of the image height, centered, with a wide empty margin around it.',
    wide ? 'Landscape 16:9 image at the highest resolution available.' : 'Portrait 3:4 image at the highest resolution available.',
    LOOK,
    bgText(bg),
    NOFX,
  ].join('\n');
}

/** Fiche de face ou de dos, générée à partir de la fiche de profil jointe. */
function vueFichePrompt({ subject, view, bg = GREY, wide = false }) {
  return [
    `The attached image is the reference sheet of our game character, a single figure seen in ${VIEW.profil.fiche}.`,
    `Draw the SAME character, alone, full body, in ${VIEW[view].fiche}: same design, proportions, outfit, colors, weapon and accessories, nothing added or removed, same scale and same neutral calm idle stance. Invent the details hidden in the attached view so that they stay consistent with the design. ${subject}`,
    'The figure is large, about 85% of the image height, centered, with a wide empty margin around it.',
    wide ? 'Landscape 16:9 image at the highest resolution available.' : 'Portrait 3:4 image at the highest resolution available.',
    LOOK,
    bgText(bg),
    NOFX,
  ].join('\n');
}

const PROPORTIONS_CREATURE =
  'Follow the natural shape of this creature, drawn in the same semi-realistic painted style as the heroes. A strong readable silhouette from far away; the character is drawn filling the full image height of its figure, with a clean outline.';

const fence = (s) => ['```text', s, '```', ''].join('\n');

/** Introduction d'un prompt d'animation : l'image jointe est la fiche de la vue. */
const animIntro = (vk, who, tail) =>
  `The attached image is the reference sheet of our game character: a single figure seen in ${VIEW[vk].fiche}.${who ? ' ' + who : ''}` +
  ` Draw a 2D sprite animation sheet of this exact character performing ${tail}` +
  ' Every frame is drawn in that same view and camera angle, exactly like the reference figure.';

// ---------------------------------------------------------------------------------------------------------------
// Personnages, rangés en lots par ordre de travail

const heroSubject = (rk, race, ck, cls) =>
  `The character belongs to the ${race.name} race and the ${cls.name} class. BODY (the race): ${race.text} OUTFIT (follows the culture of the race, nothing from any other culture): ${OUTFITS[rk][ck]}. ROLE (the class): ${cls.role} WEAPON: ${cls.weapon}. The race decides the body, the face and the clothing culture; the class only decides the role, the posture, the silhouette, the accent color and the weapon.`;
const HERO_PROP = PROPORTIONS_HERO + ' All twenty heroes of the game share exactly the same total height.';
const BOSS_PROP = PROPORTIONS_CREATURE + ' A boss: the head and the body must be clearly readable.';

const creatureAnims = (c) => {
  const list = [...CREATURE_ANIMS];
  if (c.special) list.push({ key: 'special', fr: c.special.name, en: `a special pose (${c.special.name})`, loop: c.special.loop, moves: 'The body is at a clearly different place in every frame.' });
  return list;
};

/** Un personnage = tout ce qu'il faut pour écrire sa fiche et ses planches. */
function hero(rk, ck) {
  const race = RACES[rk];
  const cls = CLASSES[ck];
  return {
    id: `${rk}-${ck}`,
    name: `${race.name} ${cls.name}`,
    kind: 'hero',
    subject: heroSubject(rk, race, ck, cls),
    proportions: HERO_PROP,
    bg: GREY,
    wide: false,
    anims: Object.entries(HERO_ANIMS).map(([key, a]) => ({ ...a, key })),
    beats: (a) => GENERIC[a.key](cls),
    tail: (a) => `${a.en}: same face, proportions, outfit, colors, ${cls.gear}, nothing added or removed.`,
    who: '',
    views: ['face', 'dos'],
  };
}
function creature(key, data, kind) {
  return {
    id: key,
    name: data.name,
    kind,
    subject: `The character is ${data.look}`,
    proportions: kind === 'boss' ? BOSS_PROP : PROPORTIONS_CREATURE,
    bg: data.bg ?? GREY,
    wide: !!data.wide,
    anims: creatureAnims(data),
    beats: (a) => CREATURE[a.key](data),
    tail: (a) => `${a.en}: same design, proportions, colors, nothing added or removed.`,
    who: `The character is ${data.look}`,
    views: ['face'],
  };
}

/** Écrit la fiche (de profil, de zéro, ou de face/dos à partir du profil) et les planches des vues demandées. */
function characterSection(ch, views, later) {
  const out = [`## ${ch.name}`, ''];
  for (const vk of views) {
    const prompt = vk === 'profil'
      ? fichePrompt({ subject: ch.subject, proportions: ch.proportions, bg: ch.bg, wide: ch.wide })
      : vueFichePrompt({ subject: ch.subject, view: vk, bg: ch.bg, wide: ch.wide });
    out.push(
      `### ${ch.name} — fiche ${vk}`,
      '',
      vk === 'profil'
        ? `**Générer 2 ou 3 variantes** et garder la meilleure. **Enregistrer :** \`2d/${ch.id}/fiche-profil.png\``
        : `**Joindre :** \`2d/${ch.id}/fiche-profil.png\`. **Enregistrer :** \`2d/${ch.id}/fiche-${vk}.png\``,
      '',
      fence(prompt),
    );
    for (const a of ch.anims) {
      const beats = ch.beats(a);
      const intro = animIntro(vk, ch.who, ch.tail(a));
      const p = animationPrompt({ intro, beats, anim: a, bg: ch.bg, label: `${ch.id}/${vk}/${a.key}` });
      out.push(
        `### ${ch.name} — ${vk} — ${a.fr}`,
        '',
        `**Joindre :** \`fiche-${vk}.png\`. **Enregistrer :** \`2d/${ch.id}/${vk}-${a.key}.png\``,
        '',
        fence(p),
      );
    }
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
    title: 'Lot 1 : Izanami (fait, dans le jeu)',
    intro: 'Les deux formes d\'Izanami, le boss du Palais. Le pêcher de son arène (décor, 2 états) est à la fin.',
    chars: [creature('izanami', BOSSES.izanami, 'boss'), creature('izanamiRevelee', BOSSES.izanamiRevelee, 'boss')],
    extra: () => ['## Pêcher de l\'arène (image fixe, 2 états)', '', ...pecherPrompts().flatMap((p) => [`### ${p.title}`, '', `**Enregistrer :** \`2d/${p.id}/${p.id}.png\``, '', fence(p.prompt)])].join('\n'),
  },
  {
    file: '02-yokai-du-palais.md',
    title: 'Lot 2 : yokai du Palais d\'Izanami (fait, dans le jeu)',
    intro: 'Shikome, ikazuchi et ikusa : les trois yokai du Palais.',
    chars: [creature('shikome', ENEMIES.shikome, 'enemy'), creature('ikazuchi', ENEMIES.ikazuchi, 'enemy'), creature('ikusa', ENEMIES.ikusa, 'enemy')],
  },
  ...Object.entries(CLASSES).map(([ck, cls], i) => ({
    file: `03-heros-${ck}.md`,
    title: `Lot 3 : héros ${cls.name} (série du Yomi, Hanyō)`,
    intro: 'Phase 1 : les tenues du Yomi, avec la race Hanyō. Les autres races viendront plus tard.',
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
    intro: 'Le premier boss a déjà ses planches peintes. À refaire en dernier avec Izanami comme référence de style.',
    chars: [creature('jorogumo', BOSSES.jorogumo, 'boss'), creature('jorogumoAraignee', BOSSES.jorogumoAraignee, 'boss')],
  },
];

// ---------------------------------------------------------------------------------------------------------------
// Fichiers

rmSync(OUT, { recursive: true, force: true });
mkdirSync(new URL('plus-tard/', OUT), { recursive: true });
const write = (name, text) => writeFileSync(new URL(name, OUT), text);

const REGLAGES =
  '**Aide de style (facultatif) :** joindre aussi une image de référence déjà réussie et ajouter au début du prompt : « Match the painting style of the second attached image. »';

let total = 0;
const count = (text) => (text.match(/^```text/gm) ?? []).length;

for (const lot of LOTS) {
  // Maintenant : fiche de profil + 8 (héros) ou 6-7 (créatures) planches de profil.
  const body = [`# ${lot.title}`, '', lot.intro, '', '**Format de toutes les planches : image carrée 1 024 × 1 024 px, 16 images en grille 4 × 4 (cases de 256 px)**, fond gris uni (magenta pour l\'Oublié). ' + REGLAGES, ''];
  for (const ch of lot.chars) body.push(characterSection(ch, NOW, false));
  if (lot.extra) body.push(lot.extra());
  const text = body.join('\n');
  write(lot.file, text);
  total += count(text);

  // Plus tard : fiches et planches de face (et de dos pour les héros).
  const later = [`# ${lot.title} : face et dos (plus tard)`, '', 'À faire **après** validation des planches de profil. Chaque fiche de face ou de dos se génère à partir de la **fiche de profil** jointe.', ''];
  for (const ch of lot.chars) later.push(characterSection(ch, ch.views, true));
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

console.log(`docs/prompts-2d/ écrit : ${total} prompts à faire maintenant (fiches et planches de profil).`);
