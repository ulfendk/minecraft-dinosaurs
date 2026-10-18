// Voxel tree shapes for the prehistoric trees. Each returns a structure with the
// trunk base at (cx, 0, cz) where cx = cz = floor(size/2).
import { hash3 } from '../texture/noise.js';
import type { SBlock } from '../emit/bedrock/nbt.js';

export interface TreeShape {
  size: [number, number, number];
  blocks: Map<string, SBlock>;
  /** trunk base inside the structure */
  base: [number, number, number];
}

type Axis = 'up' | 'east' | 'north';

class Voxels {
  blocks = new Map<string, SBlock>();
  constructor(readonly w: number, readonly h: number, readonly log: string, readonly leaf: string) {}
  setLog(x: number, y: number, z: number, axis: Axis = 'up') {
    if (!this.in(x, y, z)) return;
    this.blocks.set(`${x},${y},${z}`, { name: this.log, states: { 'minecraft:block_face': axis } });
  }
  setLeaf(x: number, y: number, z: number) {
    if (!this.in(x, y, z)) return;
    const k = `${x},${y},${z}`;
    if (!this.blocks.has(k)) this.blocks.set(k, { name: this.leaf, states: { 'dino:natural': 'yes' } });
  }
  in(x: number, y: number, z: number) {
    return x >= 0 && z >= 0 && y >= 0 && x < this.w && z < this.w && y < this.h;
  }
  blob(cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, seed: number, ragged = 0.25) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
        for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z++) {
          const d = ((x - cx) / rx) ** 2 + ((y - cy) / Math.max(0.6, ry)) ** 2 + ((z - cz) / rz) ** 2;
          if (d <= 1 - hash3(x, y, z, seed) * ragged) this.setLeaf(x, y, z);
        }
  }
  disc(cx: number, y: number, cz: number, r: number, seed: number, ragged = 0.3) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++)
      for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++) {
        const d = Math.hypot(x - cx, z - cz) / r;
        if (d <= 1 - hash3(x, y, z, seed) * ragged) this.setLeaf(x, y, z);
      }
  }
  shape(): TreeShape {
    return { size: [this.w, this.h, this.w], blocks: this.blocks, base: [Math.floor(this.w / 2), 0, Math.floor(this.w / 2)] };
  }
}

const rnd = (seed: number, i: number) => hash3(i, seed, 77, seed * 7);

export function ginkgo(seed: number, log: string, leaf: string): TreeShape {
  const h = 9 + Math.floor(rnd(seed, 1) * 4);
  const v = new Voxels(11, h + 4, log, leaf);
  const c = 5;
  for (let y = 0; y < h; y++) v.setLog(c, y, c);
  // irregular tiers of short side branches with fan-leaf clumps
  for (let i = 0; i < 4; i++) {
    const y = Math.round(h * 0.4) + i * 2;
    const ang = rnd(seed, i + 10) * Math.PI * 2;
    const len = 2 + Math.floor(rnd(seed, i + 20) * 2);
    const dx = Math.round(Math.cos(ang)), dz = Math.round(Math.sin(ang));
    for (let k = 1; k <= len; k++) v.setLog(c + dx * k, y, c + dz * k, dx ? 'east' : 'north');
    v.blob(c + dx * len, y + 1, c + dz * len, 2, 1.4, 2, seed + i);
  }
  v.blob(c, h - 1, c, 2.6, 2.2, 2.6, seed + 9);
  v.blob(c, h + 1, c, 1.6, 1.4, 1.6, seed + 8);
  return v.shape();
}

export function araucaria(seed: number, log: string, leaf: string): TreeShape {
  const h = 13 + Math.floor(rnd(seed, 1) * 5);
  const v = new Voxels(13, h + 3, log, leaf);
  const c = 6;
  for (let y = 0; y < h; y++) v.setLog(c, y, c);
  // umbrella crown: whorls of horizontal branches near the top, widest at the bottom of the crown
  for (let t = 0; t < 4; t++) {
    const y = h - 5 + t;
    const r = 5 - t;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      for (let k = 1; k < r; k++) v.setLog(c + dx * k, y, c + dz * k, dx ? 'east' : 'north');
      v.disc(c + dx * (r - 1), y + 1, c + dz * (r - 1), 1.6, seed + t);
    }
    v.disc(c, y + 1, c, r - 0.5, seed + 20 + t, 0.45);
  }
  v.disc(c, h, c, 2, seed + 40);
  return v.shape();
}

export function dawnRedwood(seed: number, log: string, leaf: string): TreeShape {
  const h = 14 + Math.floor(rnd(seed, 1) * 6);
  const v = new Voxels(11, h + 2, log, leaf);
  const c = 5;
  for (let y = 0; y < h; y++) v.setLog(c, y, c);
  // narrow cone of feathery foliage
  for (let y = 3; y <= h + 1; y++) {
    const t = (y - 3) / (h - 2);
    const r = Math.max(0.6, 4.2 * (1 - t) * (y % 2 ? 1 : 0.8));
    v.disc(c, y, c, r, seed + y, 0.35);
  }
  return v.shape();
}

export function lepidodendron(seed: number, log: string, leaf: string): TreeShape {
  const h = 14 + Math.floor(rnd(seed, 1) * 6);
  const v = new Voxels(11, h + 6, log, leaf);
  const c = 5;
  for (let y = 0; y < h; y++) v.setLog(c, y, c);
  // dichotomous (forking) crown with grassy leaf tufts on the tips
  const fork = (x: number, y: number, z: number, dx: number, dz: number, depth: number) => {
    for (let k = 1; k <= 2; k++) {
      x += dx;
      z += dz;
      y += 1;
      v.setLog(x, y, z, dx ? 'east' : 'north');
    }
    if (depth === 0) {
      v.blob(x, y + 1, z, 1.5, 1.6, 1.5, seed + x + z);
      return;
    }
    fork(x, y, z, dz || 1, dx || 1, depth - 1);
    fork(x, y, z, -(dz || 1), -(dx || 1), depth - 1);
  };
  fork(c, h - 1, c, 1, 0, 1);
  fork(c, h - 1, c, -1, 0, 1);
  // leaf scars sprouting along the upper trunk
  for (let y = h - 6; y < h; y += 2) v.setLeaf(c + (y % 4 ? 1 : -1), y, c);
  return v.shape();
}

export function treeFern(seed: number, log: string, leaf: string): TreeShape {
  const h = 4 + Math.floor(rnd(seed, 1) * 3);
  const v = new Voxels(9, h + 3, log, leaf);
  const c = 4;
  for (let y = 0; y < h; y++) v.setLog(c, y, c);
  v.setLeaf(c, h, c);
  // eight drooping fronds radiating from the crown
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
    const len = dx && dz ? 2 : 3;
    for (let k = 1; k <= len; k++) {
      const droop = k === len ? 1 : 0;
      v.setLeaf(c + dx * k, h - droop, c + dz * k);
      if (k === len) v.setLeaf(c + dx * k, h - 2, c + dz * k);
    }
  }
  v.setLeaf(c, h + 1, c);
  return v.shape();
}

export const SHAPES: Record<string, (seed: number, log: string, leaf: string) => TreeShape> = {
  ginkgo,
  araucaria,
  dawn_redwood: dawnRedwood,
  lepidodendron,
  tree_fern: treeFern,
};
