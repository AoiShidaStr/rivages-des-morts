// Toile de pixels minimale : points, disques, traits épais, pièces dessinées en texte, contour.

/** '#rrggbb' → [r, g, b, 255] */
export function rgba(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}

export class Canvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.data = Buffer.alloc(width * height * 4);
  }

  inside(x, y) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  opaque(x, y) {
    return this.inside(x, y) && this.data[(y * this.width + x) * 4 + 3] > 0;
  }

  set(x, y, color) {
    x = Math.round(x);
    y = Math.round(y);
    if (!color || !this.inside(x, y)) return;
    const c = typeof color === 'string' ? rgba(color) : color;
    this.data.set(c, (y * this.width + x) * 4);
  }

  /** Disque plein de rayon `r` (r = 0 : un pixel, r = 1 : une croix de 5, r = 1.5 : un carré arrondi de 3×3). */
  disc(cx, cy, r, color) {
    const x0 = Math.round(cx);
    const y0 = Math.round(cy);
    const reach = Math.ceil(r);
    for (let dy = -reach; dy <= reach; dy++) {
      for (let dx = -reach; dx <= reach; dx++) {
        if (dx * dx + dy * dy <= r * r + 0.5) this.set(x0 + dx, y0 + dy, color);
      }
    }
  }

  /** Trait épais entre deux points, tracé pixel par pixel. */
  line([x0, y0], [x1, y1], r, color) {
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      this.disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, color);
    }
  }

  /**
   * Pièce dessinée en texte : une ligne par rangée, un caractère par pixel, '.' pour le vide.
   * (x, y) est le point de la pièce marqué par `anchor` ([colonne, rangée]).
   */
  stamp(rows, palette, x, y, anchor = [0, 0]) {
    rows.forEach((row, j) => {
      [...row].forEach((ch, i) => {
        if (ch !== '.') this.set(x + i - anchor[0], y + j - anchor[1], palette[ch]);
      });
    });
  }

  /** Contour d'un pixel autour de la silhouette : c'est lui qui la rend lisible sur n'importe quel fond. */
  outline(color) {
    const c = rgba(color);
    const edge = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.opaque(x, y)) continue;
        if (this.opaque(x - 1, y) || this.opaque(x + 1, y) || this.opaque(x, y - 1) || this.opaque(x, y + 1)) edge.push([x, y]);
      }
    }
    for (const [x, y] of edge) this.set(x, y, c);
  }

  blit(src, ox, oy) {
    for (let y = 0; y < src.height; y++) {
      src.data.copy(this.data, ((oy + y) * this.width + ox) * 4, y * src.width * 4, (y + 1) * src.width * 4);
    }
  }
}
