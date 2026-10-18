// 16×16 pixel art helpers: ASCII sprites with palettes, plus procedural block textures.
import { PNG } from 'pngjs';
import { darken, hex, lighten, mix, shade, type RGB } from './color.js';
import { fbm, hash3 } from './noise.js';

export type Pal = Record<string, string | RGB>;

const toRGB = (c: string | RGB): RGB => (typeof c === 'string' ? hex(c) : c);

export function blank(w = 16, h = 16): PNG {
  const p = new PNG({ width: w, height: h });
  p.data.fill(0);
  return p;
}

export function set(p: PNG, x: number, y: number, c: RGB, a = 255) {
  if (x < 0 || y < 0 || x >= p.width || y >= p.height) return;
  const k = (y * p.width + x) * 4;
  p.data[k] = Math.max(0, Math.min(255, Math.round(c[0])));
  p.data[k + 1] = Math.max(0, Math.min(255, Math.round(c[1])));
  p.data[k + 2] = Math.max(0, Math.min(255, Math.round(c[2])));
  p.data[k + 3] = a;
}

export function get(p: PNG, x: number, y: number): [RGB, number] {
  const k = (y * p.width + x) * 4;
  return [[p.data[k], p.data[k + 1], p.data[k + 2]], p.data[k + 3]];
}

/** Draws an ASCII sprite ('.' or ' ' = transparent). Rows may be shorter than 16. */
export function sprite(rows: string[], pal: Pal, base?: PNG, ox = 0, oy = 0): PNG {
  const p = base ?? blank(16, 16);
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === '.' || ch === ' ') return;
      const c = pal[ch];
      if (c === undefined) throw new Error(`sprite: no palette entry for '${ch}'`);
      set(p, x + ox, y + oy, toRGB(c));
    }),
  );
  return p;
}

/** Adds a subtle per-pixel brightness jitter to opaque pixels (keeps art from looking flat). */
export function jitter(p: PNG, amt = 0.06, seed = 1): PNG {
  for (let y = 0; y < p.height; y++)
    for (let x = 0; x < p.width; x++) {
      const [c, a] = get(p, x, y);
      if (!a) continue;
      set(p, x, y, shade(c, 1 + (hash3(x, y, seed) - 0.5) * 2 * amt), a);
    }
  return p;
}

/** Fills a texture procedurally. */
export function fill(w: number, h: number, f: (x: number, y: number) => RGB | null): PNG {
  const p = blank(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const c = f(x, y);
      if (c) set(p, x, y, c);
    }
  return p;
}

// ---------------------------------------------------------------- wood

export interface WoodPal {
  bark: string;
  barkDark: string;
  wood: string;
  woodDark: string;
  style?: 'furrowed' | 'smooth' | 'scales' | 'fibrous' | 'stringy';
}

export function logSide(pw: WoodPal, seed: number): PNG {
  const b = hex(pw.bark), d = hex(pw.barkDark);
  return fill(16, 16, (x, y) => {
    switch (pw.style ?? 'furrowed') {
      case 'scales': {
        // Lepidodendron: diamond leaf-scar pattern
        const u = (x + (Math.floor(y / 4) % 2) * 2) % 4, v = y % 4;
        const edge = Math.abs(u - 1.5) + Math.abs(v - 1.5) > 2.2;
        return shade(edge ? d : mix(b, lighten(b, 0.15), (u + v) / 8), 0.95 + hash3(x, y, seed) * 0.1);
      }
      case 'smooth': {
        const band = (hash3(0, y >> 1, seed) > 0.8 ? 0.85 : 1) * (0.94 + hash3(x, y, seed) * 0.12);
        return shade(x % 7 === 3 && hash3(x, y >> 2, seed) > 0.6 ? d : b, band);
      }
      case 'fibrous': {
        const f = (x + Math.floor(fbm(x / 3, y / 8, 0, seed) * 3)) % 3 === 0;
        return shade(f ? d : b, 0.92 + hash3(x, y, seed) * 0.14);
      }
      case 'stringy': {
        const f = fbm(x / 2.5, y / 10, 1, seed) > 0.52;
        return shade(f ? d : lighten(b, 0.05), 0.92 + hash3(x, y, seed) * 0.12);
      }
      default: {
        const n = fbm(x / 2, y / 6, 2, seed, 3);
        const groove = (x + Math.round(n * 4)) % 4 === 0;
        return shade(groove ? d : b, 0.9 + n * 0.25);
      }
    }
  });
}

export function logTop(pw: WoodPal, seed: number): PNG {
  const b = hex(pw.bark), w = hex(pw.wood), wd = hex(pw.woodDark);
  return fill(16, 16, (x, y) => {
    const dx = x - 7.5, dy = y - 7.5;
    const r = Math.max(Math.abs(dx), Math.abs(dy));
    if (r > 6.5) return shade(b, 0.9 + hash3(x, y, seed) * 0.15);
    const ring = Math.round(Math.hypot(dx, dy) + fbm(x / 4, y / 4, 3, seed) * 1.2) % 3 === 0;
    return shade(ring ? wd : w, 0.95 + hash3(x, y, seed + 1) * 0.08);
  });
}

export function planks(pw: WoodPal, seed: number): PNG {
  const w = hex(pw.wood), wd = hex(pw.woodDark);
  return fill(16, 16, (x, y) => {
    const row = Math.floor(y / 4);
    if (y % 4 === 3) return darken(wd, 0.15);
    const off = (row * 7) % 16;
    if ((x + off) % 16 === 0) return darken(wd, 0.1);
    const grain = fbm(x / 6, y * 2, row, seed) > 0.6 ? 0.88 : 1;
    return shade(mix(w, wd, hash3(row, 0, seed) * 0.3), grain * (0.96 + hash3(x, y, seed) * 0.07));
  });
}

// ---------------------------------------------------------------- foliage

export function leaves(col: string, seed: number, style: 'broad' | 'needle' | 'fan' | 'frond' = 'broad'): PNG {
  const c = hex(col);
  return fill(16, 16, (x, y) => {
    const n = hash3(x, y, seed);
    if (style === 'needle') {
      const s = (x + y * 2) % 5;
      if (s === 0 && n > 0.25) return null;
      return shade(s < 2 ? darken(c, 0.2) : c, 0.85 + n * 0.3);
    }
    if (style === 'fan') {
      // ginkgo: little fan-shaped leaves
      const cx = (x % 5) - 2, cy = (y % 5) - 1;
      const inLeaf = cy >= 0 && Math.abs(cx) <= cy + 0.5;
      if (!inLeaf && n > 0.45) return null;
      return shade(inLeaf ? lighten(c, 0.1) : darken(c, 0.25), 0.85 + n * 0.25);
    }
    if (style === 'frond') {
      const vein = (x + y) % 4 === 0;
      if (!vein && (x - y + 16) % 4 === 2 && n > 0.3) return null;
      return shade(vein ? darken(c, 0.25) : c, 0.85 + n * 0.3);
    }
    if (n > 0.86) return null;
    const blob = fbm(x / 3, y / 3, 0, seed) > 0.55;
    return shade(blob ? lighten(c, 0.12) : darken(c, 0.12), 0.88 + n * 0.22);
  });
}

/** Scales a 16×16 sprite up (nearest) for previews. */
export function upscale(p: PNG, k: number): PNG {
  const o = blank(p.width * k, p.height * k);
  for (let y = 0; y < o.height; y++)
    for (let x = 0; x < o.width; x++) {
      const [c, a] = get(p, Math.floor(x / k), Math.floor(y / k));
      if (a) set(o, x, y, c, a);
    }
  return o;
}

/** Adds a 1px darker outline around opaque pixels (item icon style). */
export function outline(p: PNG, colour = '#1f1a17'): PNG {
  const src = PNG.sync.read(PNG.sync.write(p));
  const c = hex(colour);
  for (let y = 0; y < p.height; y++)
    for (let x = 0; x < p.width; x++) {
      if (get(src, x, y)[1]) continue;
      const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const xx = x + dx, yy = y + dy;
        return xx >= 0 && yy >= 0 && xx < p.width && yy < p.height && get(src, xx, yy)[1] > 0;
      });
      if (n) set(p, x, y, c);
    }
  return p;
}
