"""Rend la carte v3 une fois et garde la géométrie utile au jeu (faces, matières, hauteurs, ponts) + normales,
masques et décors, dans export/geo.npz, pour l'export vers le jeu."""
import numpy as np, pickle, time
from PIL import Image
import rendu, normales as NM, decorer, eclairage

t0 = time.time()
N = 4224
geo = {}
img = rendu.rendre(N, seed=7, geo=geo, verbeux=True)
p = geo['plan']
normal, masques, n, h = NM.carte(img, geo)
print('normales', round(time.time() - t0), flush=True)
sp = decorer.sprites()
obj, sol = decorer.placer_tout(p)
albedo_decors = img.copy()
eclairage.poser_decors(albedo_decors, n, h, masques, p, sp, obj, 0)
code = NM.coder(n, h)
np.savez_compressed('export/geo.npz', img=img, albedo_decors=albedo_decors, normal=code, masques=masques,
                    face=geo['face'], mat=geo['mat'], hsrc=geo['hsrc'], pont_h=geo['pont_h'], casc=geo['casc'])
pickle.dump({'obj': obj, 'plan_niv': p.niv, 'plan_mat': p.mat, 'zones': {k: v for k, v in p.zones.items() if k != 'rizieres'},
             'ponts': p.ponts, 'marches': p.marches, 'chemins': p.chemins},
            open('export/plan.pkl', 'wb'))
print('ok', round(time.time() - t0), 's', len(obj), 'décors', flush=True)
