"""Normal map d'une planche de personnage, pour que l'éclairage de l'île (islandLighting.ts) le modèle en volume.

    python3 tools/pixellab/normales.py public/sprites/anim/heros-hanyo-guerrier.json [...]

Le relief vient de la silhouette : un dôme qui monte depuis le bord (distance au fond, adoucie), plus un peu du
dessin lui-même (les zones claires ressortent). Écrit <planche>-normal.webp à côté de la planche (mêmes cases) et
ajoute `normal` dans la meta du JSON. Codage : RGB = normale × 0,5 + 0,5, x vers la droite, y vers le haut, z vers
la caméra ; A = alpha de la planche."""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

BORD = 5.0      # px : distance au bord à laquelle le dôme est plat
DETAIL = 0.6    # part du dessin (luminance) dans le relief
PENTE = 1.6     # force des pentes


def normales(rgba):
    a = rgba[..., 3] > 0
    d = ndi.distance_transform_edt(a)
    dome = np.sqrt(np.clip(d / BORD, 0, 1))
    lum = rgba[..., :3].astype(float) @ [0.299, 0.587, 0.114] / 255
    h = ndi.gaussian_filter(dome + DETAIL * lum * a, 0.7)
    gy, gx = np.gradient(h)
    n = np.dstack([-gx * PENTE, gy * PENTE, np.ones_like(h)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    out = np.zeros_like(rgba)
    out[..., :3] = np.round((n * 0.5 + 0.5) * 255).astype(np.uint8)
    out[..., 3] = rgba[..., 3]
    out[~a, :3] = (128, 128, 255)
    return out


def planche(json_path):
    json_path = Path(json_path)
    sheet = json.loads(json_path.read_text())
    meta = sheet['meta']
    image = json_path.parent / meta['image']
    nom = image.stem + '-normal.webp'
    rgba = np.array(Image.open(image).convert('RGBA'))
    Image.fromarray(normales(rgba)).save(json_path.parent / nom, 'WEBP', lossless=True, quality=100, method=6)
    meta['normal'] = nom
    json_path.write_text(json.dumps(sheet, ensure_ascii=False, indent=1) + '\n')
    print('  ', json_path.parent / nom)


if __name__ == '__main__':
    for p in sys.argv[1:]:
        planche(p)
