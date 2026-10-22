"""Vues à l'échelle du jeu : morceau de la carte (résolution dessin) agrandi en Scale2x + persos."""
import json, sys
import numpy as np
from PIL import Image
from echelle import scale2x

R = '/home/user/rivages-des-morts/public/sprites/anim/'
SQ3 = np.sqrt(3)
S = 1.5


def frame(nom, idx=0):
    d = json.load(open(R + nom + '.json'))
    f = d['frames'][idx]['frame']
    im = Image.open(R + nom + '.webp').convert('RGBA').crop((f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h']))
    a = np.array(im)[..., 3]
    ys, xs = np.nonzero(a > 0)
    return im, ((xs.min() + xs.max()) // 2, ys.max())


def px(u, v, h, N):
    """(u, v) en unités du plan, h en unités du monde → pixel de la carte agrandie (2N)."""
    K = 0.8165 * N / (80 * S)
    return 2 * (u / 80 + 0.5) * N, 2 * ((0.5 - v / (80 * SQ3)) * N - h * K)


def vue(carte, centre, taille, persos, sortie):
    N = carte.shape[0]
    cx, cy = px(*centre, 0, N)
    w, hh = taille
    x0, y0 = int(cx - w // 2) // 2, int(cy - hh // 2) // 2
    bout = carte[y0:y0 + hh // 2, x0:x0 + w // 2]
    im = Image.fromarray(scale2x(bout, wrap=False)).convert('RGBA')
    for nom, u, v, h, miroir in persos:
        f, (ax, ay) = frame(nom)
        if miroir:
            f = f.transpose(Image.FLIP_LEFT_RIGHT)
            ax = f.width - 1 - ax
        x, y = px(u, v, h, N)
        im.alpha_composite(f, (int(x) - 2 * x0 - ax, int(y) - 2 * y0 - ay))
    im.convert('RGB').save(sortie)


G, SO, KA = 'heros-demi-dieu-guerrier', 'heros-demi-dieu-sorcier', 'kappa'
if __name__ == '__main__':
    carte = np.array(Image.open(sys.argv[1] if len(sys.argv) > 1 else 'ile-4224.png').convert('RGB'))
    qui = sys.argv[2:] or ['pont', 'cascade', 'ponton', 'village', 'volcan', 'rizieres']
    V = {
        'pont': ((2.5, 20), (1600, 1100), [(G, 2.6, 19.8, 3.17, False), (KA, 9.5, 14.0, 2.2, True), (SO, -3.0, 25.5, 2.2, False)]),
        'cascade': ((15, 42), (1800, 1300), [(G, 20.0, 36.0, 2.2, True), (SO, 6.5, 41.5, 4.4, False)]),
        'ponton': ((-21, -44), (1600, 1100), [(G, -23.0, -47.0, 0.75, False), (SO, -18.5, -40.5, 0.4, True)]),
        'village': ((-14, 4), (1600, 1100), [(G, -14, 3, 2.2, False), (SO, -11.5, 1, 2.2, True), (KA, -8.5, 10.5, 2.2, True)]),
        'volcan': ((-14, 40), (1800, 1300), [(G, -5.5, 34, 4.4, False)]),
        'rizieres': ((19, 12), (1600, 1100), [(SO, 11.5, 8, 2.2, False), (KA, 12, -2, 2.2, True)]),
    }
    for k in qui:
        c, t, pers = V[k]
        vue(carte, c, t, pers, f'vue-{k}.png')
    Image.fromarray(carte).resize((1400, 1400), Image.LANCZOS).save('apercu.png')
    print('ok')
