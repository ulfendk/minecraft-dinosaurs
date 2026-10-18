// Deterministic hash-based noise so textures are reproducible between builds.

export function hash3(x: number, y: number, z: number, seed = 0): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(z | 0, 2147483647) + Math.imul(seed | 0, 144665)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const fade = (t: number) => t * t * (3 - 2 * t);

/** Trilinear value noise in [0,1]. */
export function valueNoise(x: number, y: number, z: number, seed = 0): number {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = fade(x - xi), yf = fade(y - yi), zf = fade(z - zi);
  let r = 0;
  for (let dz = 0; dz < 2; dz++)
    for (let dy = 0; dy < 2; dy++)
      for (let dx = 0; dx < 2; dx++) {
        const w = (dx ? xf : 1 - xf) * (dy ? yf : 1 - yf) * (dz ? zf : 1 - zf);
        r += w * hash3(xi + dx, yi + dy, zi + dz, seed);
      }
  return r;
}

export function fbm(x: number, y: number, z: number, seed = 0, octaves = 3): number {
  let a = 0.5, f = 1, s = 0, n = 0;
  for (let i = 0; i < octaves; i++) {
    s += a * valueNoise(x * f, y * f, z * f, seed + i * 31);
    n += a;
    a *= 0.5;
    f *= 2;
  }
  return s / n;
}

/** Distance to the nearest jittered feature point (cellular / Worley), cell size 1. */
export function cellular(x: number, y: number, z: number, seed = 0): number {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  let best = 9;
  for (let dz = -1; dz <= 1; dz++)
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const cx = xi + dx, cy = yi + dy, cz = zi + dz;
        const px = cx + hash3(cx, cy, cz, seed), py = cy + hash3(cx, cy, cz, seed + 1), pz = cz + hash3(cx, cy, cz, seed + 2);
        const d = Math.hypot(px - x, py - y, pz - z);
        if (d < best) best = d;
      }
  return best;
}
