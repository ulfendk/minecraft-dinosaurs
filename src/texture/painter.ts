import { PNG } from 'pngjs';
import { boxFaces, type FaceLayout } from '../model/boxuv.js';
import type { Cube, Decal, Material, Model, Vec3 } from '../model/types.js';
import { clamp, darken, hex, lighten, mix, shade, smoothstep, type RGB } from './color.js';
import { cellular, fbm, hash3, hashStr } from './noise.js';

export type PatternType = 'none' | 'stripes' | 'spots' | 'mottled' | 'bands' | 'rosettes' | 'blotches';

export interface Palette {
  back: string;
  side: string;
  belly: string;
  pattern?: { type: PatternType; colour: string; scale: number; strength?: number; coverage?: number };
  accent: string;
  accent2?: string;
  horn?: string;
  claw?: string;
  eye?: string;
  mouth?: string;
  membrane?: string;
  plateTip?: string;
  /** add a darker dorsal stripe along the spine */
  spine?: boolean;
  /** paint teeth along jaw edges (carnivores) */
  teeth?: boolean;
  seed?: number;
}

const SKINLIKE = new Set<Material>(['skin', 'belly', 'dark', 'accent', 'feather', 'fin']);

interface Ctx {
  pal: Palette;
  c: {
    back: RGB; side: RGB; belly: RGB; pattern: RGB; accent: RGB; accent2: RGB; horn: RGB; claw: RGB;
    eye: RGB; mouth: RGB; membrane: RGB; plateTip: RGB;
  };
  seed: number;
  decals: Decal[];
}

/** Paints a box-UV texture for a packed model. */
export function paint(model: Model, pal: Palette): PNG {
  const png = new PNG({ width: model.textureWidth, height: model.textureHeight });
  png.data.fill(0);
  const seed = pal.seed ?? hashStr(model.id) % 1000;
  const ctx: Ctx = {
    pal,
    seed,
    decals: model.decals,
    c: {
      back: hex(pal.back),
      side: hex(pal.side),
      belly: hex(pal.belly),
      pattern: hex(pal.pattern?.colour ?? pal.back),
      accent: hex(pal.accent),
      accent2: hex(pal.accent2 ?? pal.accent),
      horn: hex(pal.horn ?? '#b8a983'),
      claw: hex(pal.claw ?? '#3a3430'),
      eye: hex(pal.eye ?? '#e0a020'),
      mouth: hex(pal.mouth ?? '#8a3a3a'),
      membrane: hex(pal.membrane ?? pal.accent),
      plateTip: hex(pal.plateTip ?? pal.accent),
    },
  };
  for (const bone of model.bones)
    for (const cube of bone.cubes) {
      if (!cube.uv) continue;
      for (const f of boxFaces(cube.origin, cube.size, cube.uv)) paintFace(png, cube, f, ctx);
    }
  return png;
}

function paintFace(png: PNG, cube: Cube, f: FaceLayout, ctx: Ctx) {
  const [u, v, w, h] = f.rect;
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const x = u + i, y = v + j;
      if (x < 0 || y < 0 || x >= png.width || y >= png.height) continue;
      const p = f.point(i, j);
      const edge = i === 0 || j === 0 || i === w - 1 || j === h - 1;
      const col = texel(cube, f, i, j, w, h, p, edge, ctx);
      const k = (y * png.width + x) * 4;
      png.data[k] = clamp(Math.round(col[0]), 0, 255);
      png.data[k + 1] = clamp(Math.round(col[1]), 0, 255);
      png.data[k + 2] = clamp(Math.round(col[2]), 0, 255);
      png.data[k + 3] = cube.mat === 'glass' ? 120 : 255;
    }
}

/** 0 = belly, 1 = back: countershading parameter for a surface point. */
function dorsal(cube: Cube, f: FaceLayout, p: Vec3): number {
  const tags = cube.tags ?? [];
  if (tags.includes('limb')) return f.face === 'up' ? 0.85 : f.face === 'down' ? 0.45 : 0.62 + 0.18 * frac(cube, p, 1);
  if (f.face === 'up') return 1;
  if (f.face === 'down') return 0;
  return frac(cube, p, 1);
}

function frac(cube: Cube, p: Vec3, axis: number) {
  const s = cube.size[axis] || 1;
  return clamp((p[axis] - cube.origin[axis]) / s, 0, 1);
}

function grain(p: Vec3, seed: number, amt = 0.07) {
  return 1 + (hash3(Math.floor(p[0] * 2), Math.floor(p[1] * 2), Math.floor(p[2] * 2), seed) - 0.5) * 2 * amt;
}

function skinColour(cube: Cube, f: FaceLayout, p: Vec3, ctx: Ctx): RGB {
  const { c, pal, seed } = ctx;
  const t = dorsal(cube, f, p);
  let col = t < 0.5 ? mix(c.belly, c.side, smoothstep(0.12, 0.5, t)) : mix(c.side, c.back, smoothstep(0.5, 0.95, t));

  const pat = pal.pattern;
  if (pat && pat.type !== 'none' && t > 0.18) {
    const s = pat.scale;
    const strength = pat.strength ?? 0.85;
    const cov = pat.coverage ?? 0.5;
    const warp = (fbm(p[0] / 9, p[1] / 9, p[2] / 9, seed) - 0.5) * s * 0.9;
    let m = 0;
    switch (pat.type) {
      case 'stripes': {
        const sv = Math.sin(((p[2] + warp) / s) * Math.PI * 2);
        m = smoothstep(1 - cov * 1.2, 1 - cov * 1.2 + 0.25, sv) * smoothstep(0.3, 0.6, t);
        break;
      }
      case 'bands': {
        const sv = Math.sin(((p[2] + warp * 0.3) / s) * Math.PI * 2);
        m = smoothstep(1 - cov * 1.2, 1 - cov * 1.2 + 0.2, sv);
        break;
      }
      case 'spots': {
        const d = cellular(p[0] / s, p[1] / s, p[2] / s, seed);
        m = (d < 0.18 + cov * 0.25 ? 1 : 0) * smoothstep(0.25, 0.5, t);
        break;
      }
      case 'rosettes': {
        const d = cellular(p[0] / s, p[1] / s, p[2] / s, seed);
        m = (d > 0.2 && d < 0.2 + cov * 0.3 ? 1 : 0) * smoothstep(0.3, 0.55, t);
        break;
      }
      case 'mottled': {
        const n = fbm(p[0] / s, p[1] / s, p[2] / s, seed, 3);
        m = smoothstep(0.62 - cov * 0.3, 0.7 - cov * 0.3, n) * smoothstep(0.2, 0.5, t);
        break;
      }
      case 'blotches': {
        const n = fbm(p[0] / s + 7, p[1] / (s * 0.7), p[2] / s, seed + 5, 2);
        m = smoothstep(0.55 - cov * 0.25, 0.6 - cov * 0.25, n) * smoothstep(0.35, 0.6, t);
        break;
      }
    }
    col = mix(col, c.pattern, m * strength);
  }
  if (pal.spine && f.face === 'up' && Math.abs(p[0]) < Math.max(1, cube.size[0] * 0.18)) col = darken(col, 0.18);
  // scale texture: subtle checker of darker scales
  const sc = (Math.floor(p[0]) + Math.floor(p[1]) * 2 + Math.floor(p[2])) & 3;
  if (sc === 0) col = shade(col, 0.95);
  return shade(col, grain(p, seed));
}

function texel(cube: Cube, f: FaceLayout, i: number, j: number, w: number, h: number, p: Vec3, edge: boolean, ctx: Ctx): RGB {
  const { c, seed } = ctx;
  const tags = cube.tags ?? [];
  let col: RGB;
  const g = grain(p, seed + 3, 0.05);
  switch (cube.mat) {
    case 'skin':
      col = skinColour(cube, f, p, ctx);
      break;
    case 'belly':
      col = shade(c.belly, g);
      break;
    case 'dark':
      col = shade(mix(c.back, c.pattern, 0.6), g * 0.85);
      break;
    case 'accent': {
      const t = f.face === 'up' ? 1 : f.face === 'down' ? 0 : frac(cube, p, 1);
      col = shade(mix(darken(c.accent, 0.15), mix(c.accent, c.accent2, 0.5), t), g);
      // display structures get subtle bands
      if (Math.sin(p[1] * 1.3 + p[2] * 0.4) > 0.75) col = mix(col, c.accent2, 0.6);
      break;
    }
    case 'horn': {
      const t = f.face === 'up' ? 1 : f.face === 'down' ? 0 : frac(cube, p, 1);
      col = shade(mix(darken(c.horn, 0.3), lighten(c.horn, 0.1), t), g);
      if (((i + Math.floor(p[1])) & 3) === 0) col = shade(col, 0.92);
      break;
    }
    case 'claw':
      col = shade(c.claw, g);
      break;
    case 'tooth':
      col = shade(hex('#efe6cc'), g);
      break;
    case 'mouth':
      col = shade(c.mouth, g);
      break;
    case 'eye':
      col = edge && w > 1 ? hex('#1a1410') : hex('#0c0a08');
      break;
    case 'feather': {
      col = skinColour(cube, f, p, ctx);
      const fr = ((p[2] + p[1] * 0.6 + hash3(Math.floor(p[0]), 0, 0, seed) * 2) / 2.2) % 1;
      if (fr < 0.28) col = darken(col, 0.18);
      else if (fr > 0.8) col = lighten(col, 0.08);
      break;
    }
    case 'quill': {
      const t = frac(cube, p, 2);
      col = shade(mix(c.accent, c.accent2, t), g);
      if (i === Math.floor(w / 2)) col = lighten(col, 0.25);
      break;
    }
    case 'plate': {
      const t = f.face === 'up' ? 1 : f.face === 'down' ? 0 : frac(cube, p, 1);
      col = shade(mix(darken(mix(c.back, c.pattern, 0.5), 0.1), c.plateTip, smoothstep(0.15, 0.95, t)), g);
      break;
    }
    case 'armor': {
      const base = mix(c.back, c.pattern, 0.35);
      const cx = ((p[0] % 3) + 3) % 3, cz = ((p[2] % 3) + 3) % 3, cy = ((p[1] % 3) + 3) % 3;
      const centre = f.face === 'up' || f.face === 'down' ? Math.hypot(cx - 1.5, cz - 1.5) : Math.hypot((f.normal[0] ? cz : cx) - 1.5, cy - 1.5);
      col = centre < 0.9 ? lighten(base, 0.18) : centre > 1.7 ? darken(base, 0.25) : base;
      col = shade(col, g);
      break;
    }
    case 'membrane': {
      col = mix(c.membrane, c.belly, 0.15);
      const vein = Math.abs(Math.sin(p[0] * 0.55 + p[2] * 0.25)) < 0.12;
      if (vein) col = darken(col, 0.2);
      if (edge) col = darken(col, 0.25);
      col = shade(col, g);
      break;
    }
    case 'fin': {
      // flat colour (fins are built from many thin slabs; per-slab gradients would stripe them)
      col = shade(mix(c.side, c.back, 0.6), g);
      if (Math.sin(p[2] * 1.4 + p[1] * 0.7) > 0.8) col = darken(col, 0.08);
      break;
    }
    case 'saddle': {
      col = hex('#6b3f1f');
      if (edge) col = hex('#a8743f');
      else if ((i + j) % 7 === 0) col = hex('#5a3418');
      col = shade(col, g);
      break;
    }
    case 'strap':
      col = shade(edge ? hex('#2e1d10') : hex('#3f2814'), g);
      break;
    case 'metal':
      col = shade(edge ? hex('#7d8288') : hex('#b9bec4'), g);
      break;
    case 'paint':
      col = shade(edge && w > 2 && h > 2 ? darken(c.accent, 0.15) : c.accent, g);
      break;
    case 'paint2':
      col = shade(edge && w > 2 && h > 2 ? darken(c.accent2, 0.15) : c.accent2, g);
      break;
    case 'glass':
      col = mix(hex('#9fd3e6'), hex('#e8f6fb'), ((i + j) % 5) / 6);
      break;
    case 'tyre': {
      col = hex('#232323');
      if (f.face !== 'xmin' && f.face !== 'xmax' && (Math.floor(p[1] + p[2]) & 1)) col = hex('#141414');
      if ((f.face === 'xmin' || f.face === 'xmax') && Math.hypot(i - w / 2 + 0.5, j - h / 2 + 0.5) < Math.min(w, h) * 0.3) col = hex('#9a9a9a');
      break;
    }
    case 'chrome':
      col = shade(mix(hex('#c8ccd0'), hex('#f2f4f6'), ((i * 3 + j) % 4) / 4), 1);
      break;
    case 'seat':
      col = shade(edge ? hex('#2b2b2b') : hex('#3c3c3c'), g);
      break;
    case 'lamp':
      col = edge ? hex('#bfb38a') : hex('#fff4c4');
      break;
    case 'canvas':
      col = shade(hex('#c9b98f'), g * (((i + j) & 1) ? 1 : 0.95));
      break;
    default:
      col = [255, 0, 255];
  }

  if (SKINLIKE.has(cube.mat)) {
    col = applyJaws(col, cube, f, i, j, w, h, p, ctx, tags);
    col = applyDecals(col, cube, p, ctx);
    if (edge && w > 2 && h > 2) col = shade(col, 0.9);
  }
  return col;
}

function applyJaws(col: RGB, cube: Cube, f: FaceLayout, i: number, j: number, w: number, h: number, p: Vec3, ctx: Ctx, tags: string[]): RGB {
  const teeth = ctx.pal.teeth;
  const side = f.face === 'xmin' || f.face === 'xmax' || f.face === 'zmin';
  if (tags.includes('jawU')) {
    if (f.face === 'down') {
      const border = i === 0 || i === w - 1 || j === 0;
      return border && teeth ? hex('#efe6cc') : mix(ctx.c.mouth, hex('#c86a6a'), i === Math.floor(w / 2) ? 0.0 : 0.15);
    }
    if (side && j === h - 1) {
      if (teeth) return (i + (f.face === 'xmax' ? 1 : 0)) % 2 === 0 ? hex('#f2ead2') : darken(col, 0.45);
      return darken(col, 0.35);
    }
  }
  if (tags.includes('jawL')) {
    if (f.face === 'up') {
      const border = i === 0 || i === w - 1 || j === h - 1;
      return border && teeth ? hex('#efe6cc') : i === Math.floor(w / 2) || i === Math.floor((w - 1) / 2) ? hex('#c86a7a') : ctx.c.mouth;
    }
    if (side && j === 0) {
      if (teeth) return (i + (f.face === 'xmax' ? 0 : 1)) % 2 === 0 ? hex('#f2ead2') : darken(col, 0.4);
      return darken(col, 0.3);
    }
  }
  return col;
}

function applyDecals(col: RGB, cube: Cube, p: Vec3, ctx: Ctx): RGB {
  for (const d of ctx.decals) {
    if (d.onlyMat && !d.onlyMat.includes(cube.mat)) continue;
    const dx = (p[0] - d.center[0]) / d.radius[0];
    const dy = (p[1] - d.center[1]) / d.radius[1];
    const dz = (p[2] - d.center[2]) / d.radius[2];
    const dn = Math.sqrt(dx * dx + dy * dy + dz * dz);
    switch (d.kind) {
      case 'eye': {
        const small = Math.min(d.radius[1], d.radius[2]) < 1;
        if (small) {
          // tiny eyes: a single dark texel with a hint of iris colour
          if (Math.abs(p[1] - d.center[1]) < 0.55 && Math.abs(p[2] - d.center[2]) < 0.55 && Math.abs(dx) <= 1) col = mix(hex('#0d0b09'), ctx.c.eye, 0.25);
          break;
        }
        if (dn <= 1) {
          if (dn < 0.55) col = hex('#0d0b09');
          else col = ctx.c.eye;
          // glint on the upper front texel
          if (dy > 0.2 && dz < -0.1 && dn < 0.9) col = lighten(col, 0.55);
        } else if (dn < 1.6 && dy > 0.35) col = darken(col, 0.22); // brow ridge
        else if (dn < 1.3) col = darken(col, 0.12); // eye socket rim
        break;
      }
      case 'nostril':
        if (dn <= 1) col = darken(col, 0.55);
        break;
      case 'spot':
      case 'stripe':
      case 'colour':
        if (dn <= 1) col = mix(col, hex(d.colour ?? '#000000'), 0.85);
        break;
    }
  }
  return col;
}
