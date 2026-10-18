// Parametric skeletons. Every species starts from one of these rigs and then adds
// its own signature parts (horns, frills, sails, plates, crests...).
//
// Conventions (Bedrock model space): units = pixels, ground at y=0, creature
// faces -Z, +X is its left. Parts are laid out straight in "unrotated" space and
// posed with bone rotations. Bedrock rotation sign: +X pitches the -Z end DOWN.

import { ModelBuilder } from './builder.js';
import type { Material, Vec3 } from './types.js';

export type RigKind = 'theropod' | 'quadruped' | 'pterosaur' | 'marine' | 'fish' | 'snake';

/** Everything the animation generator and species features need to know. */
export interface Rig {
  kind: RigKind;
  mb: ModelBuilder;
  neck: string[];
  tail: string[];
  head: string;
  jaw?: string;
  legs: { name: string; side: 1 | -1; front: boolean; chain: string[] }[];
  arms: string[];
  wings: { name: string; tip?: string; side: 1 | -1 }[];
  flippers: { name: string; side: 1 | -1; front: boolean }[];
  /** anchor points (model px) */
  a: {
    hipY: number;
    bodyTop: number;
    bodyFront: number; // z of front of torso
    bodyBack: number;
    bodyW: number;
    bodyH: number;
    bodyY: number; // centre y of torso
    headPivot: Vec3;
    headLen: number;
    headW: number;
    headH: number;
    craniumZ0: number; // z of front of cranium (snout starts here)
    snoutTip: number; // z of snout tip
    headTop: number; // y of top of cranium (unrotated head space)
    jawY: number; // y of the mouth line
    seat: Vec3; // where a rider sits
    tailEnd: number;
  };
}

// ---------------------------------------------------------------------------
// shared pieces

export interface HeadSpec {
  len: number; // cranium length
  w: number;
  h: number;
  snoutLen: number;
  snoutW?: number;
  snoutH?: number;
  jawH?: number;
  /** extra snout drop (negative = snout lower than cranium top) */
  snoutDrop?: number;
  eyeR?: number;
  /** cranium narrows to the back (Gives a T. rex skull look) */
  cheek?: number;
  beak?: boolean;
  /** extra snout segment for long-snouted spinosaurids / crocs */
  rostrum?: { len: number; w: number; h: number };
  mat?: Material;
}

function buildHead(mb: ModelBuilder, parent: string, pivot: Vec3, rot: number, hs: HeadSpec) {
  const [, py, pz] = pivot;
  const head = mb.bone('head', parent, pivot, [rot, 0, 0]);
  const jawH = hs.jawH ?? Math.max(1, Math.round(hs.h * 0.3));
  const mouthY = py - hs.h / 2 + jawH; // mouth line
  const cranH = hs.h - jawH;
  const cranZ0 = pz - hs.len;
  const mat = hs.mat ?? 'skin';
  // cranium (upper head, back part)
  head.box([-hs.w / 2, mouthY, cranZ0], [hs.w, cranH, hs.len + 1], mat, { tags: ['jawU'] });
  if (hs.cheek) head.box([-hs.w / 2 - hs.cheek / 2, mouthY - 1, cranZ0 + hs.len * 0.35], [hs.w + hs.cheek, Math.max(2, cranH * 0.55), hs.len * 0.5], mat, { tags: ['jawU'] });
  // snout / upper jaw
  const sw = hs.snoutW ?? Math.max(2, hs.w - 2);
  const sh = hs.snoutH ?? Math.max(2, Math.round(cranH * 0.75));
  const drop = hs.snoutDrop ?? 0;
  const snoutZ0 = cranZ0 - hs.snoutLen;
  if (hs.snoutLen > 0) head.box([-sw / 2, mouthY, snoutZ0], [sw, sh + drop, hs.snoutLen], hs.beak ? 'horn' : mat, { tags: ['jawU'] });
  let tip = snoutZ0;
  if (hs.rostrum) {
    const r = hs.rostrum;
    head.box([-r.w / 2, mouthY, snoutZ0 - r.len], [r.w, r.h, r.len], mat, { tags: ['jawU'] });
    tip = snoutZ0 - r.len;
  }
  // lower jaw on its own bone so it can open
  const jawPivot: Vec3 = [0, mouthY, pz - 1];
  const jaw = mb.bone('jaw', 'head', jawPivot);
  const jw = Math.max(2, sw - 1);
  const jawLen = pz - tip - 1;
  jaw.box([-jw / 2, mouthY - jawH, tip + 1], [jw, jawH, jawLen], hs.beak ? 'horn' : mat, { tags: ['jawL'] });
  if (hs.w - 1 > jw) jaw.box([-(hs.w - 1) / 2, mouthY - jawH, cranZ0 + 1], [hs.w - 1, jawH, hs.len - 1], mat, { tags: ['jawL'] });
  // eyes
  const er = hs.eyeR ?? Math.max(0.6, Math.min(1.5, hs.h / 9));
  mb.decal({ kind: 'eye', center: [hs.w / 2, mouthY + cranH * 0.68, cranZ0 + Math.max(1.5, hs.len * 0.28)], radius: [0.7, er, er], mirrorX: true });
  // nostrils
  mb.decal({ kind: 'nostril', center: [sw / 2 - 0.5, mouthY + sh + drop - 0.6, tip + 1.2], radius: [0.8, 0.6, 0.8], mirrorX: true });
  return { mouthY, cranZ0, tip, top: mouthY + cranH, jawH };
}

/** A straight chain of tapering segments along ±Z; returns bone names. */
function chain(
  mb: ModelBuilder,
  prefix: string,
  parent: string,
  start: Vec3,
  dir: 1 | -1,
  lens: number[],
  w0: number,
  h0: number,
  w1: number,
  h1: number,
  rots: number[],
  mat: Material = 'skin',
  yAlign: 'centre' | 'top' = 'centre',
) {
  const names: string[] = [];
  let z = start[2];
  let prev = parent;
  const n = lens.length;
  const topY = start[1] + h0 / 2;
  lens.forEach((len, i) => {
    const t0 = i / n;
    const w = Math.max(1, Math.round(w0 + (w1 - w0) * t0));
    const h = Math.max(1, Math.round(h0 + (h1 - h0) * t0));
    const name = `${prefix}${i}`;
    const b = mb.bone(name, prev, [start[0], start[1], z], [rots[i] ?? 0, 0, 0]);
    const y0 = yAlign === 'top' ? topY - h : start[1] - h / 2;
    const z0 = dir < 0 ? z - len : z - 1;
    b.box([start[0] - w / 2, y0, z0], [w, h, len + 1], mat);
    names.push(name);
    prev = name;
    z += dir * len;
  });
  return { names, end: z };
}

function splitLen(total: number, n: number, falloff = 0.85) {
  const ws = Array.from({ length: n }, (_, i) => Math.pow(falloff, i));
  const s = ws.reduce((a, b) => a + b, 0);
  const lens = ws.map((w) => Math.max(2, Math.round((w / s) * total)));
  return lens;
}

// ---------------------------------------------------------------------------
// theropods & other bipeds

export interface TheropodSpec {
  hipY: number;
  body: { len: number; w: number; h: number; tilt?: number; chest?: number };
  neck: { len: number; w: number; h: number; angle: number; segments?: number };
  head: HeadSpec;
  tail: { len: number; w?: number; h?: number; segments?: number; lift?: number; tipW?: number; tipH?: number };
  arms: { len: number; w: number; hand?: number; angle?: number; big?: boolean };
  legs: { thighW: number; shinW?: number; footLen?: number; footW?: number; stance?: number };
  feathered?: boolean;
}

export function theropod(id: string, s: TheropodSpec): Rig {
  const mb = new ModelBuilder(id);
  mb.bone('root', undefined, [0, 0, 0]);
  const { hipY } = s;
  const B = s.body;
  const bodyFront = -Math.round(B.len * 0.74);
  const bodyBack = Math.round(B.len * 0.26);
  const bodyY = hipY + 1;
  const coat: Material = s.feathered ? 'feather' : 'skin';
  const body = mb.bone('body', 'root', [0, hipY, 0], [B.tilt ?? -4, 0, 0]);
  body.box([-B.w / 2, bodyY - B.h / 2, bodyFront], [B.w, B.h, B.len], coat);
  const chest = B.chest ?? Math.round(B.h * 0.18);
  if (chest > 0) body.box([-(B.w - 2) / 2, bodyY - B.h / 2 - chest, bodyFront + 2], [B.w - 2, chest + 1, Math.round(B.len * 0.45)], coat);
  // hips (wider muscle mass over the thighs)
  body.box([-(B.w + 2) / 2, bodyY - B.h * 0.25, bodyBack - Math.round(B.len * 0.42)], [B.w + 2, Math.round(B.h * 0.65), Math.round(B.len * 0.42)], coat);

  // neck + head
  const N = s.neck;
  const neckPivot: Vec3 = [0, bodyY + B.h * 0.18, bodyFront + 2];
  const nseg = N.segments ?? 1;
  const nlens = splitLen(N.len, nseg, 1);
  const nRot = -N.angle / nseg;
  const nk = chain(mb, 'neck', 'body', neckPivot, -1, nlens, N.w, N.h, Math.max(2, N.w - 1), Math.max(2, N.h - 1), nlens.map(() => nRot), coat);
  const headPivot: Vec3 = [0, neckPivot[1] + 1, nk.end + 1];
  const hd = buildHead(mb, nk.names[nk.names.length - 1], headPivot, N.angle * 0.92 - (B.tilt ?? -4), s.head);

  // tail
  const T = s.tail;
  const tseg = T.segments ?? 4;
  const tlens = splitLen(T.len, tseg, 0.92);
  const tw = T.w ?? Math.round(B.w * 0.72);
  const th = T.h ?? Math.round(B.h * 0.7);
  const tl = chain(mb, 'tail', 'body', [0, bodyY + B.h * 0.12, bodyBack], 1, tlens, tw, th, T.tipW ?? 2, T.tipH ?? 2, tlens.map((_, i) => (i === 0 ? T.lift ?? 2 : -1.5)), coat, 'top');

  // arms
  const A = s.arms;
  const arms: string[] = [];
  for (const side of [1, -1] as const) {
    const name = side > 0 ? 'arm_l' : 'arm_r';
    const ax = side * (B.w / 2 - Math.max(1, A.w / 2));
    const ay = bodyY - B.h * 0.12;
    const az = bodyFront + Math.round(B.len * 0.14);
    const arm = mb.bone(name, 'body', [ax, ay, az], [A.angle ?? -35, 0, 0]);
    arm.box([ax - A.w / 2 + side * 0.5, ay - A.len, az - A.w / 2], [A.w, A.len + 1, A.w], A.big ? coat : 'skin', { tags: ['limb'] });
    const hand = A.hand ?? Math.max(1, Math.round(A.len * 0.35));
    arm.box([ax - A.w / 2 + side * 0.5, ay - A.len - hand, az - A.w / 2 - 1], [A.w, hand, 1], 'claw');
    arms.push(name);
  }

  // legs: thigh → shin → foot, posed digitigrade (knee forward, ankle back)
  const L = s.legs;
  const lt = hipY - 2; // vertical budget minus toe height
  const total = lt / (0.38 * Math.cos((25 * Math.PI) / 180) + 0.38 * Math.cos((30 * Math.PI) / 180) + 0.24);
  const a = Math.round(total * 0.38), b = Math.round(total * 0.38);
  const c = Math.max(2, lt - Math.round(a * Math.cos((25 * Math.PI) / 180)) - Math.round(b * Math.cos((30 * Math.PI) / 180)));
  const legs: Rig['legs'] = [];
  const shinW = L.shinW ?? Math.max(2, Math.round(L.thighW * 0.7));
  const footW = L.footW ?? Math.max(3, shinW + 1);
  const footLen = L.footLen ?? Math.max(4, Math.round(hipY * 0.24));
  for (const side of [1, -1] as const) {
    const sx = side * (L.stance ?? B.w / 2 - L.thighW / 2 + 1.5);
    const n = side > 0 ? 'l' : 'r';
    const thigh = mb.bone(`leg_${n}`, 'root', [sx, hipY, 0], [-25, 0, 0]);
    thigh.box([sx - L.thighW / 2, hipY - a, -Math.round(L.thighW * 0.7)], [L.thighW, a + 3, Math.round(L.thighW * 1.4)], coat, { tags: ['limb'] });
    const shin = mb.bone(`shin_${n}`, `leg_${n}`, [sx, hipY - a, 0], [55, 0, 0]);
    shin.box([sx - shinW / 2, hipY - a - b, -shinW / 2], [shinW, b + 1, shinW], 'skin', { tags: ['limb'] });
    const fy = hipY - a - b;
    const foot = mb.bone(`foot_${n}`, `shin_${n}`, [sx, fy, 0], [-30, 0, 0]);
    foot.box([sx - shinW / 2 + 0.5, fy - c, -shinW / 2 + 0.5], [Math.max(1, shinW - 1), c + 1, Math.max(1, shinW - 1)], 'skin', { tags: ['limb'] });
    foot.box([sx - footW / 2, fy - c - 2, -footLen + 1], [footW, 2, footLen], 'skin', { tags: ['limb'] });
    foot.box([sx - footW / 2, fy - c - 2, -footLen], [footW, 1, 1], 'claw');
    legs.push({ name: `leg_${n}`, side, front: false, chain: [`leg_${n}`, `shin_${n}`, `foot_${n}`] });
  }

  return {
    kind: 'theropod',
    mb,
    neck: nk.names,
    tail: tl.names,
    head: 'head',
    jaw: 'jaw',
    legs,
    arms,
    wings: [],
    flippers: [],
    a: {
      hipY,
      bodyTop: bodyY + B.h / 2,
      bodyFront,
      bodyBack,
      bodyW: B.w,
      bodyH: B.h,
      bodyY,
      headPivot,
      headLen: s.head.len + s.head.snoutLen,
      headW: s.head.w,
      headH: s.head.h,
      craniumZ0: hd.cranZ0,
      snoutTip: hd.tip,
      headTop: hd.top,
      jawY: hd.mouthY,
      seat: [0, bodyY + B.h / 2, bodyFront + Math.round(B.len * 0.42)],
      tailEnd: tl.end,
    },
  };
}

// ---------------------------------------------------------------------------
// quadrupeds (sauropods, ceratopsians, thyreophorans, hadrosaurs, crocs, synapsids)

export interface QuadSpec {
  frontLeg: number; // height of shoulder joint
  backLeg: number; // height of hip joint
  body: { len: number; w: number; h: number; belly?: number; hump?: number };
  neck: { len: number; w: number; h: number; angle: number; segments?: number; tipW?: number; tipH?: number };
  head: HeadSpec;
  headAngle?: number;
  /** lift: per-segment pitch in degrees (accumulates along the tail; negative droops) */
  tail: { len: number; w?: number; h?: number; segments?: number; lift?: number; tipW?: number; tipH?: number };
  legs: { frontW: number; backW: number; sprawl?: number; footLen?: number; elbow?: number; knee?: number };
}

export function quadruped(id: string, s: QuadSpec): Rig {
  const mb = new ModelBuilder(id);
  mb.bone('root', undefined, [0, 0, 0]);
  const B = s.body;
  const half = B.len / 2;
  const span = B.len * 0.76;
  const legTopF = s.frontLeg, legTopB = s.backLeg;
  const bodyY = (legTopF + legTopB) / 2 + B.h * 0.3; // centre of torso
  const tilt = (-Math.atan2(legTopF - legTopB, span) * 180) / Math.PI;
  const body = mb.bone('body', 'root', [0, bodyY, 0], [tilt, 0, 0]);
  body.box([-B.w / 2, bodyY - B.h / 2, -half], [B.w, B.h, B.len], 'skin');
  if (B.belly) body.box([-(B.w - 2) / 2, bodyY - B.h / 2 - B.belly, -half + B.len * 0.18], [B.w - 2, B.belly + 1, B.len * 0.6], 'skin');
  if (B.hump) body.box([-(B.w - 4) / 2, bodyY + B.h / 2 - 1, -half + B.len * 0.2], [B.w - 4, B.hump + 1, B.len * 0.55], 'skin');

  // neck & head
  const N = s.neck;
  const neckPivot: Vec3 = [0, bodyY + B.h * 0.15, -half + 2];
  const nseg = N.segments ?? 1;
  const nlens = splitLen(N.len, nseg, 0.95);
  const nk = chain(mb, 'neck', 'body', neckPivot, -1, nlens, N.w, N.h, N.tipW ?? Math.max(2, N.w - 2), N.tipH ?? Math.max(2, N.h - 2), nlens.map(() => (-N.angle - tilt) / nseg), 'skin');
  const headPivot: Vec3 = [0, neckPivot[1], nk.end + 1];
  const hd = buildHead(mb, nk.names[nk.names.length - 1], headPivot, s.headAngle ?? N.angle * 0.9, s.head);

  // tail
  const T = s.tail;
  const tseg = T.segments ?? 4;
  const tlens = splitLen(T.len, tseg, 0.9);
  const tl = chain(mb, 'tail', 'body', [0, bodyY + B.h * 0.18, half], 1, tlens, T.w ?? Math.round(B.w * 0.6), T.h ?? Math.round(B.h * 0.55), T.tipW ?? 2, T.tipH ?? 2, tlens.map((_, i) => (T.lift ?? -2) - i * 1.5 - tilt / tseg), 'skin', 'top');

  // legs: upper + lower (+ foot pad); columnar with a slight elbow/knee bend
  const L = s.legs;
  const legs: Rig['legs'] = [];
  const tiltR = (tilt * Math.PI) / 180;
  for (const front of [true, false])
    for (const side of [1, -1] as const) {
      const n = `${front ? 'f' : 'b'}${side > 0 ? 'l' : 'r'}`;
      const w = front ? L.frontW : L.backW;
      const top = front ? legTopF : legTopB;
      const z = front ? -span / 2 : span / 2;
      const zz = Math.round(z * Math.cos(tiltR));
      const sx = side * (B.w / 2 - w / 2 + (L.sprawl ?? 0.5));
      const up = Math.round(top * 0.52), lo = top - up;
      const bend = front ? L.elbow ?? 8 : L.knee ?? -8;
      const upper = mb.bone(`leg_${n}`, 'root', [sx, top, zz], [bend, 0, 0]);
      upper.box([sx - w / 2, top - up, zz - w / 2], [w, up + Math.round(B.h * 0.35), w], 'skin', { tags: ['limb'] });
      const lower = mb.bone(`shin_${n}`, `leg_${n}`, [sx, top - up, zz], [-bend, 0, 0]);
      const lw = Math.max(2, w - 1);
      lower.box([sx - lw / 2, 0, zz - lw / 2], [lw, lo + 1, lw], 'skin', { tags: ['limb'] });
      const fl = L.footLen ?? 0;
      if (fl > 0) lower.box([sx - (lw + 1) / 2, 0, zz - lw / 2 - fl], [lw + 1, 2, fl], 'skin', { tags: ['limb'] });
      lower.box([sx - lw / 2, 0, zz - lw / 2 - fl - 1], [lw, 1, 1], 'claw');
      legs.push({ name: `leg_${n}`, side, front, chain: [`leg_${n}`, `shin_${n}`] });
    }

  return {
    kind: 'quadruped',
    mb,
    neck: nk.names,
    tail: tl.names,
    head: 'head',
    jaw: 'jaw',
    legs,
    arms: [],
    wings: [],
    flippers: [],
    a: {
      hipY: legTopB,
      bodyTop: bodyY + B.h / 2 + (B.hump ?? 0),
      bodyFront: -half,
      bodyBack: half,
      bodyW: B.w,
      bodyH: B.h,
      bodyY,
      headPivot,
      headLen: s.head.len + s.head.snoutLen,
      headW: s.head.w,
      headH: s.head.h,
      craniumZ0: hd.cranZ0,
      snoutTip: hd.tip,
      headTop: hd.top,
      jawY: hd.mouthY,
      seat: [0, bodyY + B.h / 2 + (B.hump ?? 0), -Math.round(B.len * 0.12)],
      tailEnd: tl.end,
    },
  };
}

// ---------------------------------------------------------------------------
// pterosaurs

export interface PteroSpec {
  bodyY: number;
  body: { len: number; w: number; h: number };
  neck: { len: number; w: number; h: number; angle: number; segments?: number };
  head: HeadSpec;
  wing: { span: number; chord: number; armW: number };
  legs: { len: number; w: number };
  tail?: { len: number; vane?: boolean };
}

export function pterosaur(id: string, s: PteroSpec): Rig {
  const mb = new ModelBuilder(id);
  mb.bone('root', undefined, [0, 0, 0]);
  const B = s.body;
  const y = s.bodyY;
  const front = -Math.round(B.len * 0.6), back = B.len + front;
  const body = mb.bone('body', 'root', [0, y, 0], [-12, 0, 0]);
  body.box([-B.w / 2, y - B.h / 2, front], [B.w, B.h, B.len], 'feather');

  const N = s.neck;
  const neckPivot: Vec3 = [0, y + B.h * 0.2, front + 1];
  const nseg = N.segments ?? 2;
  const nlens = splitLen(N.len, nseg, 1);
  const nk = chain(mb, 'neck', 'body', neckPivot, -1, nlens, N.w, N.h, Math.max(1, N.w - 1), Math.max(1, N.h - 1), nlens.map(() => -N.angle / nseg), 'feather');
  const headPivot: Vec3 = [0, neckPivot[1], nk.end + 1];
  const hd = buildHead(mb, nk.names[nk.names.length - 1], headPivot, N.angle + 12, s.head);

  // wings: arm along the leading edge, membrane behind it, wingtip bone for flex
  const W = s.wing;
  const wings: Rig['wings'] = [];
  const inner = Math.round(W.span * 0.45), outer = W.span - inner;
  for (const side of [1, -1] as const) {
    const n = side > 0 ? 'l' : 'r';
    const sx = side * (B.w / 2);
    const wy = y + B.h / 2 - 1;
    const wz = front + 2;
    const wing = mb.bone(`wing_${n}`, 'body', [sx, wy, wz], [12, 0, 0]);
    const x0 = side > 0 ? sx : sx - inner;
    wing.box([x0, wy - W.armW / 2, wz - 1], [inner, W.armW, W.armW], 'feather');
    wing.box([x0, wy, wz], [inner, 0, W.chord], 'membrane');
    const tipX = sx + side * inner;
    const tip = mb.bone(`wingtip_${n}`, `wing_${n}`, [tipX, wy, wz]);
    const x1 = side > 0 ? tipX : tipX - outer;
    tip.box([x1, wy - Math.max(1, W.armW - 1) / 2, wz - 1], [outer, Math.max(1, W.armW - 1), Math.max(1, W.armW - 1)], 'skin');
    // membrane tapers towards the tip: two strips
    const c2 = Math.round(W.chord * 0.65);
    tip.box([x1, wy, wz], [Math.round(outer * 0.55) + (side > 0 ? 0 : 0), 0, c2], 'membrane');
    tip.box(side > 0 ? [x1 + Math.round(outer * 0.55), wy, wz] : [x1, wy, wz], [Math.round(outer * 0.45), 0, Math.round(W.chord * 0.32)], 'membrane');
    // hand claws on leading edge
    tip.box([side > 0 ? tipX : tipX - 1, wy, wz - 2], [1, 1, 1], 'claw');
    wings.push({ name: `wing_${n}`, tip: `wingtip_${n}`, side });
  }

  // small hind legs
  const legs: Rig['legs'] = [];
  for (const side of [1, -1] as const) {
    const n = side > 0 ? 'l' : 'r';
    const sx = side * (B.w / 2 - 1);
    const leg = mb.bone(`leg_${n}`, 'root', [sx, y - B.h / 2 + 1, back - 2], [-10, 0, 0]);
    leg.box([sx - s.legs.w / 2, y - B.h / 2 + 1 - s.legs.len, back - 2 - s.legs.w / 2], [s.legs.w, s.legs.len + 1, s.legs.w], 'skin', { tags: ['limb'] });
    leg.box([sx - s.legs.w / 2, y - B.h / 2 + 1 - s.legs.len, back - 2 - s.legs.w / 2 - 2], [s.legs.w, 1, 2], 'claw');
    legs.push({ name: `leg_${n}`, side, front: false, chain: [`leg_${n}`] });
  }

  const tail: string[] = [];
  if (s.tail) {
    const t = mb.bone('tail0', 'body', [0, y, back], [8, 0, 0]);
    t.box([-0.5, y - 0.5, back - 1], [1, 1, s.tail.len], 'skin');
    if (s.tail.vane) t.box([-0, y - 2, back + s.tail.len - 4], [0, 4, 4], 'accent');
    tail.push('tail0');
  }

  return {
    kind: 'pterosaur',
    mb,
    neck: nk.names,
    tail,
    head: 'head',
    jaw: 'jaw',
    legs,
    arms: [],
    wings,
    flippers: [],
    a: {
      hipY: y,
      bodyTop: y + B.h / 2,
      bodyFront: front,
      bodyBack: back,
      bodyW: B.w,
      bodyH: B.h,
      bodyY: y,
      headPivot,
      headLen: s.head.len + s.head.snoutLen,
      headW: s.head.w,
      headH: s.head.h,
      craniumZ0: hd.cranZ0,
      snoutTip: hd.tip,
      headTop: hd.top,
      jawY: hd.mouthY,
      seat: [0, y + B.h / 2, front + Math.round(B.len * 0.45)],
      tailEnd: back + (s.tail?.len ?? 0),
    },
  };
}

// ---------------------------------------------------------------------------
// marine reptiles (flippers) and fish

export interface MarineSpec {
  bodyY: number;
  body: { len: number; w: number; h: number };
  neck: { len: number; w: number; h: number; segments?: number; angle?: number };
  head: HeadSpec;
  tail: { len: number; w?: number; h?: number; segments?: number; fluke?: 'vertical' | 'mosasaur' | 'none' | 'shark'; flukeH?: number };
  flippers: { front: [number, number]; back?: [number, number] }; // [length, chord]
  dorsal?: { h: number; len: number };
  fishFins?: boolean; // shark-style pectoral fins instead of paddles
}

export function marine(id: string, s: MarineSpec, kind: 'marine' | 'fish' = 'marine'): Rig {
  const mb = new ModelBuilder(id);
  mb.bone('root', undefined, [0, 0, 0]);
  const B = s.body;
  const y = s.bodyY;
  const front = -Math.round(B.len / 2), back = front + B.len;
  const body = mb.bone('body', 'root', [0, y, 0]);
  body.box([-B.w / 2, y - B.h / 2, front], [B.w, B.h, B.len], 'skin');
  body.box([-(B.w - 2) / 2, y - B.h / 2 - 1, front + 2], [B.w - 2, 2, B.len - 4], 'skin');
  if (s.dorsal) body.box([-0.5, y + B.h / 2 - 1, -Math.round(s.dorsal.len / 2)], [1, s.dorsal.h + 1, s.dorsal.len], 'fin', { rotation: [-25, 0, 0], pivot: [0, y + B.h / 2, Math.round(s.dorsal.len / 2)] });

  const N = s.neck;
  const nseg = N.segments ?? 1;
  const nlens = splitLen(N.len, nseg, 1);
  const neckPivot: Vec3 = [0, y + 1, front + 2];
  const nk = chain(mb, 'neck', 'body', neckPivot, -1, nlens, N.w, N.h, Math.max(2, N.w - 2), Math.max(2, N.h - 2), nlens.map(() => -(N.angle ?? 0) / nseg), 'skin');
  const headPivot: Vec3 = [0, y + 1, nk.end + 1];
  const hd = buildHead(mb, nk.names[nk.names.length - 1], headPivot, N.angle ?? 0, s.head);

  const T = s.tail;
  const tseg = T.segments ?? 4;
  const tlens = splitLen(T.len, tseg, 0.9);
  const tl = chain(mb, 'tail', 'body', [0, y + 0.5, back], 1, tlens, T.w ?? B.w - 2, T.h ?? B.h - 2, 2, 2, tlens.map(() => 0), 'skin');
  const last = mb.get(tl.names[tl.names.length - 1]);
  const fh = T.flukeH ?? Math.round(B.h * 1.1);
  if (T.fluke === 'vertical' || T.fluke === 'shark') {
    const ze = tl.end;
    last.box([-0.5, y, ze - 4], [1, fh, 4], 'fin', { rotation: [-35, 0, 0], pivot: [0, y, ze - 2] });
    last.box([-0.5, y - (T.fluke === 'shark' ? fh * 0.7 : fh), ze - 4], [1, T.fluke === 'shark' ? Math.round(fh * 0.7) : fh, 4], 'fin', { rotation: [35, 0, 0], pivot: [0, y + 1, ze - 2] });
  } else if (T.fluke === 'mosasaur') {
    const ze = tl.end;
    last.box([-0.5, y - fh * 0.9, ze - 6], [1, Math.round(fh * 0.9), 6], 'fin', { rotation: [28, 0, 0], pivot: [0, y, ze - 3] });
    last.box([-0.5, y, ze - 5], [1, Math.round(fh * 0.4), 5], 'fin');
  }

  const flippers: Rig['flippers'] = [];
  const mk = (front: boolean, [len, chord]: [number, number]) => {
    for (const side of [1, -1] as const) {
      const n = `${front ? 'f' : 'b'}${side > 0 ? 'l' : 'r'}`;
      const sx = side * (B.w / 2 - 1);
      const fz = front ? front_z : back_z;
      const fy = y - B.h / 2 + 2;
      const fl = mb.bone(`flipper_${n}`, 'body', [sx, fy, fz], [0, side * (front ? -20 : -30), side * -15]);
      const x0 = side > 0 ? sx : sx - len;
      if (s.fishFins) fl.box([x0, fy, fz], [len, 0, chord], 'fin');
      else fl.box([x0, fy - 0.5, fz], [len, 1, chord], 'fin');
      flippers.push({ name: `flipper_${n}`, side, front });
    }
  };
  const front_z = front + Math.round(B.len * 0.18);
  const back_z = back - Math.round(B.len * 0.28);
  mk(true, s.flippers.front);
  if (s.flippers.back) mk(false, s.flippers.back);

  return {
    kind,
    mb,
    neck: nk.names,
    tail: tl.names,
    head: 'head',
    jaw: 'jaw',
    legs: [],
    arms: [],
    wings: [],
    flippers,
    a: {
      hipY: y,
      bodyTop: y + B.h / 2,
      bodyFront: front,
      bodyBack: back,
      bodyW: B.w,
      bodyH: B.h,
      bodyY: y,
      headPivot,
      headLen: s.head.len + s.head.snoutLen,
      headW: s.head.w,
      headH: s.head.h,
      craniumZ0: hd.cranZ0,
      snoutTip: hd.tip,
      headTop: hd.top,
      jawY: hd.mouthY,
      seat: [0, y + B.h / 2, front + Math.round(B.len * 0.35)],
      tailEnd: tl.end,
    },
  };
}

// ---------------------------------------------------------------------------
// snakes

export interface SnakeSpec {
  w: number;
  h: number;
  segments: number;
  segLen: number;
  head: HeadSpec;
}

export function snake(id: string, s: SnakeSpec): Rig {
  const mb = new ModelBuilder(id);
  mb.bone('root', undefined, [0, 0, 0]);
  const y = s.h / 2;
  const total = s.segments * s.segLen;
  const front = -Math.round(total * 0.3);
  const body = mb.bone('body', 'root', [0, y, front]);
  body.box([-s.w / 2, 0, front], [s.w, s.h, s.segLen + 1], 'skin');
  // head is in front of the first segment
  const headPivot: Vec3 = [0, y, front + 1];
  mb.bone('neck0', 'body', [0, y, front]);
  const hd = buildHead(mb, 'neck0', headPivot, 0, s.head);
  // body segments trail behind as the "tail" chain, tapering in the last third
  const tail: string[] = [];
  let prev = 'body';
  let z = front + s.segLen;
  for (let i = 0; i < s.segments - 1; i++) {
    const t = i / (s.segments - 1);
    const taper = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4 * 0.8;
    const w = Math.max(1, Math.round(s.w * taper)), h = Math.max(1, Math.round(s.h * taper));
    const name = `tail${i}`;
    const b = mb.bone(name, prev, [0, y, z]);
    b.box([-w / 2, 0, z - 0.5], [w, h, s.segLen + 1], 'skin');
    tail.push(name);
    prev = name;
    z += s.segLen;
  }
  return {
    kind: 'snake',
    mb,
    neck: ['neck0'],
    tail,
    head: 'head',
    jaw: 'jaw',
    legs: [],
    arms: [],
    wings: [],
    flippers: [],
    a: {
      hipY: y,
      bodyTop: s.h,
      bodyFront: front,
      bodyBack: z,
      bodyW: s.w,
      bodyH: s.h,
      bodyY: y,
      headPivot,
      headLen: s.head.len + s.head.snoutLen,
      headW: s.head.w,
      headH: s.head.h,
      craniumZ0: hd.cranZ0,
      snoutTip: hd.tip,
      headTop: hd.top,
      jawY: hd.mouthY,
      seat: [0, s.h, 0],
      tailEnd: z,
    },
  };
}
