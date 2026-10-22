"""Vues d'ambiance : la carte + des arbres du pack Forgotten Memories posés à part (comme les décors du jeu),
avec leurs ombres, et les persos. Sert seulement à juger l'ensemble, rien n'est peint dans la carte."""
import os
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

from echelle import scale2x
from plan import construire, CELL, HERBE, FLEURS, TERRE, DALLE, MARCHE, SPIRALE, PIERRE, DIGUE, RIZ, EAU, xz2uv
from vues import frame, px, G, SO, KA

FM = os.path.join(os.environ.get('PACKS', 'packs'), 'ForgottenMemories') + '/'
SHEET = np.array(Image.open(FM + 'Trees_seperated.png').convert('RGBA'))
# (arbre complet y0, y1, x0, x1), (ombre y0, y1, x0, x1)
ARBRES = {
    'erable': ((307, 416, 18, 92), (535, 571, 35, 85)),
    'ginkgo': ((316, 416, 199, 255), (549, 578, 226, 264)),
    'pin': ((321, 413, 268, 315), (542, 579, 276, 323)),
    'saule': ((273, 439, 330, 509), (528, 633, 355, 537)),
}


def sprite(box):
    y0, y1, x0, x1 = box
    a = SHEET[y0:y1, x0:x1].copy()
    return scale2x(a, wrap=False)


SPR = {k: (sprite(t), sprite(o)) for k, (t, o) in ARBRES.items()}


def pied(img):
    """Milieu du bas du tronc (dernière ligne opaque)."""
    ys, xs = np.nonzero(img[..., 3] > 200)
    bas = ys.max()
    return int(xs[ys == bas].mean()), bas


def placer(p, centre, rayon, seed, eviter=()):
    """Positions d'arbres (u, v, h, espèce) : sur l'herbe, loin des chemins et des bords, en bosquets."""
    herbe = np.isin(p.mat, (HERBE, FLEURS))
    chemin = np.isin(p.mat, (TERRE, DALLE, MARCHE, SPIRALE, PIERRE, DIGUE, RIZ, EAU))
    d_chemin = ndi.distance_transform_edt(~chemin) * CELL
    # bord de plateau : une cellule voisine à un autre niveau
    niv = p.niv
    bord = np.zeros_like(herbe)
    for dx, dz in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        bord |= np.abs(np.roll(np.roll(niv, dx, 0), dz, 1) - niv) > 0.3
    d_bord = ndi.distance_transform_edt(~bord) * CELL
    ok = herbe & (d_chemin > 1.6) & (d_bord > 1.1)
    du, dv = p.U - centre[0], p.V - centre[1]
    ok &= (np.abs(du) < rayon[0]) & (np.abs(dv) < rayon[1])
    rng = np.random.default_rng(seed)
    g = ndi.gaussian_filter(rng.standard_normal(p.mat.shape), 4 / CELL)
    g /= g.std() + 1e-9
    seul = rng.random(p.mat.shape) < 0.004                  # quelques arbres isolés hors des bosquets
    cand = np.argwhere(ok & ((g > 0.45) | seul))
    rng.shuffle(cand)
    pris = []
    for i, j in cand:
        u, v = p.U[i, j], p.V[i, j]
        if any((u - a) ** 2 + ((v - b) * 0.8) ** 2 < (3.6 if 'saule' in (e,) else 1.75) ** 2 for a, b, _, e in pris):
            continue
        if any((u - a) ** 2 + (v - b) ** 2 < 3.0 ** 2 for a, b in eviter):
            continue
        if u > 8 and 2 < v < 28:
            esp = 'saule' if rng.random() < 0.25 else ['erable', 'pin', 'ginkgo'][int(rng.integers(0, 3))]
        elif v > 30:
            esp = 'pin' if rng.random() < 0.6 else 'ginkgo'
        else:
            esp = ['erable', 'ginkgo', 'pin', 'erable'][int((g[i, j] * 7) % 4)]
        pris.append((u, v, float(niv[i, j]), esp))
    return pris


def ambiance(carte, p, centre, taille, persos, sortie, seed=3):
    N = carte.shape[0]
    cx, cy = px(*centre, 0, N)
    w, hh = taille
    x0, y0 = int(cx - w // 2) // 2, int(cy - hh // 2) // 2
    bout = carte[y0:y0 + hh // 2, x0:x0 + w // 2]
    im = Image.fromarray(scale2x(bout, wrap=False)).convert('RGBA')
    arbres = placer(p, centre, (w / 2 / (2 * N / 80) + 3, hh / 2 / (2 * N / 80) * 1.9 + 3), seed,
                    [(u, v) for _, u, v, _, _ in persos])
    objets = []
    for u, v, h, esp in arbres:
        x, y = px(u, v, h, N)
        x, y = int(x) - 2 * x0, int(y) - 2 * y0
        t, o = SPR[esp]
        ax, ay = pied(t)
        fond = Image.new('RGBA', im.size, (0, 0, 0, 0))
        fond.paste(Image.fromarray(o), (x - o.shape[1] // 2 + 6, y - o.shape[0] // 2 - 4))
        im.alpha_composite(fond)
        objets.append((y, Image.fromarray(t), x - ax, y - ay))
    for nom, u, v, h, miroir in persos:
        f, (ax, ay) = frame(nom)
        if miroir:
            f = f.transpose(Image.FLIP_LEFT_RIGHT)
            ax = f.width - 1 - ax
        x, y = px(u, v, h, N)
        x, y = int(x) - 2 * x0, int(y) - 2 * y0
        objets.append((y, f, x - ax, y - ay))
    for _, spr, x, y in sorted(objets, key=lambda o: o[0]):
        fond = Image.new('RGBA', im.size, (0, 0, 0, 0))
        fond.paste(spr, (x, y))
        im.alpha_composite(fond)
    im.convert('RGB').save(sortie)


def apercu_arbres(carte, p, sortie, seed=5):
    """Toute l'île à la résolution dessin, avec des arbres du pack, réduite pour l'aperçu."""
    N = carte.shape[0]
    im = Image.fromarray(carte).convert('RGBA')
    objets = []
    for u, v, h, esp in placer(p, (0, 0), (45, 80), seed):
        x, y = px(u, v, h, N)
        x, y = int(x) // 2, int(y) // 2
        t, o = ARBRES[esp]
        t = SHEET[t[0]:t[1], t[2]:t[3]]
        o = SHEET[o[0]:o[1], o[2]:o[3]]
        ax, ay = pied(t)
        ombre = Image.new('RGBA', im.size, (0, 0, 0, 0))
        ombre.paste(Image.fromarray(o), (x - o.shape[1] // 2 + 3, y - o.shape[0] // 2 - 2))
        im.alpha_composite(ombre)
        objets.append((y, Image.fromarray(t), x - ax, y - ay))
    for _, spr, x, y in sorted(objets, key=lambda o: o[0]):
        im.alpha_composite(spr, (x, y)) if x >= 0 and y >= 0 else None
    im.convert('RGB').resize((1400, 1400), Image.LANCZOS).save(sortie)


if __name__ == '__main__':
    carte = np.array(Image.open(sys.argv[1] if len(sys.argv) > 1 else 'ile-4224.png').convert('RGB'))
    p = construire(7)
    ambiance(carte, p, (2, 18), (2000, 1400), [(G, 3.2, 21.0, 2.32, False), (KA, 9.0, 16.0, 2.2, True),
                                                (SO, -1.5, 24.5, 2.2, False)], 'ambiance-pont.png')
    ambiance(carte, p, (-12, 4), (2000, 1400), [(G, -14, 6, 2.2, False), (SO, -11.5, 4, 2.2, True),
                                                 (KA, -8.5, 13.5, 2.2, True)], 'ambiance-village.png')
    apercu_arbres(carte, p, 'apercu-arbres.png')
    print('ok')
