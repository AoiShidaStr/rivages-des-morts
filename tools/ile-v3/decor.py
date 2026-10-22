"""Décors de l'île au style des packs Forgotten Memories et Resurrected RPG, à la résolution dessin
(35,2 px par unité du monde, agrandis ensuite en Scale2x comme la carte).

- Arbres japonisés : arbres des deux packs reteints (cerisier, érable, ginkgo, cèdre, camphrier sacré,
  cerisier pleureur, saule), troncs d'origine gardés.
- Bâtiments et objets dessinés en iso avec la palette des packs : maison de thé, forge de Tetsu, torii,
  lanternes de pierre, Jizō, Grand Rocher.
Chaque sprite est (RGBA, (x, y) du pied dans le sprite)."""
import os
import numpy as np
import cv2
from PIL import Image
from scipy import ndimage as ndi

import fm

PW = 35.2                      # pixels par unité du monde (résolution dessin)
K = 0.8165 * PW                # pixels par unité de hauteur
R2, R3 = np.sqrt(2), np.sqrt(3)
FM = os.path.join(os.environ.get('PACKS', 'packs'), 'ForgottenMemories') + '/'
RR = fm.RR
ARBRES_FM = np.array(Image.open(FM + 'Trees_seperated.png').convert('RGBA'))
PLANTES_RR = np.array(Image.open(RR + 'Plants.png').convert('RGBA'))
OMBRE_RR = np.array(Image.open(RR + 'PlantShadow.png').convert('RGBA'))


def c(h):
    return tuple(int(v) for v in fm.hx(h)) + (255,)


# ============================ arbres =====================================
TRONC = {'#432b30', '#53383a', '#6b4a47', '#583731', '#464339', '#6b505b', '#57404f', '#2f2c3f', '#765961'}
RAMPES = {
    'sakura': ['#f2dde0', '#e8c4c9', '#d9a3ad', '#c28393', '#a0677b', '#7a4e63', '#56384c'],
    'momiji': ['#e2825a', '#d66a4a', '#b8483a', '#963832', '#712a2e', '#4f2028'],
    'kusu': ['#8fa363', '#748c50', '#5c7543', '#465c39', '#344830', '#243326'],
    'matsu': ['#7d9160', '#5f7650', '#485e41', '#354635', '#26332a', '#1b231f'],
    'sugi': ['#6f8656', '#566b47', '#43553b', '#334232', '#252f27'],
    'ginkgo': ['#e0b04a', '#cf9a35', '#b47f2a', '#946327', '#704a25'],
    'saule': ['#a3a25a', '#868a45', '#6a703a', '#525a33', '#3d452c'],
}


def teindre(img, rampe, garder=TRONC):
    """Reteint le feuillage (tout sauf le tronc) : chaque couleur prend le ton de la rampe de même rang de clarté."""
    out = img.copy()
    m = out[..., 3] > 0
    cols = out[m][:, :3]
    u, inv = np.unique(cols, axis=0, return_inverse=True)
    hexa = ['#%02x%02x%02x' % tuple(x) for x in u]
    feuil = np.array([h not in garder for h in hexa])
    lum = u.astype(float) @ np.array([0.3, 0.55, 0.15])
    idx = np.where(feuil)[0]
    ordre = idx[np.argsort(-lum[idx])]
    ramp = fm.pal(*rampe)
    neuf = u.copy()
    for r, k in enumerate(ordre):
        neuf[k] = ramp[int(round(r / max(1, len(ordre) - 1) * (len(ramp) - 1)))]
    out[m, :3] = neuf[inv.reshape(-1)]
    return out


def _decoupe(sheet, y0, y1, x0, x1):
    return sheet[y0:y1, x0:x1].copy()


def _pied(img):
    ys, xs = np.nonzero(img[..., 3] > 200)
    bas = ys.max()
    return int(xs[ys == bas].mean()), int(bas)


def ombre_ellipse(larg, haut):
    """Ombre portée violette semi-transparente, comme celles des packs."""
    o = np.zeros((haut, larg, 4), np.uint8)
    cv2.ellipse(o, (larg // 2, haut // 2), (larg // 2 - 1, haut // 2 - 1), 0, 0, 360, (67, 32, 80, 110), -1)
    return o


def arbres():
    """Toutes les espèces : nom → (sprite RGBA, pied, ombre RGBA)."""
    F, P = ARBRES_FM, PLANTES_RR
    src = {
        'erable_fm': _decoupe(F, 307, 416, 18, 92),
        'rond_fm': _decoupe(F, 310, 416, 102, 196),
        'ginkgo_fm': _decoupe(F, 316, 416, 199, 255),
        'pin_fm': _decoupe(F, 321, 413, 268, 315),
        'geant_fm': _decoupe(F, 273, 439, 330, 509),
        'large_rr': _decoupe(P, 443, 568, 548, 667),     # grand arbre étalé, tronc épais
        'large_rr2': _decoupe(P, 40, 165, 552, 671),
        'haut_rr': _decoupe(P, 436, 625, 7, 116),         # grand arbre élancé
        'rond_rr': _decoupe(P, 433, 583, 128, 245),
    }
    # le ginkgo du pack a un tronc de bouleau : on le passe en écorce brune
    g = src['ginkgo_fm']
    for a, b in [('#8f7a79', '#6b4a47'), ('#baa8a6', '#865e51'), ('#a28e97', '#6b4a47'), ('#725b53', '#53383a'),
                 ('#644e43', '#432b30')]:
        g[np.all(g[..., :3] == fm.hx(a), -1), :3] = fm.hx(b)
    TR = TRONC | {'#865e51'}
    esp = {
        'sakura': teindre(src['large_rr2'], RAMPES['sakura']),
        'sakura_rond': teindre(src['rond_fm'], RAMPES['sakura']),
        'shidarezakura': teindre(src['geant_fm'], RAMPES['sakura'][1:]),  # cerisier pleureur géant
        'momiji': teindre(src['large_rr'], RAMPES['momiji']),
        'momiji_fm': teindre(src['erable_fm'], RAMPES['momiji']),
        'kusunoki': teindre(src['geant_fm'], RAMPES['kusu']),             # camphrier sacré, tronc énorme
        'matsu': teindre(src['large_rr'], RAMPES['matsu']),
        'sugi': teindre(src['pin_fm'], RAMPES['sugi']),
        'sugi_haut': teindre(src['haut_rr'], RAMPES['sugi']),
        'ginkgo': teindre(g, RAMPES['ginkgo'], TR),
        'saule': teindre(src['geant_fm'], RAMPES['saule']),
        'kaki': teindre(src['rond_rr'], RAMPES['kusu']),
    }
    out = {}
    for k, im in esp.items():
        pied = _pied(im)
        w = im.shape[1]
        out[k] = (im, pied, ombre_ellipse(int(w * 0.8), max(10, int(w * 0.32))))
    return out


# ============================ dessin iso ====================================
class Toile:
    """Petit canevas RGBA où l'on dessine en coordonnées du monde (x, z, h), pied en (ox, oy)."""

    def __init__(self, w, h, ox, oy):
        self.img = np.zeros((h, w, 4), np.uint8)
        self.ox, self.oy = ox, oy
        # géométrie exacte de ce qui est dessiné en 3D : normale (espace tangent de la carte) et hauteur du monde
        self.nrm = np.zeros((h, w, 3), np.float32)
        self.hgt = np.full((h, w), -1.0, np.float32)

    @staticmethod
    def _tangent(n):
        """Normale du monde (x, z, h) → espace tangent de la carte (u, v, haut), tournée vers la caméra."""
        n = np.asarray(n, np.float64)
        if n @ np.array([-1.0, -1.0, 1.0]) < 0:
            n = -n
        t = np.array([(n[0] - n[1]) / R2, (n[0] + n[1]) / R2, n[2]])
        return (t / (np.linalg.norm(t) + 1e-9)).astype(np.float32)

    def _noter(self, masque, n, h):
        self.nrm[masque] = n
        self.hgt[masque] = h

    def p(self, x, z, h):
        return (self.ox + (x - z) / R2 * PW, self.oy - (x + z) / R2 * PW / R3 - h * K)

    def poly(self, pts, coul):
        q = np.array([self.p(*t) for t in pts])
        m = np.zeros(self.img.shape[:2], np.uint8)
        cv2.fillPoly(m, [np.round(q).astype(np.int32)], 1)
        cv2.fillPoly(self.img, [np.round(q).astype(np.int32)], coul)
        P = np.array(pts, np.float64)
        self._noter(m > 0, self._tangent(np.cross(P[1] - P[0], P[2] - P[0])), float(P[:, 2].mean()))

    def ligne(self, a, b, coul, ep=1):
        pa = tuple(int(round(v)) for v in self.p(*a))
        pb = tuple(int(round(v)) for v in self.p(*b))
        m = np.zeros(self.img.shape[:2], np.uint8)
        cv2.line(m, pa, pb, 1, ep)
        cv2.line(self.img, pa, pb, coul, ep)
        self._noter(m > 0, self._tangent((-1, -1, 1)), (a[2] + b[2]) / 2)

    def plan(self, o, ds, dt, motif):
        """Remplit le parallélogramme o + s·ds + t·dt (s, t ∈ [0, 1]) ; motif(s, t) → couleurs RGBA (n, 4)."""
        P0, Ps, Pt = (np.array(self.p(*v)) for v in (o, np.add(o, ds), np.add(o, dt)))
        A = np.stack([Ps - P0, Pt - P0], 1)
        coins = np.array([P0, Ps, Ps + Pt - P0, Pt])
        m = np.zeros(self.img.shape[:2], np.uint8)
        cv2.fillConvexPoly(m, np.round(coins).astype(np.int32), 1)
        ys, xs = np.nonzero(m)
        st = np.linalg.solve(A, np.stack([xs - P0[0], ys - P0[1]]))
        s, t = np.clip(st[0], 0, 1), np.clip(st[1], 0, 1)
        c_ = motif(s, t)
        self.img[ys, xs] = c_
        vis = c_[:, 3] > 0
        n = self._tangent(np.cross(np.asarray(ds, np.float64), np.asarray(dt, np.float64)))
        self.nrm[ys[vis], xs[vis]] = n
        self.hgt[ys[vis], xs[vis]] = (o[2] + s * ds[2] + t * dt[2])[vis]

    def rogner(self):
        global DERNIER
        a = self.img[..., 3] > 0
        ys, xs = np.nonzero(a)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        DERNIER = (self.nrm[y0:y1, x0:x1].copy(), self.hgt[y0:y1, x0:x1].copy())
        return self.img[y0:y1, x0:x1].copy(), (self.ox - x0, self.oy - y0)


DERNIER = None     # (normales, hauteurs) du dernier sprite rogné
GEOMETRIE = {}     # nom du sprite → (normales, hauteurs) connues


def rayures(c1, c2, n, axe='t', ep=0.12, fond=None):
    """Motif de lignes parallèles (planches, tuiles, rangs)."""
    def f(s, t):
        q = t if axe == 't' else s
        f_ = (q * n) % 1
        out = np.tile(np.array(c1, np.uint8), (len(s), 1))
        out[f_ < ep] = c2
        return out
    return f


def boite_mur(T, X, Z, H, c_g, c_d, motif_g=None, motif_d=None):
    """Murs visibles d'une boîte centrée : face -x (gauche, éclairée) et face -z (droite, plus sombre)."""
    T.plan((-X / 2, Z / 2, 0), (0, -Z, 0), (0, 0, H), motif_g or (lambda s, t: np.tile(np.array(c_g, np.uint8), (len(s), 1))))
    T.plan((-X / 2, -Z / 2, 0), (X, 0, 0), (0, 0, H), motif_d or (lambda s, t: np.tile(np.array(c_d, np.uint8), (len(s), 1))))


def toit_pignon(T, X, Z, H, R, o, base, ligne, clair, sombre):
    """Toit à deux pans, faîtage le long de x, débord o ; tuiles en rangs."""
    def tuiles(teinte):
        def f(s, t):
            out = np.tile(np.array(teinte, np.uint8), (len(s), 1))
            out[((t * 7) % 1) < 0.16] = ligne
            out[((s * X * 3.2) % 1) < 0.09] = ligne
            out[t > 0.94] = sombre
            return out
        return f
    x0, x1 = -X / 2 - o, X / 2 + o
    # pan arrière (+z), puis pan avant (-z)
    T.plan((x0, 0, H + R), (x1 - x0, 0, 0), (0, Z / 2 + o, -R - 0.15), tuiles(base))
    T.plan((x0, 0, H + R), (x1 - x0, 0, 0), (0, -Z / 2 - o, -R - 0.15), tuiles(clair))
    T.ligne((x0, 0, H + R + 0.04), (x1, 0, H + R + 0.04), sombre, 3)                  # faîtage
    T.ligne((x0, -Z / 2 - o, H - 0.15), (x1, -Z / 2 - o, H - 0.15), sombre, 2)       # bord de l'avant-toit
    T.ligne((x0, 0, H + R), (x0, -Z / 2 - o, H - 0.15), sombre, 2)                   # rives
    T.ligne((x0, 0, H + R), (x0, Z / 2 + o, H - 0.15), sombre, 2)


# ============================ bâtiments ======================================
def maison_the(X=4.6, Z=3.4, H=2.0, the=True, toit=('#4d4753', '#2c2133', '#5f5a6b', '#2c2133'), noren='#3c6175'):
    """La maison de thé d'Obaa Kiku : socle de pierre, murs de bois et shōji, toit de tuiles sombres,
    rideau noren à l'entrée, une ombrelle rouge et un banc dehors (the=False : simple maison du village)."""
    T = Toile(400, 380, 200, 270)
    # socle de pierre
    T.plan((-X / 2 - 0.2, Z / 2 + 0.2, -0.0), (0, -Z - 0.4, 0), (0, 0, 0.35), rayures(c('#a28e97'), c('#725b53'), 6, 's', 0.1))
    T.plan((-X / 2 - 0.2, -Z / 2 - 0.2, 0), (X + 0.4, 0, 0), (0, 0, 0.35), rayures(c('#8f7a79'), c('#53383a'), 8, 's', 0.1))
    T.plan((-X / 2 - 0.2, -Z / 2 - 0.2, 0.35), (X + 0.4, 0, 0), (0, Z + 0.4, 0),
           rayures(c('#c0af83'), c('#a78c61'), 9, 's', 0.08))                        # plancher (engawa)

    def shoji(clair):
        def f(s, t):
            out = np.tile(np.array(c('#e8dcc8') if clair else c('#dbc9b4'), np.uint8), (len(s), 1))
            out[((s * 9) % 1) < 0.1] = c('#a78c61')
            out[((t * 5) % 1) < 0.1] = c('#a78c61')
            out[t < 0.28] = c('#865e51') if clair else c('#6b4a47')                 # bas de mur en planches
            out[((s * 3) % 1) < 0.06] = c('#603f36')                                 # poteaux
            out[t > 0.93] = c('#603f36')
            return out
        return f
    T.plan((-X / 2, Z / 2, 0.35), (0, -Z, 0), (0, 0, H), shoji(True))
    T.plan((-X / 2, -Z / 2, 0.35), (X, 0, 0), (0, 0, H), shoji(False))
    # porte avec noren (rideau) sur la face avant droite
    T.plan((-0.55, -Z / 2 - 0.01, 0.35), (1.1, 0, 0), (0, 0, 1.55), lambda s, t: np.where(
        (t > 0.62)[:, None], np.where((((s * 3) % 1) < 0.08)[:, None], np.array(c('#432b30'), np.uint8), np.array(c('#3c6175'), np.uint8)),
        np.array(c('#432b30'), np.uint8)))
    # pignon (triangle) côté -x
    R = 1.45
    pts = [(-X / 2, Z / 2, 0.35 + H), (-X / 2, -Z / 2, 0.35 + H), (-X / 2, 0, 0.35 + H + R)]
    T.poly(pts, c('#865e51'))
    T.ligne(pts[0], pts[2], c('#603f36'), 1)
    toit_pignon(T, X, Z, 0.35 + H, R, 0.45, *(c(t) for t in toit))
    if not the:
        return T.rogner()
    # lanterne de papier sous l'avant-toit
    x, y = (int(round(v)) for v in T.p(1.4, -Z / 2 - 0.2, 0.35 + H - 0.55))
    cv2.ellipse(T.img, (x, y), (5, 7), 0, 0, 360, c('#a04625'), -1)
    cv2.ellipse(T.img, (x - 1, y - 1), (2, 4), 0, 0, 360, c('#e83b3b'), -1)
    cv2.line(T.img, (x - 4, y - 7), (x + 4, y - 7), c('#2c2133'), 2)
    cv2.line(T.img, (x - 4, y + 7), (x + 4, y + 7), c('#2c2133'), 2)
    # ombrelle (nodate-gasa) et banc devant
    banc_x, banc_z = -X / 2 - 1.3, -Z / 2 - 0.9
    T.plan((banc_x - 0.9, banc_z - 0.35, 0.45), (1.8, 0, 0), (0, 0.7, 0), rayures(c('#a04625'), c('#8c3329'), 4, 's'))
    T.plan((banc_x - 0.9, banc_z - 0.35, 0), (1.8, 0, 0), (0, 0, 0.45), lambda s, t: np.tile(np.array(c('#603f36'), np.uint8), (len(s), 1)))
    T.ligne((banc_x + 0.2, banc_z + 0.4, 0.45), (banc_x + 0.2, banc_z + 0.4, 2.3), c('#603f36'), 2)
    cx_, cy_ = (int(round(v)) for v in T.p(banc_x + 0.2, banc_z + 0.4, 2.3))
    cv2.ellipse(T.img, (cx_, cy_ + 4), (38, 13), 0, 180, 360, c('#a04625'), -1)
    cv2.ellipse(T.img, (cx_, cy_ + 4), (38, 4), 0, 0, 360, c('#8c3329'), -1)
    for a in range(-30, 31, 10):
        cv2.line(T.img, (cx_, cy_ - 8), (cx_ + a, cy_ + 3), c('#8c3329'), 1)
    cv2.ellipse(T.img, (cx_ - 12, cy_ - 2), (14, 5), -10, 180, 330, c('#ab5124'), 2)
    return T.rogner()


def forge():
    """La forge de Tetsu : appentis ouvert sur poteaux, toit de bardeaux, foyer de pierre rougeoyant,
    cheminée qui fume, enclume, tonneau et bois empilé."""
    T = Toile(380, 380, 190, 280)
    X, Z, H = 4.4, 3.4, 2.3
    # sol de terre battue
    T.plan((-X / 2 - 0.3, -Z / 2 - 0.3, 0), (X + 0.6, 0, 0), (0, Z + 0.6, 0), rayures(c('#825e48'), c('#6c4c3f'), 5, 's', 0.06))
    # mur du fond (+z) et mur gauche bas en planches
    T.plan((-X / 2, Z / 2, 0), (X, 0, 0), (0, 0, H), rayures(c('#6b4a47'), c('#432b30'), 10, 's', 0.12))
    T.plan((X / 2, -Z / 2, 0), (0, Z, 0), (0, 0, H), rayures(c('#603f36'), c('#432b30'), 8, 's', 0.12))
    # foyer de pierre contre le fond, avec sa bouche rougeoyante
    fx, fz = -0.5, Z / 2 - 0.8
    T.plan((fx - 0.8, fz + 0.6, 0), (0, -1.2, 0), (0, 0, 1.3), rayures(c('#a28e97'), c('#725b53'), 4, 't', 0.12))
    T.plan((fx - 0.8, fz - 0.6, 0), (1.6, 0, 0), (0, 0, 1.3), rayures(c('#8f7a79'), c('#53383a'), 4, 't', 0.12))
    T.plan((fx - 0.8, fz - 0.6, 1.3), (1.6, 0, 0), (0, 1.2, 0), lambda s, t: np.tile(np.array(c('#baa8a6'), np.uint8), (len(s), 1)))
    T.plan((fx - 0.35, fz - 0.61, 0.3), (0.7, 0, 0), (0, 0, 0.55), lambda s, t: np.where(
        ((s - 0.5) ** 2 + (t - 0.4) ** 2 < 0.08)[:, None], np.array(c('#f79617'), np.uint8),
        np.where((t < 0.8)[:, None], np.array(c('#ab5124'), np.uint8), np.array(c('#2c2133'), np.uint8))))
    # cheminée
    T.plan((fx - 0.3, fz + 0.3, 1.3), (0, -0.6, 0), (0, 0, 2.6), rayures(c('#a28e97'), c('#725b53'), 7, 't', 0.12))
    T.plan((fx - 0.3, fz - 0.3, 1.3), (0.6, 0, 0), (0, 0, 2.6), rayures(c('#8f7a79'), c('#53383a'), 7, 't', 0.12))
    # poteaux avant
    for x, z in [(-X / 2, -Z / 2), (X / 2, -Z / 2), (-X / 2, Z / 2)]:
        T.plan((x - 0.1, z, 0), (0.2, 0, 0), (0, 0, H + 0.3), lambda s, t: np.where(
            (s < 0.4)[:, None], np.array(c('#865e51'), np.uint8), np.array(c('#603f36'), np.uint8)))
    # toit à un pan (appentis) qui descend vers l'avant
    o = 0.4

    def bardeaux(teinte):
        def f(s, t):
            out = np.tile(np.array(teinte, np.uint8), (len(s), 1))
            out[((t * 8) % 1) < 0.18] = c('#603f36')
            out[(((s * 14) + np.floor(t * 8) * 0.5) % 1) < 0.08] = c('#6b4a47')
            return out
        return f
    T.plan((-X / 2 - o, Z / 2 + o, H + 1.0), (X + 2 * o, 0, 0), (0, -Z - 2 * o, -1.0), bardeaux(c('#a57660')))
    T.ligne((-X / 2 - o, -Z / 2 - o, H), (X / 2 + o, -Z / 2 - o, H), c('#432b30'), 2)
    T.ligne((-X / 2 - o, Z / 2 + o, H + 1.0), (-X / 2 - o, -Z / 2 - o, H), c('#432b30'), 2)
    # la cheminée dépasse du toit
    T.plan((fx - 0.3, fz - 0.3, H + 0.6), (0.6, 0, 0), (0, 0, 1.4), rayures(c('#8f7a79'), c('#53383a'), 4, 't', 0.12))
    T.plan((fx - 0.3, fz + 0.3, H + 0.6), (0, -0.6, 0), (0, 0, 1.4), rayures(c('#a28e97'), c('#725b53'), 4, 't', 0.12))
    sx, sy = (int(round(v)) for v in T.p(fx, fz, H + 2.0))
    for k, (dx, dy, r) in enumerate([(0, -6, 6), (5, -16, 8), (12, -28, 10), (20, -42, 11)]):
        cv2.circle(T.img, (sx + dx, sy + dy), r, (168, 152, 160, 170 - 30 * k), -1)
    # enclume, tonneau, bois empilé devant
    ax_, ay_ = (int(round(v)) for v in T.p(0.9, -Z / 2 - 0.8, 0))
    cv2.rectangle(T.img, (ax_ - 4, ay_ - 10), (ax_ + 4, ay_), c('#432b30'), -1)
    cv2.rectangle(T.img, (ax_ - 11, ay_ - 16), (ax_ + 9, ay_ - 10), c('#4d4753'), -1)
    cv2.line(T.img, (ax_ - 11, ay_ - 16), (ax_ + 9, ay_ - 16), c('#8f7a79'), 1)
    cv2.line(T.img, (ax_ + 9, ay_ - 14), (ax_ + 14, ay_ - 13), c('#4d4753'), 2)
    bx, by = (int(round(v)) for v in T.p(-X / 2 - 0.6, -0.8, 0))
    cv2.rectangle(T.img, (bx - 8, by - 20), (bx + 8, by), c('#865e51'), -1)
    for yy in (by - 17, by - 5):
        cv2.line(T.img, (bx - 8, yy), (bx + 8, yy), c('#432b30'), 2)
    cv2.ellipse(T.img, (bx, by - 20), (8, 3), 0, 0, 360, c('#3c6175'), -1)
    for k in range(3):
        for j in range(3 - k):
            wx, wy = (int(round(v)) for v in T.p(X / 2 + 0.6, -0.6 + j * 0.45 + k * 0.22, 0.05 + k * 0.38))
            cv2.circle(T.img, (wx, wy), 6, c('#865e51'), -1)
            cv2.circle(T.img, (wx, wy), 3, c('#c3a79c'), -1)
    return T.rogner()


def portail(T, W, haut):
    """Le passage vers le donjon : un tourbillon rouge et noir tendu entre les piliers du torii (plan x = 0)."""
    def f(s, t):
        dx, dy = (s - 0.5) * 1.2, (t - 0.47) * 1.0
        r = np.hypot(dx, dy)
        th = np.arctan2(dy, dx)
        bande = ((th / (2 * np.pi) + r * 2.6) % 1)
        out = np.zeros((len(s), 4), np.uint8)
        out[:] = c('#2c2133')
        out[bande < 0.45] = c('#53383a')
        out[(bande < 0.22)] = c('#8c3329')
        out[(bande < 0.22) & (r < 0.32)] = c('#e83b3b')
        out[r < 0.07] = c('#1e1724')
        out[(r > 0.5) | (t > 0.97)] = 0
        return out
    T.plan((0, -W + 0.16, 0.02), (0, 2 * W - 0.32, 0), (0, 0, haut - 0.86), f)


def torii(pilier='#a04625', ombre='#8c3329', sombre='#613c3c', toit='#2c2133', toit_c='#432b30', larg=2.8, haut=3.5,
          avec_portail=False):
    """Torii dont la poutre suit l'axe z (on passe dessous en allant selon x)."""
    T = Toile(300, 300, 150, 230)
    W = larg / 2
    for z in (W, -W):                                    # pilier lointain d'abord
        if avec_portail and z == -W:
            portail(T, W, haut)
        T.plan((-0.16, z - 0.16, 0), (0, 0.32, 0), (0, 0, haut), lambda s, t: np.where(
            (s > 0.75)[:, None], np.array(c(ombre), np.uint8), np.array(c(pilier), np.uint8)))
        T.plan((-0.16, z - 0.16, 0), (0.32, 0, 0), (0, 0, haut), lambda s, t: np.tile(np.array(c(ombre), np.uint8), (len(s), 1)))
        T.plan((-0.2, z - 0.2, 0), (0, 0.4, 0), (0, 0, 0.35), lambda s, t: np.tile(np.array(c('#2c2133'), np.uint8), (len(s), 1)))
        T.plan((-0.2, z - 0.2, 0), (0.4, 0, 0), (0, 0, 0.35), lambda s, t: np.tile(np.array(c('#1e1724'), np.uint8), (len(s), 1)))
    # nuki (poutre basse) qui traverse les piliers
    T.plan((-0.1, -W - 0.45, haut - 0.85), (0, 2 * W + 0.9, 0), (0, 0, 0.22), lambda s, t: np.tile(np.array(c(pilier), np.uint8), (len(s), 1)))
    T.plan((-0.1, -W - 0.45, haut - 0.85), (0.2, 0, 0), (0, 0, 0.22), lambda s, t: np.tile(np.array(c(sombre), np.uint8), (len(s), 1)))
    # gakuzuka (plaque) au centre
    T.plan((-0.12, -0.2, haut - 0.63), (0, 0.4, 0), (0, 0, 0.5), lambda s, t: np.tile(np.array(c(toit_c), np.uint8), (len(s), 1)))
    # shimaki + kasagi : double linteau, bouts relevés
    T.plan((-0.2, -W - 0.6, haut), (0, 2 * W + 1.2, 0), (0, 0, 0.2), lambda s, t: np.tile(np.array(c(pilier), np.uint8), (len(s), 1)))
    T.plan((-0.2, -W - 0.6, haut), (0.4, 0, 0), (0, 0, 0.2), lambda s, t: np.tile(np.array(c(sombre), np.uint8), (len(s), 1)))
    zs = np.linspace(-W - 0.85, W + 0.85, 24)
    for a, b in zip(zs[:-1], zs[1:]):
        lev = lambda z: haut + 0.2 + 0.28 * (abs(z) / (W + 0.85)) ** 3
        T.poly([(-0.26, a, lev(a)), (-0.26, b, lev(b)), (-0.26, b, lev(b) + 0.26), (-0.26, a, lev(a) + 0.26)], c(toit))
        T.poly([(-0.26, a, lev(a) + 0.26), (-0.26, b, lev(b) + 0.26), (0.26, b, lev(b) + 0.26), (0.26, a, lev(a) + 0.26)], c(toit_c))
    return T.rogner()


def lanterne(allumee=True):
    """Lanterne de pierre (tōrō) : socle, fût, plateau, foyer ajouré, toit aux coins relevés, pommeau."""
    T = Toile(80, 120, 40, 105)
    pierre, p_s, p_c, p_n = c('#a28e97'), c('#725b53'), c('#baa8a6'), c('#53383a')

    def bloc(d, h0, h1):
        T.plan((-d, d, h0), (0, -2 * d, 0), (0, 0, h1 - h0), lambda s, t: np.tile(np.array(pierre, np.uint8), (len(s), 1)))
        T.plan((-d, -d, h0), (2 * d, 0, 0), (0, 0, h1 - h0), lambda s, t: np.tile(np.array(p_s, np.uint8), (len(s), 1)))
        T.plan((-d, -d, h1), (2 * d, 0, 0), (0, 2 * d, 0), lambda s, t: np.tile(np.array(p_c, np.uint8), (len(s), 1)))
    bloc(0.32, 0, 0.18)
    bloc(0.11, 0.18, 0.75)
    bloc(0.3, 0.75, 0.88)
    bloc(0.22, 0.88, 1.25)
    feu = c('#f79617') if allumee else c('#2c2133')
    T.plan((-0.23, -0.1, 0.95), (0, 0.2, 0), (0, 0, 0.22), lambda s, t: np.tile(np.array(feu, np.uint8), (len(s), 1)))
    T.plan((-0.1, -0.23, 0.95), (0.2, 0, 0), (0, 0, 0.22), lambda s, t: np.tile(np.array(c('#ab5124') if allumee else c('#1e1724'), np.uint8), (len(s), 1)))
    # toit
    T.poly([(-0.42, 0.42, 1.25), (-0.42, -0.42, 1.25), (0, 0, 1.55)], pierre)
    T.poly([(-0.42, -0.42, 1.25), (0.42, -0.42, 1.25), (0, 0, 1.55)], p_s)
    T.ligne((-0.42, -0.42, 1.25), (-0.5, -0.5, 1.33), p_n, 2)
    T.ligne((-0.42, 0.42, 1.25), (-0.5, 0.5, 1.33), p_n, 2)
    T.ligne((0.42, -0.42, 1.25), (0.5, -0.5, 1.33), p_n, 2)
    x, y = (int(round(v)) for v in T.p(0, 0, 1.62))
    cv2.circle(T.img, (x, y), 3, pierre, -1)
    cv2.line(T.img, (x - 1, y - 1), (x, y - 2), p_c, 1)
    return T.rogner()


def jizo():
    """Statue de Jizō : pierre arrondie, bonnet et bavoir rouges."""
    T = Toile(40, 50, 20, 44)
    x, y = 20, 44
    cv2.rectangle(T.img, (x - 9, y - 5), (x + 9, y), c('#725b53'), -1)
    cv2.rectangle(T.img, (x - 9, y - 5), (x + 9, y - 4), c('#a28e97'), -1)
    cv2.ellipse(T.img, (x, y - 14), (8, 11), 0, 0, 360, c('#a28e97'), -1)
    cv2.ellipse(T.img, (x + 3, y - 12), (4, 8), 0, -60, 90, c('#8f7a79'), -1)
    cv2.circle(T.img, (x, y - 27), 6, c('#baa8a6'), -1)
    cv2.circle(T.img, (x + 2, y - 26), 4, c('#a28e97'), -1)
    cv2.line(T.img, (x - 3, y - 27), (x - 1, y - 27), c('#725b53'), 1)
    cv2.line(T.img, (x + 2, y - 27), (x + 4, y - 27), c('#725b53'), 1)
    cv2.ellipse(T.img, (x, y - 31), (6, 4), 0, 180, 360, c('#a04625'), -1)                 # bonnet
    pts = np.array([[x - 7, y - 21], [x + 7, y - 21], [x + 3, y - 12], [x - 3, y - 12]], np.int32)
    cv2.fillConvexPoly(T.img, pts, c('#a04625'))                                          # bavoir
    cv2.line(T.img, (x - 7, y - 21), (x + 7, y - 21), c('#8c3329'), 1)
    return T.rogner()


def grand_rocher(seed=4):
    """Le Grand Rocher, sceau d'Izanagi : un bloc à facettes ombrées comme les rochers du pack Resurrected,
    ceinturé d'une corde sacrée (shimenawa) d'où pendent des shide de papier."""
    w, h = 240, 220
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    # chapeau convexe : minimum de plans (une facette par plan), deux bosses accolées
    def chapeau(cx, cy, rx, ry, n):
        ang = rng.uniform(0, 2 * np.pi, n)
        rad = rng.uniform(0.35, 1.0, n)
        a = np.cos(ang) * rad * 1.6 / rx
        b = np.sin(ang) * rad * 1.6 / ry
        d = rng.uniform(1.0, 1.25, n)
        H = np.full((h, w), np.inf, np.float32)
        idx = np.zeros((h, w), np.int32)
        for i in range(n):
            v = d[i] - a[i] * (xx - cx) - b[i] * (yy - cy) - 0.0
            v = v - (((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2) * 0.0
            plus = v < H
            H = np.where(plus, v, H)
            idx = np.where(plus, i, idx)
        ell = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2
        H = np.minimum(H, 1.3 - ell)
        idx = np.where(1.3 - ell <= H + 1e-6, n, idx)
        return H, idx, a, b
    H1, i1, a1, b1 = chapeau(w * 0.45, h * 0.52, w * 0.4, h * 0.44, 22)
    H2, i2, a2, b2 = chapeau(w * 0.68, h * 0.62, w * 0.25, h * 0.3, 12)
    deux = H2 > H1
    forme = (np.maximum(H1, H2) > 0.3) & (yy < h - 4)
    # lumière venant du haut à gauche : clarté selon la pente de chaque facette
    ga = np.where(deux, np.append(a2, 0)[i2], np.append(a1, 0)[i1])
    gb = np.where(deux, np.append(b2, 0)[i2], np.append(b1, 0)[i1])
    fac = np.where(deux, i2 + 100, i1)
    lum = ga * w * 0.4 * 0.6 + gb * h * 0.44 * 0.9
    lum[(fac == 22) | (fac == 112)] = -0.4                          # le pourtour, plus sombre
    q = np.digitize(lum, [-0.9, -0.3, 0.3, 0.9])                    # 0 sombre … 4 clair
    rampe = fm.RAMPE_RR
    img = np.zeros((h, w, 4), np.uint8)
    img[forme, :3] = rampe[4 - q[forme]]
    img[forme, 3] = 255
    # arêtes entre facettes : un pixel plus sombre en bas, plus clair en haut
    bord = np.zeros_like(forme)
    bord[1:] |= fac[1:] != fac[:-1]
    bord[:, 1:] |= fac[:, 1:] != fac[:, :-1]
    bord &= forme
    img[bord, :3] = fm.decaler(img[bord, :3][None], rampe, 1)[0]
    # pied sombre et contour bas
    bas = forme & ~np.roll(forme, -3, 0)
    img[bas, :3] = fm.hx('#633634')
    # mousse sur les facettes tournées vers le ciel
    mousse = forme & (gb < -0.25 / (h * 0.44)) & (yy < h * 0.5)
    img[mousse, :3] = fm.hx('#6a6a46')
    img[mousse & (q >= 3), :3] = fm.hx('#808449')
    # shimenawa : grosse corde torsadée qui ceinture le rocher en s'affaissant
    cx = w * 0.5
    ys = (h * 0.5 + 10 + 22 * ((xx[0] - cx) / (w * 0.5)) ** 2 * -0.6 + 0.06 * (xx[0] - cx)).astype(int)
    for x in range(w):
        col = np.nonzero(forme[:, x])[0]
        if not len(col):
            continue
        y = ys[x]
        for dy in range(-7, 8):
            if 0 <= y + dy < h and forme[y + dy, x]:
                tor = ((x + dy * 1.3) % 10) < 5
                img[y + dy, x, :3] = fm.hx('#dbc9b4') if tor else fm.hx('#c0af83')
                if dy >= 5:
                    img[y + dy, x, :3] = fm.hx('#a78c61')
                if dy == 7 or dy == -7:
                    img[y + dy, x, :3] = fm.hx('#936d53')
    for x in range(int(cx - w * 0.32), int(cx + w * 0.33), 30):     # shide en zigzag
        y = ys[x] + 8
        pts = [(x, y), (x + 6, y), (x + 6, y + 6), (x + 1, y + 6), (x + 1, y + 12), (x + 7, y + 12), (x + 7, y + 18), (x + 2, y + 18), (x + 2, y + 24)]
        for a, b in zip(pts[:-1], pts[1:]):
            cv2.line(img, a, b, (232, 220, 200, 255), 2)
    ys_, xs_ = np.nonzero(forme)
    pied = (int(xs_.mean()), int(ys_.max()))
    return img, pied


def tout():
    """Tous les sprites de décor : nom → (RGBA, pied, ombre ou None)."""
    out = {k: v for k, v in arbres().items()}
    out['maison_a'] = (*maison_the(3.6, 3.0, 1.8, False, ('#865e51', '#603f36', '#a57660', '#432b30'), '#8c3329'), None)
    GEOMETRIE['maison_a'] = DERNIER
    out['maison_b'] = (*maison_the(4.0, 2.8, 1.8, False), None)
    GEOMETRIE['maison_b'] = DERNIER
    for nom, f in [('maison_the', maison_the), ('forge', forge), ('lanterne', lanterne), ('jizo', jizo),
                   ('rocher', grand_rocher)]:
        im, pied = f()
        GEOMETRIE[nom] = DERNIER
        out[nom] = (im, pied, ombre_ellipse(int(im.shape[1] * 0.9), max(8, int(im.shape[1] * 0.3))) if nom in ('rocher',) else None)
    im, pied = torii()
    out['torii'] = (im, pied, None)
    GEOMETRIE['torii'] = DERNIER
    im, pied = torii('#2c2133', '#1e1724', '#1e1724', '#8c3329', '#a04625', 3.2, 4.2, avec_portail=True)
    out['torii_noir'] = (im, pied, None)
    GEOMETRIE['torii_noir'] = DERNIER
    return out


if __name__ == '__main__':
    from echelle import scale2x
    sp = tout()
    H = max(v[0].shape[0] for v in sp.values())
    W = sum(v[0].shape[1] + 10 for v in sp.values())
    m = np.zeros((H, W, 4), np.uint8)
    m[...] = (128, 132, 73, 255)
    x = 0
    for k, (im, pied, o) in sp.items():
        h, w = im.shape[:2]
        sub = m[H - h:H, x:x + w]
        a = im[..., 3:4] / 255.0
        sub[..., :3] = (im[..., :3] * a + sub[..., :3] * (1 - a)).astype(np.uint8)
        x += w + 10
    Image.fromarray(scale2x(m[..., :3], wrap=False)).save('decor-montage.png')
    print({k: v[0].shape for k, v in sp.items()})
