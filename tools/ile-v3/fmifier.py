"""Passe les sprites du jeu (pixel art avec contour sombre) au style des packs : contour extérieur remplacé par
la teinte sombre de la matière voisine, couleurs ramenées à la palette FM + Resurrected, pixels isolés nettoyés."""
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
import fm
import rendu


def palette():
    p = rendu.palette_fm()
    rr = []
    for f in ('Wall.png', 'Plants.png', 'Props.png'):
        a = np.array(Image.open(fm.RR + f).convert('RGBA')).reshape(-1, 4)
        rr.append(np.unique(a[a[:, 3] > 0][:, :3], axis=0))
    return np.unique(np.concatenate([p] + [r.astype(np.int32) for r in rr]), axis=0).astype(np.int32)


PAL = None


def vers_palette(cols):
    global PAL
    if PAL is None:
        PAL = palette()
    u, inv = np.unique(cols.reshape(-1, 3), axis=0, return_inverse=True)
    # distance pondérée (le vert compte plus) pour garder les teintes
    w = np.array([0.30, 0.59, 0.11]) * 3
    d = (((u[:, None, :].astype(np.float32) - PAL[None]) ** 2) * w).sum(-1)
    return PAL[d.argmin(1)][inv.reshape(-1)].reshape(cols.shape).astype(np.uint8)


def fmifier(img, echelle=1.0):
    a = img.copy()
    if echelle != 1.0:
        im = Image.fromarray(a)
        im = im.resize((int(im.width * echelle), int(im.height * echelle)), Image.NEAREST)
        a = np.array(im)
    a[..., 3] = np.where(a[..., 3] > 127, 255, 0)
    m = a[..., 3] > 0
    lum = a[..., :3].astype(np.float32) @ np.array([0.3, 0.59, 0.11])
    # contour : pixels très sombres au bord de la silhouette (2 px)
    bord = m & ~ndi.binary_erosion(m, iterations=2)
    noir = bord & (lum < 52)
    # chaque pixel de contour prend la couleur intérieure la plus proche, assombrie
    interieur = m & ~noir
    idx = ndi.distance_transform_edt(~interieur, return_distances=False, return_indices=True)
    voisin = a[idx[0], idx[1], :3]
    a[noir, :3] = rendu.assombrir(voisin[noir], 0.72)
    a[m, :3] = vers_palette(a[m, :3])
    # pixels isolés : prennent la couleur majoritaire de leurs voisins
    return a


if __name__ == '__main__':
    import sys
    from echelle import scale2x
    out = []
    for f, e in [('jeu/rocher.png', 1), ('jeu/decor_maison-the.png', 1), ('jeu/torii.png', 1), ('jeu/decor_lanterne.png', 0.6),
                 ('jeu/jizo.png', 0.45), ('jeu/pnj_lanterne-de-pierre.png', 1)]:
        im = np.array(Image.open(f).convert('RGBA'))
        out.append((im, fmifier(im, e)))
    H = max(max(x.shape[0], y.shape[0]) for x, y in out)
    W = sum(x.shape[1] + 8 for x, _ in out)
    m = np.zeros((2 * H + 8, W, 3), np.uint8)
    m[:] = (128, 132, 73)
    x = 0
    for a, b in out:
        for row, im in ((0, a), (H + 8, b)):
            h, w = im.shape[:2]
            al = im[..., 3:4] / 255
            sub = m[row + H - h: row + H, x:x + w]
            sub[:] = (im[..., :3] * al + sub * (1 - al)).astype(np.uint8)
        x += a.shape[1] + 8
    Image.fromarray(scale2x(m, wrap=False)).save('fmifier-test.png')
