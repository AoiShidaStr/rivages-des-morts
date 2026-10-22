"""Exporte l'île v3 vers le jeu, depuis export/geo.npz et export/plan.pkl (geo_cache.py) :
- public/sprites/ile/v3/ : sol.webp (carte sans décors), normal.webp, donnees.webp (R hauteur/12, G émissif, B eau),
  halo.webp, sol-512.webp (petite, pour la couleur de la mer)
- public/sprites/decor/v3/ : un sprite par décor (pied au centre, à 2 % du bas, comme le veut decorSprites.ts)
- src/data/island.json : carte, zones de marche, décors, lumières, positions des PNJ et des zones recalées.

Repère du jeu : u vers la droite, v vers le haut de l'écran, en unités du monde ; l'image fait 120 × 120·√3.
Un point du plan (u, v) à la hauteur h tombe dans l'image en (1,5·u, 1,5·v + √2·h) : on marche « sur l'image »."""
import json
import math
import pickle
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

import decorer
from plan import EAU, LAVE, RIZ, MARCHE, uv2xz, xz2uv, CELL, EXT

JEU = Path(sys.argv[1] if len(sys.argv) > 1 else '/home/user/rivages-des-morts')
N = 4224
S = 1.5
W = 80 * S                      # largeur de l'image dans le monde
H = W * math.sqrt(3)            # sa hauteur (étirée en profondeur, comme toute carte du jeu)
PX = N / W                      # pixels par unité du monde (35,2)
K = 0.8165 * PX                 # lignes d'image par unité de hauteur
SOL_DIR = JEU / 'public/sprites/ile/v3'
DECOR_DIR = JEU / 'public/sprites/decor/v3'


def px2uv(x, y):
    return round(float((x / N - 0.5) * W), 2), round(float((0.5 - y / N) * H), 2)


def plan2px(u, v, h):
    """(u, v) du plan, h du monde → pixel de l'image."""
    return (u / 80 + 0.5) * N, (0.5 - v / (80 * math.sqrt(3))) * N - h * K


def niveau(plan, u, v):
    x, z = uv2xz(u, v)
    i = int(np.clip((x + EXT) / CELL, 0, plan['plan_niv'].shape[0] - 1))
    j = int(np.clip((z + EXT) / CELL, 0, plan['plan_niv'].shape[1] - 1))
    return float(plan['plan_niv'][i, j])


def webp(img, path, lossless=True):
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(img).save(path, 'WEBP', lossless=lossless, quality=100, method=6)
    print(path.relative_to(JEU), round(path.stat().st_size / 1e6, 2), 'Mo', flush=True)


# ============================== textures du sol ==============================
def textures(g):
    """Deux grandes textures seulement (la mémoire graphique) :
    - sol.webp : RGB la carte, A = 255 - 128 × émissif (opaque presque partout : le navigateur garde les couleurs)
    - relief.webp : R, G = x, y de la normale (z se déduit : elle regarde toujours vers le haut ou la caméra),
      B = hauteur / 12, A = 255 - 0,75 × eau (eau : 0 sec, 64 décor, 128 rizière, 192 eau, 255 cascade ; jamais 0,
      sinon le navigateur perd les couleurs) ;
    - hauteur.webp : hauteur du sol / 12 en 1056 × 1056, lue par le code (la torche du héros, la teinte des sprites)."""
    img, normal, masques = g['img'], g['normal'], g['masques']
    masques = sans_lanternes(masques)
    sol = np.dstack([img, 255 - (masques[..., 0].astype(np.uint16) * 128 // 255).astype(np.uint8)])
    webp(sol, SOL_DIR / 'sol.webp')
    webp(np.array(Image.fromarray(img).resize((512, 512), Image.BOX)), SOL_DIR / 'sol-512.webp', lossless=False)
    eau = np.where(masques[..., 2] > 0, 255, np.where(masques[..., 1] == 255, 192, np.where(masques[..., 1] > 0, 128, 0)))
    # les décors (arbres, maisons) : 64, pour que leurs ombres n'en fassent qu'une coque (islandLighting.ts)
    decor = np.any(g['albedo_decors'] != img, axis=-1) & (eau == 0)
    eau = np.where(decor, 64, eau)
    print('décors dans le relief', round(decor.mean() * 100, 1), '%')
    q = lambda c: np.clip((c.astype(np.int32) // 4) * 4 + 2, 0, 255).astype(np.uint8)   # 64 crans : 2 fois plus léger
    relief = np.dstack([q(normal[..., 0]), q(normal[..., 1]), normal[..., 3], (255 - eau * 3 // 4).astype(np.uint8)])
    webp(relief, SOL_DIR / 'relief.webp')
    hs = np.clip(np.where(g['face'], 0, g['hsrc']) / 12 * 255, 0, 255).astype(np.uint8)
    petit = np.median(hs.reshape(N // 4, 4, N // 4, 4).transpose(0, 2, 1, 3).reshape(N // 4, N // 4, 16), -1)
    webp(np.repeat(petit.astype(np.uint8)[..., None], 3, -1), SOL_DIR / 'hauteur.webp')
    # halo : la couleur des sources émissives (décors compris), étalée, en basse résolution
    e = masques[..., 0:1].astype(np.float32) / 255 * g['albedo_decors'].astype(np.float32) / 255
    petit = cv2.resize(e, (N // 8, N // 8), interpolation=cv2.INTER_AREA)
    flou = cv2.GaussianBlur(petit, (0, 0), 70 / 8)
    flou = np.sqrt(flou / (flou.max() + 1e-6))
    webp(np.clip(flou * 255, 0, 255).astype(np.uint8), SOL_DIR / 'halo.webp', lossless=False)


def sans_lanternes(masques):
    """Les lanternes de pierre sont des objets du jeu, allumés ou non selon la quête : leur flamme ne doit ni briller
    dans la carte ni teinter le halo (le jeu allume leur lumière quand le joueur les allume)."""
    try:
        lant = json.load(open('export/decors.json'))['pnj']['lanterne']
    except FileNotFoundError:
        return masques
    m = masques.copy()
    for gu, gv in lant:
        x, y = int((gu / W + 0.5) * N), int((0.5 - gv / H) * N)
        m[max(0, y - int(3 * PX)):y + int(0.3 * PX), max(0, x - int(1.2 * PX)):x + int(1.2 * PX), 0] = 0
    return m


# ============================== zones de marche ==============================
def masque_marche(g):
    face, mat, hsrc, pont_h, casc = g['face'], g['mat'], g['hsrc'], g['pont_h'], g['casc']
    pont = pont_h >= 0
    ok = (~face & ~np.isin(mat, (EAU, LAVE)) & ~(casc > 0)) | (mat == MARCHE) | pont
    # pas de passage entre deux pixels voisins de hauteurs trop différentes : le bord arrière d'un plateau touche,
    # dans l'image, le sol plus bas qui est derrière lui (les marches et les terrasses restent sous le seuil)
    hh = np.where(pont, pont_h, hsrc).astype(np.float32)
    saut = np.zeros_like(ok)
    dy = np.abs(np.diff(hh, axis=0)) > 0.7
    dx = np.abs(np.diff(hh, axis=1)) > 0.7
    saut[:-1] |= dy
    saut[1:] |= dy
    saut[:, :-1] |= dx
    saut[:, 1:] |= dx
    saut &= ~(mat == MARCHE)
    ok &= ~ndi.binary_dilation(saut, iterations=2)
    ok = ndi.binary_opening(ok, iterations=2)
    return ok, pont


def polygones(m, eps=2.5, mini=400):
    """Contours d'un masque → polygones extérieurs et trous, en unités du jeu."""
    cs, hier = cv2.findContours(m.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    dehors, trous = [], []
    if hier is None:
        return dehors, trous
    for c, hrow in zip(cs, hier[0]):
        if cv2.contourArea(c) < mini:
            continue
        c = cv2.approxPolyDP(c, eps, True)[:, 0, :]
        poly = [list(px2uv(x + 0.5, y + 0.5)) for x, y in c]
        (trous if hrow[3] >= 0 else dehors).append(poly)
    return dehors, trous


# ============================== décors ==============================
# rayon d'obstacle (unités du monde) ; 0 : on passe au travers
SOLIDE = {'sakura': 0.45, 'sakura_rond': 0.4, 'shidarezakura': 0.8, 'momiji': 0.45, 'momiji_fm': 0.4, 'kusunoki': 0.9,
          'matsu': 0.45, 'sugi': 0.35, 'sugi_haut': 0.5, 'ginkgo': 0.35, 'saule': 0.7, 'kaki': 0.45,
          'maison_a': 2.6, 'maison_b': 2.6, 'maison_the': 3.0, 'forge': 2.8, 'rocher': 3.2, 'torii': 0.0,
          'torii_noir_z': 0.0}
# ces décors sont déjà des PNJ ou des objets du jeu (jizo, lanterne) : on garde leur place, pas l'image
PNJ = {'jizo', 'lanterne'}


def sprite_jeu(t, ax, ay):
    """Recadre un sprite : pied (ax, ay) au milieu de la largeur. Tout le dessin est gardé, même sous le pied (le
    soubassement et le devant d'une maison) : renvoie l'image et le nombre de lignes sous la ligne du pied."""
    a = t[..., 3] > 127
    ys, xs = np.nonzero(a)
    demi = max(ax - xs.min(), xs.max() - ax) + 1
    y0, y1 = ys.min(), max(ys.max(), ay) + 1
    out = np.zeros((y1 - y0, 2 * demi + 1, 4), np.uint8)
    xs0, xs1 = max(0, ax - demi), min(t.shape[1], ax + demi + 1)
    out[:, xs0 - (ax - demi):xs1 - (ax - demi)] = t[y0:y1, xs0:xs1]
    out[out[..., 3] < 128] = 0
    out[..., 3] = np.where(out[..., 3] > 0, 255, 0)
    return out, y1 - 1 - ay


def decors(plan, marche):
    sp = decorer.sprites()
    items, pnj = [], {'jizo': [], 'lanterne': []}
    faits = set()
    for nom, u, v, h in plan['obj']:
        x, y = plan2px(u, v, h)
        gu, gv = px2uv(x, y)
        if nom in PNJ:
            pnj[nom].append((gu, gv))
            continue
        t, (ax, ay), _ = sp[nom]
        image, sous = sprite_jeu(t, int(ax), int(ay))
        if nom not in faits:
            webp(image, DECOR_DIR / f'{nom}.webp')
            faits.add(nom)
        # hauteur de l'image, et ce qui en dépasse sous le pied (decorSprites.ts), en unités du monde
        item = {'sprite': f'v3/{nom}', 'u': gu, 'v': gv, 'height': round(image.shape[0] / PX, 3),
                'below': round((sous + 0.5) / PX, 3)}
        if SOLIDE.get(nom):
            item['solid'] = SOLIDE[nom]
        items.append(item)
    return items, pnj


if __name__ == '__main__':
    etapes = sys.argv[2:] or ['textures', 'donnees']
    g = dict(np.load('export/geo.npz'))
    plan = pickle.load(open('export/plan.pkl', 'rb'))
    if 'textures' in etapes:
        textures(g)
    if 'donnees' in etapes:
        marche, pont = masque_marche(g)
        np.save('export/marche.npy', marche)
        np.save('export/pont.npy', pont)
        items, pnj = decors(plan, marche)
        json.dump({'decor': items, 'pnj': pnj}, open('export/decors.json', 'w'), ensure_ascii=False)
        print(len(items), 'décors', {k: len(v) for k, v in pnj.items()})
