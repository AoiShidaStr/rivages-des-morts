"""Textures et couleurs tirées du pack Forgotten Memories (utilisées pixel pour pixel)."""
import os
import numpy as np
from PIL import Image

FM = os.path.join(os.environ.get('PACKS', 'packs'), 'ForgottenMemories') + '/'
TS = np.array(Image.open(FM + 'TileSet.png').convert('RGBA'))
WT = np.array(Image.open(FM + 'WaterTiles-6frames.png').convert('RGBA'))


def hx(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.uint8)


def pal(*hs):
    return np.array([hx(h) for h in hs], np.uint8)


TEX = {
    'herbe1': TS[0:128, 1440:1568, :3],
    'herbe2': TS[0:128, 1568:1696, :3],
    'herbe3': TS[0:128, 1696:1824, :3],
    'terre': TS[320:576, 1312:1568, :3],
    'sable': TS[320:576, 1568:1824, :3],
    'eau': WT[288:384, 32:224, :3],
    'cascade': WT[704:800, 352:544, :3],
    'sous': WT[637:656, 704:896, :3],     # rochers sombres sous l'eau, au pied des parois
}

VIDE = hx('#5f4848')


def paroi(seed=3):
    """Paroi de galets FM, haute et répétable : rangées des bandes de rochers
    du pack empilées et décalées (les pierres du bas recouvrent celles du haut)."""
    rangs = [WT[590:637, 704:896, :3], WT[492:540, 704:896, :3], WT[397:447, 704:896, :3]]
    pas, n = 34, 12
    rng = np.random.default_rng(seed)
    dec = rng.integers(0, 192, n)
    toile = np.tile(VIDE, (pas * (n + 2), 192, 1))
    for k in range(n + 2):
        r = rangs[k % 3]
        r = np.roll(r, dec[k % n], axis=1)
        y = pas * k
        h = min(r.shape[0], toile.shape[0] - y)
        z = r[:h]
        m = np.any(z != VIDE, axis=-1)
        sl = toile[y:y + h]
        sl[m] = z[m]
    return toile[pas: pas * (n + 1)]


# rampes de couleur (du plus clair au plus sombre)
RAMPE_ROCHE = pal('#dbc9b4', '#c0af83', '#a78c61', '#936d53', '#805147', '#5f4848', '#4d4753', '#2c2133')
RAMPE_VOLCAN = pal('#a57b6c', '#8f7a79', '#725b53', '#613c3c', '#53383a', '#432b30', '#2c2133', '#1e1724')
RAMPE_BOUE = pal('#a57660', '#9c7b4f', '#8e5829', '#825e48', '#6c4c3f', '#53383a', '#432b30', '#2c2133')
RAMPE_SABLE = pal('#e8dcc8', '#dbc9b4', '#c0af83', '#b29f53', '#a78c61', '#936d53', '#805147', '#5f4848')
RAMPE_BOIS = pal('#c3a79c', '#a57660', '#865e51', '#6b4a47', '#603f36', '#432b30', '#2c2133', '#1e1724')
RAMPE_LAVE = pal('#dbc9b4', '#f79617', '#ab7923', '#ab5124', '#a04625', '#8c3329', '#613c3c', '#432b30')
RAMPE_EAU = pal('#a9d3d3', '#7fb7bd', '#6ba2af', '#5b99a6', '#4c8d9d', '#4c8394', '#3c6175', '#2f4a5e')


def indexer(img, rampe):
    """Indice de la couleur de rampe la plus proche pour chaque pixel."""
    d = ((img[..., None, :].astype(np.int32) - rampe[None, None].astype(np.int32)) ** 2).sum(-1)
    return d.argmin(-1)


def decaler(img, rampe, k):
    """Assombrit (k > 0) ou éclaircit une image dont les couleurs sont dans la rampe."""
    i = np.clip(indexer(img, rampe) + k, 0, len(rampe) - 1)
    return rampe[i]


def recolorer(img, src, dst):
    """Remplace chaque couleur de src (rampe) par la couleur de même rang dans dst."""
    return dst[indexer(img, src)]


# ---------- pack Resurrected RPG (même artiste) : mur de gros rochers ----------
RR = os.path.join(os.environ.get('PACKS', 'packs'), 'Resurrected RPG 1.1') + '/'
RW = np.array(Image.open(RR + 'Wall.png').convert('RGBA'))
RAMPE_RR = pal('#bdb18a', '#b49f7d', '#9d8770', '#856555', '#633634')
RAMPE_RR_VOLCAN = pal('#a57b6c', '#8f7a79', '#725b53', '#53383a', '#2c2133')
RAMPE_RR_SABLE = pal('#dbc9b4', '#c0af83', '#a78c61', '#936d53', '#805147')


def paroi_rr(seed=3, rangs=8):
    """Falaise de gros rochers du pack Resurrected : la face du mur répétée en largeur (période 187 px)
    et empilée en hauteur (période rangs × 88 px), chaque rang décalé, ses rochers du haut chevauchant
    le bas du rang au-dessus. Renvoie (paroi RGB, lèvre RGBA 12 × 187 : les sommets des rochers qui
    dépassent du bord d'une falaise)."""
    F = RW[192:320, 1120:1376]
    P, a = 187, 25
    face = F[:, a:a + P]
    rng = np.random.default_rng(seed)
    pas = 88
    H = rangs * pas
    toile = np.zeros((H, P, 4), np.uint8)
    dec = rng.integers(0, P, rangs)
    deborde = 119 + (rangs - 1) * pas - H            # le dernier rang déborde en haut de la toile
    for k in list(range(rangs)) + [0]:
        bloc = np.roll(face[:119], int(dec[k]), axis=1)
        ys = (np.arange(119) + k * pas) % H
        m = bloc[..., 3] > 0
        if k == 0 and toile[..., 3].any():
            m[deborde:] = False                         # 2e passage du rang 0 : seulement sous le débord
        sl = toile[ys]
        sl[m] = bloc[m]
        toile[ys] = sl
    levre = face[:12].copy()
    return toile[..., :3].copy(), levre
