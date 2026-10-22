"""Plan de la nouvelle île (style Forgotten Memories, vue isométrique du jeu).

Coordonnées du monde (x, z) en unités du jeu ; l'écran voit
u = (x - z)/√2 (horizontal) et v = (x + z)/√2 (profondeur, haut = loin).
Les bords des plateaux suivent les axes du monde : ils apparaissent à ±30°
comme les falaises du jeu.  Les faces visibles regardent vers -x (bas gauche)
ou -z (bas droite).
"""
import numpy as np

S2 = np.sqrt(2.0)
S = 1.5              # unités du monde par unité du plan (le monde est 1,5 fois plus grand que le plan)
TUILE = 0.909 / S     # une tuile FM (32 px à 35,2 px par unité du monde), en unités du plan
CELL = TUILE / 3      # la grille du plan : un tiers de tuile, pour des bords de relief naturels
STEP = 2.2           # hauteur d'un niveau (unités du monde) : deux tuiles de paroi FM
EXT = 84             # demi-étendue de la grille en x et z (unités du plan)

(EAU, SABLE, HERBE, TERRE, DALLE, BOIS, VOLCAN, LAVE, RIZ, DIGUE, SPIRALE, PIERRE, MARCHE,
 FLEURS, CENDRE, LYS) = range(16)
NOMS = 'eau sable herbe terre dalle bois volcan lave riz digue spirale pierre marche fleurs cendre lys'.split()
L1, L2 = 2.2, 4.4     # niveaux du sol (unités du monde) : l'île, les plateaux
HCASC = 8.8           # plateau de la cascade


def uv2xz(u, v):
    return (u + v) / S2, (v - u) / S2


def xz2uv(x, z):
    return (x - z) / S2, (x + z) / S2


def lisse(shape, freq, seed):
    from scipy.ndimage import zoom
    n = max(3, int(shape[0] * freq) + 3)
    g = np.random.default_rng(seed).uniform(-1, 1, (n, n))
    b = zoom(g, shape[0] / (n - 2), order=3)[: shape[0], : shape[1]]
    return np.clip(b, -1, 1)


def bruit_plan(shape, longueur, seed):
    """Bruit lisse dans [-1, 1] dont le grain fait ~longueur unités du plan."""
    n = shape[0]
    return lisse(shape, CELL / longueur, seed)


class Plan:
    def __init__(self, seed=7):
        self.seed = seed
        n = int(2 * EXT / CELL)
        c = (np.arange(n) + 0.5) * CELL - EXT
        self.X, self.Z = np.meshgrid(c, c, indexing='ij')   # [i, j] = (x, z)
        self.U, self.V = xz2uv(self.X, self.Z)
        self.n = n
        self.niv = np.zeros((n, n), np.float32)
        self.mat = np.full((n, n), EAU, np.uint8)
        self.chemins = []     # (points uv, largeur, matière)
        self.marches = []     # (cu, cv, ax, az, axe, h0, h1)
        self.rizieres = []    # (x, z, demi-côté, hauteur)
        self.ponts = []       # dict : centre, demi-tailles, axe, hauteur, garde-corps
        self.zones = {}

    # --- formes sur la grille ---------------------------------------------
    def rect(self, cu, cv, ax, az):
        cx, cz = uv2xz(cu, cv)
        return (np.abs(self.X - cx) <= ax) & (np.abs(self.Z - cz) <= az)

    def ovale(self, cu, cv, ru, rv):
        return ((self.U - cu) / ru) ** 2 + ((self.V - cv) / rv) ** 2 <= 1

    def bande(self, pts, larg, U=None, V=None):
        U = self.U if U is None else U
        V = self.V if V is None else V
        d = np.full(U.shape, 1e9, np.float32)
        for (u0, v0), (u1, v1) in zip(pts[:-1], pts[1:]):
            du, dv = u1 - u0, v1 - v0
            L2 = du * du + dv * dv
            t = np.clip(((U - u0) * du + (V - v0) * dv) / L2, 0, 1)
            d = np.minimum(d, np.hypot(U - u0 - t * du, V - v0 - t * dv))
        return d <= larg / 2 if np.isscalar(larg) else d <= larg / 2

    # --- détails au pixel (appelé par le rendu) -----------------------------
    def fins(self, U, V, X, Z, H, M, N):
        from rendu import bruit
        PU = N / 80
        # escaliers : rampe en marches de 0,25 u
        for cu, cv, ax, az, axe, h0, h1 in self.marches:
            cx, cz = uv2xz(cu, cv)
            m = (np.abs(X - cx) <= ax) & (np.abs(Z - cz) <= az)
            if axe == 'x':
                t = (X - (cx - ax)) / (2 * ax)
            else:
                t = (Z - (cz - az)) / (2 * az)
            n = max(1, int(round((h1 - h0) / 0.3)))
            h = h0 + (h1 - h0) * np.minimum(np.floor(t * n) + 1, n) / n
            H[m] = h[m]
            M[m] = MARCHE


def _marche(p, cx, cz, axe, sens, pas=0.5, maxi=40):
    """Avance sur la grille depuis (cx, cz) ; renvoie la liste des (x, z, niveau)."""
    out = []
    for k in range(int(maxi / pas)):
        x = cx + (k * pas * sens if axe == 'x' else 0)
        z = cz + (k * pas * sens if axe == 'z' else 0)
        i = int((x + EXT) / CELL)
        j = int((z + EXT) / CELL)
        out.append((x, z, p.niv[i, j], p.mat[i, j]))
    return out


def escalier(p, u, v, axe, larg):
    """Escalier qui monte depuis (u, v) le long de +axe jusqu'au bord du plateau."""
    cx, cz = uv2xz(u, v)
    pts = _marche(p, cx, cz, axe, 1, maxi=16)
    h0 = pts[0][2]
    e = next((q for q in pts if q[2] > h0 + 0.8), None)
    if e is None or pts[0][3] == EAU:
        print('escalier introuvable', (u, v), axe, [round(float(q[2]), 2) for q in pts[::4]])
        return
    h1 = e[2]
    n = int(round((h1 - h0) / 0.3))
    L = n * 0.5 / S                    # profondeur de l'escalier (unités du plan)
    if axe == 'x':
        ex = e[0] - 0.25                # bord (à la demi-cellule près)
        sx, sz = ex - L / 2 + 0.25, cz
        p.marches.append((*xz2uv(sx, sz), L / 2 + 0.25, larg / 2, 'x', h0, h1))
    else:
        ez = e[1] - 0.25
        sx, sz = cx, ez - L / 2 + 0.25
        p.marches.append((*xz2uv(sx, sz), larg / 2, L / 2 + 0.25, 'z', h0, h1))


def pont(p, u, v, axe, larg, h, rampe=True, sens=0, longueur=None):
    """Pont (ou ponton) le long d'un axe ; s'arrête 1,2 u après chaque rive."""
    cx, cz = uv2xz(u, v)
    if sens == 0:
        a = [q for q in _marche(p, cx, cz, axe, 1) if q[3] != EAU][0]
        b = [q for q in _marche(p, cx, cz, axe, -1) if q[3] != EAU][0]
        lo = (b[0] if axe == 'x' else b[1]) - 1.6
        hi = (a[0] if axe == 'x' else a[1]) + 1.6
    else:
        # ponton : part de la terre en (u, v) et avance vers -axe dans la mer
        b = [q for q in _marche(p, cx, cz, axe, -1, pas=0.25) if q[3] == EAU][0]
        bord = b[0] if axe == 'x' else b[1]
        hi = bord + 1.5
        lo = bord - longueur
    m = (lo + hi) / 2
    dem = (hi - lo) / 2
    if axe == 'x':
        c = (m, cz)
        ax, az = dem, larg / 2
        bouts = (xz2uv(lo, cz), xz2uv(hi, cz))
    else:
        c = (cx, m)
        ax, az = larg / 2, dem
        bouts = (xz2uv(cx, hi), xz2uv(cx, lo))
    p.ponts.append(dict(c=c, ax=ax, az=az, axe=axe, h=h, rampe=rampe, bouts=bouts))


def tache(p, cu, cv, ru, rv, rugo=0.25, grain=4.0, seed=0):
    """Forme naturelle : ellipse déformée par deux octaves de bruit (bords irréguliers)."""
    n1 = bruit_plan(p.U.shape, grain, abs(p.seed * 31 + seed))
    n2 = bruit_plan(p.U.shape, grain / 3, abs(p.seed * 37 + seed))
    d = np.sqrt(((p.U - cu) / ru) ** 2 + ((p.V - cv) / rv) ** 2)
    return d + rugo * (n1 + 0.4 * n2) <= 1


def construire(seed=7):
    p = Plan(seed)
    U, V = p.U, p.V
    b3 = bruit_plan(U.shape, 3.0, seed + 3)
    bc = bruit_plan(U.shape, 2.0, seed + 9)

    # ======================= masse de l'île (côte découpée) ==================
    nc = bruit_plan(U.shape, 9.0, seed + 1) + 0.45 * bruit_plan(U.shape, 3.0, seed + 2)
    e = np.abs(U / 34) ** 2.6 + np.abs((V - 2) / 58) ** 2.6
    ile = e + 0.22 * nc <= 1
    for cu, cv, ru, rv in [(-31, -50, 9, 11), (34, 4, 4, 7), (-35, 20, 3.5, 5), (31, -44, 6, 9)]:
        ile &= ~tache(p, cu, cv, ru, rv, 0.3, 3, seed=int(cu * 7 + cv))
    ile |= tache(p, 24, 50, 13.5, 11.5, 0.18, 4, seed=5)            # tout le plateau de la cascade
    p.niv[ile] = L1
    p.mat[ile] = HERBE

    # prairie fleurie (sud-est)
    pr = tache(p, 16, -32, 15, 20, 0.35, 5, seed=11) & ile
    p.mat[pr] = FLEURS
    # lys rouges (higanbana) : vers le volcan, le donjon et les Jizō
    lys = (tache(p, -26, 22, 9, 10, 0.5, 3, seed=12) | tache(p, -31, 12, 5, 6, 0.5, 2, seed=13)) & ile
    p.mat[lys] = LYS

    # îlots : des rochers dans la mer, formes naturelles
    for k, (cu, cv, r) in enumerate([(-36, -24, 2.2), (-37, 38, 2.6), (36, -6, 1.8), (34, -56, 2.4), (-13, -60, 1.6)]):
        m = tache(p, cu, cv, r, r * 1.2, 0.35, 1.2, seed=40 + k)
        p.niv[m] = L1 * (1.0 if k % 2 else 0.7)
        p.mat[m] = HERBE

    # ======================= plages =========================================
    plage = ile & tache(p, -21, -44, 9.5, 9.5, 0.3, 3, seed=14)
    plage2 = ile & tache(p, 12, -53, 9, 5.5, 0.3, 3, seed=15)
    for m in (plage, plage2):
        p.niv[m] = 0.4
        p.mat[m] = SABLE

    # ======================= plateaux (niveau 2) =============================
    def plateau(m, h, matiere=None):
        m = m & ile
        p.niv[m] = h
        if matiere is not None:
            p.mat[m] = matiere
        return m

    plateau(tache(p, -25, 28, 8, 9, 0.25, 3, seed=21), L2)                # donjon
    plateau(tache(p, -16, 46, 15, 13, 0.2, 4, seed=22), L2, CENDRE)       # pied du volcan
    plateau(tache(p, 1, 47, 9.5, 9, 0.22, 3, seed=23), L2)                # Grand Rocher
    plateau(tache(p, -28, 1, 5, 8, 0.3, 2.5, seed=24), L2)                # butte ouest du village
    plateau(tache(p, 27, -24, 5, 7, 0.3, 2.5, seed=25), L2, FLEURS)       # butte de la prairie
    casc = plateau(tache(p, 24, 50, 12, 10, 0.15, 3, seed=26), HCASC)    # plateau de la cascade
    # cendres autour du volcan
    cend = tache(p, -16, 45, 18, 16, 0.3, 3, seed=27) & ile & np.isin(p.mat, (HERBE, LYS))
    p.mat[cend] = CENDRE

    # ======================= volcan : gradins irréguliers ====================
    th = np.arctan2(V - 48, U + 16)
    d = np.hypot(U + 16, (V - 48) / 1.2)
    ondes = 0.9 * np.sin(3 * th + 0.7) + 0.5 * np.sin(5 * th + 2.1) + 0.8 * b3
    for k, r in enumerate([10.0, 7.6, 5.4, 3.6]):
        m = (d + ondes * (0.5 + 0.12 * k) <= r) & ile
        p.niv[m] = L2 + (k + 1) * 1.5
        p.mat[m] = VOLCAN
    crat = d + 0.4 * b3 <= 2.1
    p.niv[crat] = L2 + 4 * 1.5 - 0.35
    p.mat[crat] = LAVE
    coulee = p.bande([(-16, 47), (-13, 42), (-10.5, 38.5)], 1.4 + 0.4 * bc) & (p.mat == VOLCAN)
    p.mat[coulee] = LAVE

    # ======================= cascade et rivière ===============================
    cx, cz = uv2xz(24, 50)
    rang = casc & (np.abs(p.Z - cz) <= 2.2)
    bord = p.X[rang].min()                          # face -x du plateau (tournée vers la caméra), au droit de la chute
    canal = (np.abs(p.Z - cz) <= 1.6 + 0.3 * bc) & (p.X <= cx + 3) & casc
    canal |= tache(p, *xz2uv(cx + 4.0, cz), 2.4, 2.2, 0.25, 1.5, seed=28) & casc   # source
    p.niv[canal] = HCASC - 0.5
    p.mat[canal] = EAU
    vu, vv = xz2uv(bord - 4.2, cz)                  # vasque au pied de la chute
    riv = [(vu, vv), (7, 30), (2.5, 20), (0, 10), (-1.5, -2), (-4, -16), (-3, -30), (-6, -46), (-8, -66)]
    lit = p.bande(riv, 6.0 + 1.6 * b3)
    lit |= tache(p, vu, vv, 5.2, 5.2, 0.2, 2, seed=29)
    lit |= (np.abs(p.Z - cz) <= 2.6) & (p.X >= bord - 5) & (p.X <= bord + 4) & ~casc     # la vasque reçoit toute la largeur de la chute
    p.niv[lit] = 0
    p.mat[lit] = EAU
    p.zones['chute'] = (bord, cz)
    p.zones['vasque'] = (vu, vv)

    # ======================= rizières en terrasses (versant est) ==============
    # un versant qui monte vers la cascade ; les terrasses suivent ses courbes de niveau
    zr = tache(p, 21, 13, 12.5, 16, 0.25, 4, seed=30) & ile & (p.niv == L1) & ~lit & (p.mat != FLEURS)
    pente = np.clip((V - (-3)) / 30.0, 0, 1) + 0.12 * np.clip((U - 10) / 20, 0, 1)
    hcont = L1 + 3.4 * pente + 0.55 * bruit_plan(U.shape, 6.0, seed + 31)
    pas_t = 0.45
    k = np.floor((hcont - L1) / pas_t)
    k = np.clip(k, 0, None)
    terr = zr & (k >= 0)
    hk = L1 + 0.25 + k * pas_t
    p.niv[terr] = hk[terr]
    p.mat[terr] = RIZ
    p.terrasse = np.where(terr, k, -1).astype(np.int16)
    # diguettes : le bord avant de chaque terrasse (au-dessus d'une plus basse) et des murets transverses
    bas = np.zeros_like(terr)
    for dx, dz in ((-1, 0), (0, -1), (-1, -1)):
        voisin = np.roll(np.roll(p.terrasse, -dx, 0), -dz, 1)
        bas |= terr & (voisin < p.terrasse)
    for r in range(2):                              # diguette de 3 cellules de large
        bas |= terr & (np.roll(bas, 1, 0) | np.roll(bas, 1, 1)) & (np.roll(p.terrasse, -1, 0) <= p.terrasse)
    trans = terr & (np.abs(((U + 2.2 * bc) / 5.5) % 1 - 0.5) > 0.47)
    dig = bas | trans | (terr & ~ndi_erode(terr, 2))
    p.niv[dig] = p.niv[dig] + 0.12
    p.mat[dig] = DIGUE
    p.zones['rizieres'] = zr

    # ======================= jardin du Grand Rocher ===========================
    jar = p.ovale(1, 47, 6.2, 5.0) & (p.niv == L2)
    p.mat[jar] = SPIRALE
    p.zones['spirale'] = uv2xz(1, 47)
    p.zones['rocher'] = (1, 47)

    # ======================= entrée du donjon ===============================
    don = tache(p, -25, 29, 4.2, 4.2, 0.15, 1.5, seed=32) & (p.niv == L2)
    p.mat[don] = PIERRE
    p.zones['donjon'] = (-25, 29)

    # ======================= place du village ===============================
    place = tache(p, -14, 3, 5.0, 5.0, 0.12, 2, seed=33) & (p.niv == L1)
    p.mat[place] = DALLE
    p.zones['place'] = (-14, 3)

    # ======================= escaliers ======================================
    escalier(p, -20.0, -37.0, 'x', 3.4)      # plage → village
    escalier(p, -21.0, 17.0, 'z', 3.0)       # vers le donjon
    escalier(p, -4.0, 36.0, 'x', 3.0)        # vers le Grand Rocher

    # ======================= pont et ponton ==================================
    pont(p, 2.5, 20.0, 'z', 2.9, L1 + 0.12, rampe=True)
    pont(p, -21.0, -44.0, 'x', 2.6, 0.75, rampe=False, sens=-1, longueur=8.5)

    # ======================= chemins ========================================
    T = TERRE
    pw, pe = p.ponts[0]['bouts']
    p.chemins += [
        ([(-18, -37), (-15, -24), (-14, -10), (-14, 3)], 3.6, T),       # ponton → place
        ([(-14, 3), (-8, 13), pw], 3.4, T),                            # place → pont
        ([pe, (9, 15), (12, 6), (11, -8), (12, -18), (15, -28)], 3.2, T),  # pont → prairie (pied des rizières)
        ([pe, (8, 24), (11, 31)], 3.0, T),                             # pont → cascade (rive est)
        ([(-14, 3), (-17, 11), (-20, 16)], 3.0, T),                    # place → donjon
        ([(-14, 3), (-24, 9), (-31, 14)], 2.8, T),                     # place → Jizō
        ([pw, (-3, 28), (-4, 35)], 3.0, T),                            # pont → Grand Rocher
    ]
    for pts, larg, matiere in p.chemins:
        m = p.bande(pts, larg + 0.9 * bc) & np.isin(p.mat, (HERBE, FLEURS, CENDRE, LYS))
        p.mat[m] = matiere
    # clairière de terre autour de la place du village
    cl = tache(p, -14, 3, 7.0, 7.0, 0.25, 2, seed=34) & np.isin(p.mat, (HERBE, LYS)) & (p.niv == L1)
    p.mat[cl] = TERRE
    p.ile = ile
    p.riv = riv
    return p


def ndi_erode(m, it):
    from scipy import ndimage
    return ndimage.binary_erosion(m, iterations=it)
