"""Remet l'arme dans la main sur une marche faite avec un modèle de PixelLab (le modèle la fait disparaître, alors que
la marche reste bien plus fluide qu'une animation libre). L'arme est prise sur la vue du personnage, puis collée à
chaque image là où se trouve la main, seulement sur le fond (le corps passe devant).

    python3 tools/pixellab/arme.py VUE DOSSIER --main-vue x0,x1,y0,y1 --main x0,x1,y0,y1 --arme x0,x1,y0,y1 [--sombre 45]

--main-vue : zone où chercher la main sur la vue ; --main : la même, plus large, sur les images de la marche ;
--arme : boîte de l'arme sur la vue ; --sombre : ne garder que les pixels plus sombres que ce seuil (une lame noire)."""
import argparse
from pathlib import Path

import numpy as np
from PIL import Image


def peau(a):
    r, g, b = (a[..., i].astype(int) for i in range(3))
    return (a[..., 3] > 0) & (b > r + 10) & ((r + g + b) / 3 > 80)


def main_en(a, zone):
    x0, x1, y0, y1 = zone
    m = np.zeros(a.shape[:2], bool)
    m[y0:y1, x0:x1] = True
    ys, xs = np.nonzero(m & peau(a))
    return np.array([xs.mean(), ys.mean()]) if len(xs) else None


def coller(vue, dossier, main_vue, main, arme, sombre=None):
    v = np.array(Image.open(vue).convert('RGBA'))
    ref = main_en(v, main_vue)
    x0, x1, y0, y1 = arme
    lum = v[..., :3].astype(int).sum(-1) / 3
    pixels = [(x, y) for y in range(y0, y1) for x in range(x0, x1)
              if v[y, x, 3] > 0 and (sombre is None or lum[y, x] < sombre)]
    images = sorted(Path(dossier).glob('*.png'), key=lambda f: int(f.stem))
    tableaux = [np.array(Image.open(f).convert('RGBA')) for f in images]
    # décalage de la main à chaque image ; une main cachée (bras derrière le corps) prend la moyenne de ses voisines
    decalages = []
    for a in tableaux:
        h = main_en(a, main)
        decalages.append(None if h is None else np.round(h - ref).astype(int))
    for i, d in enumerate(decalages):
        if d is None:
            voisins = [decalages[j % len(decalages)] for j in (i - 1, i + 1) if decalages[j % len(decalages)] is not None]
            decalages[i] = np.round(np.mean(voisins, 0)).astype(int) if voisins else np.array([0, 0])
    for f, a, (dx, dy) in zip(images, tableaux, decalages):
        for x, y in pixels:
            X, Y = x + dx, y + dy
            if 0 <= Y < a.shape[0] and 0 <= X < a.shape[1] and a[Y, X, 3] == 0:
                a[Y, X] = v[y, x]
        Image.fromarray(a).save(f)
    return [tuple(int(c) for c in d) for d in decalages]


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('vue')
    ap.add_argument('dossier')
    zone = lambda s: tuple(int(c) for c in s.split(','))
    ap.add_argument('--main-vue', type=zone, required=True)
    ap.add_argument('--main', type=zone, required=True)
    ap.add_argument('--arme', type=zone, required=True)
    ap.add_argument('--sombre', type=int)
    a = ap.parse_args()
    print(coller(a.vue, a.dossier, a.main_vue, a.main, a.arme, a.sombre))
