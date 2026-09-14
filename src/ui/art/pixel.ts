/**
 * Micro-libreria di pixel art: una griglia di colori disegnata con primitive
 * semplici, poi convertita in PNG (data URL) e mostrata con
 * `image-rendering: pixelated`.
 *
 * Perché così e non file PNG: gli sprite restano *dati* nel repo (versionabili,
 * diffabili, tematizzabili per rarità) e non serve una pipeline di asset. La
 * conversione avviene una volta sola per sprite ed è memoizzata.
 */

export const SPRITE_SIZE = 24;

export type Grid = (string | null)[][];

export function newGrid(size = SPRITE_SIZE): Grid {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => null));
}

export function px(g: Grid, x: number, y: number, c: string | null): void {
  if (y < 0 || y >= g.length) return;
  const row = g[y]!;
  if (x < 0 || x >= row.length) return;
  row[x] = c;
}

export function rect(g: Grid, x: number, y: number, w: number, h: number, c: string): void {
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) px(g, x + dx, y + dy, c);
}

export function hline(g: Grid, x1: number, x2: number, y: number, c: string): void {
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) px(g, x, y, c);
}

export function vline(g: Grid, x: number, y1: number, y2: number, c: string): void {
  for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) px(g, x, y, c);
}

/** Disco pieno (per teste, corpi tondi, bagliori). */
export function disc(g: Grid, cx: number, cy: number, r: number, c: string): void {
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      if (x * x + y * y <= r * r + r * 0.4) px(g, cx + x, cy + y, c);
    }
  }
}

/** Specchia la metà sinistra sulla destra: simmetria gratis e coerente. */
export function mirrorX(g: Grid): void {
  const size = g.length;
  for (let y = 0; y < size; y++) {
    const row = g[y]!;
    for (let x = 0; x < Math.floor(size / 2); x++) {
      row[size - 1 - x] = row[x]!;
    }
  }
}

/**
 * Contorno scuro attorno alla silhouette: è il trucco che fa "leggere" uno
 * sprite pixel anche a dimensioni piccole.
 */
export function outline(g: Grid, color: string): void {
  const size = g.length;
  const toPaint: [number, number][] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (g[y]![x] !== null) continue;
      const near =
        g[y]![x - 1] != null ||
        g[y]![x + 1] != null ||
        (g[y - 1]?.[x] ?? null) != null ||
        (g[y + 1]?.[x] ?? null) != null;
      if (near) toPaint.push([x, y]);
    }
  }
  for (const [x, y] of toPaint) px(g, x, y, color);
}

/** Ombra ellittica a terra, per staccare lo sprite dal fondo. */
export function groundShadow(g: Grid, cy: number, halfWidth: number, color = 'rgba(0,0,0,0.35)'): void {
  const cx = Math.floor(g.length / 2);
  for (let x = -halfWidth; x <= halfWidth; x++) {
    const t = Math.abs(x) / halfWidth;
    if (t > 0.95) continue;
    px(g, cx + x, cy, color);
    if (t < 0.6) px(g, cx + x, cy + 1, color);
  }
}

/** Schiarisce un colore esadecimale (gli stadi evoluti sono più luminosi). */
export function lighten(color: string, amount: number): string {
  if (!color.startsWith('#') || color.length !== 7) return color;
  const ch = (i: number) => parseInt(color.slice(1 + i * 2, 3 + i * 2), 16);
  const mix = (v: number) => Math.round(v + (255 - v) * amount);
  const hex = (v: number) => v.toString(16).padStart(2, '0');
  return `#${hex(mix(ch(0)))}${hex(mix(ch(1)))}${hex(mix(ch(2)))}`;
}

/** Applica la schiaritura a tutta la griglia, preservando il contorno scuro. */
export function tintGrid(grid: Grid, amount: number, keep: string): void {
  for (const row of grid) {
    for (let x = 0; x < row.length; x++) {
      const c = row[x];
      if (!c || c === keep) continue;
      row[x] = lighten(c, amount);
    }
  }
}

const cache = new Map<string, string>();

/** Converte la griglia in PNG data URL (memoizzato per chiave). */
export function toDataUrl(key: string, draw: () => Grid): string {
  const hit = cache.get(key);
  if (hit) return hit;
  const grid = draw();
  const size = grid.length;

  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const c = grid[y]![x];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  const url = canvas.toDataURL('image/png');
  cache.set(key, url);
  return url;
}
