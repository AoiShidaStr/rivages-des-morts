"""Prépare tout ce qu'il faut au shader d'éclairage de la carte v3 :
- ile-albedo.png  : la carte avec ses décors (couleurs)
- ile-normal.png  : normales (RGB, espace tangent de la carte) + hauteur du monde / 12 (A)
- ile-masques.png : R émissif, G eau, B cascade, A halo de lumière (lave, portail, lanternes)
- lumieres.json   : les lumières ponctuelles (lanternes, forge, maison de thé, portail du donjon, Grand Rocher, lave)
Unités : celles du monde (le plan × 1,5) ; u vers la droite de l'écran, v vers le fond, h vers le haut."""
import json
import sys
import numpy as np
import cv2
from PIL import Image

import rendu
import normales as NM
import decorer
from plan import construire, uv2xz, LAVE
from vues import px

S = 1.5
R2 = np.sqrt(2)

# couleurs émissives des décors, sprite par sprite (le reste de leurs couleurs n'éclaire pas)
EMISSIF = {
    'lanterne': {'#f79617': 1.0, '#ab5124': 0.6},
    'forge': {'#f79617': 1.0, '#ab5124': 0.7},
    'maison_the': {'#e83b3b': 0.8},
    'torii_noir_z': {'#e83b3b': 1.0},
}


def emissif_sprite(nom, img):
    e = np.zeros(img.shape[:2], np.float32)
    for h, f in EMISSIF.get(nom, {}).items():
        e[np.all(img[..., :3] == np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)]), -1)] = f
    if nom == 'rocher':          # les fissures rouges du sceau d'Izanami
        r, g, b = (img[..., k].astype(int) for k in range(3))
        e[(r > 140) & (g < 90) & (b < 90) & (r - g > 70)] = 0.7
    return e * (img[..., 3] > 0)


def poser_decors(albedo, nrm, hgt, masques, p, sp, obj, K):
    """Compose les décors (triés d'arrière en avant) dans les quatre couches, à la résolution dessin."""
    N = albedo.shape[0]
    geo = dict(decorer_geo(sp))
    poses = []
    for nom, u, v, h in obj:
        x, y = px(u, v, h, N)
        poses.append((y / 2, nom, int(x / 2), int(y / 2), h))
    poses.sort()
    em = masques[..., 0].astype(np.float32) / 255
    for _, nom, x, y, h0 in poses:
        t, (ax, ay), o = sp[nom]
        n_s, h_s = geo[nom]
        H, W = t.shape[:2]
        x0, y0 = x - ax, y - ay
        if o is not None and False:                      # ombres peintes retirées : le shader les projette lui-même
            oh, ow = o.shape[:2]
            ox, oy = x - ow // 2 + int(ow * 0.12), y - oh // 2
            ys, xs = np.nonzero(o[..., 3] > 0)
            ys2, xs2 = ys + oy, xs + ox
            ok = (ys2 >= 0) & (ys2 < N) & (xs2 >= 0) & (xs2 < N)
            a = o[ys[ok], xs[ok], 3:4] / 255.0
            albedo[ys2[ok], xs2[ok]] = (albedo[ys2[ok], xs2[ok]] * (1 - a) + o[ys[ok], xs[ok], :3] * a).astype(np.uint8)
        ys, xs = np.nonzero(t[..., 3] > 127)
        ys2, xs2 = ys + y0, xs + x0
        ok = (ys2 >= 0) & (ys2 < N) & (xs2 >= 0) & (xs2 < N)
        ys, xs, ys2, xs2 = ys[ok], xs[ok], ys2[ok], xs2[ok]
        albedo[ys2, xs2] = t[ys, xs, :3]
        nrm[ys2, xs2] = n_s[ys, xs]
        hgt[ys2, xs2] = h0 + h_s[ys, xs]
        em[ys2, xs2] = emissif_sprite(nom, t)[ys, xs]
        masques[ys2, xs2, 1] = 0
        masques[ys2, xs2, 2] = 0
    masques[..., 0] = np.clip(em * 255, 0, 255).astype(np.uint8)


_GEO = {}


def decorer_geo(sp):
    """Normales et hauteurs de chaque sprite de décor : géométrie exacte pour ce qui est dessiné en 3D, sinon forme
    bombée (arbres, buissons, Grand Rocher)."""
    import decor
    if _GEO:
        return _GEO.items()
    for nom, (t, pied, _) in sp.items():
        miroir = nom.endswith('_z')
        connu = decor.GEOMETRIE.get(nom[:-2] if miroir else nom)
        if nom == 'rocher':
            connu = None
        n_c, h_c = (None, None) if connu is None else connu
        if miroir and n_c is not None:
            n_c = n_c[:, ::-1].copy()
            n_c[..., 0] *= -1                             # le miroir échange u et -u
            h_c = h_c[:, ::-1].copy()
        if n_c is not None and n_c.shape[:2] != t.shape[:2]:
            n_c, h_c = None, None
        arbre = not nom.startswith(('maison', 'forge', 'torii', 'lanterne', 'jizo', 'barriere', 'banc', 'faille'))
        _GEO[nom] = NM.sprite_normales(t, n_c, h_c, pied, bombe=6.0 if arbre else 3.0, detail=2.6 if arbre else 1.4)
    return _GEO.items()


def lumieres(p, obj):
    L = []

    def ajoute(u, v, h, coul, rayon, force, genre):
        L.append({'u': round(u * S, 3), 'v': round(v * S, 3), 'h': round(h, 3), 'couleur': coul,
                  'rayon': rayon, 'force': force, 'genre': genre})
    for nom, u, v, h in obj:
        if nom == 'lanterne':
            ajoute(u, v, h + 1.05, [1.0, 0.62, 0.3], 6.5, 1.25, 'flamme')
        elif nom == 'forge':
            ajoute(u - 0.66, v + 0.19, h + 0.6, [1.0, 0.48, 0.18], 8.0, 1.6, 'flamme')
        elif nom == 'maison_the':
            ajoute(u + 1.56, v - 0.24, h + 1.8, [1.0, 0.42, 0.3], 5.5, 0.9, 'flamme')
        elif nom == 'torii_noir_z':
            ajoute(u, v - 0.3, h + 1.6, [1.0, 0.16, 0.12], 9.0, 1.5, 'pouls')
        elif nom == 'rocher':
            ajoute(u, v - 1.2, h + 1.6, [1.0, 0.22, 0.15], 6.0, 0.7, 'pouls')
    sol = decorer.Sol(p)
    ajoute(-16, 48, 10.0, [1.0, 0.45, 0.12], 16.0, 1.7, 'lave')
    for u, v in [(-14.5, 44.5), (-12.0, 40.5)]:
        ajoute(u, v, sol.h(u, v) + 0.8, [1.0, 0.42, 0.1], 8.0, 1.1, 'lave')
    return L


if __name__ == '__main__':
    N = 4224
    geo = {}
    img = rendu.rendre(N, seed=7, geo=geo)
    p = geo['plan']
    normal, masques, n, h = NM.carte(img, geo)
    del geo
    print('carte : normales ok', flush=True)
    sp = decorer.sprites()
    obj, _ = decorer.placer_tout(p)
    albedo = img.copy()
    poser_decors(albedo, n, h, masques, p, sp, obj, 0)
    normal = NM.coder(n, h)
    # textures sans canal alpha (les navigateurs abîment les couleurs sous un alpha faible) :
    # normale RGB ; données RGB = hauteur / 12, émissif, eau (128 rizière, 192 eau, 255 cascade)
    donnees = np.zeros((N, N, 3), np.uint8)
    donnees[..., 0] = normal[..., 3]
    donnees[..., 1] = masques[..., 0]
    donnees[..., 2] = np.where(masques[..., 2] > 0, 255, np.where(masques[..., 1] == 255, 192,
                               np.where(masques[..., 1] > 0, 128, 0)))
    # halo coloré, en basse résolution : la couleur des sources émissives, étalée
    e = masques[..., 0:1].astype(np.float32) / 255 * albedo.astype(np.float32) / 255
    petit = cv2.resize(e, (N // 8, N // 8), interpolation=cv2.INTER_AREA)
    g = cv2.GaussianBlur(petit, (0, 0), 70 / 8)
    g = np.sqrt(g / (g.max() + 1e-6))
    Image.fromarray(albedo).save('ile-albedo.png')
    Image.fromarray(normal[..., :3]).save('ile-normal.png')
    Image.fromarray(donnees).save('ile-donnees.png')
    Image.fromarray(np.clip(g * 255, 0, 255).astype(np.uint8)).save('ile-halo.png')
    Image.fromarray(normal[..., :3]).resize((1400, 1400), Image.LANCZOS).save('apercu-normal.png')
    K = 0.8165 * N / 80 / S
    lieux = {}
    for nom, (u, v, hh) in {'Village des âmes': (-14, 4, 2.2), 'Grand Rocher': (0.5, 44, 4.4),
                            'Donjon': (-26, 28.5, 4.4), 'Cascade': (15, 42, 4.4), 'Pont': (2.5, 20, 2.2),
                            'Volcan': (-14, 42, 6), 'Ponton de Charon': (-19, -42, 0.5),
                            'Rizières': (17, 10, 3), 'Prairie': (14, -26, 2.2)}.items():
        x, y = px(u, v, hh, N)
        lieux[nom] = [round(x / 2), round(y / 2)]
    json.dump({'taille': N, 'monde': [120, round(120 * np.sqrt(3), 4)], 'lumieres': lumieres(p, obj), 'lieux': lieux},
              open('lumieres.json', 'w'), ensure_ascii=False, indent=1)
    print('ok', len(obj), 'décors')
