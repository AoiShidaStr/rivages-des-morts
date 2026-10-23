"""Pose les décors de l'île v3 selon le GDD (Yomotsu Hirasaka) : bosquets d'arbres japonisés par biome,
village des âmes (maison de thé d'Obaa Kiku, forge de Tetsu), torii vermillon du Grand Rocher, torii noir
du donjon, quatre lanternes d'Obon, six Jizō, buissons.
Rien n'est peint dans la carte : les décors sont des sprites à part, triés en profondeur avec les persos,
comme dans le jeu. Sorties : aperçu complet et vues à l'échelle du jeu (Scale2x)."""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

import decor
import fmifier
from echelle import scale2x
from plan import (construire, uv2xz, xz2uv, CELL, EXT, L1, L2, HERBE, FLEURS, TERRE, DALLE, MARCHE, SPIRALE,
                  PIERRE, DIGUE, RIZ, EAU, LAVE, SABLE, CENDRE, LYS, VOLCAN, FORET)
from vues import frame, px, G, SO, KA

GROS = {'shidarezakura', 'kusunoki', 'saule'}


# ============================ sprites ========================================
def buissons():
    """Buissons du pack Resurrected : verts, et azalées (tsutsuji) roses ou rouges."""
    P = decor.PLANTES_RR
    boites = [(443, 481, 821, 868), (448, 478, 763, 801), (452, 475, 701, 734)]   # rangée vert sombre
    out = {}
    for k, (y0, y1, x0, x1) in enumerate(boites):
        b = P[y0:y1, x0:x1].copy()
        out[f'buisson{k}'] = b
        out[f'azalee{k}'] = decor.teindre(b, ['#e8c4c9', '#d9a3ad', '#c26d82', '#a04f6a', '#7a3d55', '#4f2a3c'], set())
        out[f'tsutsuji{k}'] = decor.teindre(b, ['#e2825a', '#c95b4a', '#a8413d', '#7f3134', '#56242a'], set())
    return out


def sprites():
    sp = decor.tout()
    roc = np.array(Image.open('jeu/rocher.png').convert('RGBA'))
    roc = fmifier.fmifier(roc)
    ys, xs = np.nonzero(roc[..., 3] > 0)
    sp['rocher'] = (roc, (int(xs.mean()), int(ys.max()) - 6), decor.ombre_ellipse(int(roc.shape[1] * 1.05), 44))
    t, (ax, ay), o = sp['torii_noir']
    sp['torii_noir_z'] = (t[:, ::-1].copy(), (t.shape[1] - 1 - ax, ay), None)      # passage le long de z
    for k, b in buissons().items():
        ys, xs = np.nonzero(b[..., 3] > 0)
        sp[k] = (b, (int(xs.mean()), int(ys.max())), decor.ombre_ellipse(int(b.shape[1] * 0.9), 9))
    for k in ('maison_the', 'forge'):
        im, pied, _ = sp[k]
        sp[k] = (im, pied, decor.ombre_ellipse(int(im.shape[1] * 0.95), int(im.shape[1] * 0.42)))
    return sp


# ============================ terrain ========================================
class Sol:
    """Où l'on peut poser quelque chose : herbe plate, hors chemins, loin des bords de plateau."""

    def __init__(self, p):
        self.p = p
        chemin = np.zeros(p.mat.shape, bool)
        for pts, larg, _ in p.chemins:
            chemin |= p.bande(pts, larg + 0.8)
        dur = np.isin(p.mat, (EAU, LAVE, RIZ, DIGUE, DALLE, MARCHE, SPIRALE, PIERRE, SABLE))
        for cu, cv, ax, az, axe, h0, h1 in p.marches:
            cx, cz = uv2xz(cu, cv)
            dur |= (np.abs(p.X - cx) <= ax + 0.8) & (np.abs(p.Z - cz) <= az + 0.8)
        for b in p.ponts:
            u0, v0 = b['bouts'][0]
            u1, v1 = b['bouts'][1]
            dur |= p.bande([(u0, v0), (u1, v1)], 4.0)
        if 'parc' in p.zones:                          # le parc : rien au hasard dedans, tout y est posé à la main
            pu, pv, pa = p.zones['parc']
            pcx, pcz = uv2xz(pu, pv)
            dur |= (np.abs(p.X - pcx) <= pa + 0.7) & (np.abs(p.Z - pcz) <= pa + 0.7)
        if 'fujikasane' in p.zones:                    # la clairière du gardien
            fu, fv = p.zones['fujikasane']
            dur |= np.hypot(p.U - fu, (p.V - fv) * 1.1) < 5.0
            # et devant elle (côté caméra), pas d'arbre : ils cacheraient le gardien et le héros
            dur |= (np.abs(p.U - fu) < 4.6) & (p.V > fv - 8.0) & (p.V < fv)
        self.mauvais = chemin | dur
        self.d_mauvais = ndi.distance_transform_edt(~self.mauvais) * CELL
        self.d_eau = ndi.distance_transform_edt(p.mat != EAU) * CELL
        self._plat = {}
        self.pris = []

    def ij(self, u, v):
        x, z = uv2xz(u, v)
        return int((x + EXT) / CELL), int((z + EXT) / CELL)

    def h(self, u, v):
        i, j = self.ij(u, v)
        return float(self.p.niv[i, j])

    def plat(self, r):
        k = int(np.ceil(r / CELL))
        if k not in self._plat:
            yy, xx = np.mgrid[-k:k + 1, -k:k + 1]
            fp = xx ** 2 + yy ** 2 <= k * k
            niv = self.p.niv
            self._plat[k] = (ndi.maximum_filter(niv, footprint=fp) - ndi.minimum_filter(niv, footprint=fp)) < 0.05
        return self._plat[k]

    def ok(self, r, marge=0.3):
        return (self.d_mauvais >= r) & self.plat(r + marge) & (self.p.niv > 0.5)

    def libre(self, u, v, r, ecart=1.0):
        return all((u - a) ** 2 + (v - b) ** 2 >= (ecart * (r + ra)) ** 2 for a, b, ra in self.pris)

    def cherche(self, u0, v0, r, rmax=8.0, ecart=1.0):
        """La place libre la plus proche de (u0, v0) pour un objet de rayon r."""
        ok = self.ok(r) & ((self.p.U - u0) ** 2 + (self.p.V - v0) ** 2 <= rmax ** 2)
        cand = np.argwhere(ok)
        if not len(cand):
            print('pas de place pour', (u0, v0, r))
            return None
        d = (self.p.U[ok] - u0) ** 2 + (self.p.V[ok] - v0) ** 2
        for k in np.argsort(d):
            i, j = cand[k]
            u, v = float(self.p.U[i, j]), float(self.p.V[i, j])
            if self.libre(u, v, r, ecart):
                self.pris.append((u, v, r))
                return u, v, float(self.p.niv[i, j])
        return None

    def prendre(self, u, v, r):
        self.pris.append((u, v, r))
        return u, v, self.h(u, v)


# ============================ placement ======================================
def espece(u, v, mat, d_eau, choix, rng):
    """Essence d'arbre selon le lieu : chaque biome a sa couleur (comme les régions de Ghost of Tsushima),
    et un bosquet garde la même essence (choix ∈ [0, 1[ vient d'un bruit lisse)."""
    def parmi(*l):
        return l[int(choix * len(l))]
    r = rng.random()
    if mat == FORET:                                               # Mont Fujikasane : vieille forêt de cèdres
        if r < 0.5:
            return 'sugi_haut'
        return 'kusunoki' if r < 0.62 else ('momiji' if r < 0.7 else parmi('sugi', 'sugi_haut', 'sugi', 'matsu'))
    if mat == CENDRE or np.hypot(u + 16, (v - 46) / 1.2) < 15:    # pentes du volcan : pins tordus, clairsemés
        return 'matsu' if r < 0.35 else None
    if v > 35 and -12 < u < 12:                                    # autour du Grand Rocher : cerisiers
        return 'kusunoki' if r < 0.12 else parmi('shidarezakura', 'sakura', 'sakura_rond', 'sakura')
    if v > 38 and u >= 12:                                         # plateau de la cascade : érables rouges, cèdres
        return 'sugi_haut' if r < 0.2 else parmi('momiji', 'momiji_fm', 'momiji')
    if u < -17 and v > 8:                                          # vers le donjon : cèdres sombres
        return parmi('sugi_haut', 'sugi', 'kusunoki', 'sugi_haut')
    if d_eau < 2.5 and r < 0.45:                                   # saules au bord de l'eau
        return 'saule'
    if u < -4 and -16 < v <= 16:                                   # village des âmes : cerisiers, kakis
        return 'kaki' if r < 0.3 else parmi('sakura', 'sakura_rond', 'kusunoki', 'sakura')
    if u < -4:                                                     # côte sud-ouest : pins et camphriers
        return parmi('matsu', 'matsu', 'sugi', 'kusunoki')
    if v > 0:                                                      # rive est, au-dessus des rizières
        return parmi('kusunoki', 'kaki', 'saule', 'kaki')
    if r < 0.3:                                                    # prairie est : clairsemée (place pour combattre)
        return None
    return 'kaki' if r < 0.42 else parmi('kusunoki', 'momiji', 'kaki', 'ginkgo', 'kusunoki', 'matsu', 'momiji_fm')


def placer_tout(p, seed=5):
    sol = Sol(p)
    obj = []          # (nom, u, v, h)

    def mettre(nom, res):
        if res is not None:
            obj.append((nom, *res))
        return res

    # --- Grand Rocher au centre du jardin en spirale, torii vermillon en haut de l'escalier
    u, v = p.zones['rocher']
    mettre('rocher', sol.prendre(u, v + 0.6, 2.6))
    cu, cv, ax, az, axe, h0, h1 = min(p.marches, key=lambda m: (m[0] + 4) ** 2 + (m[1] - 36) ** 2)
    sx, sz = uv2xz(cu, cv)
    tu, tv = xz2uv(sx + ax + 1.3, sz)
    mettre('torii', sol.prendre(tu, tv, 1.0))
    # --- donjon : torii noir et son portail
    du, dv = p.zones['donjon']
    mettre('torii_noir_z', sol.prendre(du, dv, 1.6))
    # --- village des âmes
    mettre('maison_the', sol.cherche(-19, 8, 2.5, 9))
    mettre('forge', sol.cherche(-7, -2, 2.3, 9))
    mettre('maison_a', sol.cherche(-21, -2, 2.1, 9))
    mettre('maison_b', sol.cherche(-9, -10, 2.1, 9))
    # --- quatre lanternes d'Obon le long du grand chemin (ponton → place → pont → Grand Rocher)
    pw, pe = p.ponts[0]['bouts']
    for (lu, lv) in [(-15.5, -33), (-8.5, -1), (pw[0] - 2.5, pw[1] - 1.5), (tu - 2.0, tv - 1.0)]:
        mettre('lanterne', sol.cherche(lu, lv, 0.45, 4, ecart=1.0))
    # --- six Jizō en rang au bout du chemin des lys
    for v0 in np.arange(16.5, 10, -0.4):
        for u0 in np.arange(-36, -28, 0.4):
            pts = [(u0 + 0.85 * k, v0) for k in range(6)]
            if all(sol.ok(0.4)[sol.ij(a, b)] and sol.libre(a, b, 0.4) for a, b in pts):
                h0_ = sol.h(*pts[0])
                if all(abs(sol.h(a, b) - h0_) < 0.05 for a, b in pts):
                    for a, b in pts:
                        mettre('jizo', sol.prendre(a, b, 0.9))
                    break
        else:
            continue
        break
    # --- la faille du Yomi sans fond, dans la paroi au pied de la cascade, juste à droite du rideau d'eau
    bx, bz = p.zones['chute']
    fu, fv = xz2uv(bx - 0.15, bz - 3.0)
    obj.append(('faille', fu, fv, L1))
    p.zones['faille'] = (fu, fv)
    # --- parc de la grande prairie : barrières sur le pourtour (une porte au milieu de chaque côté), bancs le long
    # des allées en croix, un cerisier au bout de chaque pelouse
    pu, pv, pa = p.zones['parc']
    pcx, pcz = uv2xz(pu, pv)

    def parc(nom, dx, dz, r):
        u, v = xz2uv(pcx + dx, pcz + dz)
        obj.append((nom, u, v, sol.h(u, v)))
        sol.pris.append((u, v, r))
        return u, v
    lg = 0.8                                           # une barrière : 1,2 unité du monde
    bout = pa - 0.15
    k = np.arange(-bout + lg / 2, bout, lg)
    for t in k:
        if abs(t) < 1.2:
            continue
        for s_ in (-1, 1):
            parc('barriere', t, s_ * bout, 0.3)
            parc('barriere_z', s_ * bout, t, 0.3)
    p.zones['bancs'] = [parc(nom, dx, dz, 0.6) for nom, dx, dz in
                        [('banc', 3.3, 1.45), ('banc', -3.3, -1.45), ('banc_z', -1.45, 3.3), ('banc_z', 1.45, -3.3)]]
    for nom, (dx, dz) in zip(['sakura', 'sakura_rond', 'momiji', 'sakura'], [(1, 1), (1, -1), (-1, -1), (-1, 1)]):
        parc(nom, dx * (pa - 1.9), dz * (pa - 1.9), 0.95)
    # --- arbres en bosquets
    rng = np.random.default_rng(seed)
    g = ndi.gaussian_filter(rng.standard_normal(p.mat.shape), 3.5 / CELL)
    g /= g.std() + 1e-9
    gs = ndi.gaussian_filter(rng.standard_normal(p.mat.shape), 3.0 / CELL)
    gs = np.clip(0.5 + 0.5 * gs / (2 * gs.std() + 1e-9), 0, 0.999)        # choix de l'essence par bosquet
    seul = rng.random(p.mat.shape) < 0.005
    herbe = np.isin(p.mat, (HERBE, FLEURS, LYS, CENDRE, FORET))
    ok_arbre = sol.ok(0.9, 0.6) & herbe
    foret = p.mat == FORET                              # la forêt du Mont Fujikasane : serrée partout
    cand = np.argwhere(ok_arbre & ((g > 0.35) | seul | (foret & (g > -1.2))))
    rng.shuffle(cand)
    for i, j in cand:
        u, v = float(p.U[i, j]), float(p.V[i, j])
        e = espece(u, v, p.mat[i, j], sol.d_eau[i, j], gs[i, j], rng)
        if e is None:
            continue
        r = 1.7 if e in GROS else (0.85 if foret[i, j] else 0.95)
        if e in GROS and not (sol.ok(1.5, 0.6)[i, j]):
            e, r = ('sakura' if v > 35 else 'kaki'), 0.95
        if not sol.libre(u, v, r, ecart=0.95):
            continue
        sol.pris.append((u, v, r))
        obj.append((e, u, v, float(p.niv[i, j])))
    # --- buissons à l'orée des bosquets, azalées près du village et du Grand Rocher
    cand = np.argwhere(sol.ok(0.4, 0.3) & herbe & (g > 0.1) & (g < 0.5))
    rng.shuffle(cand)
    n = 0
    for i, j in cand:
        if n > 260:
            break
        u, v = float(p.U[i, j]), float(p.V[i, j])
        if not sol.libre(u, v, 0.45, 1.0):
            continue
        k = int(rng.integers(0, 3))
        pres_village = (u < -4 and -16 < v <= 16) or (v > 35 and -12 < u < 12)
        if np.hypot(u + 16, (v - 46) / 1.2) < 15:
            continue
        nom = (['azalee', 'tsutsuji'][int(rng.integers(0, 2))] if pres_village and rng.random() < 0.6 else 'buisson') + str(k)
        sol.pris.append((u, v, 0.45))
        obj.append((nom, u, v, float(p.niv[i, j])))
        n += 1
    return obj, sol


# ============================ composition =====================================
def composer(fond, sp, obj, persos, x0, y0, double):
    """fond : image RGB ; obj : (nom, u, v, h) ; persos : (sprite, u, v, h, miroir).
    double=True : le fond est la carte agrandie 2× et les sprites de décor passent aussi en Scale2x."""
    N = 4224
    im = Image.fromarray(fond).convert('RGBA')
    W, H = im.size
    f = 1 if double else 0.5
    cache = {}

    def spr(nom):
        if nom not in cache:
            t, (ax, ay), o = sp[nom]
            if double:
                t = scale2x(t, wrap=False)
                ax, ay = 2 * ax + 1, 2 * ay + 1
                o = scale2x(o, wrap=False) if o is not None else None
            cache[nom] = (Image.fromarray(t), ax, ay, Image.fromarray(o) if o is not None else None)
        return cache[nom]

    pos = []
    for nom, u, v, h in obj:
        x, y = px(u, v, h, N)
        x, y = int(x * f) - x0, int(y * f) - y0
        t, ax, ay, o = spr(nom)
        if x - ax > W or x + t.width - ax < 0 or y - ay > H or y + t.height - ay < 0:
            continue
        pos.append((y, t, x - ax, y - ay, o, x, y))
    calque = Image.new('RGBA', im.size, (0, 0, 0, 0))
    for _, t, x, y, o, cx, cy in pos:                                     # ombres d'abord
        if o is not None:
            dx = int(o.width * 0.12)
            calque.alpha_composite(o, (max(0, cx - o.width // 2 + dx), max(0, cy - o.height // 2))) \
                if cx - o.width // 2 + dx >= 0 and cy - o.height // 2 >= 0 else None
    im.alpha_composite(calque)
    for spr_, u, v, h, miroir in persos:
        fr, (ax, ay) = frame(spr_)
        if miroir:
            fr = fr.transpose(Image.FLIP_LEFT_RIGHT)
            ax = fr.width - 1 - ax
        x, y = px(u, v, h, N)
        x, y = int(x * f) - x0, int(y * f) - y0
        if not double:
            fr = fr.resize((fr.width // 2, fr.height // 2), Image.NEAREST)
            ax, ay = ax // 2, ay // 2
        pos.append((y, fr, x - ax, y - ay, None, x, y))
    for _, t, x, y, *_ in sorted(pos, key=lambda q: q[0]):
        c = Image.new('RGBA', im.size, (0, 0, 0, 0))
        c.paste(t, (x, y))
        im.alpha_composite(c)
    return im.convert('RGB')


def vue(carte, sp, obj, centre, taille, persos, sortie):
    N = carte.shape[0]
    cx, cy = px(*centre, 0, N)
    w, hh = taille
    x0, y0 = int(cx - w // 2) // 2, int(cy - hh // 2) // 2
    bout = scale2x(carte[y0:y0 + hh // 2, x0:x0 + w // 2], wrap=False)
    # on écarte les décors qui tomberaient sur les persos
    loin = [o for o in obj if all((o[1] - u) ** 2 + (o[2] - v) ** 2 > 2.2 ** 2 for _, u, v, _, _ in persos)
            or o[0] in ('rocher', 'torii', 'torii_noir_z', 'maison_the', 'forge', 'maison_a', 'maison_b', 'jizo', 'lanterne')]
    composer(bout, sp, loin, persos, 2 * x0, 2 * y0, True).save(sortie)


VUES = {
    'village': ((-14, 4), (1800, 1250), [(G, -13, 3, 2.2, False), (SO, -10.5, 1, 2.2, True), (KA, -8.5, 10.5, 2.2, True)]),
    'rocher': ((0.5, 44), (1800, 1400), [(G, -1.2, 38.6, 4.4, False), (SO, 5.0, 43.5, 4.4, True)]),
    'donjon': ((-26, 28.5), (1800, 1400), [(G, -21.8, 28.6, 4.4, True), (SO, -23.0, 17.2, 2.2, True)]),
    'pont': ((2.5, 20), (1800, 1250), [(G, 2.6, 19.8, 3.17, False), (KA, 9.5, 14.0, 2.2, True), (SO, -3.0, 25.5, 2.2, False)]),
    'cascade': ((15, 42), (1800, 1300), [(G, 20.0, 36.0, 2.2, True), (SO, 6.5, 41.5, 4.4, False)]),
    'ponton': ((-19, -42), (1800, 1250), [(G, -23.0, -47.0, 0.75, False), (SO, -18.5, -40.5, 0.4, True)]),
    'volcan': ((-14, 40), (1800, 1300), [(G, -5.5, 34, 4.4, False)]),
    'rizieres': ((17, 10), (1800, 1250), [(SO, 11.5, 8, 2.2, False), (KA, 12, -2, 2.2, True)]),
    'prairie': ((14, -26), (1800, 1250), [(G, 12, -20, 2.2, False), (SO, 15, -30, 2.2, True)]),
}

if __name__ == '__main__':
    carte = np.array(Image.open('ile-4224.png').convert('RGB'))
    p = construire(7)
    sp = sprites()
    obj, sol = placer_tout(p)
    from collections import Counter
    print(Counter(o[0] for o in obj))
    qui = sys.argv[1:] or list(VUES) + ['apercu']
    for k in qui:
        if k == 'apercu':
            grande = composer(carte, sp, obj, [], 0, 0, False)
            grande.save('ile-decors-4224.png')
            grande.resize((1600, 1600), Image.LANCZOS).save('apercu-decors.png')
        else:
            c, t, pers = VUES[k]
            vue(carte, sp, obj, c, t, pers, f'vue-{k}.png')
    print('ok')
