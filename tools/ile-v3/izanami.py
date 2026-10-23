"""Le Palais d'Izanami (arenes.py, arène `palais`) : les décors dessinés pour lui, au style des packs.

Le doc de design validé par Meven (23/10/2026) : le fond de l'arène est le côté de la mort (le palais pourri : laque
noire, tatamis moisis, stores déchirés, l'irori au feu violet froid et sa marmite, le yomotsu-hegui), le devant est le
côté de la fuite (la roche nue de la pente de Yomotsu Hirasaka, les vignes sauvages et les pousses de bambou
qu'Izanagi jeta derrière lui). Huit taiko de bronze vert-de-gris autour, qui s'allument d'éclairs blancs pendant la
colère d'Izanami. Les pêchers sont la seule lumière chaude.

Chaque sprite est (RGBA, (x, y) du pied dans le sprite, ombre), comme ceux de decor.py."""
import cv2
import numpy as np
from PIL import Image

import decor
import fm
from decor import K, PW, Toile, c

R2 = np.sqrt(2)


def _uni(coul):
    return lambda s, t: np.tile(np.array(coul, np.uint8), (len(s), 1))


def _pied(img):
    ys, xs = np.nonzero(img[..., 3] > 0)
    return int(round(xs.mean())), int(ys.max())


# ============================ taiko ==========================================
def taiko(allume=False, e=1.4):
    """Un ō-daiko de bronze vert-de-gris sur son support de laque : le fût bombé, la peau tournée vers la caméra, les
    clous du bord. Allumé : la peau et les arêtes du bronze prennent l'éclair blanc bleuté de la colère.
    `e` : l'échelle du dessin (1 : 48 px de large)."""
    def q(v):
        return int(round(v * e))

    def pt(x, y):
        return q(x), q(y)
    W, H = q(48), q(64)
    img = np.zeros((H, W, 4), np.uint8)
    cx, cy = 24, 31
    laque, laque_c = c('#2c2133'), c('#613c3c')
    # le support : deux pieds en X et une traverse
    for a, b in [((10, 60), (30, 34)), ((38, 60), (18, 34))]:
        cv2.line(img, pt(*a), pt(*b), laque_c, q(4))
        cv2.line(img, pt(a[0], a[1] - 1.5), pt(b[0], b[1] - 1.5), c('#8c3329'), 1)
    cv2.line(img, pt(8, 60), pt(40, 60), laque, q(3))
    cv2.line(img, pt(8, 58.5), pt(40, 58.5), laque_c, 1)
    # le fût
    if allume:
        corps, ombre, clair, rouille = c('#6fa598'), c('#3e6b5e'), c('#d9f0ff'), c('#9fd0c0')
        peau, peau_o, clou = c('#f4f8ff'), c('#c6d6f0'), c('#ffffff')
    else:
        corps, ombre, clair, rouille = c('#3e6b5e'), c('#2b4441'), c('#5f8f7a'), c('#7fb09a')
        peau, peau_o, clou = c('#b9b29a'), c('#8f8676'), c('#8fb8a0')
    cv2.ellipse(img, pt(cx + 2, cy), pt(16, 15), 0, 0, 360, ombre, -1)
    cv2.ellipse(img, pt(cx, cy), pt(15, 15), 0, 0, 360, corps, -1)
    cv2.ellipse(img, pt(cx + 4, cy), pt(11, 14), 0, -70, 70, ombre, -1)
    for dy in (-9, 9):                                                       # cerclages
        cv2.ellipse(img, pt(cx, cy + dy), pt(14, 3), 0, 0, 180, clair, 1)
    for x, y in [(cx - 2, cy - 4), (cx + 5, cy + 3), (cx - 6, cy + 6), (cx + 1, cy - 11)]:
        X, Y = pt(x, y)
        img[Y:Y + q(2), X:X + q(3)] = rouille
    # la peau, tournée vers la gauche (la caméra regarde le coin -x -z)
    cv2.ellipse(img, pt(cx - 8, cy), pt(8, 14), 0, 0, 360, peau_o, -1)
    cv2.ellipse(img, pt(cx - 9, cy), pt(7, 13), 0, 0, 360, peau, -1)
    for k in range(14):
        th = k / 14 * 2 * np.pi
        X, Y = pt(cx - 8.5 + 7.2 * np.cos(th), cy + 13.2 * np.sin(th))
        img[Y, X] = clou
    # le tomoe peint, presque effacé
    cv2.ellipse(img, pt(cx - 9, cy), pt(3, 6), 0, 0, 360, peau_o if not allume else c('#a8c4ff'), 1)
    if allume:                                                               # éclairs le long du fût
        for pts in [[(cx + 13, cy - 13), (cx + 17, cy - 19), (cx + 15, cy - 22), (cx + 20, cy - 28)],
                    [(cx - 14, cy - 12), (cx - 18, cy - 18), (cx - 15, cy - 21), (cx - 19, cy - 26)]]:
            for a, b in zip(pts, pts[1:]):
                cv2.line(img, pt(*a), pt(*b), c('#eef4ff'), 1)
    return img, pt(24, 60), None


# ============================ irori ==========================================
def irori():
    """L'irori : le foyer creusé dans le plancher, son cadre de bois noir, la cendre, le feu violet froid, et la
    marmite du yomotsu-hegui pendue au crochet (jizaikagi)."""
    T = Toile(110, 150, 55, 125)
    bois, bois_c, cendre, braise = c('#2c2133'), c('#53383a'), c('#6b6370'), c('#5a3f86')
    d, e = 0.75, 0.55
    T.plan((-d, -d, 0.06), (2 * d, 0, 0), (0, 2 * d, 0), _uni(bois))
    T.plan((-d, -d, 0.0), (2 * d, 0, 0), (0, 0, 0.06), _uni(bois_c))
    T.plan((-d, -d, 0.0), (0, 2 * d, 0), (0, 0, 0.06), _uni(c('#432b30')))

    def cendres(s, t):
        rng = np.random.default_rng(3)
        out = np.tile(np.array(cendre, np.uint8), (len(s), 1))
        r = np.hypot(s - 0.5, t - 0.5)
        out[r < 0.22] = braise
        out[(r >= 0.22) & (r < 0.3) & ((s * 13 + t * 7).astype(int) % 3 == 0)] = c('#4d4753')
        return out
    T.plan((-e, -e, 0.061), (2 * e, 0, 0), (0, 2 * e, 0), cendres)
    img = T.img
    fx, fy = (int(round(v)) for v in T.p(0, 0, 0.06))
    # flammes violettes, froides : trois langues qui montent, le cœur presque blanc
    for coul, ech in [(c('#4a2f78'), 1.0), (c('#7a5aa8'), 0.78), (c('#a98bd8'), 0.55), (c('#e0d4ff'), 0.3)]:
        for dx, hh in [(-7, 26), (0, 34), (7, 22)]:
            h = int(hh * ech)
            w = int(6 * ech) + 1
            pts = np.array([[fx + dx - w, fy], [fx + dx + w, fy], [fx + dx + int(2 * ech), fy - h]], np.int32)
            cv2.fillConvexPoly(img, pts, coul)
    # le crochet et la marmite
    top = T.p(0, 0, 3.0)
    bas = T.p(0, 0, 1.45)
    cv2.line(img, (int(top[0]), int(top[1])), (int(bas[0]), int(bas[1])), c('#6b4a47'), 2)
    py = int(round(bas[1]))
    cv2.line(img, (fx - 8, py - 6), (fx + 8, py - 9), c('#432b30'), 3)               # le poisson de bois
    cv2.ellipse(img, (fx, py + 9), (11, 9), 0, 0, 360, c('#1e1724'), -1)
    cv2.ellipse(img, (fx, py + 2), (11, 3), 0, 0, 360, c('#4d4753'), -1)
    cv2.ellipse(img, (fx, py + 2), (9, 2), 0, 0, 360, c('#5a3f86'), -1)              # ce qui bout dedans
    cv2.line(img, (fx - 11, py + 2), (fx - 8, py - 2), c('#2c2133'), 1)
    cv2.line(img, (fx + 11, py + 2), (fx + 8, py - 2), c('#2c2133'), 1)
    cv2.ellipse(img, (fx - 3, py + 7), (4, 3), 0, 180, 270, c('#4d4753'), 1)
    for k, (dx, dy) in enumerate([(-3, -6), (1, -11), (-2, -16), (2, -21)]):           # vapeur grise
        cv2.circle(img, (fx + dx, py + dy), 2 if k < 2 else 1, c('#8f8a96'), -1)
    return T.rogner() + (None,)


# ============================ stores et piliers ==============================
def _pilier(T, x, z, h, coul, face, ecl=None, seed=0):
    d = 0.14
    T.plan((x - d, z + d, 0), (0, -2 * d, 0), (0, 0, h), _uni(coul))
    T.plan((x - d, z - d, 0), (2 * d, 0, 0), (0, 0, h), _uni(face))
    T.plan((x - d, z - d, h), (2 * d, 0, 0), (0, 2 * d, 0), _uni(c('#4d4753')))
    if ecl is not None:                                                     # laque rouge écaillée
        rng = np.random.default_rng(seed)
        for _ in range(5):
            hh = rng.uniform(0.2, h - 0.2)
            px, py = (int(round(v)) for v in T.p(x - d, z - d * rng.uniform(-0.8, 0.8), hh))
            T.img[py:py + 2, px - 1:px + 1] = ecl


def sudare(L=2.6, axe='x', seed=1):
    """Deux piliers de laque noire écaillée, la poutre, et un store de bambou (sudare) déchiré entre eux.
    `axe` : le long de x (monte vers la droite à l'écran) ou de z (vers la gauche)."""
    T = Toile(150, 170, 75, 140)
    H = 2.7
    rng = np.random.default_rng(seed)
    o = np.array((-L / 2, 0, 0)) if axe == 'x' else np.array((0, -L / 2, 0))
    ds = np.array((L, 0, 0)) if axe == 'x' else np.array((0, L, 0))
    noir, face, rouge = c('#1e1724'), c('#2c2133'), c('#8c3329')
    _pilier(T, *(o + ds * 0.02)[:2], H, noir, face, rouge, seed)
    # le store : lattes horizontales, le bas arraché par bandes ; un trou au milieu
    n = 22
    bas = np.clip(rng.uniform(0.35, 1.0, n), 0, 1)
    bas[rng.integers(0, n, 3)] = rng.uniform(0.05, 0.2, 3)

    def store(s, t):
        k = np.minimum((s * n).astype(int), n - 1)
        out = np.tile(np.array(c('#8a7a5a'), np.uint8), (len(s), 1))
        out[(t * 40) % 1 < 0.35] = c('#6e6048')
        out[(s * n) % 1 < 0.12] = c('#5a4c3a')
        out[t < 0.06] = c('#3d2f38')                                       # la bordure de tissu en haut
        out[t > bas[k] * 0.92] = (0, 0, 0, 0)
        return out
    T.plan(tuple(o + np.array((0, 0, H - 0.08))), tuple(ds), (0, 0, -(H - 0.4)), store)
    _pilier(T, *(o + ds * 0.98)[:2], H, noir, face, rouge, seed + 1)
    # la poutre
    p0 = o + np.array((0, 0, H))
    T.plan(tuple(p0 + (0, 0, 0.0)), tuple(ds), (0, 0, 0.16), _uni(face))
    T.ligne(tuple(p0 + (0, 0, 0.16)), tuple(p0 + ds + (0, 0, 0.16)), c('#4d4753'), 1)
    return T.rogner() + (None,)


def pilier_brise(seed=5):
    """Un pilier de laque cassé, le haut en dents."""
    T = Toile(50, 100, 25, 90)
    h = 1.5
    _pilier(T, 0, 0, h, c('#1e1724'), c('#2c2133'), c('#8c3329'), seed)
    x, y = (int(round(v)) for v in T.p(0, 0, h))
    pts = np.array([[x - 6, y - 1], [x - 3, y - 7], [x - 1, y - 2], [x + 2, y - 9], [x + 6, y - 1]], np.int32)
    cv2.fillPoly(T.img, [pts], c('#2c2133'))
    cv2.line(T.img, (x - 3, y - 7), (x + 2, y - 9), c('#53383a'), 1)
    return T.rogner() + (None,)


# ============================ os, bols, offrandes ============================
def os_(seed=0):
    """Un crâne et des os, au bord du plancher."""
    img = np.zeros((22, 34, 4), np.uint8)
    os1, os2, trou = c('#d8ccb4'), c('#a89c86'), c('#2c2133')
    rng = np.random.default_rng(seed)
    for _ in range(2):
        x0, y0 = int(rng.integers(3, 14)), int(rng.integers(13, 19))
        x1, y1 = x0 + int(rng.integers(12, 18)), y0 + int(rng.integers(-4, 3))
        cv2.line(img, (x0, y0), (x1, y1), os2, 2)
        cv2.line(img, (x0, y0 - 1), (x1, y1 - 1), os1, 1)
        for x, y in [(x0, y0), (x1, y1)]:
            cv2.circle(img, (x, y), 2, os1, -1)
    cx, cy = 22, 11
    cv2.ellipse(img, (cx, cy), (6, 5), 0, 0, 360, os2, -1)
    cv2.ellipse(img, (cx - 1, cy - 1), (5, 4), 0, 0, 360, os1, -1)
    cv2.rectangle(img, (cx - 3, cy + 3), (cx + 2, cy + 6), os1, -1)
    img[cy:cy + 2, cx - 4:cx - 2] = trou
    img[cy:cy + 2, cx:cx + 2] = trou
    img[cy + 5, cx - 2:cx + 2:2] = trou
    return img, (17, 20), None


def bol():
    """Un bol de laque rouge renversé, écaillé, et le plateau d'offrande couché."""
    img = np.zeros((20, 34, 4), np.uint8)
    cv2.ellipse(img, (10, 13), (8, 4), 0, 0, 360, c('#432b30'), -1)       # plateau couché
    cv2.ellipse(img, (10, 12), (8, 4), 0, 0, 360, c('#613c3c'), -1)
    cv2.ellipse(img, (23, 14), (8, 3), 0, 0, 360, c('#613c3c'), -1)
    cv2.ellipse(img, (23, 13), (7, 7), 0, 180, 360, c('#a04625'), -1)     # le bol, retourné
    cv2.ellipse(img, (21, 9), (3, 2), 0, 180, 360, c('#c25a35'), -1)
    img[10:12, 26:28] = c('#2c2133')                                     # l'écaille
    img[8, 19:21] = c('#2c2133')
    cv2.circle(img, (4, 16), 1, c('#d8ccb4'), -1)                        # grains de riz épars
    cv2.circle(img, (31, 17), 1, c('#d8ccb4'), -1)
    return img, (17, 17), None


# ============================ la fuite d'Izanagi =============================
def raisins(i=0):
    """Une vigne sauvage (ebikazura) : un buisson des packs reteint vert sombre, les grappes violettes."""
    src = np.array(Image.open(fm.FM + 'Props.png').convert('RGBA'))
    x, y, w, h = [(647, 51, 54, 45), (576, 66, 32, 30)][i]
    b = src[y:y + h, x:x + w].copy()
    b[b[..., 3] < 128] = 0
    b = decor.teindre(b, ['#6a7a44', '#4f6238', '#3c4c2f', '#2c3826', '#1f281e'], garder=set())
    rng = np.random.default_rng(11 + i)
    ys, xs = np.nonzero(b[..., 3] > 0)
    for _ in range(4 if i == 0 else 2):
        k = rng.integers(len(xs))
        gx, gy = int(xs[k]), int(ys[k])
        if gy > h - 8:
            gy = h - 8
        for dx, dy, col in [(0, 0, '#6b4f8f'), (2, 0, '#4d3a6b'), (1, 2, '#4d3a6b'), (-1, 2, '#6b4f8f'),
                            (1, 4, '#3a2a52'), (0, -1, '#8a70b0')]:
            if 0 <= gy + dy < h and 0 <= gx + dx < w:
                b[gy + dy, gx + dx] = c(col)
    return b, _pied(b), None


def takenoko(seed=0):
    """Des pousses de bambou sorties de la roche : des cônes de gaines brunes, la pointe verte."""
    img = np.zeros((30, 34, 4), np.uint8)
    rng = np.random.default_rng(seed)
    for x, hh in [(9, 22), (19, 15), (27, 10)][:2 + (seed % 2)]:
        b = 27
        w = max(3, hh // 4)
        pts = np.array([[x - w, b], [x + w, b], [x, b - hh]], np.int32)
        cv2.fillConvexPoly(img, pts, c('#9c7b4f'))
        cv2.fillConvexPoly(img, np.array([[x, b], [x + w, b], [x, b - hh]], np.int32), c('#6c4c3f'))
        for k in range(1, 4):
            yy = b - hh * k // 4
            ww = int(w * (1 - k / 4))
            cv2.line(img, (x - ww, yy), (x + ww, yy + 1), c('#53383a'), 1)
        img[b - hh:b - hh + 3, x:x + 1] = c('#808449')
    return img, (17, 27), None


# ============================ les pêchers ====================================
def pechers():
    """Les trois pêchers d'Izanagi en pixel art : un petit arbre des packs, le feuillage vert tendre et ses pêches ; et
    le même nu, une fois la pêche jetée, ses branches à vif."""
    src = np.array(Image.open(fm.FM + 'Props.png').convert('RGBA'))
    t = src[330:403, 256:315].copy()
    t[t[..., 3] < 128] = 0
    tronc = {'#432b30', '#53383a', '#6b4a47'}
    vert = decor.teindre(t, ['#b6c46a', '#93a956', '#6f8a45', '#4f6a39'], garder=tronc)
    hexa = np.array(['#%02x%02x%02x' % tuple(p[:3]) for p in t.reshape(-1, 4)]).reshape(t.shape[:2])
    feuil = (t[..., 3] > 0) & ~np.isin(hexa, list(tronc))
    rng = np.random.default_rng(8)
    ys, xs = np.nonzero(feuil)
    mur = vert.copy()
    poses = []
    for _ in range(400):
        if len(poses) >= 11:
            break
        k = rng.integers(len(xs))
        x, y = int(xs[k]), int(ys[k])
        if y > 50 or any(abs(x - a) + abs(y - b) < 7 for a, b in poses):
            continue
        poses.append((x, y))
        for dx, dy, col in [(0, 0, '#f0a890'), (1, 0, '#e8836f'), (0, 1, '#e8836f'), (1, 1, '#c8605a'),
                            (-1, 0, '#f6c2a4'), (0, -1, '#fbe0c8'), (-1, 1, '#f0a890'), (1, -1, '#f0a890')]:
            if feuil[y + dy, x + dx]:
                mur[y + dy, x + dx] = c(col)
        if feuil[y - 2, x]:
            mur[y - 2, x] = c('#4f6a39')                                       # la feuille du pédoncule
    # nu : le bois seul, et des branches tracées là où était le feuillage
    nu = np.zeros_like(t)
    bois = (t[..., 3] > 0) & np.isin(hexa, list(tronc))
    nu[bois] = t[bois]

    def branche(x, y, ang, L, ep, prof):
        x1, y1 = x + L * np.cos(ang), y - L * np.sin(ang)
        cv2.line(nu, (int(x), int(y)), (int(x1), int(y1)), c('#53383a' if ep > 1 else '#6b4a47'), ep)
        if prof:
            for da in (-0.5, 0.45):
                branche(x1, y1, ang + da + rng.uniform(-0.15, 0.15), L * 0.68, max(1, ep - 1), prof - 1)
    # le haut du tronc : le point de bois le plus haut de chaque côté
    yb, xb = np.nonzero(bois)
    for side in (-1, 1):
        sel = (xb - xb.mean()) * side > 0
        if sel.any():
            k = np.argmin(yb[sel])
            branche(xb[sel][k], yb[sel][k], np.pi / 2 - side * 0.5, 13, 2, 3)
    for _ in range(5):                                                          # quelques feuilles qui restent
        k = rng.integers(len(xs))
        if nu[ys[k], xs[k], 3] == 0:
            nu[ys[k], xs[k]] = c('#93a956')
    return (mur, _pied(mur), None), (nu, _pied(t), None)


def sprites():
    pm, pn = pechers()
    return {
        'taiko': taiko(False),
        'taiko_allume': taiko(True),
        'irori': irori(),
        'sudare_x': sudare(axe='x', seed=1),
        'sudare_z': sudare(axe='z', seed=2),
        'pilier_brise': pilier_brise(),
        'os': os_(0),
        'os_b': os_(3),
        'bol': bol(),
        'raisins': raisins(0),
        'raisins_b': raisins(1),
        'takenoko': takenoko(0),
        'takenoko_b': takenoko(1),
        'pecher_v3': pm,
        'pecher_nu_v3': pn,
    }


if __name__ == '__main__':
    import sys
    sp = sprites()
    W = sum(s[0].shape[1] + 8 for s in sp.values())
    H = max(s[0].shape[0] for s in sp.values())
    planche = np.full((H + 8, W, 4), (40, 34, 46, 255), np.uint8)
    x = 4
    for nom, (im, pied, _) in sp.items():
        h, w = im.shape[:2]
        m = im[..., 3] > 0
        planche[4:4 + h, x:x + w][m] = im[m]
        x += w + 8
    out = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/izanami-sprites.png'
    Image.fromarray(planche).resize((W * 4, (H + 8) * 4), Image.NEAREST).save(out)
    print(out)
