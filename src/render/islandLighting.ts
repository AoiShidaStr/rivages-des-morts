import {
  Color3,
  Constants,
  Effect,
  ProceduralTexture,
  ShaderMaterial,
  Texture,
  Vector2,
  Vector3,
  Vector4,
  type BaseTexture,
  type Scene,
} from '@babylonjs/core';
import type { IslandMap as MapData, MapLight, ScreenPoint } from '../game/island';

/**
 * Éclairage de l'île v3 (pixel art) : l'heure du jour, les ombres des falaises, des arbres et des maisons qui tournent
 * avec le soleil, les lanternes, la forge et la lave la nuit, la torche du héros, les reflets de l'eau et la brume.
 *
 * La carte vient avec son relief (tools/ile-v3) : pour chaque texel, la normale de la surface peinte et sa hauteur.
 * Le shader du sol relit la lumière de chaque texel ; celui des sprites éclaire les décors comme le texel de la carte
 * qu'ils recouvrent (leur relief y est), et les personnages comme une image debout sur le sol, face à la caméra.
 * À midi, la lumière redonne exactement l'image peinte.
 *
 * Repère de la lumière : u vers la droite, v vers le fond (au sol), h la hauteur. Un point à la hauteur h est peint
 * √2·h plus haut sur la carte : le héros, qui marche « sur l'image », est au sol en v - √2·h.
 */

const SPRITES = `${import.meta.env.BASE_URL}sprites/`;
const MAX_LIGHTS = 16;
/** Une heure de jeu par minute le jour, deux fois plus vite la nuit. */
const HOURS_PER_SECOND = 1 / 60;
const NIGHT_SPEED = 2;
const START_HOUR = 9;
/** Paliers de lumière tramés, comme dans un jeu en pixel art (0 : continu). */
const STEPS = 6;
/**
 * Les ombres du soleil coûtent cher (une quarantaine de lectures du relief par pixel) : elles sont calculées une fois
 * par texel, dans des bandes de la carte autour de la caméra, et recalculées quand le soleil a tourné ou que la
 * caméra approche du bord. Trois bandes de 512 lignes couvrent bien plus que la hauteur de la vue (600 lignes).
 */
const BAND_WIDTH = 2560;
const BAND_HEIGHT = 512;
const BANDS = 3;
/** Le soleil a tourné de plus de 0,4° : la bande est recalculée (une par image au plus). */
const SUN_STEP = Math.cos((0.4 * Math.PI) / 180);
/** Marge, en texels, entre le bord de la vue et celui d'une bande. */
const BAND_MARGIN = 96;

type Rgb = [number, number, number];

/** La lumière pour laquelle l'art est peint, en haut à gauche. */
const REF = norm([-0.55, -0.15, 0.82]);

interface Key {
  h: number;
  sun: Rgb;
  color: Rgb;
  ambient: Rgb;
  fog: number;
  fogColor: Rgb;
  night: number;
}

/** Images clés de la journée, interpolées : la lune la nuit, l'aube rose, le soir orange. */
const KEYS: Key[] = [
  { h: 0, sun: [-0.45, 0.25, 0.86], color: [0.16, 0.2, 0.36], ambient: [0.15, 0.14, 0.3], fog: 0.55, fogColor: [0.24, 0.24, 0.38], night: 1 },
  { h: 4.5, sun: [0.6, 0.3, 0.74], color: [0.18, 0.2, 0.34], ambient: [0.17, 0.16, 0.3], fog: 0.6, fogColor: [0.3, 0.29, 0.42], night: 1 },
  { h: 6.5, sun: [0.88, -0.1, 0.46], color: [0.95, 0.62, 0.55], ambient: [0.36, 0.32, 0.44], fog: 0.45, fogColor: [0.86, 0.74, 0.78], night: 0.35 },
  { h: 9, sun: [0.35, -0.3, 0.88], color: [0.6, 0.57, 0.52], ambient: [0.44, 0.44, 0.46], fog: 0.15, fogColor: [0.85, 0.85, 0.86], night: 0 },
  { h: 12, sun: REF, color: [0.55, 0.55, 0.55], ambient: [0.45, 0.45, 0.45], fog: 0, fogColor: [0.85, 0.85, 0.86], night: 0 },
  { h: 16, sun: [-0.75, -0.05, 0.66], color: [0.6, 0.53, 0.45], ambient: [0.42, 0.4, 0.44], fog: 0.05, fogColor: [0.85, 0.8, 0.8], night: 0 },
  { h: 18.5, sun: [-0.92, 0.12, 0.37], color: [1.0, 0.5, 0.28], ambient: [0.32, 0.22, 0.38], fog: 0.25, fogColor: [0.62, 0.38, 0.45], night: 0.55 },
  { h: 20, sun: [-0.6, 0.3, 0.74], color: [0.25, 0.2, 0.38], ambient: [0.2, 0.16, 0.34], fog: 0.45, fogColor: [0.3, 0.24, 0.4], night: 0.9 },
  { h: 24, sun: [-0.45, 0.25, 0.86], color: [0.16, 0.2, 0.36], ambient: [0.15, 0.14, 0.3], fog: 0.55, fogColor: [0.24, 0.24, 0.38], night: 1 },
];

function norm(v: Rgb): Rgb {
  const l = Math.hypot(...v);
  return [v[0] / l, v[1] / l, v[2] / l];
}

function moment(hour: number): Key {
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1].h <= hour) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const t = (hour - a.h) / (b.h - a.h);
  const mix = (x: Rgb, y: Rgb): Rgb => [x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t];
  return {
    h: hour,
    sun: norm(mix(a.sun, b.sun)),
    color: mix(a.color, b.color),
    ambient: mix(a.ambient, b.ambient),
    fog: a.fog + (b.fog - a.fog) * t,
    fogColor: mix(a.fogColor, b.fogColor),
    night: a.night + (b.night - a.night) * t,
  };
}

/** `?ombres=0` dans l'adresse : sans ombres portées (essais de vitesse). */
function shadowsWanted(): boolean {
  return new URLSearchParams(location.search).get('ombres') !== '0';
}

/** `?heure=21` dans l'adresse : l'heure reste fixe (essais, captures). */
function fixedHour(): number | null {
  const value = new URLSearchParams(location.search).get('heure');
  const hour = value === null ? NaN : Number.parseFloat(value.replace(',', '.'));
  return Number.isFinite(hour) ? ((hour % 24) + 24) % 24 : null;
}

// --- Shaders -----------------------------------------------------------------------

const BAND_UNIFORMS = Array.from({ length: BANDS }, (_, i) => `uBande${i}`);
const BAND_SAMPLERS = Array.from({ length: BANDS }, (_, i) => `uOmbre${i}`);
const LIGHT_UNIFORMS = [
  'uN', 'uMonde', 'uSoleil', 'uSoleilCoul', 'uAmbiant', 'uRef', 'uBrumeCoul', 'uReglages', 'uReglages2', 'uLumPos', 'uLumCoul',
  ...BAND_UNIFORMS,
];
const LIGHT_SAMPLERS = ['uSol', 'uRelief', 'uHalo', ...BAND_SAMPLERS];

// GLSL ES 1.0 : WebGL 1 et 2. Les textures sont lues au texel près : la lumière change par pixel de l'art.
const COMMON = `
precision highp float;
uniform sampler2D uSol;      // RGB : la carte, A = 1 - émissif / 2
uniform sampler2D uRelief;   // RG : x, y de la normale, B : hauteur / 12, A = 1 - 0,75 × eau (0,25 : un décor)
uniform sampler2D uHalo;     // lumière colorée de la lave et du portail, lissée
uniform float uN;            // taille de la carte en texels
uniform vec2 uMonde;         // étendue de l'image dans le monde (u, v)
uniform vec3 uSoleil;        // direction vers le soleil (ou la lune)
uniform vec3 uSoleilCoul;
uniform vec3 uAmbiant;
uniform vec3 uRef;           // la lumière pour laquelle l'art est peint
uniform vec3 uBrumeCoul;
uniform vec4 uReglages;      // temps, brume, halo, émissif
uniform vec4 uReglages2;     // paliers, ombres, nombre de lumières, scale2x
uniform vec4 uLumPos[${MAX_LIGHTS}];   // u, v, h, rayon
uniform vec4 uLumCoul[${MAX_LIGHTS}];  // r, g, b, force
${BAND_SAMPLERS.map((n) => `uniform sampler2D ${n};`).join('\n')}
${BAND_UNIFORMS.map((n) => `uniform vec4 ${n};`).join('\n')}  // bandes d'ombre : x, y du coin (texel), 1 si calculée
const vec2 BANDE = vec2(${BAND_WIDTH}.0, ${BAND_HEIGHT}.0);

// Texel t de la carte, compté depuis le coin haut gauche (les textures sont retournées : le haut de l'image en v = 1).
vec4 texel(sampler2D s, vec2 t) { return texture2D(s, vec2(t.x + 0.5, uN - t.y - 0.5) / uN); }
vec3 normale(vec4 r) {
  vec2 xy = r.rg * 2.0 - 1.0;
  return normalize(vec3(xy, sqrt(max(1.0 - dot(xy, xy), 0.0))));
}
float emissif(vec4 s) { return clamp((1.0 - s.a) * 1.9922, 0.0, 1.0); }

float hasard(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float bruit(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hasard(i), hasard(i + vec2(1.0, 0.0)), f.x), mix(hasard(i + vec2(0.0, 1.0)), hasard(i + vec2(1.0, 1.0)), f.x), f.y);
}
float bayer2(vec2 a) { a = floor(a); return fract(a.x * 0.5 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(a * 0.5) * 0.25 + bayer2(a); }

// Ombres portées : la carte vue de 3/4 cache tout ce qui est derrière une surface plus haute sur la même ligne de vue ;
// un rayon vers la lumière est dans l'ombre dès que la hauteur peinte là où il se trouve à l'écran le dépasse. Renvoie
// de combien. Le relief y voit des colonnes pleines jusqu'au sol : juste pour le terrain, pas pour un arbre ou une
// maison (relief A = 207 : un décor), qui n'est qu'une coque, sinon leurs ombres s'allongent en grandes traînées.
float cache(vec3 R) {
  vec2 t = vec2(R.x / uMonde.x + 0.5, 0.5 - (R.y + 1.41421 * R.z) / uMonde.y);
  if (t.x < 0.0 || t.x > 1.0 || t.y < 0.0 || t.y > 1.0) return 0.0;
  vec4 r = texel(uRelief, floor(t * uN));
  float d = r.b * 12.0 - R.z;
  return abs(r.a - 0.8118) < 0.03 && d > 2.5 ? 0.0 : d;
}
// Vers une lumière proche : on s'arrête un peu avant elle, sinon la lanterne qui la porte la cacherait.
float ombreProche(vec3 P, vec3 L, float dist) {
  float vis = 1.0;
  float span = max(dist - 0.9, 0.0);
  for (int i = 1; i < 14; i++) {
    float t = span * float(i) / 13.0;
    if (cache(P + L * t) > 0.1) { vis = 0.0; break; }
  }
  return vis;
}
float ombre(vec3 P, vec3 L, float loin) {
  float t = 0.12;
  float vis = 1.0;
  for (int i = 0; i < 40; i++) {
    vec3 R = P + L * t;
    float d = cache(R);
    if (d > 0.08) vis = min(vis, 1.0 - clamp(d * 3.0, 0.0, 1.0) * clamp(1.0 - t / loin * 0.6, 0.4, 1.0));
    if (vis <= 0.0 || R.z > 12.0) break;
    t += 0.06 + t * 0.07;
    if (t > loin) break;
  }
  return clamp(vis, 0.0, 1.0);
}

// Le soleil vu du texel t (P : son point), lu dans les bandes déjà calculées, sinon calculé ici.
bool dansBande(vec4 b, vec2 t) {
  vec2 d = t - b.xy;
  return b.z > 0.5 && d.x >= 0.0 && d.y >= 0.0 && d.x < BANDE.x && d.y < BANDE.y;
}
float soleilVu(vec2 t, vec3 P) {
${BAND_UNIFORMS.map((n, i) => `  if (dansBande(${n}, t)) return texture2D(uOmbre${i}, (t - ${n}.xy + 0.5) / BANDE).r;`).join('\n')}
  return ombre(P, uSoleil, 14.0 + 22.0 * (1.0 - uSoleil.z));
}

// La lumière reçue en P, de normale n ; base : le texel de la carte (tramage des paliers, halo) ; t : celui où lire
// l'ombre du soleil (le sol sous les pieds, pour un personnage).
vec3 eclairer(vec3 P, vec3 n, vec2 base, vec2 t, out vec3 reflet) {
  float temps = uReglages.x;
  float vSol = uReglages2.y > 0.5 ? mix(0.08, 1.0, soleilVu(t, P)) : 1.0;
  // relative à la lumière peinte : midi redonne l'image d'origine
  float lref = 0.45 + 0.55 * max(dot(n, uRef), 0.0);
  vec3 lumiere = (uAmbiant + uSoleilCoul * max(dot(n, uSoleil), 0.0) * vSol) / lref;

  vec3 V = vec3(0.0, -0.81650, 0.57735);
  vec3 nw = normalize(vec3(0.07 * sin(P.x * 1.7 + temps * 1.3) + 0.04 * sin(P.y * 2.3 - temps),
                           0.07 * cos(P.y * 1.9 + temps * 1.1), 1.0));
  vec3 ponct = vec3(0.0);
  reflet = vec3(0.0);
  for (int i = 0; i < ${MAX_LIGHTS}; i++) {
    if (float(i) >= uReglages2.z) break;
    vec3 L = uLumPos[i].xyz - P;
    float dist = length(L);
    float a = clamp(1.0 - dist / uLumPos[i].w, 0.0, 1.0);
    if (a <= 0.0) continue;
    a *= a;
    L /= dist;
    vec3 c = uLumCoul[i].rgb * uLumCoul[i].a * a;
    float vis = uReglages2.y > 0.5 ? ombreProche(P, L, dist) : 1.0;
    ponct += c * (0.3 + 0.7 * max(dot(n, L), 0.0)) * (0.25 + 0.75 * vis);
    reflet += c * pow(max(dot(reflect(-L, nw), V), 0.0), 16.0);
  }
  vec2 tc = (base + 0.5) / uN;
  lumiere += ponct + texture2D(uHalo, vec2(tc.x, 1.0 - tc.y)).rgb * uReglages.z * (0.55 + 0.45 * max(n.z, 0.0));

  if (uReglages2.x > 0.0) {
    float m = max(max(lumiere.r, lumiere.g), lumiere.b);
    float q = floor(m * uReglages2.x + 0.5 + (bayer4(base) - 0.5) * 0.7) / uReglages2.x;
    lumiere *= max(q, 0.0) / max(m, 0.001);
  }
  return lumiere;
}

// Brume de Yomi : plus épaisse au ras de l'eau, en nappes qui dérivent, tramée.
vec3 brume(vec3 col, vec3 P, float h, vec2 base) {
  if (uReglages.y <= 0.0) return col;
  float temps = uReglages.x;
  float nb = bruit(P.xy * 0.045 + vec2(temps * 0.025, temps * 0.01)) * 0.65 + bruit(P.xy * 0.11 - vec2(temps * 0.04, 0.0)) * 0.35;
  float bas = clamp(1.0 - h / 7.0, 0.0, 1.0);
  float fq = smoothstep(0.42, 0.85, nb) * (0.35 + 0.65 * bas) * uReglages.y;
  fq = floor(fq * 5.0 + bayer4(base)) / 5.0;
  return mix(col, uBrumeCoul, clamp(fq, 0.0, 0.8));
}
`;

const GROUND_VERTEX = `
precision highp float;
attribute vec3 position;
attribute vec2 uv;
uniform mat4 worldViewProjection;
varying vec2 vUV;
void main(void) {
  vUV = uv;
  gl_Position = worldViewProjection * vec4(position, 1.0);
}`;

const GROUND_FRAGMENT = `${COMMON}
varying vec2 vUV;
vec3 albedoEn(vec2 t) { return texel(uSol, t).rgb; }
bool egal(vec3 a, vec3 b) { return all(lessThan(abs(a - b), vec3(0.002))); }

// Scale2x (EPX) : chaque texel devient 2 × 2 pixels qui arrondissent les diagonales.
vec3 scale2x(vec2 base, vec2 f) {
  vec3 E = albedoEn(base);
  if (uReglages2.w < 0.5) return E;
  vec3 B = albedoEn(base + vec2(0.0, -1.0));
  vec3 H = albedoEn(base + vec2(0.0, 1.0));
  vec3 D = albedoEn(base + vec2(-1.0, 0.0));
  vec3 F = albedoEn(base + vec2(1.0, 0.0));
  if (egal(B, H) || egal(D, F)) return E;
  bool haut = f.y < 0.5;
  bool gauche = f.x < 0.5;
  if (haut && gauche) return egal(D, B) ? D : E;
  if (haut) return egal(B, F) ? F : E;
  if (gauche) return egal(D, H) ? D : E;
  return egal(H, F) ? F : E;
}

void main(void) {
  float temps = uReglages.x;
  vec2 p = vec2(vUV.x, 1.0 - vUV.y) * uN;
  vec2 base = floor(p);
  vec3 albedo = scale2x(base, p - base);
  vec4 r = texel(uRelief, base);
  vec3 n = normale(r);
  float h = r.b * 12.0;
  vec2 tc = (base + 0.5) / uN;
  vec3 P = vec3((tc.x - 0.5) * uMonde.x, (0.5 - tc.y) * uMonde.y - 1.41421 * h, h);
  vec3 reflet;
  vec3 lumiere = eclairer(P, n, base, base, reflet);
  vec3 col = albedo * lumiere;

  // émissif : la lave, le portail, les flammes restent vives dans le noir
  float vacille = 0.86 + 0.14 * sin(temps * 2.7 + P.x * 0.9 + P.y * 0.6);
  col = max(col, albedo * emissif(texel(uSol, base)) * uReglages.w * vacille * 1.3);

  // eau : scintillement au soleil, reflets des lanternes la nuit ; cascade : des filets clairs qui descendent
  float eau = (1.0 - r.a) / 0.75;
  if (eau > 0.6 && eau < 0.9) {
    float s = sin(base.x * 0.31 + temps * 1.4 + sin(base.y * 0.13)) * sin(base.y * 0.53 - temps * 0.9);
    float eclat = step(0.965, s) * step(0.45, hasard(base + floor(temps * 2.0)));
    col += vec3(0.66, 0.83, 0.83) * eclat * 0.9 * dot(uSoleilCoul, vec3(0.6));
    col += reflet * 2.4;
  }
  if (eau > 0.95) {
    float t = fract((base.y - temps * 38.0) / 11.0 + hasard(vec2(base.x, 7.0)) * 0.8);
    col = mix(col, vec3(0.80, 0.92, 0.92) * lumiere, step(t, 0.16) * 0.55);
  }
  gl_FragColor = vec4(brume(col, P, h, base), 1.0);
}`;

const SPRITE_VERTEX = `
precision highp float;
attribute vec3 position;
attribute vec2 uv;
uniform mat4 world;
uniform mat4 worldViewProjection;
varying vec2 vUV;
varying vec3 vMonde;
void main(void) {
  vUV = uv;
  vMonde = (world * vec4(position, 1.0)).xyz;
  gl_Position = worldViewProjection * vec4(position, 1.0);
}`;

// Mêmes réglages que le sprite ordinaire (renderer.ts : teinte, éclair, transparence, miroir, case de planche).
const SPRITE_FRAGMENT = `${COMMON}
varying vec2 vUV;
varying vec3 vMonde;
uniform sampler2D textureSampler;
uniform sampler2D uHauteur;  // hauteur du sol seul / 12 (sans les décors)
uniform vec3 tint;
uniform float flash;
uniform vec3 flashColor;
uniform float alpha;
uniform float flipX;
uniform vec4 frameRect;
uniform float uDecor;
void main(void) {
  vec2 uv = frameRect.xy + vec2(mix(vUV.x, 1.0 - vUV.x, flipX), vUV.y) * frameRect.zw;
  vec4 color = texture2D(textureSampler, uv);
  float a = color.a * alpha;
  if (a < 0.02) discard;
  // Le monde : x, z au sol, y vers le haut ; l'écran : u vers la droite, v vers le haut (vue à 35,26°).
  float u = dot(vMonde.xz, vec2(0.707107, -0.707107));
  float v = dot(vMonde.xz, vec2(0.707107, 0.707107));
  // Le texel de la carte qui est à cet endroit de l'écran
  vec2 base = floor(vec2(u / uMonde.x + 0.5, 0.5 - (v + 1.414214 * vMonde.y) / uMonde.y) * uN);
  vec3 P;
  vec3 n;
  float h;
  float em = 0.0;
  vec2 ombreEn = base;
  if (uDecor > 0.5) {
    // un décor de la carte : son relief est dans celui de la carte, là où on le voit
    vec4 r = texel(uRelief, base);
    n = normale(r);
    h = r.b * 12.0;
    vec2 tc = (base + 0.5) / uN;
    P = vec3((tc.x - 0.5) * uMonde.x, (0.5 - tc.y) * uMonde.y - 1.41421 * h, h);
    em = emissif(texel(uSol, base));
  } else {
    // un personnage : une image debout sur le sol, tournée vers la caméra
    float vPied = v - 0.707107 * vMonde.y;
    vec2 pied = vec2(u / uMonde.x + 0.5, 0.5 - vPied / uMonde.y);
    float sol = texture2D(uHauteur, vec2(pied.x, 1.0 - pied.y)).r * 12.0;
    h = sol + vMonde.y * 1.5;
    P = vec3(u, vPied - 1.41421 * sol, h);
    n = normalize(vec3(0.0, -0.6, 0.8));
    // à l'ombre si le sol sous ses pieds l'est
    ombreEn = floor(pied * uN);
  }
  vec3 reflet;
  vec3 lumiere = eclairer(P, n, base, ombreEn, reflet);
  vec3 col = max(color.rgb * tint * lumiere, color.rgb * em * uReglages.w * 1.2);
  gl_FragColor = vec4(mix(brume(col, P, h, base), flashColor, flash), a);
}`;

// Une bande d'ombres : la visibilité du soleil pour chaque texel (uCible : coin, taille).
const BAND_FRAGMENT = `${COMMON}
varying vec2 vUV;
uniform vec4 uCible;
void main(void) {
  vec2 base = uCible.xy + floor(vUV * uCible.zw);
  float h = texel(uRelief, base).b * 12.0;
  vec2 tc = (base + 0.5) / uN;
  vec3 P = vec3((tc.x - 0.5) * uMonde.x, (0.5 - tc.y) * uMonde.y - 1.41421 * h, h);
  float vis = ombre(P, uSoleil, 14.0 + 22.0 * (1.0 - uSoleil.z));
  gl_FragColor = vec4(vis, vis, vis, 1.0);
}`;

function registerShaders(): void {
  if (Effect.ShadersStore.islandGroundVertexShader) return;
  Effect.ShadersStore.islandGroundVertexShader = GROUND_VERTEX;
  Effect.ShadersStore.islandGroundFragmentShader = GROUND_FRAGMENT;
  Effect.ShadersStore.islandSpriteVertexShader = SPRITE_VERTEX;
  Effect.ShadersStore.islandSpriteFragmentShader = SPRITE_FRAGMENT;
}

function loadTexture(scene: Scene, file: string, nearest: boolean): Promise<Texture> {
  return new Promise((resolve, reject) => {
    const texture: Texture = new Texture(
      `${SPRITES}${file}`,
      scene,
      true,
      true,
      nearest ? Texture.NEAREST_SAMPLINGMODE : Texture.BILINEAR_SAMPLINGMODE,
      () => resolve(texture),
      (message) => reject(new Error(message ?? file)),
    );
    texture.wrapU = Texture.CLAMP_ADDRESSMODE;
    texture.wrapV = Texture.CLAMP_ADDRESSMODE;
  });
}

/** La hauteur du sol, lue par le code (la torche du héros) : une petite image en niveaux de gris. */
async function loadHeights(file: string): Promise<{ data: Uint8Array; size: number }> {
  const image = new Image();
  image.src = `${SPRITES}${file}`;
  await image.decode();
  const size = image.naturalWidth;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D indisponible');
  ctx.drawImage(image, 0, 0);
  const rgba = ctx.getImageData(0, 0, size, size).data;
  const data = new Uint8Array(size * size);
  for (let i = 0; i < data.length; i++) data[i] = rgba[i * 4];
  return { data, size };
}

/** Une bande d'ombres du soleil, calculée sur la carte graphique (voir BAND_WIDTH). */
interface ShadowBand {
  texture: ProceduralTexture;
  /** Ce que lisent les matériaux : coin (texels de la carte) et 1 si la bande est calculée. */
  shown: Vector4;
  /** Ce que la bande calcule : coin et taille. */
  target: Vector4;
  /** Le soleil de son dernier calcul. */
  sun: Vector3;
  /** Rangée de bandes qu'elle couvre (-1 : aucune). */
  row: number;
  /** Calcul demandé, pas encore fait. */
  busy: boolean;
}

/** Ce que montre la caméra : son centre, et sa demi-largeur en unités du monde. */
export interface LightingView {
  target: ScreenPoint;
  halfWidth: number;
}

export class IslandLighting {
  private readonly materials = new Set<ShaderMaterial>();
  private readonly bands: ShadowBand[];
  private hour: number;
  private readonly fixed: boolean;
  // Valeurs partagées par tous les matériaux : on les change sur place, une fois par image.
  private readonly sun = new Vector3();
  private readonly sunColor = new Vector3();
  private readonly ambient = new Vector3();
  private readonly fogColor = new Vector3();
  private readonly settings = new Vector4();
  private readonly settings2 = new Vector4(STEPS, shadowsWanted() ? 1 : 0, 0, 1);
  private readonly lightPos: number[] = new Array<number>(MAX_LIGHTS * 4).fill(0);
  private readonly lightColor: number[] = new Array<number>(MAX_LIGHTS * 4).fill(0);
  private readonly world: Vector2;
  private readonly texels: number;
  private time = 0;
  /** Lumière d'une surface plate et dégagée, à l'heure qu'il est : la mer au-delà de la carte. */
  readonly flat = new Color3(1, 1, 1);

  private constructor(
    private readonly scene: Scene,
    private readonly sol: Texture,
    private readonly relief: Texture,
    private readonly halo: Texture,
    private readonly heightTexture: Texture,
    private readonly heights: { data: Uint8Array; size: number },
    private readonly lights: readonly MapLight[],
    width: number,
    height: number,
  ) {
    registerShaders();
    this.world = new Vector2(width, height);
    this.texels = relief.getSize().width;
    const hour = fixedHour();
    this.fixed = hour !== null;
    this.hour = hour ?? START_HOUR;
    this.bands = Array.from({ length: BANDS }, (_, i) => this.band(i));
  }

  private band(index: number): ShadowBand {
    const texture = new ProceduralTexture(
      `islandShadows${index}`,
      { width: BAND_WIDTH, height: BAND_HEIGHT },
      { fragmentSource: BAND_FRAGMENT },
      this.scene,
      null,
      false,
    );
    texture.refreshRate = 0;
    texture.updateSamplingMode(Texture.NEAREST_SAMPLINGMODE);
    texture.wrapU = Texture.CLAMP_ADDRESSMODE;
    texture.wrapV = Texture.CLAMP_ADDRESSMODE;
    const band: ShadowBand = { texture, shown: new Vector4(), target: new Vector4(0, 0, BAND_WIDTH, BAND_HEIGHT), sun: new Vector3(), row: -1, busy: false };
    texture.setTexture('uRelief', this.relief);
    texture.setFloat('uN', this.texels);
    texture.setVector2('uMonde', this.world);
    texture.setVector3('uSoleil', band.sun);
    texture.setVector4('uCible', band.target);
    texture.onGeneratedObservable.add(() => {
      if (!band.busy) return;
      band.shown.set(band.target.x, band.target.y, 1, 0);
      band.busy = false;
    });
    return band;
  }

  /**
   * Garde des bandes d'ombres autour de la caméra : celles des rangées qu'elle voit, assez larges pour sa vue, et à
   * jour avec le soleil. Une seule bande est recalculée à la fois ; en attendant, le shader calcule lui-même.
   */
  private updateBands(view: LightingView): void {
    const n = this.texels;
    const cx = (view.target.u / this.world.x + 0.5) * n;
    const cy = (0.5 - view.target.v / this.world.y) * n;
    const reach = (view.halfWidth / this.world.x) * n + BAND_MARGIN;
    const rows = Math.ceil(n / BAND_HEIGHT);
    const row = Math.floor(cy / BAND_HEIGHT);
    // La rangée de la caméra d'abord, puis ses voisines.
    const needed = [row, row - 1, row + 1].filter((r) => r >= 0 && r < rows);
    for (const r of needed) {
      if (this.bands.some((b) => b.row === r)) continue;
      const free = this.bands.find((b) => !needed.includes(b.row) && !b.busy);
      if (!free) break;
      free.row = r;
      free.shown.z = 0;
    }
    if (this.bands.some((b) => b.busy)) return;
    const left = Math.max(0, cx - reach);
    const right = Math.min(n, cx + reach);
    const mine = needed.flatMap((r) => this.bands.filter((b) => b.row === r));
    let pick = mine.find((b) => !(b.shown.z > 0.5 && left >= b.shown.x && right <= b.shown.x + BAND_WIDTH));
    if (!pick) {
      let worst = SUN_STEP;
      for (const b of mine) {
        const d = Vector3.Dot(b.sun, this.sun);
        if (d < worst) {
          worst = d;
          pick = b;
        }
      }
    }
    if (!pick) return;
    const x0 = Math.round(Math.min(Math.max(cx - BAND_WIDTH / 2, 0), Math.max(0, n - BAND_WIDTH)));
    pick.target.set(x0, pick.row * BAND_HEIGHT, BAND_WIDTH, BAND_HEIGHT);
    pick.sun.copyFrom(this.sun);
    pick.busy = true;
    pick.texture.resetRefreshCounter();
  }

  /** Les textures de la carte (island.json, `map` : image, relief, halo, hauteur). */
  static async load(scene: Scene, map: MapData, width: number, height: number): Promise<IslandLighting> {
    if (!map.relief || !map.halo || !map.height) throw new Error("Carte sans relief : pas d'éclairage");
    const [sol, relief, halo, heightTexture, heights] = await Promise.all([
      loadTexture(scene, map.image, true),
      loadTexture(scene, map.relief, true),
      loadTexture(scene, map.halo, false),
      loadTexture(scene, map.height, true),
      loadHeights(map.height),
    ]);
    return new IslandLighting(scene, sol, relief, halo, heightTexture, heights, map.lights ?? [], width, height);
  }

  /** Le matériau du sol. */
  ground(): ShaderMaterial {
    const material = new ShaderMaterial(
      'islandGround',
      this.scene,
      { vertex: 'islandGround', fragment: 'islandGround' },
      { attributes: ['position', 'uv'], uniforms: ['worldViewProjection', ...LIGHT_UNIFORMS], samplers: LIGHT_SAMPLERS },
    );
    return this.attach(material);
  }

  /**
   * Un sprite éclairé, avec les mêmes réglages que spriteMaterial (renderer.ts). `decor` : un décor de la carte, dont le
   * relief est dans celui de la carte ; sinon, un personnage ou un objet debout sur le sol.
   */
  sprite(name: string, texture: BaseTexture, decor: boolean): ShaderMaterial {
    const material = new ShaderMaterial(
      name,
      this.scene,
      { vertex: 'islandSprite', fragment: 'islandSprite' },
      {
        attributes: ['position', 'uv'],
        uniforms: ['world', 'worldViewProjection', 'tint', 'flash', 'flashColor', 'alpha', 'flipX', 'frameRect', 'uDecor', ...LIGHT_UNIFORMS],
        samplers: ['textureSampler', 'uHauteur', ...LIGHT_SAMPLERS],
        needAlphaBlending: true,
      },
    );
    material.setTexture('textureSampler', texture);
    material.setTexture('uHauteur', this.heightTexture);
    material.setColor3('tint', Color3.White());
    material.setFloat('flash', 0);
    material.setColor3('flashColor', Color3.White());
    material.setFloat('alpha', 1);
    material.setFloat('flipX', 0);
    material.setVector4('frameRect', new Vector4(0, 0, 1, 1));
    material.setFloat('uDecor', decor ? 1 : 0);
    material.backFaceCulling = false;
    // Triés entre eux (alphaIndex), dessinés par-dessus le sol même sous la ligne du pied.
    material.depthFunction = Constants.ALWAYS;
    return this.attach(material);
  }

  private attach(material: ShaderMaterial): ShaderMaterial {
    material.setTexture('uSol', this.sol);
    material.setTexture('uRelief', this.relief);
    material.setTexture('uHalo', this.halo);
    material.setFloat('uN', this.texels);
    material.setVector2('uMonde', this.world);
    material.setVector3('uSoleil', this.sun);
    material.setVector3('uSoleilCoul', this.sunColor);
    material.setVector3('uAmbiant', this.ambient);
    material.setVector3('uRef', new Vector3(...REF));
    material.setVector3('uBrumeCoul', this.fogColor);
    material.setVector4('uReglages', this.settings);
    material.setVector4('uReglages2', this.settings2);
    material.setArray4('uLumPos', this.lightPos);
    material.setArray4('uLumCoul', this.lightColor);
    this.bands.forEach((band, i) => {
      material.setTexture(`uOmbre${i}`, band.texture);
      material.setVector4(`uBande${i}`, band.shown);
    });
    this.materials.add(material);
    material.onDisposeObservable.addOnce(() => this.materials.delete(material));
    return material;
  }

  /** Hauteur du sol seul (sans les décors) en un point de l'image. */
  heightAt(s: ScreenPoint): number {
    const { data, size } = this.heights;
    const x = Math.floor((s.u / this.world.x + 0.5) * size);
    const y = Math.floor((0.5 - s.v / this.world.y) * size);
    if (x < 0 || y < 0 || x >= size || y >= size) return 0;
    return (data[y * size + x] / 255) * 12;
  }

  /**
   * Avance l'heure et place les lumières. `hero` : où se tient le héros (sa torche, la nuit) ; `lit` : les lanternes que
   * le joueur a allumées (les autres restent éteintes) ; `view` : ce que montre la caméra (les ombres à calculer).
   */
  update(dt: number, hero: ScreenPoint | null, lit: (lamp: string) => boolean, view: LightingView | null): void {
    this.time += dt;
    if (!this.fixed) {
      const night = this.hour >= 20 || this.hour < 5;
      this.hour = (this.hour + dt * HOURS_PER_SECOND * (night ? NIGHT_SPEED : 1)) % 24;
    }
    const m = moment(this.hour);
    const t = this.time;
    this.sun.set(...m.sun);
    this.sunColor.set(...m.color);
    this.ambient.set(...m.ambient);
    this.fogColor.set(...m.fogColor);
    this.settings.set(t % 3600, m.fog, 0.15 + 0.75 * m.night, 0.4 + 0.6 * m.night);
    if (view && this.settings2.y > 0.5) this.updateBands(view);

    const heroGround = hero ? { u: hero.u, v: hero.v - Math.SQRT2 * this.heightAt(hero), h: this.heightAt(hero) } : null;
    const wanted: { u: number; v: number; h: number; r: number; color: Rgb; force: number; d: number }[] = [];
    if (heroGround && m.night > 0.05) {
      // La torche, un peu devant le héros (vers la caméra) : elle éclaire son visage.
      wanted.push({
        u: heroGround.u,
        v: heroGround.v - 0.7,
        h: heroGround.h + 1.3,
        r: 7.5,
        color: [1, 0.72, 0.42],
        force: 1.25 * (0.93 + 0.07 * Math.sin(t * 11)) * Math.min(1, m.night * 1.4),
        d: 0,
      });
    }
    this.lights.forEach((l, i) => {
      if (l.lamp && !lit(l.lamp)) return;
      let force = l.force;
      if (l.genre === 'flamme') force *= (0.87 + 0.09 * Math.sin(t * 9 + i * 3.1) + 0.04 * Math.sin(t * 23 + i)) * m.night;
      else if (l.genre === 'pouls') force *= 0.7 + 0.3 * Math.sin(t * 1.6 + i);
      else force *= 0.88 + 0.12 * Math.sin(t * 2.3 + i);
      if (force <= 0.001) return;
      const d = heroGround ? Math.hypot(l.u - heroGround.u, l.v - heroGround.v) - l.rayon : 0;
      // Hors de vue : la caméra ne montre qu'une vingtaine d'unités autour du héros.
      if (d > 30) return;
      wanted.push({ u: l.u, v: l.v, h: l.h, r: l.rayon, color: l.couleur, force, d });
    });
    wanted.sort((a, b) => a.d - b.d);
    const n = Math.min(MAX_LIGHTS, wanted.length);
    for (let i = 0; i < n; i++) {
      const l = wanted[i];
      this.lightPos.splice(i * 4, 4, l.u, l.v, l.h, l.r);
      this.lightColor.splice(i * 4, 4, l.color[0], l.color[1], l.color[2], l.force);
    }
    this.settings2.z = n;

    // Une surface plate au soleil, sans ombre : la mer au-delà de la carte.
    const lref = 0.45 + 0.55 * REF[2];
    const sunUp = Math.max(m.sun[2], 0);
    const fog = m.fog * 0.3;
    this.flat.set(
      ((m.ambient[0] + m.color[0] * sunUp) / lref) * (1 - fog) + m.fogColor[0] * fog,
      ((m.ambient[1] + m.color[1] * sunUp) / lref) * (1 - fog) + m.fogColor[1] * fog,
      ((m.ambient[2] + m.color[2] * sunUp) / lref) * (1 - fog) + m.fogColor[2] * fog,
    );
  }

  dispose(): void {
    for (const material of [...this.materials]) material.dispose();
    for (const band of this.bands) band.texture.dispose();
    for (const texture of [this.sol, this.relief, this.halo, this.heightTexture]) texture.dispose();
  }
}
