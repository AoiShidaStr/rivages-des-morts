"""Normal map, hauteurs et masques de la carte, tirés de la géométrie exacte du rendu (pas devinés depuis les couleurs).

Espace tangent de la carte posée au sol (celui du jeu) : x = u (droite de l'écran), y = v (vers le fond, haut de
l'image), z = haut du monde. Convention OpenGL (vert = vers le haut de l'image).
- dessus des plateaux : (0, 0, 1)
- parois tournées vers -x (à gauche, éclairées) : (-0,71, -0,71, 0) ; vers -z (à droite) : (0,71, -0,71, 0)
- détail : relief tiré de la clarté de l'image, matière par matière (rien n'est inventé à la frontière de deux matières)

Sorties (même taille que la carte) :
- normal  : RGB = normale, A = hauteur du monde / 12 (pour placer les lumières en 3D)
- masques : R = émissif (lave, portail, lanternes), G = eau, B = cascade (eau qui coule), A = halo (lumière de la lave)
"""
import numpy as np
import cv2

from plan import EAU, LAVE, RIZ, DIGUE, MARCHE, HERBE, FLEURS, LYS, TERRE, DALLE, SABLE, PIERRE, SPIRALE, VOLCAN, CENDRE, FORET

R2 = np.sqrt(0.5)
DROITE = np.array([1.0, 0.0, 0.0], np.float32)             # droite de l'écran, dans l'espace tangent
HAUT_ECRAN = np.array([0.0, 0.57735, 0.81650], np.float32)   # haut de l'écran
VERS_OEIL = np.array([0.0, -0.81650, 0.57735], np.float32)   # vers le spectateur
HMAX = 12.0

# force du relief tiré de la clarté, par matière (dessus) ; les parois ont la leur
FORCE = {FORET: 1.2, HERBE: 1.2, FLEURS: 1.2, LYS: 1.2, DIGUE: 1.0, TERRE: 1.6, DALLE: 2.6, PIERRE: 2.6, SPIRALE: 1.4,
         SABLE: 1.0, VOLCAN: 1.8, CENDRE: 1.6, MARCHE: 1.5, RIZ: 0.6, EAU: 0.3, LAVE: 1.0}
FORCE_PAROI = 3.2


def clarte(rgb):
    return rgb[..., :3].astype(np.float32) @ np.array([0.30, 0.59, 0.11], np.float32) / 255.0


def gradient_par_region(L, region):
    """Pente de L (vers la droite, vers le haut de l'écran), nulle là où les deux voisins ne sont pas de la même région."""
    gx = np.zeros_like(L)
    gy = np.zeros_like(L)
    mx = region[:, 2:] == region[:, :-2]
    my = region[:-2, :] == region[2:, :]
    gx[:, 1:-1] = np.where(mx, (L[:, 2:] - L[:, :-2]) * 0.5, 0)
    gy[1:-1, :] = np.where(my, (L[:-2, :] - L[2:, :]) * 0.5, 0)
    # au bord d'une région, la différence d'un seul côté
    gx[:, 1:-1] = np.where(~mx & (region[:, 1:-1] == region[:, 2:]), L[:, 2:] - L[:, 1:-1], gx[:, 1:-1])
    gx[:, 1:-1] = np.where(~mx & (region[:, 1:-1] == region[:, :-2]), L[:, 1:-1] - L[:, :-2], gx[:, 1:-1])
    gy[1:-1, :] = np.where(~my & (region[1:-1, :] == region[:-2, :]), L[:-2, :] - L[1:-1, :], gy[1:-1, :])
    gy[1:-1, :] = np.where(~my & (region[1:-1, :] == region[2:, :]), L[1:-1, :] - L[2:, :], gy[1:-1, :])
    return gx, gy


def incliner(base, gx, gy, force):
    """La normale de base penchée selon la pente du relief (vue à l'écran)."""
    p = -(gx * force)[..., None] * DROITE - (gy * force)[..., None] * HAUT_ECRAN
    p -= (p * base).sum(-1, keepdims=True) * base
    n = base + p
    return n / np.linalg.norm(n, axis=-1, keepdims=True)


def coder(n, h):
    out = np.empty(n.shape[:2] + (4,), np.uint8)
    out[..., :3] = np.clip(np.round((n * 0.5 + 0.5) * 255), 0, 255).astype(np.uint8)
    out[..., 3] = np.clip(np.round(h / HMAX * 255), 0, 255).astype(np.uint8)
    return out


def carte(img, geo):
    """Normales + hauteurs (RGBA) et masques (RGBA) de la carte, depuis les tampons du rendu (rendu.rendre(geo=...))."""
    N, K = geo['N'], geo['K']
    face, ori, dep, hsrc, mat, casc, pont_h = (geo[k] for k in ('face', 'ori', 'dep', 'hsrc', 'mat', 'casc', 'pont_h'))
    dessus = ~face
    base = np.zeros((N, N, 3), np.float32)
    base[dessus] = (0, 0, 1)
    base[face & (ori < 0)] = (-R2, -R2, 0)
    base[face & (ori > 0)] = (R2, -R2, 0)
    pont = pont_h >= 0
    base[pont] = (0, 0, 1)
    h = np.where(face, hsrc - dep / K, hsrc).astype(np.float32)
    h[pont] = pont_h[pont]

    # régions : une par matière, côté dessus / paroi gauche / paroi droite / pont
    region = mat.astype(np.int32) + np.where(face, np.where(ori > 0, 200, 100), 0) + np.where(pont, 1000, 0)
    L = cv2.GaussianBlur(clarte(img), (0, 0), 0.7)
    gx, gy = gradient_par_region(L, region)
    force = np.zeros((N, N), np.float32)
    for m, f in FORCE.items():
        force[dessus & (mat == m)] = f
    force[face] = FORCE_PAROI
    force[casc] = 0.4
    force[pont] = 2.0
    n = incliner(base, gx, gy, force)
    del base, gx, gy, L

    # masques
    masques = np.zeros((N, N, 4), np.uint8)
    lave = (mat == LAVE)
    lum = clarte(img)
    em = np.where(lave, 0.55 + 0.45 * lum, 0)
    masques[..., 0] = np.clip(em * 255, 0, 255).astype(np.uint8)
    eau = dessus & ~pont & (mat == EAU)
    masques[..., 1] = np.where(eau, 255, np.where(dessus & (mat == RIZ), 140, 0)).astype(np.uint8)
    masques[..., 2] = np.where(casc & (mat == EAU), 255, 0).astype(np.uint8)
    return coder(n, h), masques, n, h


def halo(masques, rayon_px):
    """Lumière portée autour des sources émissives (la lave éclaire le terrain voisin), de 0 à 1."""
    e = masques[..., 0].astype(np.float32) / 255.0
    petit = cv2.resize(e, (e.shape[1] // 8, e.shape[0] // 8), interpolation=cv2.INTER_AREA)
    g = cv2.GaussianBlur(petit, (0, 0), rayon_px / 8)
    g = g / (g.max() + 1e-6)
    g = np.sqrt(g)
    g = cv2.resize(g, (e.shape[1], e.shape[0]), interpolation=cv2.INTER_LINEAR)
    masques[..., 3] = np.clip(g * 255, 0, 255).astype(np.uint8)
    return masques


# ============================ sprites de décor ======================================
def sprite_normales(img, nrm_connue=None, hauteur_connue=None, pied=None, K=28.74, bombe=5.0, detail=2.2):
    """Normales d'un sprite debout (arbre, rocher, bâtiment) dans l'espace tangent de la carte.
    Là où la géométrie est connue (bâtiments dessinés en 3D), on la garde ; ailleurs, forme bombée tirée de la
    silhouette (comme Laigter) + relief tiré de la clarté. Hauteur : celle d'un panneau debout au pied du sprite."""
    a = img[..., 3] > 0
    H, W = a.shape
    af = a.astype(np.float32)
    dome = cv2.GaussianBlur(af, (0, 0), 3.0) + 0.6 * cv2.GaussianBlur(af, (0, 0), 7.0)
    L = cv2.GaussianBlur(clarte(img), (0, 0), 0.6) * af
    relief = dome * bombe / 10 + L * detail / 10 * 4
    gx = np.zeros_like(relief)
    gy = np.zeros_like(relief)
    gx[:, 1:-1] = (relief[:, 2:] - relief[:, :-2]) * 0.5
    gy[1:-1, :] = (relief[:-2, :] - relief[2:, :]) * 0.5
    sx, sy = -gx * 10, -gy * 10                       # pente → normale vue de face (x droite, y haut, z vers l'œil)
    n = (sx[..., None] * DROITE + sy[..., None] * HAUT_ECRAN + 1.0 * VERS_OEIL[None, None, :])
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    if nrm_connue is not None:
        connue = np.linalg.norm(nrm_connue, axis=-1) > 0.5
        # relief de la clarté ajouté à la géométrie connue, plus doucement
        p = -(gx * 4)[..., None] * DROITE - (gy * 4)[..., None] * HAUT_ECRAN
        b = nrm_connue
        p -= (p * b).sum(-1, keepdims=True) * b
        nb = b + p
        nb /= np.linalg.norm(nb, axis=-1, keepdims=True) + 1e-6
        n = np.where(connue[..., None], nb, n)
    px, py = pied if pied is not None else (W // 2, H - 1)
    hpan = np.maximum(0, (py - np.arange(H, dtype=np.float32))[:, None] / K) * np.ones((1, W), np.float32)
    h = hpan
    if hauteur_connue is not None:
        h = np.where(hauteur_connue >= 0, hauteur_connue, hpan)
    return n.astype(np.float32), h.astype(np.float32)
