// Minimal software renderer for Bedrock geometry + box-UV textures.
// Used for visual QA of generated models (no game needed).
import { PNG } from 'pngjs';
import { boxFaces } from '../../src/model/boxuv.js';
import type { Vec3 } from '../../src/model/types.js';

type Mat4 = number[]; // row-major 4x4

const I = (): Mat4 => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function mul(a: Mat4, b: Mat4): Mat4 {
  const r = new Array(16).fill(0);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) r[i * 4 + j] += a[i * 4 + k] * b[k * 4 + j];
  return r;
}
const T = (x: number, y: number, z: number): Mat4 => [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z, 0, 0, 0, 1];
function Rx(a: number): Mat4 {
  const c = Math.cos(a), s = Math.sin(a);
  return [1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0, 0, 0, 0, 1];
}
function Ry(a: number): Mat4 {
  const c = Math.cos(a), s = Math.sin(a);
  return [c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0, 0, 0, 0, 1];
}
function Rz(a: number): Mat4 {
  const c = Math.cos(a), s = Math.sin(a);
  return [c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}
const D = Math.PI / 180;
/** Bedrock euler rotation (degrees) as a right-handed matrix in Bedrock model space. */
export function bedrockRot(r: Vec3 | undefined): Mat4 {
  if (!r) return I();
  return mul(Rz(-r[2] * D), mul(Ry(r[1] * D), Rx(-r[0] * D)));
}
function apply(m: Mat4, p: Vec3): Vec3 {
  return [
    m[0] * p[0] + m[1] * p[1] + m[2] * p[2] + m[3],
    m[4] * p[0] + m[5] * p[1] + m[6] * p[2] + m[7],
    m[8] * p[0] + m[9] * p[1] + m[10] * p[2] + m[11],
  ];
}

interface GeoBone {
  name: string;
  parent?: string;
  pivot?: Vec3;
  rotation?: Vec3;
  cubes?: { origin: Vec3; size: Vec3; uv: [number, number]; inflate?: number; pivot?: Vec3; rotation?: Vec3; mirror?: boolean }[];
}

export interface Pose {
  [bone: string]: { rotation?: Vec3; position?: Vec3; hidden?: boolean; scale?: number };
}

interface Tri {
  p: Vec3[];
  uv: [number, number][];
  shade: number;
}

/** Collects textured triangles in display space (x mirrored like Blockbench/in-game). */
export function collectTris(bones: GeoBone[], pose: Pose = {}, hide: string[] = []): Tri[] {
  const byName = new Map(bones.map((b) => [b.name, b]));
  const mats = new Map<string, Mat4>();
  const hidden = new Set<string>();
  const worldOf = (b: GeoBone): Mat4 => {
    const cached = mats.get(b.name);
    if (cached) return cached;
    const parent = b.parent ? byName.get(b.parent) : undefined;
    const pm = parent ? worldOf(parent) : I();
    const pv = b.pivot ?? [0, 0, 0];
    const ps = pose[b.name] ?? {};
    const rot: Vec3 = [
      (b.rotation?.[0] ?? 0) + (ps.rotation?.[0] ?? 0),
      (b.rotation?.[1] ?? 0) + (ps.rotation?.[1] ?? 0),
      (b.rotation?.[2] ?? 0) + (ps.rotation?.[2] ?? 0),
    ];
    const off = ps.position ?? [0, 0, 0];
    // Bedrock animation positions: x is mirrored relative to model space
    const k = ps.scale ?? 1;
    const S: Mat4 = [k, 0, 0, 0, 0, k, 0, 0, 0, 0, k, 0, 0, 0, 0, 1];
    const m = mul(pm, mul(T(pv[0] - off[0], pv[1] + off[1], pv[2] + off[2]), mul(bedrockRot(rot), mul(S, T(-pv[0], -pv[1], -pv[2])))));
    mats.set(b.name, m);
    return m;
  };
  const isHidden = (b: GeoBone): boolean => {
    if (hide.includes(b.name) || pose[b.name]?.hidden) return true;
    const p = b.parent ? byName.get(b.parent) : undefined;
    return p ? isHidden(p) : false;
  };
  for (const b of bones) if (isHidden(b)) hidden.add(b.name);

  const tris: Tri[] = [];
  const light: Vec3 = norm([-0.45, 0.85, -0.35]);
  for (const b of bones) {
    if (hidden.has(b.name)) continue;
    const m = worldOf(b);
    for (const c of b.cubes ?? []) {
      const inf = c.inflate ?? 0;
      let cm = m;
      if (c.rotation) {
        const cp = c.pivot ?? [0, 0, 0];
        cm = mul(m, mul(T(cp[0], cp[1], cp[2]), mul(bedrockRot(c.rotation), T(-cp[0], -cp[1], -cp[2]))));
      }
      const bind = (b as any).bind_pose_rotation as Vec3 | undefined; // legacy vanilla geometry
      if (bind) {
        const bp = b.pivot ?? [0, 0, 0];
        cm = mul(cm, mul(T(bp[0], bp[1], bp[2]), mul(bedrockRot(bind), T(-bp[0], -bp[1], -bp[2]))));
      }
      const geoFaces = boxFaces([c.origin[0] - inf, c.origin[1] - inf, c.origin[2] - inf], [c.size[0] + 2 * inf, c.size[1] + 2 * inf, c.size[2] + 2 * inf], c.uv);
      const uvFaces = boxFaces(c.origin, c.size, c.uv);
      geoFaces.forEach((f, fi) => {
        const [u, v, rw, rh] = uvFaces[fi].rect;
        const corners: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]];
        const pts = corners.map(([s, t]) => mirror(apply(cm, f.corner(s, t))));
        const uvs = corners.map(([s, t]) => [u + s * rw, v + t * rh] as [number, number]);
        const n = mirror(sub(apply(cm, f.normal), apply(cm, [0, 0, 0])));
        const lambert = Math.max(0, dot(norm(n), light));
        const shade = 0.55 + 0.45 * lambert;
        tris.push({ p: [pts[0], pts[1], pts[2]], uv: [uvs[0], uvs[1], uvs[2]], shade });
        tris.push({ p: [pts[0], pts[2], pts[3]], uv: [uvs[0], uvs[2], uvs[3]], shade });
      });
    }
  }
  return tris;
}

const mirror = (p: Vec3): Vec3 => [-p[0], p[1], p[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
function norm(a: Vec3): Vec3 {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
}

export interface View {
  yaw: number; // degrees, 0 = looking at the creature's face
  pitch: number;
}

/** Renders triangles into an RGBA buffer with orthographic projection. */
export function renderView(tris: Tri[], tex: PNG, view: View, size: number, geoTw = tex.width, geoTh = tex.height, bg = [236, 240, 232]): PNG {
  const out = new PNG({ width: size, height: size });
  const zbuf = new Float32Array(size * size).fill(Infinity);
  for (let i = 0; i < size * size; i++) {
    out.data[i * 4] = bg[0];
    out.data[i * 4 + 1] = bg[1];
    out.data[i * 4 + 2] = bg[2];
    out.data[i * 4 + 3] = 255;
  }
  // camera: rotate world so we look along +Z from -Z side (creature faces -Z → we see its face at yaw 0)
  const cam = mul(Rx(-view.pitch * D), Ry(view.yaw * D));
  const proj = tris.map((t) => t.p.map((p) => apply(cam, p)));
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const tp of proj) for (const p of tp) {
    minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
    minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
  }
  const span = Math.max(maxX - minX, maxY - minY) * 1.08 || 1;
  const scale = size / span;
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  // camera looks along +Z, so screen-right is -X
  const toScreen = (p: Vec3): Vec3 => [-(p[0] - cx) * scale + size / 2, size / 2 - (p[1] - cy) * scale, p[2]];
  const tw = tex.width, th = tex.height;
  const su = tw / geoTw, sv = th / geoTh;

  const raster = (translucent: boolean) =>
    proj.forEach((tp, ti) => {
      const t = tris[ti];
      const [a, b, c] = tp.map(toScreen);
      const area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      if (Math.abs(area) < 1e-9) return;
      const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0])));
      const x1 = Math.min(size - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
      const y0 = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1])));
      const y1 = Math.min(size - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          const px = x + 0.5, py = y + 0.5;
          const w0 = ((b[0] - px) * (c[1] - py) - (b[1] - py) * (c[0] - px)) / area;
          const w1 = ((c[0] - px) * (a[1] - py) - (c[1] - py) * (a[0] - px)) / area;
          const w2 = 1 - w0 - w1;
          if (w0 < 0 || w1 < 0 || w2 < 0) continue;
          const z = w0 * a[2] + w1 * b[2] + w2 * c[2];
          const idx = y * size + x;
          if (z >= zbuf[idx]) continue;
          const u = w0 * t.uv[0][0] + w1 * t.uv[1][0] + w2 * t.uv[2][0];
          const v = w0 * t.uv[0][1] + w1 * t.uv[1][1] + w2 * t.uv[2][1];
          const tx = Math.min(tw - 1, Math.max(0, Math.floor(u * su - 1e-4)));
          const ty = Math.min(th - 1, Math.max(0, Math.floor(v * sv - 1e-4)));
          const ti4 = (ty * tw + tx) * 4;
          const alpha = tex.data[ti4 + 3];
          if (alpha < 8) continue;
          const isTrans = alpha < 250;
          if (isTrans !== translucent) continue;
          const k = alpha / 255;
          if (!translucent) zbuf[idx] = z;
          for (let ch = 0; ch < 3; ch++) {
            const src = Math.min(255, tex.data[ti4 + ch] * t.shade);
            out.data[idx * 4 + ch] = translucent ? out.data[idx * 4 + ch] * (1 - k) + src * k : src;
          }
        }
    });
  raster(false);
  raster(true);
  return out;
}

/** Composes several views side by side. */
export function sheet(images: PNG[], cols: number): PNG {
  const s = images[0].width;
  const rows = Math.ceil(images.length / cols);
  const out = new PNG({ width: s * cols, height: s * rows });
  images.forEach((img, i) => {
    const ox = (i % cols) * s, oy = Math.floor(i / cols) * s;
    PNG.bitblt(img, out, 0, 0, s, s, ox, oy);
  });
  return out;
}

/** Normalises vanilla legacy (1.8.0 "geometry.x": {bones}) or modern geometry docs. */
export function geoBones(doc: any, id?: string): { bones: GeoBone[]; tw: number; th: number } {
  if (doc['minecraft:geometry']) {
    const g = id ? doc['minecraft:geometry'].find((x: any) => x.description.identifier === id) : doc['minecraft:geometry'][0];
    return { bones: g.bones, tw: g.description.texture_width, th: g.description.texture_height };
  }
  const key = id ?? Object.keys(doc).find((k) => k.startsWith('geometry.'))!;
  const g = doc[key];
  return { bones: g.bones, tw: g.texturewidth ?? 64, th: g.textureheight ?? 32 };
}
