"""Rendu isométrique de l'île au style Forgotten Memories (sans contour noir).

L'image est rendue à la résolution « dessin » du pack (35,2 px par unité du
monde, une tuile FM de 32 px ≈ 0,9 unité), puis agrandie en Scale2x pour
arriver à la densité des héros (70,4 px par unité) : les pierres, touffes et
chemins ont ainsi les proportions des scènes du pack à côté des personnages.

Usage : python3 rendu.py N [sortie.png]   (N = 4224 pour la carte entière)
Le plan est en « unités du plan » (cadre u ∈ [-40, 40]) ; le monde vaut S fois plus.
"""
import sys
import time
import numpy as np
import cv2
from numba import njit, prange
from scipy import ndimage as ndi
from PIL import Image

import fm
from plan import *

SQ3 = np.sqrt(3.0)


def bruit(N, cellule, seed, mode=cv2.INTER_CUBIC):
    """Bruit lisse ~N(0,1) de taille N×N, grain ≈ cellule pixels."""
    n = max(2, int(N / max(cellule, 1)) + 2)
    g = np.random.default_rng(seed).standard_normal((n, n)).astype(np.float32)
    b = cv2.resize(g, (int(N * n / (n - 1)) + 1,) * 2, interpolation=mode)[:N, :N]
    return b / (b.std() + 1e-6)


@njit(parallel=True, cache=True)
def voxel(H, K, src, dep):
    """Projection d'arrière en avant : chaque ligne d'image reçoit la ligne de sol
    qu'elle montre (src) et sa profondeur sous le dessus (dep = 0 : dessus)."""
    N = H.shape[0]
    for px in prange(N):
        ybuf = N
        for gy in range(N - 1, -1, -1):
            top = gy - int(H[gy, px] * K + 0.5)
            if top < ybuf:
                lo = top if top > 0 else 0
                for r in range(lo, ybuf):
                    src[r, px] = gy
                    dep[r, px] = r - top
                ybuf = lo
                if ybuf == 0:
                    break


def tuile(tex, N, dx=0, dy=0):
    h, w = tex.shape[:2]
    r = (np.arange(N) + dy) % h
    c = (np.arange(N) + dx) % w
    return tex[r[:, None], c[None, :]]


def touffes(tex, fond, garder):
    """Les petits motifs (touffes, fleurs, cailloux) d'une tuile du pack, détachés de leur fond."""
    base = np.all(tex == fond, -1)
    lab, n = ndi.label(~base, structure=np.ones((3, 3)))
    out = []
    for k, sl in enumerate(ndi.find_objects(lab), 1):
        m = lab[sl] == k
        if garder(tex[sl][m]):
            out.append((tex[sl].copy(), m))
    return out


def semis(tex, fond, garder, taille=512, densite=1.0, seed=1):
    """Texture répétable : fond uni + touffes du pack posées au hasard."""
    tf = touffes(tex, fond, garder)
    rng = np.random.default_rng(seed)
    out = np.tile(fond, (taille, taille, 1))
    nb = int(len(tf) * densite * (taille / tex.shape[0]) ** 2)
    for _ in range(nb):
        t, m = tf[rng.integers(len(tf))]
        y, x = rng.integers(0, taille, 2)
        h, w = m.shape
        ys = (np.arange(h) + y) % taille
        xs = (np.arange(w) + x) % taille
        blk = out[ys[:, None], xs[None, :]]
        blk[m] = t[m]
        out[ys[:, None], xs[None, :]] = blk
    return out


def a_couleur(*hs):
    cs = fm.pal(*hs)
    return lambda cols: any((cols == c).all(-1).any() for c in cs)


# ---------- assombrir d'un cran dans la palette du pack -----------------------
_PAL = None


def palette_fm():
    global _PAL
    if _PAL is None:
        cs = []
        for img in (fm.TS, fm.WT):
            a = img.reshape(-1, 4)
            a = a[a[:, 3] > 0][:, :3]
            cs.append(np.unique(a, axis=0))
        extra = np.concatenate([fm.RAMPE_ROCHE, fm.RAMPE_VOLCAN, fm.RAMPE_BOUE, fm.RAMPE_SABLE, fm.RAMPE_BOIS,
                                fm.RAMPE_LAVE, fm.RAMPE_EAU, fm.pal('#3f3f30', '#463f33', '#3a2f3a')])
        _PAL = np.unique(np.concatenate(cs + [extra]), axis=0).astype(np.int32)
    return _PAL


def assombrir(cols, force=0.78):
    """La même couleur, plus sombre et un peu violacée comme les ombres du pack, prise dans sa palette."""
    if cols.size == 0:
        return cols
    pal = palette_fm()
    u, inv = np.unique(cols.reshape(-1, 3), axis=0, return_inverse=True)
    cible = u.astype(np.float32) * force + np.array([20, 8, 40], np.float32) * (1 - force)
    d = ((cible[:, None, :] - pal[None]) ** 2).sum(-1)
    d[(u[:, None, :] == pal[None]).all(-1)] += 1e9      # jamais la couleur d'origine
    res = pal[d.argmin(1)].astype(np.uint8)
    return res[inv.reshape(-1)].reshape(cols.shape)


def _h(a, b, seed):
    return (np.sin(a * 78.233 + b * 12.9898 + seed * 3.7) * 43758.5453) % 1


def dalles_fm(x, z, seed, lx, lz):
    """Dalles alignées sur le monde, rangées décalées, longueurs de 1 ou 2 modules :
    (id, fx, fz, L) avec fx, fz la position dans la dalle et L sa longueur."""
    rang = np.floor(z / lz)
    xx = x / lx + _h(rang, 0.5, seed)
    col = np.floor(xx)
    paire = np.floor(col / 2)
    longue = _h(rang, paire, seed + 1) < 0.5
    debut = np.where(longue, 2 * paire, col)
    L = np.where(longue, 2, 1) * lx
    return _h(rang, debut, seed + 2), (xx - debut) * lx, (z / lz - rang) * lz, L


def pierres_fm():
    """Les dalles du tas de pierres plates du pack (TileSet), une par une."""
    bloc = fm.TS[130:262, 1310:1470]
    m = bloc[..., 3] > 0
    lab, n = ndi.label(m)                      # 4-connexité : les dalles sont séparées d'un pixel
    out = []
    for k, sl in enumerate(ndi.find_objects(lab), 1):
        mk = lab[sl] == k
        if mk.sum() >= 14:
            out.append((bloc[sl][..., :3].copy(), mk, ndi.binary_dilation(np.pad(mk, 1))))
    return out


def paver(img, zone, densite, pierres, rng, essais):
    """Pose des dalles du pack sans chevauchement (un pixel de joint), plus ou moins serrées selon densite."""
    ys, xs = np.nonzero(zone)
    if not len(ys):
        return
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    zb = zone[y0:y1, x0:x1]
    db = densite[y0:y1, x0:x1]
    occ = np.zeros((y1 - y0 + 2, x1 - x0 + 2), bool)
    ib = img[y0:y1, x0:x1]
    yy, xx = ys - y0, xs - x0
    tir = rng.integers(0, len(yy), essais)
    for i, (t, m, md) in zip(tir, (pierres[k] for k in rng.integers(0, len(pierres), essais))):
        y, x = yy[i], xx[i]
        if rng.random() > db[y, x]:
            continue
        h, w = m.shape
        a, b = y - h // 2, x - w // 2
        if a < 0 or b < 0 or a + h > zb.shape[0] or b + w > zb.shape[1]:
            continue
        if (occ[a:a + h + 2, b:b + w + 2] & md).any() or not zb[a:a + h, b:b + w][m].all():
            continue
        occ[a + 1:a + h + 1, b + 1:b + w + 1] |= m
        blk = ib[a:a + h, b:b + w]
        blk[m] = t[m]


def pavage_fm(dens, rng):
    """Dalles plates façon pack, alignées sur l'écran : rangées de 10 à 15 px, dalles de 11 à 26 px,
    joint d'un pixel, coins cassés, dessus clair et tranche sombre de 2 px. dens (0..1) règle la
    part de dalles posées ; ailleurs le sol passe."""
    H, W = dens.shape
    out = np.zeros((H, W, 3), np.uint8)
    pose = np.zeros((H, W), bool)
    tons = [fm.pal('#c0af83', '#a78c61')] * 5 + [fm.pal('#a78c61', '#936d53')] * 2 + [fm.pal('#dbc9b4', '#a78c61')]
    y = -int(rng.integers(0, 6))
    while y < H:
        rh = int(rng.integers(10, 16))
        x = -int(rng.integers(0, 20))
        while x < W:
            sw = int(rng.integers(11, 27))
            haut = int(rng.integers(0, 4))                               # dalles de hauteurs inégales
            joint = 1 + (rng.random() < 0.3)
            y0, y1, x0, x1 = y + haut, y + rh - 1, x, x + sw - joint
            cy, cx = min(max((y0 + y1) // 2, 0), H - 1), min(max((x0 + x1) // 2, 0), W - 1)
            if rng.random() < dens[cy, cx]:
                c = tons[int(rng.integers(0, len(tons)))]
                bloc = np.empty((y1 - y0, x1 - x0, 3), np.uint8)
                bloc[:] = c[0]
                bloc[-2:] = c[1]
                if rng.random() < 0.25:                                   # tache plus sombre
                    a, b = int(rng.integers(0, max(1, y1 - y0 - 3))), int(rng.integers(0, max(1, x1 - x0 - 4)))
                    bloc[a:a + 3, b:b + 4] = c[1]
                m = np.ones(bloc.shape[:2], bool)
                m[0, 0] = m[0, -1] = m[-1, 0] = m[-1, -1] = False
                ya, yb, xa, xb = max(y0, 0), min(y1, H), max(x0, 0), min(x1, W)
                if ya < yb and xa < xb:
                    sl = (slice(ya - y0, yb - y0), slice(xa - x0, xb - x0))
                    mm = m[sl]
                    out[ya:yb, xa:xb][mm] = bloc[sl][mm]
                    pose[ya:yb, xa:xb] |= mm
            x += sw
        y += rh
    return out, pose


def pousse_riz():
    """Une pousse de riz en pixels (couleurs du pack) : des brins en éventail et leur reflet."""
    L, M, D, R = fm.pal('#b29f53', '#808449', '#6a6a46', '#a9d3d3')
    h, w = 15, 13
    t = np.zeros((h, w, 3), np.uint8)
    m = np.zeros((h, w), np.uint8)
    pied = (6, 12)
    for i, bout in enumerate([(0, 4), (2, 1), (5, 0), (8, 0), (10, 1), (12, 4), (3, 6), (9, 6)]):
        cv2.line(m, pied, bout, 1, 1)
        if i % 2 == 0:
            m[bout[1], bout[0]] = 2                   # pointe claire
    t[m == 1] = M
    t[m == 2] = L
    bas = np.zeros((h, w), bool)
    bas[10:13] = True
    t[(m > 0) & bas] = D
    t[13, 3:10] = R
    mm = m > 0
    mm[13, 3:10] = True
    return t, mm


def rendre(N, plan=None, seed=7, verbeux=True, geo=None):
    t0 = time.time()

    def log(m):
        if verbeux:
            print(m, round(time.time() - t0, 1), 's', flush=True)

    p = plan or construire(seed)
    PU = N / 80                  # pixels par unité du plan
    PW = PU / S                  # pixels par unité du monde (35,2 pour N = 4224)
    K = 0.8165 * PW              # lignes d'image par unité de hauteur (monde)
    e = 1.0 / PU                 # un pixel, en unités du plan

    # ---------- sol --------------------------------------------------------
    u = ((np.arange(N, dtype=np.float32) + 0.5) / N - 0.5) * 80
    v = (0.5 - (np.arange(N, dtype=np.float32) + 0.5) / N) * 80 * SQ3
    U = np.broadcast_to(u[None, :], (N, N))
    V = np.broadcast_to(v[:, None], (N, N))
    X = (U + V) / S2
    Z = (V - U) / S2
    amp = 0.1 * TUILE
    XJ = X + amp * bruit(N, 1.2 * TUILE * PU, seed + 11) + 0.4 * amp * bruit(N, 0.25 * TUILE * PU, seed + 12)
    ZJ = Z + amp * bruit(N, 1.2 * TUILE * PU, seed + 13) + 0.4 * amp * bruit(N, 0.25 * TUILE * PU, seed + 14)
    I = np.clip(((XJ + EXT) / CELL).astype(np.int32), 0, p.n - 1)
    J = np.clip(((ZJ + EXT) / CELL).astype(np.int32), 0, p.n - 1)
    H = p.niv[I, J].astype(np.float32)
    M = p.mat[I, J].copy()
    hl = p.niv[np.maximum(I - 1, 0), J]
    hr = p.niv[I, np.maximum(J - 1, 0)]
    dl = hl < H - 0.05
    dr = hr < H - 0.05
    fx = (XJ + EXT) / CELL - I
    fz = (ZJ + EXT) / CELL - J
    OG = np.where(dl & ~dr, -1, np.where(dr & ~dl, 1, np.where(fx < fz, -1, 1))).astype(np.int8)
    # sur les bords en diagonale, les cellules alternent -x / -z : on prend l'orientation moyenne du bord
    # (pente lissée), sinon la paroi se couvre de bandes verticales claires et sombres d'une cellule
    from scipy.ndimage import gaussian_filter
    nb = gaussian_filter(p.niv.astype(np.float32), 1.6)
    gx = nb - np.roll(nb, 1, 0)
    gz = nb - np.roll(nb, 1, 1)
    og_lisse = np.where(gx >= gz, -1, 1).astype(np.int8)
    OG = np.where((dl | dr), og_lisse[I, J], OG).astype(np.int8)
    del hl, hr, dl, dr, fx, fz, XJ, ZJ, I, J
    p.fins(U, V, X, Z, H, M, N)
    for cu, cv, ax, az, axe, h0, h1 in p.marches:
        cx, cz = uv2xz(cu, cv)
        m = (np.abs(X - cx) <= ax) & (np.abs(Z - cz) <= az)
        OG[m] = -1 if axe == 'x' else 1
    log('sol')

    # ---------- projection ------------------------------------------------
    src = np.zeros((N, N), np.int32)
    dep = np.zeros((N, N), np.int32)
    voxel(H, K, src, dep)
    cols = np.broadcast_to(np.arange(N, dtype=np.int32)[None, :], (N, N))
    mat = M[src, cols]
    hsrc = H[src, cols]
    face = dep > 0
    dessus = ~face
    ori = OG[src, cols]
    del OG
    xs = X[src, cols]
    zs = Z[src, cols]
    log('projection')

    img = np.zeros((N, N, 3), np.uint8)
    T = dict(fm.TEX)
    t_ = T['terre'].copy()
    t_[np.all(t_ == fm.hx('#5f4848'), -1)] = fm.hx('#825e48')    # cailloux les plus sombres adoucis
    T['terre'] = t_
    herbeux_m = (mat == HERBE) | (mat == FLEURS) | (mat == DIGUE) | (mat == LYS)
    fleur = a_couleur('#dbc9b4', '#f79617', '#c3a79c', '#fb6b1d', '#9c807e', '#e83b3b')

    # ---------- herbe : fond du pack, touffes semées, taches claires et sombres --
    h_simple = semis(T['herbe1'], fm.hx('#808449'), lambda c: not fleur(c), densite=0.5, seed=seed)
    h_claire = semis(T['herbe1'], fm.hx('#808449'), lambda c: not fleur(c), densite=1.8, seed=seed + 5)
    h_sombre = semis(T['herbe2'], fm.hx('#6a6a46'), lambda c: not fleur(c), densite=0.6, seed=seed + 1)
    h_tres = semis(T['herbe3'], fm.hx('#52513d'), lambda c: not fleur(c), densite=0.5, seed=seed + 2)
    nh = bruit(N, 10 * PW, seed + 21) + 0.3 * bruit(N, 2.5 * PW, seed + 22) + 0.12 * bruit(N, 0.2 * PW, seed + 23)
    sel = dessus & ((mat == HERBE) | (mat == DIGUE) | (mat == LYS))
    img[sel] = tuile(h_simple, N)[sel]
    s2 = sel & (nh < -1.35)
    img[s2] = tuile(h_claire, N, 41, 77)[s2]
    s2 = sel & (nh > 1.35)
    img[s2] = tuile(h_sombre, N, 101, 57)[s2]
    s2 = sel & (nh > 2.3)
    img[s2] = tuile(h_tres, N, 13, 211)[s2]
    sel = dessus & (mat == FLEURS)
    img[sel] = tuile(T['herbe1'], N)[sel]
    s2 = sel & (nh > 1.2)
    img[s2] = tuile(T['herbe2'], N, 37, 11)[s2]
    del nh
    log('herbe')

    # ---------- terres, sable, cendres -------------------------------------
    sel = dessus & (mat == TERRE)
    img[sel] = tuile(T['terre'], N)[sel]
    sel = dessus & (mat == SABLE)
    sab = fm.recolorer(tuile(T['sable'], N), fm.pal('#9e8251', '#9c7b4f', '#98734c', '#b29f53', '#825e48'),
                       fm.pal('#c0af83', '#b8a57a', '#a78c61', '#dbc9b4', '#a78c61'))
    img[sel] = sab[sel]
    del sab
    terre_src = fm.pal('#98734c', '#9c7b4f', '#825e48', '#808449', '#5f4848')
    sel = dessus & (mat == CENDRE)
    if sel.any():
        img[sel] = fm.recolorer(tuile(T['terre'], N, 64, 32)[sel][None], terre_src,
                                fm.pal('#6c4c3f', '#725b53', '#53383a', '#5e6431', '#432b30'))[0]
    sel = dessus & (mat == VOLCAN)
    if sel.any():
        img[sel] = fm.recolorer(tuile(T['terre'], N, 128, 96)[sel][None], terre_src,
                                fm.pal('#53383a', '#613c3c', '#432b30', '#4c5c43', '#2c2133'))[0]
    sel = dessus & (mat == LAVE)
    if sel.any():
        nl = bruit(N, 0.25 * PW, seed + 51) + 0.5 * bruit(N, 0.08 * PW, seed + 52)
        lave = fm.pal('#8c3329', '#ab5124', '#ab7923', '#f79617')
        k = np.clip(((nl + 1.6) / 3.2 * 4).astype(int), 0, 3)
        img[sel] = lave[k[sel]]
        del nl
    log('sols')

    # ---------- dalles irrégulières (place du village, entrée du donjon) ----------
    rng_d = np.random.default_rng(seed + 71)
    autour = cv2.distanceTransform((~(dessus & np.isin(mat, (DALLE, PIERRE)))).astype(np.uint8), cv2.DIST_L2, 5) / PW
    for matiere, rampe, sol_dst in [
        (DALLE, None, None),
        (PIERRE, fm.RAMPE_VOLCAN, fm.pal('#6c4c3f', '#725b53', '#53383a', '#5e6431', '#432b30')),
    ]:
        sel = dessus & (mat == matiere)
        if not sel.any():
            continue
        fond = tuile(T['terre'], N, 17, 9)
        if sol_dst is not None:
            fond = fm.recolorer(fond, fm.pal('#98734c', '#9c7b4f', '#825e48', '#808449', '#5f4848'), sol_dst)
        img[sel] = fond[sel]
        del fond
        dedans = cv2.distanceTransform(sel.astype(np.uint8), cv2.DIST_L2, 5) / PW
        dens = np.clip(0.35 + dedans / 1.2, 0, 0.97).astype(np.float32)
        # quelques dalles éparses sur la terre autour de la place
        bord = dessus & (mat == TERRE) & (autour < 1.5) & (hsrc == hsrc[sel].max())
        dens[bord] = np.clip(0.3 - autour[bord] / 5, 0, 1)
        zone = sel | bord
        dens[~zone] = 0
        ys, xs_ = np.nonzero(zone)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs_.min(), xs_.max() + 1
        pv, pose = pavage_fm(dens[y0:y1, x0:x1], rng_d)
        if rampe is not None:
            pv = fm.recolorer(pv, fm.RAMPE_SABLE, rampe)
        pose &= zone[y0:y1, x0:x1]
        ib = img[y0:y1, x0:x1]
        ib[pose] = pv[pose]
        del dedans, dens, zone, pv, pose
    del autour
    sel = dessus & (mat == MARCHE)
    img[sel] = fm.hx('#c0af83')
    # ---------- jardin de sable ratissé ------------------------------------
    sel = dessus & (mat == SPIRALE)
    if sel.any():
        cx, cz = p.zones['spirale']
        dx, dz = xs[sel] - cx, zs[sel] - cz
        r = np.hypot(dx, dz)
        th = np.arctan2(dz, dx)
        pas = 0.42
        f = ((r - pas * th / (2 * np.pi)) / pas) % 1
        c = np.where((f < 0.12)[:, None], fm.hx('#a78c61'), fm.hx('#dbc9b4'))
        c = np.where(((f >= 0.12) & (f < 0.22))[:, None], fm.hx('#c0af83'), c)
        img[sel] = c
    log('dallages')

    # ---------- eau ----------------------------------------------------------
    eau = dessus & (mat == EAU)
    sol_eau = M == EAU
    dist = cv2.distanceTransform(sol_eau.astype(np.uint8), cv2.DIST_L2, 5) / PW
    dimg = dist[src, cols]
    del dist
    wat = tuile(T['eau'], N)
    prof = (dimg > 7).astype(np.int8) + (dimg > 18) + (dimg > 32)
    prof = np.where(dimg < 1.0, -1, prof)
    for k in (-1, 1, 2, 3):
        m = eau & (prof == k)
        if m.any():
            img[m] = fm.decaler(wat[m][None], fm.RAMPE_EAU, min(k, 2))[0]
    m = eau & (prof == 0)
    img[m] = wat[m]
    del prof, dimg
    sel = dessus & (mat == RIZ)
    if sel.any():
        # eau de rizière : calme, un ton plus clair et plus vert, seuls les reflets du pack restent
        w_ = fm.indexer(wat[sel][None], fm.RAMPE_EAU)[0]
        img[sel] = np.where((w_ <= 1)[:, None], fm.hx('#7fb7bd'), fm.hx('#6ba2af'))
    del wat
    log('eau')

    # ---------- parois : gros rochers du pack Resurrected, teintés selon le terrain ----------
    paroi, levre_rr = fm.paroi_rr(seed)
    ph_, pw_ = paroi.shape[:2]
    # rangs de rochers alignés sur l'écran (comme les murs du pack), décalés selon la hauteur du plateau
    lignes = np.arange(N, dtype=np.int32)[:, None] + (hsrc * K * 0.61).astype(np.int32)
    pr = paroi[lignes % ph_, cols % pw_]
    del lignes
    droite = face & (ori > 0)
    pr[droite] = fm.decaler(pr[droite][None], fm.RAMPE_RR, 1)[0]
    img[face] = pr[face]
    del pr
    teintes = [(VOLCAN, fm.RAMPE_RR_VOLCAN), (CENDRE, fm.RAMPE_RR_VOLCAN), (SABLE, fm.RAMPE_RR_SABLE)]
    for matiere, rampe in teintes:
        sel = face & (mat == matiere)
        if sel.any():
            img[sel] = fm.recolorer(img[sel][None], fm.RAMPE_RR, rampe)[0]
    sel = face & (mat == DIGUE)
    if sel.any():
        img[sel] = np.where((dep[sel] <= 1)[:, None], fm.hx('#6a6a46'), fm.hx('#825e48'))
    sel = face & (mat == MARCHE)
    if sel.any():
        c = np.where((ori[sel] > 0)[:, None], fm.hx('#805147'), fm.hx('#936d53'))
        c = np.where((dep[sel] == 2)[:, None], fm.hx('#a78c61'), c)
        c = np.where((dep[sel] <= 1)[:, None], fm.hx('#dbc9b4'), c)
        img[sel] = c
    # cascade (et coulée de lave) : bandeau du pack, lèvre / filets étirés / écume
    casc = face & ((mat == EAU) | (mat == LAVE))
    if casc.any():
        W = fm.WT[:, 352:544, :3]
        d = dep[casc]
        hf = np.maximum(hsrc[casc] * K, 30)
        levre, pied_ = 12, 12
        ligne = np.where(d < levre, 744 + d,
                         np.where(d > hf - pied_, 786 + np.minimum(d - (hf - pied_), 11),
                                  756 + ((d - levre) / np.maximum(hf - levre - pied_, 1) * 30).astype(int)))
        img[casc] = W[ligne.astype(int), cols[casc] % 192]
        cl = face & (mat == LAVE)
        if cl.any():
            img[cl] = fm.recolorer(img[cl][None], fm.RAMPE_EAU, fm.RAMPE_LAVE)[0]
    log('parois')

    # ---------- pied des parois : rochers sombres dans l'eau, écume sous la chute --
    sous = T['sous']
    hs = sous.shape[0]
    casc_eau = casc & (mat == EAU)
    deja = np.zeros((N, N), bool)
    ecume = np.zeros((N, N), bool)
    ombre_eau = np.zeros((N, N), bool)
    for k in range(1, hs + 14):
        au_dessus = np.zeros((N, N), bool)
        au_dessus[k:] = face[:-k] & ~deja[k:]
        cc = np.zeros((N, N), bool)
        cc[k:] = casc_eau[:-k]
        m = au_dessus & eau & ~cc
        if k <= hs:
            if m.any():
                img[m] = sous[k - 1][cols[m] % 192]
        else:
            ombre_eau |= m
        ecume |= au_dessus & eau & cc & (k <= 10)
        deja |= au_dessus & eau
    img[ombre_eau] = fm.decaler(img[ombre_eau][None], fm.RAMPE_EAU, 1)[0]
    img[ecume] = fm.hx('#a9d3d3')
    img[ecume & (bruit(N, 0.15 * PW, seed + 61) > 0.3)] = fm.hx('#7fb7bd')
    plage = (mat == SABLE)
    pres = ndi.binary_dilation(plage, iterations=2) & eau & ~plage
    img[pres] = fm.hx('#7fb7bd')
    pres1 = ndi.binary_dilation(plage, iterations=1) & eau & ~plage
    img[pres1] = fm.hx('#a9d3d3')
    del deja, ecume, ombre_eau
    terre_basse = dessus & (mat != EAU) & (mat != SABLE) & (mat != RIZ)
    r1 = ndi.binary_dilation(terre_basse, iterations=1) & eau & ~casc
    r2 = ndi.binary_dilation(terre_basse, iterations=3) & eau & ~casc & ~r1
    img[r2] = np.where((fm.indexer(img[r2][None], fm.RAMPE_EAU)[0] >= 2)[:, None], fm.hx('#6ba2af'), img[r2])
    img[r1] = fm.hx('#a9d3d3')
    b1 = terre_basse & ndi.binary_dilation(eau & ~casc, iterations=1)
    img[b1] = assombrir(img[b1])
    b2 = terre_basse & ndi.binary_dilation(b1, iterations=1) & ~b1
    img[b2] = assombrir(img[b2], 0.9)
    del terre_basse, r1, r2, b1, b2
    log('pied des parois')

    # ---------- ombre portée au pied des parois (sur le sol plus bas) --------------
    nb_o = bruit(N, 0.12 * PW, seed + 81)
    long_ = np.clip(6 + 3 * nb_o, 2, 10).astype(np.int32)
    ombre = np.zeros((N, N), bool)
    for k in range(1, 11):
        m = np.zeros((N, N), bool)
        m[k:] = face[:-k]
        m &= dessus & (mat != EAU) & (mat != LAVE) & (k <= long_)
        ombre |= m
    img[ombre] = assombrir(img[ombre])
    del nb_o, long_, ombre
    log('ombres')

    # ---------- bords de chemins façon FM : liseré sombre côté terre, herbe qui déborde --
    terre = dessus & (mat == TERRE)
    herbe = dessus & herbeux_m
    # l'herbe, un peu plus haute, ombre la terre sous son bord (comme les chemins du pack)
    ombre_h = np.zeros((N, N), bool)
    for k in range(1, 4):
        ombre_h[k:] |= herbe[:-k]
    ombre_h &= terre
    img[ombre_h] = assombrir(img[ombre_h], 0.9)
    lis = terre & ndi.binary_dilation(herbe, iterations=1)
    img[lis] = fm.hx('#825e48')
    lis2 = herbe & ndi.binary_dilation(terre, iterations=1)
    img[lis2] = fm.hx('#6a6a46')
    vert = lambda c: not fleur(c) and (c[:, 1].astype(int) > c[:, 0].astype(int) - 4).mean() > 0.6
    tf = touffes(T['herbe1'], fm.hx('#808449'), vert)
    tf = [t for t in tf if 3 <= t[1].shape[0] <= 7 and 3 <= t[1].shape[1] <= 9]
    rng = np.random.default_rng(seed + 9)
    bord = np.argwhere(lis)
    if len(bord):
        for (y, x) in bord[rng.random(len(bord)) < 0.04]:
            t, m = tf[rng.integers(len(tf))]
            h_, w_ = m.shape
            y0, x0 = y - h_ // 2, x - w_ // 2
            if y0 < 0 or x0 < 0 or y0 + h_ >= N or x0 + w_ >= N:
                continue
            blk = img[y0:y0 + h_, x0:x0 + w_]
            ok = m & dessus[y0:y0 + h_, x0:x0 + w_]
            blk[ok] = t[ok]
    sable = dessus & (mat == SABLE)
    lis3 = sable & ndi.binary_dilation(herbe, iterations=1)
    img[lis3] = fm.hx('#a78c61')
    del terre, herbe, lis, lis2, lis3
    log('bords')

    # ---------- lèvre : les sommets des rochers dépassent du bord des falaises ----------
    rocheux = face & ~np.isin(mat, (DIGUE, MARCHE, EAU, LAVE, RIZ)) & (dep == 1)
    for k in range(1, levre_rr.shape[0] + 1):
        m = np.zeros((N, N), bool)
        m[:-k] = rocheux[k:]
        m &= dessus & ~np.isin(mat, (EAU, LAVE))
        ys, xs_ = np.nonzero(m)
        if not len(ys):
            continue
        lv = levre_rr[levre_rr.shape[0] - k, xs_ % pw_]
        ok = lv[:, 3] > 0
        ys, xs_, c = ys[ok], xs_[ok], lv[ok, :3]
        mf = mat[ys + k, xs_]
        dr = ori[ys + k, xs_] > 0
        c[dr] = fm.decaler(c[dr][None], fm.RAMPE_RR, 1)[0]
        for matiere, rampe in teintes:
            q = mf == matiere
            if q.any():
                c[q] = fm.recolorer(c[q][None], fm.RAMPE_RR, rampe)[0]
        img[ys, xs_] = c
    # arête arrière des plateaux : le dessus haut, au bord du sol plus bas derrière lui
    dd = np.zeros((N, N), bool)
    dd[1:] = dessus[:-1] & (hsrc[:-1] < hsrc[1:] - 0.3)
    arr = dessus & dd & (mat != EAU)
    img[arr] = assombrir(img[arr])
    log('franges')

    # ---------- pont japonais et ponton (par-dessus le terrain) ----------------
    pont_h = np.full((N, N), -1.0, np.float32)            # hauteur du tablier là où un pont est dessiné
    for pt in p.ponts:
        avant = img.copy()
        pont_japonais(img, pt, N, K, eau, seed)
        pont_h[np.any(img != avant, -1)] = pt['h'] + (0.45 if pt['rampe'] else 0.0)
        del avant
    log('pont')

    # ---------- lys rouges (higanbana) : touffes de fleurs rouges sur tige nue ----------
    lysm = dessus & (mat == LYS)
    if lysm.any():
        lt, lm = higanbana()
        nl = bruit(N, 1.5 * PW, seed + 91)
        ys, xs_ = np.nonzero(lysm & (nl > -0.3))
        rng = np.random.default_rng(seed + 92)
        garde = rng.random(len(ys)) < 0.006
        for y, x in sorted(zip(ys[garde], xs_[garde])):
            t, m = (lt, lm) if rng.random() < 0.5 else (lt[:, ::-1], lm[:, ::-1])
            h_, w_ = m.shape
            y0, x0 = y - h_ + 1, x - w_ // 2
            if y0 < 0 or x0 < 0 or x0 + w_ >= N:
                continue
            blk = img[y0:y0 + h_, x0:x0 + w_]
            ok = m & lysm[y0:y0 + h_, x0:x0 + w_]
            blk[ok] = t[ok]
    log('lys')

    # ---------- pousses de riz : touffes du pack plantées en rangs -----------
    riz = dessus & (mat == RIZ)
    if riz.any():
        pr_t, pr_m = pousse_riz()
        tf = [(pr_t, pr_m), (pr_t[:, ::-1], pr_m[:, ::-1])]
        pa, pb = 0.5 / S, 0.75 / S                  # le long des rangs, entre les rangs
        pts = []
        ri = np.argwhere(p.mat == RIZ)
        x_ = p.X[ri[:, 0], 0]
        z_ = p.Z[0, ri[:, 1]]
        for i, b in enumerate(np.arange(z_.min(), z_.max(), pb)):
            for a in np.arange(x_.min() + (i % 2) * pa / 2, x_.max(), pa):
                ci = int((a + EXT) / CELL)
                cj = int((b + EXT) / CELL)
                if p.mat[ci, cj] == RIZ:
                    px_, py_ = proj(a, b, float(p.niv[ci, cj]), N, K)
                    pts.append((py_, px_))
        pts.sort()                                   # d'arrière en avant
        rng = np.random.default_rng(seed + 3)
        for yf, xf in pts:
            y, x = int(round(yf)), int(round(xf))
            if not (0 <= y < N and 0 <= x < N) or not riz[y, x]:
                continue
            t, m = tf[rng.integers(len(tf))]
            h_, w_ = m.shape
            y0, x0 = y - h_ + 1, x - w_ // 2
            if y0 < 0 or x0 < 0 or x0 + w_ >= N:
                continue
            blk = img[y0:y0 + h_, x0:x0 + w_]
            ok = m & riz[y0:y0 + h_, x0:x0 + w_]
            blk[ok] = t[ok]
    log('riz')
    if geo is not None:
        geo.update(face=face, ori=ori, dep=dep, hsrc=hsrc, mat=mat, casc=casc, pont_h=pont_h, K=K, N=N, plan=p)
    return img


def proj(x, z, h, N, K):
    """(x, z) en unités du plan, h en unités du monde → pixel de l'image."""
    u, v = xz2uv(x, z)
    return (u / 80 + 0.5) * N, (0.5 - v / (80 * SQ3)) * N - h * K


def higanbana():
    """Un lys rouge (higanbana) : une couronne de pétales fins au bout d'une tige nue."""
    R, r, D, T = fm.pal('#e83b3b', '#a04625', '#8c3329', '#5e6431')
    motif = ['R.r.R',
             '.RDR.',
             'rDRDr',
             '.R.R.',
             '..T..',
             '..T..',
             '..T..']
    h, w = len(motif), len(motif[0])
    t = np.zeros((h, w, 3), np.uint8)
    m = np.zeros((h, w), bool)
    for y, ligne in enumerate(motif):
        for x, c in enumerate(ligne):
            if c != '.':
                t[y, x] = {'R': R, 'r': r, 'D': D, 'T': T}[c]
                m[y, x] = True
    return t, m


def pont_japonais(img, pt, N, K, eau, seed):
    """Pont de bois légèrement cintré (ou ponton plat) : planches posées une à une, poutre de rive,
    pieux dans l'eau, garde-corps avec des giboshi (pommeaux de bronze) aux extrémités."""
    cx, cz = pt['c']
    arche = pt['rampe']
    if pt['axe'] == 'z':
        L, W = pt['az'], pt['ax']
        pos = lambda t, w: (cx + w, cz + t)
    else:
        L, W = pt['ax'], pt['az']
        pos = lambda t, w: (cx + t, cz + w)
    h0 = pt['h']
    A = 0.85 if arche else 0.0
    haut = lambda t: h0 + A * (1 - (t / L) ** 2)
    P = lambda t, w, h: tuple(int(round(c)) for c in proj(*pos(t, w), h, N, K))
    col = lambda h: tuple(int(c) for c in fm.hx(h))
    rng = np.random.default_rng(seed + 17)

    # ombre sur l'eau
    ombre = np.zeros(img.shape[:2], np.uint8)
    ts = np.linspace(-L, L, 24)
    poly = [P(t, -W, 0.05) for t in ts] + [P(t, W, 0.05) for t in ts[::-1]]
    cv2.fillPoly(ombre, [np.array(poly, np.int32) + np.array([int(0.25 * K), int(0.1 * K)])], 1)
    ob = (ombre > 0) & eau
    img[ob] = assombrir(img[ob])

    # pieux (sous le tablier)
    bois_s, bois, bois_c, noir = col('#432b30'), col('#603f36'), col('#865e51'), col('#2c2133')
    pieux = [-0.45 * L, 0.45 * L] if arche else list(np.linspace(-L + 0.4, L - 0.4, max(2, int(2 * L * S / 2.0))))
    for t in sorted(pieux, reverse=True):
        for w in (W - 0.25, -W + 0.25):
            a, b = P(t, w, -0.4), P(t, w, haut(t) - 0.1)
            cv2.rectangle(img, (a[0] - 2, b[1]), (a[0] + 2, a[1]), bois_s, -1)
            cv2.line(img, (a[0] - 2, b[1]), (a[0] - 2, a[1]), bois, 1)

    # planches, de la plus lointaine à la plus proche
    ep = 0.36 / S
    n = max(4, int(2 * L / ep))
    bords = np.linspace(-L, L, n + 1)
    loin = 1 if (pt['axe'] == 'z' or pt['axe'] == 'x') else -1      # +t s'éloigne de la caméra (v croît)
    tons = [col('#a57660'), col('#9c7b4f'), col('#865e51'), col('#a57660')]
    for i in (range(n - 1, -1, -1) if loin > 0 else range(n)):
        t0, t1 = bords[i], bords[i + 1]
        h = haut((t0 + t1) / 2)
        q = np.array([P(t0, -W, h), P(t1, -W, h), P(t1, W, h), P(t0, W, h)], np.int32)
        cv2.fillConvexPoly(img, q, tons[int(rng.integers(0, len(tons)))])
        cv2.line(img, tuple(q[1]), tuple(q[2]), col('#c3a79c'), 1)        # arête lointaine éclairée
        cv2.line(img, tuple(q[0]), tuple(q[3]), col('#6b4a47'), 1)        # joint côté caméra
    # poutre de rive visible (côté -x ou -z, tourné vers la caméra)
    for i in range(n - 1, -1, -1):
        t0, t1 = bords[i], bords[i + 1]
        q = np.array([P(t0, -W, haut(t0)), P(t1, -W, haut(t1)), P(t1, -W, haut(t1) - 0.32),
                      P(t0, -W, haut(t0) - 0.32)], np.int32)
        cv2.fillConvexPoly(img, q, bois)
        cv2.line(img, tuple(q[0]), tuple(q[1]), bois_c, 1)
        cv2.line(img, tuple(q[3]), tuple(q[2]), bois_s, 1)
    # bout du tablier côté caméra
    t = -L
    q = np.array([P(t, -W, haut(t)), P(t, W, haut(t)), P(t, W, haut(t) - 0.32), P(t, -W, haut(t) - 0.32)], np.int32)
    cv2.fillConvexPoly(img, q, bois_s)

    def poteau(t, w, hh, pommeau=False):
        a, b = P(t, w, haut(t)), P(t, w, haut(t) + hh)
        cv2.rectangle(img, (a[0] - 2, b[1]), (a[0] + 2, a[1]), bois, -1)
        cv2.line(img, (a[0] - 2, b[1]), (a[0] - 2, a[1]), bois_c, 1)
        cv2.line(img, (a[0] + 2, b[1]), (a[0] + 2, a[1]), bois_s, 1)
        if pommeau:                                   # giboshi : petit bulbe de bronze
            x, y = b
            cv2.rectangle(img, (x - 3, y - 2), (x + 3, y), col('#8e5829'), -1)
            cv2.circle(img, (x, y - 4), 3, col('#8e5829'), -1)
            cv2.line(img, (x, y - 9), (x, y - 7), col('#8e5829'), 1)
            cv2.line(img, (x - 2, y - 5), (x - 1, y - 6), col('#ab7923'), 1)

    def lisse(w, hh, ep_):
        pts = [P(t, w, haut(t) + hh) for t in np.linspace(-L + 0.15, L - 0.15, 20)]
        for a, b in zip(pts[:-1], pts[1:]):
            cv2.line(img, a, b, bois, ep_)
        for a, b in zip(pts[:-1], pts[1:]):
            cv2.line(img, (a[0], a[1] - ep_ // 2), (b[0], b[1] - ep_ // 2), bois_c, 1)

    if arche:
        tp = np.linspace(-L + 0.15, L - 0.15, max(3, int(2 * L * S / 1.6) + 1))
        for w in (W - 0.12, -W + 0.12):               # côté loin d'abord
            for k, t in enumerate(tp):
                poteau(t, w, 1.0, pommeau=(k == 0 or k == len(tp) - 1))
            lisse(w, 0.92, 3)
            lisse(w, 0.48, 2)
    else:
        # ponton : bornes d'amarrage avec un tour de corde
        for t in (-L + 0.3, -L * 0.2):
            for w in (W - 0.15, -W + 0.15):
                poteau(t, w, 0.55)
                a = P(t, w, haut(t) + 0.3)
                cv2.line(img, (a[0] - 3, a[1]), (a[0] + 3, a[1] + 1), col('#c0af83'), 2)


def charpente(img, p, N, K):
    """Poteaux, garde-corps et pieux en bois, avec le liseré sombre des clôtures du pack."""
    lw, rw = 4, 3
    noir = tuple(int(c) for c in fm.hx('#2c2133'))
    bois = tuple(int(c) for c in fm.hx('#865e51'))
    clair = tuple(int(c) for c in fm.hx('#a57660'))
    sombre = tuple(int(c) for c in fm.hx('#603f36'))

    def poteau(x, z, h0, h1, coul):
        a = proj(x, z, h0, N, K)
        b = proj(x, z, h1, N, K)
        x0 = int(round(a[0] - lw / 2))
        cv2.rectangle(img, (x0 - 1, int(b[1]) - 1), (x0 + lw, int(a[1]) + 1), noir, -1)
        cv2.rectangle(img, (x0, int(b[1])), (x0 + lw - 1, int(a[1])), coul, -1)
        cv2.line(img, (x0, int(b[1])), (x0, int(a[1])), clair, 1)

    def lisse(p0, p1, h):
        a = tuple(int(round(c)) for c in proj(*p0, h, N, K))
        b = tuple(int(round(c)) for c in proj(*p1, h, N, K))
        cv2.line(img, a, b, noir, rw + 2)
        cv2.line(img, a, b, bois, rw)
        cv2.line(img, (a[0], a[1] - 1), (b[0], b[1] - 1), clair, 1)

    for pt in p.ponts:
        cx, cz = pt['c']
        h = pt['h']
        if pt['axe'] == 'z':
            L, W = pt['az'], pt['ax']
            pos = lambda t, cote: (cx + cote * W, cz + t)
        else:
            L, W = pt['ax'], pt['az']
            pos = lambda t, cote: (cx + t, cz + cote * W)
        if pt['rampe']:
            hr = h + 0.9
            ts = np.linspace(-L + 0.1, L - 0.1, max(2, int(2 * L * S / 1.8) + 1))
            for cote in (1, -1):                      # côté loin d'abord
                for t in ts:
                    poteau(*pos(t, cote), h, hr + 0.08, bois)
                lisse(pos(ts[0], cote), pos(ts[-1], cote), hr)
                lisse(pos(ts[0], cote), pos(ts[-1], cote), h + 0.45)
        else:
            ts = np.linspace(-L + 0.15, L - 0.15, max(2, int(2 * L * S / 2.2) + 1))
            for t in ts:
                poteau(*pos(t, -1), -0.2, h + 0.45, sombre)
            for t in ts[::2]:
                poteau(*pos(t, 1), h, h + 0.45, bois)


if __name__ == '__main__':
    N = int(sys.argv[1]) if len(sys.argv) > 1 else 2112
    out = sys.argv[2] if len(sys.argv) > 2 else f'ile-{N}.png'
    img = rendre(N)
    Image.fromarray(img).save(out)
    print('ok', out)
