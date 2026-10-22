"""Vue de dessus rapide du plan (matières + ombrage des hauteurs), en coordonnées écran (u, v)."""
import sys
import numpy as np
from PIL import Image
from plan import *

COUL = {EAU: '#3c6175', SABLE: '#dbc9b4', HERBE: '#808449', TERRE: '#98734c', DALLE: '#c0af83', VOLCAN: '#53383a',
        LAVE: '#f79617', RIZ: '#7fb7bd', DIGUE: '#5e6431', SPIRALE: '#e8dcc8', PIERRE: '#725b53', MARCHE: '#a78c61',
        FLEURS: '#b29f53', CENDRE: '#6c4c3f', LYS: '#a04625', BOIS: '#865e51'}


def voir(p, sortie, W=700):
    H = int(W * np.sqrt(3))
    u = (np.arange(W) + 0.5) / W * 80 - 40
    v = (0.5 - (np.arange(H) + 0.5) / H) * 80 * np.sqrt(3)
    U, V = np.meshgrid(u, v)
    X, Z = uv2xz(U, V)
    I = np.clip(((X + EXT) / CELL).astype(int), 0, p.n - 1)
    J = np.clip(((Z + EXT) / CELL).astype(int), 0, p.n - 1)
    m = p.mat[I, J]
    h = p.niv[I, J]
    lut = np.array([[int(COUL[k][i:i + 2], 16) for i in (1, 3, 5)] for k in range(16)], np.float32)
    img = lut[m] * (0.6 + 0.4 * np.clip(h / 12, 0, 1))[..., None]
    # bords de niveaux
    e = np.zeros_like(h, bool)
    e[1:] |= np.abs(h[1:] - h[:-1]) > 0.2
    e[:, 1:] |= np.abs(h[:, 1:] - h[:, :-1]) > 0.2
    img[e] *= 0.4
    Image.fromarray(img.clip(0, 255).astype(np.uint8)).save(sortie)


if __name__ == '__main__':
    voir(construire(7), sys.argv[1] if len(sys.argv) > 1 else 'plan.png')
