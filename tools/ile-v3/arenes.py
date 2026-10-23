"""Arènes des donjons en pixel art, dans le style de la carte v3 (même rendu, mêmes tuiles, mêmes décors).

Chaque arène est un petit plan (plan.py) autour de l'origine : le carré de combat (arenaHalfSize 9 dans le monde,
soit ±6 unités du plan, aligné sur le monde comme les plateaux de l'île) et tout ce qui se voit autour. Le rendu de
l'île (rendu.rendre) le dessine à la même échelle que la carte (35,2 px par unité du monde), puis on garde le morceau
que la caméra du combat peut montrer.
- public/sprites/arenes/<nom>.webp : le sol, sans les décors
- src/data/arenes.json : taille de l'image et son centre dans le repère du jeu (u, v), décors posés par le jeu
  (decorSprites.ts, triés avec les personnages), couleur du fond au-delà de l'image
- public/sprites/decor/v3/roc_*.webp : les rochers posés autour, et ceux qui servent d'obstacles (les « souches »)

Le jeu pose l'image sur le sol (src/render/arenaPixel.ts) : pied de l'arène, au niveau `sol` du plan, à y = 0.

Lancer : PACKS=… python3 arenes.py ../.. [yomi rizieres fujikasane]"""
import json
import math
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

import decor
import decorer
import rendu
from export_jeu import sprite_jeu
from plan import (DALLE, DIGUE, EAU, FORET, HERBE, PIERRE, RIZ, TERRE, VOLCAN, CELL, Plan, bruit_plan, tache, uv2xz,
                  xz2uv)

JEU = Path(sys.argv[1] if len(sys.argv) > 1 else '/home/user/rivages-des-morts')
N = 4224
S = 1.5
PX = N / (80 * S)                    # pixels par unité du monde (35,2)
PV = N / (80 * S * math.sqrt(3))     # lignes d'image par unité de profondeur v du monde (20,3)
K = 0.8165 * PX                      # lignes d'image par unité de hauteur
A = 6.0                              # demi-côté de l'arène (unités du plan) : arenaHalfSize 9 dans le monde
# morceau gardé autour du pied de l'arène (unités du monde) : la caméra suit le héros jusqu'aux coins
DEMI_U, AVANT_V, ARRIERE_V, HAUT = 30.0, 26.0, 26.0, 9.0


def plan2px(u, v, h):
    return (u / 80 + 0.5) * N, (0.5 - v / (80 * math.sqrt(3))) * N - h * K


def carre(p, cx=0.0, cz=0.0):
    """Distance « carrée » au centre de l'arène (bords alignés sur le monde, losange à l'écran)."""
    return np.maximum(np.abs(p.X - cx), np.abs(p.Z - cz))


def vide(seed):
    p = Plan(seed)
    p.zones['spirale'] = (1e3, 1e3)
    p.terrasse = np.full(p.mat.shape, -1, np.int16)
    return p


# ============================== les plans ====================================
def plan_yomi():
    """Yomi sans fond : une salle souterraine noyée. De l'eau peu profonde sur tout le sol, une margelle de pierre au
    bord de l'arène, la roche de la caverne en gradins au fond, et devant, la roche qui se perd dans le noir."""
    p = vide(71)
    b = bruit_plan(p.U.shape, 2.5, 3)
    d = carre(p)
    p.mat[:] = VOLCAN
    p.niv[:] = 0.4
    sol = d + 0.15 * b <= A + 0.9
    p.mat[sol] = EAU
    p.niv[sol] = 0.0
    marge = ~sol & (d + 0.15 * b <= A + 1.9)
    p.mat[marge] = PIERRE
    p.niv[marge] = 0.4
    # au fond (les deux bords loin de la caméra), la paroi de la caverne monte en gradins irréguliers
    fond = np.maximum(p.X, p.Z) + 0.9 * b
    for r, hh in [(A + 3.2, 20.0)]:
        m = (fond > r) & (np.minimum(p.X, p.Z) > -A - 6)
        p.niv[m] = hh
        p.mat[m] = VOLCAN
    p.zones['sol'] = 0.0
    return p


def plan_rizieres():
    """Rizières noyées (la Jorōgumo) : des carrés de riz inondé coupés de diguettes, une diguette plus large au bord de
    l'arène, des terrasses qui montent au fond, puis le talus d'herbe et ses saules."""
    p = vide(72)
    b = bruit_plan(p.U.shape, 3.0, 5)
    d = carre(p)
    p.mat[:] = HERBE
    p.niv[:] = 0.0
    champ = d <= A + 7.5
    p.mat[champ] = RIZ
    # diguettes : un quadrillage de 2 unités du plan, aligné sur le monde
    pas = 2.0
    fx = np.abs(((p.X + A) / pas) % 1 - 0.5) * pas
    fz = np.abs(((p.Z + A) / pas) % 1 - 0.5) * pas
    dig = champ & ((fx > pas / 2 - 0.16) | (fz > pas / 2 - 0.16))
    p.mat[dig] = DIGUE
    bord = (d > A + 0.1) & (d <= A + 0.9)            # la limite de l'arène : un sentier de terre battue
    p.mat[bord] = TERRE
    # au fond, les terrasses (chacune un peu plus haute), puis le talus
    fond = np.maximum(p.X, p.Z) + 0.5 * b
    for k, r in enumerate([A + 2.6, A + 5.0, A + 7.4]):
        m = fond > r
        p.niv[m] = 0.9 * (k + 1)
    talus = fond > A + 9.4
    p.niv[talus] = 3.6
    p.mat[talus] = HERBE
    # le bord des terrasses est une diguette
    for k, r in enumerate([A + 2.6, A + 5.0, A + 7.4]):
        p.mat[(fond > r) & (fond <= r + 0.45) & ~talus] = DIGUE
    p.zones['sol'] = 0.0
    return p


def plan_fujikasane():
    """Mont Fujikasane, en grand : la clairière du sommet, son herbe et son sentier de terre, le sous-bois sombre tout
    autour, et au fond le haut du mont qui remonte encore."""
    p = vide(73)
    b = bruit_plan(p.U.shape, 3.0, 7)
    p.mat[:] = FORET
    p.niv[:] = 0.0
    r = np.hypot(p.X, p.Z) + 0.9 * b
    clair = (r <= A * 1.42) | (carre(p) <= A + 0.6)
    p.mat[clair] = HERBE
    p.mat[clair & (bruit_plan(p.U.shape, 1.2, 9) > 0.55)] = TERRE        # herbe pelée
    # le sentier arrive par le devant (coin -x -z), et s'efface au milieu de la clairière
    sentier = p.bande([(0, -16), (0.3, -9), (-0.4, -4), (0, -1)], 1.6 + 0.6 * b)
    p.mat[sentier] = TERRE
    fond = np.maximum(p.X, p.Z) + 0.8 * b
    haut = (fond > A + 7.0) & (r > A * 1.3)
    p.niv[haut] = 2.2
    plus_haut = (fond > A + 11.0) & (r > A * 1.5)
    p.niv[plus_haut] = 4.4
    # quelques pierres plates au bord de la clairière
    for k, (u, v, rr) in enumerate([(-6.5, 3.0, 0.9), (6.8, 1.5, 0.8), (2.5, 7.5, 0.7)]):
        p.mat[tache(p, u, v, rr, rr * 0.8, 0.3, 0.8, seed=90 + k)] = PIERRE
    p.zones['sol'] = 0.0
    return p


# ============================== les décors ===================================
def niveau(p, u, v):
    x, z = uv2xz(u, v)
    i = int(np.clip((x + 84) / CELL, 0, p.n - 1))
    j = int(np.clip((z + 84) / CELL, 0, p.n - 1))
    return float(p.niv[i, j]), int(p.mat[i, j])


def autour(p, rng, n, rmin, rmax, ecart, garde, essais=4000):
    """Points (u, v) du plan au-delà du carré de combat, à `ecart` les uns des autres ; `garde(u, v, h, mat)` trie."""
    pts = []
    for _ in range(essais):
        if len(pts) >= n:
            break
        x, z = rng.uniform(-rmax, rmax, 2)
        dd = max(abs(x), abs(z))
        if dd < rmin or dd > rmax:
            continue
        u, v = xz2uv(x, z)
        h, m = niveau(p, u, v)
        if not garde(u, v, h, m):
            continue
        if any(math.hypot(u - a, v - b) < ecart for a, b in pts):
            continue
        pts.append((u, v))
    return pts


def dans_cadre(u, v):
    """Le pied du décor reste dans le morceau d'image gardé (sinon on ne le verrait jamais)."""
    return abs(u) * S < DEMI_U - 1 and -AVANT_V + 2 < v * S < ARRIERE_V + 4


def decors_yomi(p, rng):
    obj = []
    # gros rochers sur la margelle et dans les gradins du fond ; aucun arbre : on est sous terre
    for u, v in autour(p, rng, 18, A + 1.2, A + 14, 3.0, lambda u, v, h, m: m in (PIERRE, VOLCAN) and h < 1 and dans_cadre(u, v)):
        h, _ = niveau(p, u, v)
        devant = v < -A * 0.9
        obj.append(('roc_petit' if devant else rng.choice(['roc_aiguille', 'roc_aiguille', 'roc_amas']), u, v, h))
    for u, v in [xz2uv(A + 1.3, -A + 1.0), xz2uv(-A + 1.0, A + 1.3)]:           # deux lanternes sur la margelle
        obj.append(('lanterne', u, v, niveau(p, u, v)[0]))
    u, v = xz2uv(A + 1.6, A + 1.6)                                              # le torii noir, au fond
    obj.append(('torii_noir', u, v, niveau(p, u, v)[0]))
    return obj


def decors_rizieres(p, rng):
    obj = []
    u, v = xz2uv(8.0, 8.0)                                                      # torii et jizō, comme avant (dungeons.json)
    obj.append(('torii', u, v, niveau(p, u, v)[0]))
    for k in range(6):
        u, v = xz2uv(-3.3 + k * 1.33, 7.07)
        obj.append(('jizo', u, v, niveau(p, u, v)[0]))
    # saules et cèdres sur le talus du fond, saules au bord des rizières sur les côtés
    for u, v in autour(p, rng, 30, A + 9.8, A + 22, 2.3, lambda u, v, h, m: m == HERBE and h > 3 and dans_cadre(u, v)):
        obj.append((rng.choice(['saule', 'saule', 'sugi_haut', 'kusunoki', 'momiji']), u, v, niveau(p, u, v)[0]))
    cote = lambda u, v, h, m: m == HERBE and h < 1 and abs(u) > 12 and v > -5 and dans_cadre(u, v)
    for u, v in autour(p, rng, 10, A + 7.6, A + 16, 2.6, cote):
        obj.append(('saule', u, v, niveau(p, u, v)[0]))
    devant = lambda u, v, h, m: m in (DIGUE, HERBE) and v < -A * 1.2 and dans_cadre(u, v)
    for u, v in autour(p, rng, 12, A + 1.6, A + 14, 1.6, devant):
        obj.append((rng.choice(['buisson1', 'buisson2', 'tsutsuji2']), u, v, niveau(p, u, v)[0]))
    return obj


def decors_fujikasane(p, rng):
    obj = []
    # la forêt dense tout autour, sauf devant : là, des buissons seulement (un arbre cacherait le combat)
    loin = lambda u, v, h, m: m == FORET and v > -A * 0.6 and dans_cadre(u, v)
    for u, v in autour(p, rng, 90, A + 1.5, A + 22, 1.55, loin, essais=20000):
        r = rng.random()
        nom = 'sugi_haut' if r < 0.5 else ('kusunoki' if r < 0.65 else ('momiji' if r < 0.72 else rng.choice(['sugi', 'matsu'])))
        obj.append((nom, u, v, niveau(p, u, v)[0]))
    bas = lambda u, v, h, m: m == FORET and v <= -A * 0.6 and dans_cadre(u, v)
    for u, v in autour(p, rng, 26, A + 1.3, A + 18, 1.3, bas, essais=20000):
        obj.append((rng.choice(['buisson0', 'buisson1', 'buisson2', 'azalee1']), u, v, niveau(p, u, v)[0]))
    bord = lambda u, v, h, m: m in (HERBE, TERRE, PIERRE, FORET) and dans_cadre(u, v)
    for u, v in autour(p, rng, 7, A + 0.8, A + 3.5, 3.0, bord):               # rochers moussus au bord de la clairière
        obj.append((rng.choice(['roc_mousse', 'roc_mousse_seul']), u, v, niveau(p, u, v)[0]))
    for u, v in [xz2uv(-A - 0.6, A + 1.6), xz2uv(A + 1.6, -A - 0.6)]:           # deux lanternes de pierre
        obj.append(('lanterne', u, v, niveau(p, u, v)[0]))
    return obj


def pack(fichier, morceaux, sombre=False):
    """Un décor fait de morceaux d'une planche des packs, (x, y, largeur, hauteur, dx, dy), le premier au fond ;
    `sombre` : ramené à la roche sombre du volcan (la caverne du Yomi)."""
    import fm
    src = np.array(Image.open(fichier).convert('RGBA'))
    W = max(dx + w for _, _, w, _, dx, _ in morceaux)
    H = max(dy + h for _, _, _, h, _, dy in morceaux)
    out = np.zeros((H, W, 4), np.uint8)
    for x, y, w, h, dx, dy in morceaux:
        m = src[y:y + h, x:x + w]
        a = m[..., 3] > 127
        out[dy:dy + h, dx:dx + w][a] = m[a]
    if sombre:
        a = out[..., 3] > 0
        cols = out[a, :3].astype(np.int32)
        lum = cols @ np.array([299, 587, 114])
        u = np.unique(lum)
        rang = np.searchsorted(u, lum) / max(1, len(u) - 1)
        rampe = fm.RAMPE_VOLCAN
        out[a, :3] = rampe[1 + np.round((1 - rang) * 5).astype(int)]
    return out, (W // 2, H - 3), None


def rochers():
    """Les rochers des arènes, pris aux packs (Resurrected RPG, Forgotten Memories) : décors et obstacles."""
    import fm
    rr, fmp = fm.RR + 'Props.png', fm.FM + 'Props.png'
    return {
        'roc_aiguille': pack(rr, [(2, 376, 59, 70, 0, 0)], sombre=True),
        'roc_amas': pack(rr, [(2, 449, 29, 28, 0, 4), (33, 452, 31, 23, 26, 9), (34, 483, 30, 29, 12, 14)], sombre=True),
        'roc_petit': pack(rr, [(33, 452, 31, 23, 0, 0)], sombre=True),
        'roc_obstacle': pack(rr, [(0, 482, 33, 29, 0, 0), (68, 459, 26, 14, 22, 17)], sombre=True),
        'souche_fm': pack(fmp, [(260, 133, 55, 55, 0, 0)]),
        'roc_mousse': pack(fmp, [(17, 289, 43, 32, 0, 0), (65, 298, 32, 23, 36, 10)]),
        'roc_mousse_seul': pack(fmp, [(17, 225, 43, 32, 0, 0)]),
    }


# ============================== l'image ======================================
def teinte(img, mult, ajout=(0, 0, 0)):
    f = img.astype(np.float32) * np.array(mult, np.float32) + np.array(ajout, np.float32)
    return np.clip(f, 0, 255).astype(np.uint8)


def fondu(img, fond, cx, cy, bords):
    """Assombrit (ou embrume) vers la couleur du fond, loin du centre : l'image se fond dans le fond uni du jeu."""
    H, W = img.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    du = np.abs(xx - cx) / PX / DEMI_U
    dv = np.where(yy < cy, (cy - yy) / cy, (yy - cy) / PV / AVANT_V)
    t = np.clip((np.maximum(du, dv) - bords) / (1 - bords), 0, 1) ** 1.5
    t = t[..., None]
    return (img * (1 - t) + np.array(fond, np.float32) * t).astype(np.uint8)


ARENES = {
    'yomi': dict(plan=plan_yomi, decors=decors_yomi, fond='#07090e', obstacle='roc_obstacle',
                 teinte=((0.62, 0.7, 0.86), (0, 2, 8)), eau=((0.34, 0.52, 0.58), (4, 10, 14)), gue=PIERRE, bords=0.55),
    'rizieres': dict(plan=plan_rizieres, decors=decors_rizieres, fond='#b9c2c6', obstacle='souche_fm',
                     teinte=((0.9, 0.95, 0.97), (12, 14, 16)), bords=0.55),
    'fujikasane': dict(plan=plan_fujikasane, decors=decors_fujikasane, fond='#0c1018', obstacle='roc_mousse',
                       teinte=((0.5, 0.6, 0.86), (0, 3, 12)), bords=0.5),
}


# halo des flammes sur le sol : couleur, rayon (monde), force, hauteur de la flamme (monde)
LUEURS = {'lanterne': ((255, 160, 80), 3.4, 0.65, 1.0), 'torii_noir': ((255, 50, 40), 5.0, 0.55, 1.8)}


def lueurs(img, obj, x0, y0):
    H, W = img.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    f = img.astype(np.float32)
    for nom, u, v, h in obj:
        if nom not in LUEURS:
            continue
        coul, r, force, _ = LUEURS[nom]
        x, y = plan2px(u, v, h)
        g = force * np.exp(-(((xx - x + x0) / (r * PX)) ** 2 + ((yy - y + y0) / (r * PV)) ** 2))[..., None]
        f = f * (1 + 0.9 * g * np.array(coul, np.float32) / 255) + g * np.array(coul, np.float32) * 0.25
    return np.clip(f, 0, 255).astype(np.uint8)


def hexa(c):
    return [int(c[i:i + 2], 16) for i in (1, 3, 5)]


def faire(nom, sp, meta, apercu=None):
    cfg = ARENES[nom]
    p = cfg['plan']()
    geo = {}
    img = rendu.rendre(N, p, seed=7 + len(nom), verbeux=False, geo=geo)
    cx, cy = plan2px(0, 0, p.zones['sol'])
    x0, x1 = int(cx - DEMI_U * PX), int(cx + DEMI_U * PX)
    y0, y1 = int(cy - ARRIERE_V * PV - HAUT * K), int(cy + AVANT_V * PV)
    bout = img[y0:y1, x0:x1].copy()
    mult, ajout = cfg['teinte']
    bout = teinte(bout, mult, ajout)
    if 'eau' in cfg:                                     # l'eau prend la couleur du lieu (noire et froide sous terre)
        eau = ((geo['mat'] == EAU) & ~geo['face'])[y0:y1, x0:x1]
        bout[eau] = teinte(bout[eau], *cfg['eau'])
    if 'gue' in cfg:                                     # de l'eau peu profonde : le fond se voit au travers
        q = cfg['plan']()
        q.mat[q.mat == EAU] = cfg['gue']
        fond = rendu.rendre(N, q, seed=7 + len(nom), verbeux=False)[y0:y1, x0:x1]
        bout[eau] = (0.5 * bout[eau] + 0.5 * teinte(teinte(fond[eau], mult, ajout), *cfg['eau'])).astype(np.uint8)
    del geo, img
    obj = cfg['decors'](p, np.random.default_rng(len(nom) * 7))
    bout = lueurs(bout, obj, x0, y0)
    bout = fondu(bout, hexa(cfg['fond']), cx - x0, cy - y0, cfg['bords'])
    out = JEU / 'public/sprites/arenes' / f'{nom}.webp'
    out.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(bout).save(out, 'WEBP', lossless=True, quality=100, method=6)
    Hh, Ww = bout.shape[:2]

    def jeu(x, y):
        """Pixel de l'image gardée → (u, v) du jeu, l'origine au pied de l'arène."""
        return round(float((x - (cx - x0)) / PX), 3), round(float(((cy - y0) - y) / PV), 3)

    items = []
    for dnom, u, v, h in sorted(obj, key=lambda o: -o[2]):
        t, (ax, ay), _ = sp[dnom]
        image, sous = sprite_jeu(t, int(ax), int(ay))
        fichier = JEU / 'public/sprites/decor/v3' / f'{dnom}.webp'
        if not fichier.exists() or dnom in rochers_noms:
            Image.fromarray(image).save(fichier, 'WEBP', lossless=True, quality=100, method=6)
        x, y = plan2px(u, v, h)
        gu, gv = jeu(x - x0, y - y0)
        items.append({'sprite': f'v3/{dnom}', 'u': gu, 'v': gv, 'height': round(image.shape[0] / PX, 3),
                      'below': round((sous + 0.5) / PX, 3)})
    if apercu:
        vue = bout.copy()
        for dnom, u, v, h in sorted(obj, key=lambda o: -o[2]):
            t, (ax, ay), _ = sp[dnom]
            x, y = plan2px(u, v, h)
            X0, Y0 = int(x - x0 - ax), int(y - y0 - ay)
            hh, ww = t.shape[:2]
            a, b_ = max(0, -Y0), max(0, -X0)
            c, d = min(hh, Hh - Y0), min(ww, Ww - X0)
            if c <= a or d <= b_:
                continue
            m = t[a:c, b_:d, 3] > 127
            zone = vue[Y0 + a:Y0 + c, X0 + b_:X0 + d]
            zone[m] = teinte(t[a:c, b_:d, :3], mult, ajout)[m]
        Image.fromarray(vue).save(apercu / f'arene-{nom}.png')
    cu, cv = jeu(Ww / 2, Hh / 2)
    meta[nom] = {'image': f'arenes/{nom}.webp', 'width': round(Ww / PX, 3), 'height': round(Hh / PV, 3),
                 'center': {'u': cu, 'v': cv}, 'background': cfg['fond'], 'obstacle': f'roc-{nom}',
                 'tint': [round(c, 3) for c in mult],
                 'decor': items}
    print(nom, Ww, 'x', Hh, len(items), 'décors', flush=True)
    return bout, (cx - x0, cy - y0), items


if __name__ == '__main__':
    noms = sys.argv[2:] or list(ARENES)
    sp = decorer.sprites()
    sp.update(rochers())
    rochers_noms = set(rochers())
    for k in ('roc_obstacle', 'souche_fm', 'roc_mousse'):
        t, (ax, ay), _ = sp[k]
        image, _ = sprite_jeu(t, int(ax), int(ay))
        Image.fromarray(image).save(JEU / 'public/sprites/decor/v3' / f'{k}.webp', 'WEBP', lossless=True)
    chemin = JEU / 'src/data/arenes.json'
    meta = json.load(open(chemin)) if chemin.exists() else {}
    meta['about'] = ("Arènes des donjons en pixel art (tools/ile-v3/arenes.py) : sol en une image, son centre dans le "
                     "repère du jeu (u, v, l'arène autour de l'origine), décors debout posés par le jeu, couleur du fond "
                     "au-delà de l'image, sprite des obstacles, teinte des décors debout (la même que celle du sol).")
    for nom in noms:
        faire(nom, sp, meta, Path('/tmp/claude-0'))
    json.dump(meta, open(chemin, 'w'), ensure_ascii=False, indent=1)
