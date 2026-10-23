"""Ajoute deux petites cornes aux 8 vues d'un personnage (PixelLab ne les dessine pas à 62 px de haut).
Les vues de gauche reprennent les cornes de leur vue de droite, en miroir, recalées sur la tête."""
import sys
from pathlib import Path
import numpy as np
from PIL import Image

L, M, D = (232, 222, 196, 255), (186, 174, 148, 255), (112, 100, 88, 255)
CORNES = {
    'south': [(36, 15, M), (35, 15, L), (35, 14, L), (34, 13, L), (34, 12, L),
              (41, 15, M), (42, 15, L), (42, 14, L), (43, 13, L), (43, 12, L)],
    'south-east': [(42, 16, M), (43, 16, L), (43, 15, L), (44, 14, L), (44, 13, L),
                   (38, 13, M), (38, 12, L), (39, 11, L)],
    'east': [(43, 15, M), (44, 15, L), (44, 14, L), (45, 13, L), (39, 12, M), (39, 11, L)],
    'north-east': [(43, 15, D), (44, 14, M), (44, 13, L), (45, 12, L), (39, 12, D), (39, 11, M), (40, 10, L)],
    'north': [(35, 13, D), (34, 12, M), (33, 11, L), (42, 13, D), (43, 12, M), (44, 11, L)],
}
MIROIR = {'west': 'east', 'north-west': 'north-east', 'south-west': 'south-east'}


def poser(im, points):
    a = np.array(im)
    for x, y, c in points:
        a[y, x] = c
    return Image.fromarray(a)


def tete(im):
    return np.array(im)[:28, :, 3] > 0


def main(src, dst):
    src, dst = Path(src), Path(dst)
    dst.mkdir(parents=True, exist_ok=True)
    vues = {p.stem: Image.open(p).convert('RGBA') for p in src.glob('*.png')}
    for d, pts in CORNES.items():
        poser(vues[d], pts).save(dst / f'{d}.png')
    for d, modele in MIROIR.items():
        w = vues[d].width
        ref = tete(vues[modele])[:, ::-1]
        cible = tete(vues[d])
        best = max(((np.sum(np.roll(np.roll(ref, dy, 0), dx, 1) & cible), dx, dy)
                    for dx in range(-6, 7) for dy in range(-3, 4)))
        _, dx, dy = best
        pts = [(w - 1 - x + dx, y + dy, c) for x, y, c in CORNES[modele]]
        poser(vues[d], pts).save(dst / f'{d}.png')
        print(d, 'décalage', dx, dy)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])


# ------------------------------------------------------------------ animations ------------------------------------------------------------------
IVOIRE = lambda a: (a[..., 0] > 170) & (a[..., 1] > 160) & (a[..., 2] > 130) & (np.abs(a[..., 0].astype(int) - a[..., 2]) < 70)


def recaler(frame, vue, haut=6, bas=26):
    """Où est la tête de la vue de référence dans une image de l'animation ? (décalage, écart moyen des couleurs)"""
    v = np.array(vue).astype(int)
    f = np.array(frame).astype(int)
    ox, oy = (f.shape[1] - v.shape[1]) // 2, (f.shape[0] - v.shape[0]) // 2
    masque = v[haut:bas, :, 3] > 0
    ys, xs = np.nonzero(masque)
    ys = ys + haut
    meilleur = (1e9, 0, 0)
    for dy in range(-14, 15):
        for dx in range(-14, 15):
            yy, xx = ys + oy + dy, xs + ox + dx
            ok = (yy >= 0) & (yy < f.shape[0]) & (xx >= 0) & (xx < f.shape[1])
            if ok.mean() < 0.9:
                continue
            a, b = f[yy[ok], xx[ok]], v[ys[ok], xs[ok]]
            ecart = np.abs(a[:, :3] - b[:, :3]).sum(1) * (a[:, 3] > 0) + 300 * (a[:, 3] == 0)
            meilleur = min(meilleur, (ecart.mean(), dx + ox, dy + oy))
    return meilleur


def cornes_animation(dossier, vue, points, seuil=90):
    """Repose les cornes sur chaque image d'une animation qui les a perdues (le dos, surtout). Une image où la tête
    n'est pas retrouvée (chute, tête trop penchée) est laissée telle quelle."""
    vue = Image.open(vue).convert('RGBA')
    faites = []
    for f in sorted(Path(dossier).glob('*.png'), key=lambda p: int(p.stem)):
        im = Image.open(f).convert('RGBA')
        a = np.array(im)
        ecart, dx, dy = recaler(im, vue)
        if ecart > seuil:
            faites.append(f'{f.stem}:tête perdue')
            continue
        deja = sum(IVOIRE(a[max(0, y + dy - 1):y + dy + 2, max(0, x + dx - 1):x + dx + 2]).sum() > 0 for x, y, _ in points)
        if deja >= len(points) // 2:
            faites.append(f'{f.stem}:déjà')
            continue
        for x, y, c in points:
            X, Y = x + dx, y + dy
            if 0 <= Y < a.shape[0] and 0 <= X < a.shape[1] and (a[Y, X, 3] == 0 or a[Y, X, :3].sum() < 150):
                a[Y, X] = c
        Image.fromarray(a).save(f)
        faites.append(f'{f.stem}:posées')
    return faites
