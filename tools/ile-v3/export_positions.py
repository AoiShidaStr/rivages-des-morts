"""Écrit src/data/island.json pour l'île v3 : zones de marche tirées du rendu, décors, lumières, et les PNJ, objets
et zones replacés sur la nouvelle carte (repères à la main, le reste suit par interpolation, puis on se pose sur la
zone de marche la plus proche, à distance des bords et des décors)."""
import json
import math
import pickle
import sys
from pathlib import Path

import cv2
import numpy as np
from scipy import ndimage as ndi

from export_jeu import N, W, H, PX, px2uv, plan2px, niveau, polygones
from plan import uv2xz, xz2uv

JEU = Path(sys.argv[1] if len(sys.argv) > 1 else '/home/user/rivages-des-morts')
plan = pickle.load(open('export/plan.pkl', 'rb'))
dec = json.load(open('export/decors.json'))
marche = np.load('export/marche.npy')
pont = np.load('export/pont.npy')
# l'île d'origine (git show HEAD:src/data/island.json > export/island-origine.json) : on repart toujours de là
ile = json.load(open('export/island-origine.json'))
lum = json.load(open('lumieres.json'))


def plan_px(u, v):
    return plan2px(u, v, niveau(plan, u, v))


def jeu2px(u, v):
    return (u / W + 0.5) * N, (0.5 - v / H) * N


# ---------------------------------------------------------------- zone de marche principale
lab, n = ndi.label(marche)
pont_mask = pont
# la composante du ponton de Charon (point de départ) : tout le reste est hors d'atteinte
pu, pv = plan['ponts'][1]['c']
cu, cv = xz2uv(pu, pv)
x0, y0 = plan2px(cu, cv, plan['ponts'][1]['h'])
k = lab[int(y0), int(x0)]
if k == 0:
    d, (iy, ix) = ndi.distance_transform_edt(lab == 0, return_indices=True)
    k = lab[iy[int(y0), int(x0)], ix[int(y0), int(x0)]]
principal = lab == k
print('zone principale', round(principal.sum() / PX ** 2), 'u²', flush=True)

# obstacles des décors, pour se tenir à distance
solides = np.zeros_like(principal)
yy, xx = np.mgrid[0:N:8, 0:N:8]
for it in dec['decor']:
    if it.get('solid'):
        x, y = jeu2px(it['u'], it['v'])
        r = (it['solid'] + 0.4) * PX
        cv2.circle(solides, (int(x), int(y)), int(r), 1, -1) if False else None
libre = principal.copy()
for it in dec['decor']:
    if it.get('solid'):
        x, y = jeu2px(it['u'], it['v'])
        r = int((it['solid'] + 0.45) * PX)
        m = np.zeros(libre.shape, np.uint8)
        cv2.circle(m, (int(x), int(y)), r, 1, -1)
        libre &= m == 0
marge = ndi.distance_transform_edt(libre)


def poser(x, y, clair=0.75):
    """Le pixel libre le plus proche de (x, y), à `clair` unités au moins des bords et des décors."""
    ok = marge >= clair * PX
    x, y = int(round(x)), int(round(y))
    if 0 <= x < N and 0 <= y < N and ok[y, x]:
        return x, y
    r = 40
    while r < 3000:
        y0, y1, x0, x1 = max(0, y - r), min(N, y + r), max(0, x - r), min(N, x + r)
        ys, xs = np.nonzero(ok[y0:y1, x0:x1])
        if len(ys):
            d = (ys + y0 - y) ** 2 + (xs + x0 - x) ** 2
            i = int(np.argmin(d))
            return int(xs[i] + x0), int(ys[i] + y0)
        r *= 2
    raise RuntimeError('rien de libre')


# ---------------------------------------------------------------- repères (ancienne île → plan v3)
ponton = xz2uv(*plan['ponts'][1]['c'])
pont_c = xz2uv(*plan['ponts'][0]['c'])
pw, pe = plan['ponts'][0]['bouts']
jizo = dec['pnj']['jizo']
lant = dec['pnj']['lanterne']
deco = {}
for it in dec['decor']:
    deco.setdefault(it['sprite'].split('/')[-1], []).append((it['u'], it['v']))

REPERES = [   # (ancienne position u, v) → (u, v) du plan
    ((-22.86, -27.64), ponton), ((-10.38, 7.8), (-14, 3)), ((-19.3, 32.7), (-25, 29)), ((2.6, 44.2), (1, 44)),
    ((16.43, 29.75), (15, 38)), ((18.23, 6.27), (19, 11)), ((19.4, -33.6), (16, -30)), ((-35, 23), (-30, 13)),
    ((2, -1), (-1, 6)), ((-1.42, -25.31), (-6, -22)), ((33.97, 42.88), (30, 40)), ((7.68, 57.22), (10, 56)),
]


def interpole(u, v):
    a = np.array([r[0] for r in REPERES], float)
    b = np.array([r[1] for r in REPERES], float)
    d = np.hypot(a[:, 0] - u, a[:, 1] - v) + 1e-3
    w = 1 / d ** 2
    dep = ((b - a) * w[:, None]).sum(0) / w.sum()
    return u + dep[0], v + dep[1]


# positions choisies à la main : soit (u, v) du plan, soit ('jeu', u, v) déjà dans l'image du jeu
def pres(nom, du=0.0, dv=0.0, i=0):
    """À côté d'un décor v3 (coordonnées du jeu), décalé de (du, dv) unités du jeu."""
    u, v = deco[nom][i]
    return ('jeu', u + du, v + dv)


pontou = plan['ponts'][1]['bouts']
A_LA_MAIN = {
    'charon': ('ponton', 0.45), 'barque': ('ponton-eau', 0.0), 'stele-records': ('plage', (-17.5, -41.5)),
    'biwa': ('plage', (-22.5, -38.5)), 'voyageur': None,
    'obaa': pres('maison_the', 3.2, -2.2), 'tetsu': pres('forge', -3.0, -2.6),
    'toro-1': ('jeu', *lant[0]), 'toro-2': ('jeu', *lant[1]), 'toro-3': ('jeu', *lant[2]), 'toro-4': ('jeu', *lant[3]),
    'jizo-1': ('jeu', *jizo[0]), 'jizo-2': ('jeu', *jizo[1]), 'jizo-3': ('jeu', *jizo[2]),
    'jizo-4': ('jeu', *jizo[3]), 'jizo-5': ('jeu', *jizo[4]), 'jizo-6': ('jeu', *jizo[5]),
    'portail': pres('torii_noir_z', 0.0, -0.6),
    # le moine veille sur le jardin, à gauche du Grand Rocher, face à l'allée qui monte du torii
    'moine': pres('rocher', -4.6, -2.4),
    # la faille du Yomi sans fond s'ouvre dans la paroi, au pied de la cascade : on se tient juste devant
    'faille-cascade': pres('faille', 0.0, -0.9),
    # le gardien errant, au milieu de la clairière au sommet du Mont Fujikasane
    'gardien-errant': ('plage', plan['zones']['fujikasane']),
    # la grande prairie devenue parc : ses deux âmes s'assoient près des bancs, au milieu, à la vue de tous
    'nanashi': pres('banc', 1.4, -0.9, 0), 'dogu': pres('banc_z', -1.4, -0.9, 1),
    # les kappa au bord de la rivière, pas sur les chemins ; la plaque votive au pied de l'escalier du Mont
    'kawataro': ('plage', (5.2, 3.5)), 'vieux-kappa': ('plage', (5.0, 25.0)), 'ema': ('plage', (13.6, 4.0)),
}


def finale(defn, old_u, old_v, clair=0.75):
    if defn is None:
        u, v = interpole(old_u, old_v)
        return poser(*plan_px(u, v), clair)
    if defn[0] == 'jeu':
        return poser(*jeu2px(defn[1], defn[2]), clair)
    if defn[0] == 'plage':
        return poser(*plan_px(*defn[1]), clair)
    raise ValueError(defn)


sortie = {}
# ponton : Charon près du bout, la barque dans l'eau juste après, le départ un peu en arrière
a, b = np.array(pontou[0]), np.array(pontou[1])     # bouts du ponton (côté mer, côté terre)
h_p = plan['ponts'][1]['h']


def sur_ponton(t, cote=0.0):
    u, v = a + (b - a) * t
    x, y = plan2px(u, v, h_p + 0.0)
    return x, y + cote


for it in ile['interactables']:
    i = it['id']
    if i == 'charon':
        x, y = sur_ponton(0.22)
        x, y = poser(x, y, 0.45)
    elif i == 'barque':
        x, y = plan2px(*(a + (a - b) * 0.12), 0.0)
        x, y = int(x - 0.8 * PX), int(y + 1.2 * PX)
    elif i in ('jizo-faux', 'tanuki'):
        (u1, v1), (u2, v2) = jizo[-2], jizo[-1]
        k_ = 1 if i == 'jizo-faux' else 2.6
        x, y = poser(*jeu2px(u2 + (u2 - u1) * k_, v2 + (v2 - v1) * k_), 0.45)
    elif i == 'rocher':
        # l'interaction du Grand Rocher : à son pied, sur la pierre même (on la touche en s'approchant)
        u, v = deco['rocher'][0]
        x, y = jeu2px(u, v - 0.3)
        it['reach'] = 4.2
    elif i.startswith('jizo-') or i.startswith('toro-'):
        x, y = finale(A_LA_MAIN[i], 0, 0, 0.0)
    else:
        x, y = finale(A_LA_MAIN.get(i), it['u'], it['v'])
    sortie[i] = (x, y)
    it['u'], it['v'] = px2uv(x, y)
    if i == 'gardien-errant':
        # après minuit, on peut l'affronter (dialogues.json, gardien)
        it['verbIf'] = [{'if': [{'hours': [0, 5]}], 'verb': 'Affronter'}]

x, y = sur_ponton(0.42)
ile['spawn'] = dict(zip('uv', px2uv(*poser(x, y, 0.45))))
x, y = sur_ponton(0.34)
ile['dungeonExit'] = dict(zip('uv', px2uv(*poser(x, y, 0.45))))

ZONES = {'ponton': ((-19.5, -42), 11), 'donjon': ((-25, 29), 9), 'village': ((-14, 3), 15), 'rocher': ((1, 45), 12),
         'cascade': ((15, 39), 10), 'fujikasane': ((21, 13), 15), 'prairie': ((14, -31), 13)}
for ar in ile['areas']:
    if ar['id'] == 'rizieres':                 # les rizières ouvertes sont devenues la forêt du Mont Fujikasane
        ar['id'], ar['name'] = 'fujikasane', 'Mont Fujikasane'
    if ar['id'] == 'prairie':
        ar['name'] = 'Le parc de la prairie'
    (u, v), r = ZONES[ar['id']]
    ar['u'], ar['v'] = px2uv(*plan_px(u, v))
    ar['r'] = r

# ---------------------------------------------------------------- polygones
dehors, trous = polygones(principal, eps=2.5)
bois_dehors, _ = polygones(pont_mask & principal, eps=2.0, mini=200)
# la lumière d'une lanterne de pierre ne brille que si le joueur l'a allumée (son image allumée)
lumieres = []
for l in lum['lumieres']:
    l = dict(l)
    for it in ile['interactables']:
        if it['id'].startswith('toro-') and abs(it['u'] - l['u']) < 0.3 and l['genre'] == 'flamme':
            l['lamp'] = it['id']
    lumieres.append(l)
ile['map'] = {'image': 'ile/v3/sol.webp', 'sample': 'ile/v3/sol-512.webp', 'width': W,
              'relief': 'ile/v3/relief.webp', 'halo': 'ile/v3/halo.webp', 'height': 'ile/v3/hauteur.webp',
              'lights': lumieres}
ile['walk'] = dehors
ile['blocks'] = trous
ile['river'] = []
ile['bridges'] = []
ile['falls'] = []
ile['wood'] = bois_dehors
ile['scenery'] = {'paddies': [], 'pool': [], 'groves': [], 'beaches': []}
ile['props'] = []
ile['decor'] = dec['decor']
ile['about'] = ("Positions en coordonnées d'écran : u vers la droite, v vers le haut, en unités du monde (le héros mesure "
                "1,75). La carte (île v3, pixel art) est une image de map.width unités de large, éclairée par le shader de "
                "src/render/islandLighting.ts (relief : normales et hauteurs). Zones de marche, décors et lumières sont "
                "exportés par tools/ile-v3 (export_jeu.py, export_positions.py).")
json.dump(ile, open(JEU / 'src/data/island.json', 'w'), ensure_ascii=False, indent=1)
print('walk', len(dehors), sum(len(p) for p in dehors), 'points ; trous', len(trous), '; bois', len(bois_dehors))

# ---------------------------------------------------------------- aperçu des positions
from PIL import Image, ImageDraw
Image.MAX_IMAGE_PIXELS = None
img = Image.open('ile-decors-4224.png').convert('RGB')
f = 1400 / N
ap = img.resize((1400, 1400), Image.BOX)
o = np.array(ap).astype(np.float32)
pm = cv2.resize(principal.astype(np.uint8), (1400, 1400), interpolation=cv2.INTER_NEAREST) > 0
o[pm] = o[pm] * 0.7 + np.array([255, 60, 200]) * 0.3
ap = Image.fromarray(o.astype(np.uint8))
d = ImageDraw.Draw(ap)
for ar in ile['areas']:
    x, y = jeu2px(ar['u'], ar['v'])
    r = ar['r'] * PX * f
    d.ellipse((x * f - r, y * f - r * 0.6, x * f + r, y * f + r * 0.6), outline=(255, 255, 0))
    d.text((x * f, y * f), ar['id'], fill=(255, 255, 0))
for i, (x, y) in sortie.items():
    d.ellipse((x * f - 3, y * f - 3, x * f + 3, y * f + 3), fill=(255, 0, 0))
    d.text((x * f + 4, y * f - 6), i, fill=(255, 255, 255))
x, y = jeu2px(ile['spawn']['u'], ile['spawn']['v'])
d.ellipse((x * f - 4, y * f - 4, x * f + 4, y * f + 4), fill=(0, 255, 0))
ap.save('export/positions.png')
