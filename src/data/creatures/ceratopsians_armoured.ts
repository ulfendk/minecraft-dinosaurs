import { quadruped, theropod, type Rig } from '../../model/rigs.js';
import type { Material } from '../../model/types.js';
import * as F from '../../creatures/features.js';
import type { CreatureDef } from '../types.js';
import { BROWSE, HERB, SND } from '../common.js';

// ---------------------------------------------------------------------------
// local part helpers (head-space parts for ceratopsians, armour bits)

/** Hooked parrot beak in front of the snout, upper on the head and lower on the jaw. */
function beak(r: Rig, o: { len: number; h?: number; w?: number }) {
  const h = r.mb.get(r.head);
  const jaw = r.mb.get(r.jaw!);
  const tip = r.a.snoutTip;
  const y = r.a.jawY;
  const w = o.w ?? 3;
  const bh = o.h ?? 3;
  h.box([-w / 2, y - 1, tip - o.len], [w, bh + 1, o.len + 1], 'horn', { tags: ['jawU'] });
  h.box([-(w - 1) / 2, y - 2, tip - o.len], [w - 1, 1, 1], 'horn'); // hook
  jaw.box([-(w - 1) / 2, y - 2, tip - o.len + 1], [w - 1, 2, o.len + 1], 'horn', { tags: ['jawL'] });
}

/**
 * Ceratopsian frill on its own bone (so spikes and knobs lean with it): a shield
 * that widens upwards, built from stacked slabs so it reads rounded, with optional
 * edge knobs (epoccipitals) and spikes radiating from the rim.
 */
function shield(
  r: Rig,
  o: { w: number; h: number; tilt: number; knobs?: number; spikes?: { n: number; len: number; spread?: number }; mat?: Material; up?: number; window?: boolean; patch?: string; patch2?: string; thick?: number },
) {
  const z = r.a.headPivot[2] - 2;
  const y0 = r.a.headTop - 3 + (o.up ?? 0);
  const fb = r.mb.bone('frill', r.head, [0, y0, z + 1], [-o.tilt, 0, 0]);
  const rows: [number, number][] = [
    [0.6, 0.25],
    [1.0, 0.55],
    [0.75, 0.2],
  ];
  let y = y0;
  const mat = o.mat ?? 'skin';
  // display colour patches painted on both faces of the shield (decals are in unrotated space)
  if (o.patch) {
    const cy = y0 + o.h * 0.55;
    r.mb.decal({ kind: 'colour', colour: o.patch, center: [0, cy, z + 1], radius: [o.w * 0.42, o.h * 0.4, 3] });
    if (o.patch2) r.mb.decal({ kind: 'colour', colour: o.patch2, center: [0, cy, z + 1], radius: [o.w * 0.2, o.h * 0.2, 3] });
  }
  for (const [fw, fh] of rows) {
    const w = Math.max(2, Math.round(o.w * fw));
    const hh = Math.max(1, Math.round(o.h * fh));
    fb.box([-w / 2, y, z], [w, hh, o.thick ?? 2], mat);
    y += hh;
  }
  const top = y;
  if (o.window) fb.box([-Math.round(o.w * 0.3), y0 + Math.round(o.h * 0.35), z + 2], [Math.round(o.w * 0.6), Math.round(o.h * 0.35), 0], 'dark');
  // rim follows an arc over the upper half of the shield
  const rim = (t: number) => {
    const a = Math.PI * t;
    return { x: -Math.cos(a) * (o.w * 0.47), y: y0 + (top - y0) * 0.45 + Math.sin(a) * (top - y0) * 0.55 - 0.5, a };
  };
  if (o.knobs) {
    for (let i = 0; i < o.knobs; i++) {
      const p = rim((i + 0.5) / o.knobs);
      fb.box([p.x - 0.5, p.y, z + 0.5], [1, 1, 1], 'horn', { inflate: 0.35 });
    }
  }
  if (o.spikes) {
    const { n, len, spread = 70 } = o.spikes;
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : 0.5 + (i / (n - 1) - 0.5) * (spread / 90);
      const p = rim(t);
      // lean the spike outwards along the rim normal (positive z-rotation tilts +x outwards)
      const ang = (0.5 - t) * -180;
      fb.box([p.x - 1, p.y - 1, z], [2, len, 2], 'horn', { rotation: [-8, 0, ang], pivot: [p.x, p.y, z + 1] });
    }
  }
}

/**
 * Diamond-shaped plate: a square slab turned 45° about X so it reads as a kite
 * in profile; the lower corner sinks into the body. `h` is the visible height.
 */
function kitePlate(r: Rig, bone: string, x: number, y: number, z: number, h: number, lean = 8) {
  const s = Math.max(2, Math.round(h / 1.15));
  const cy = y + h - s * 0.72;
  r.mb.get(bone).box([x - 0.5, cy - s / 2, z - s / 2], [1, s, s], 'plate', { rotation: [45, 0, x > 0 ? lean : -lean], pivot: [x, cy, z] });
}

/** Rounded armour hump on top of the body shell (ankylosaurs). */
function shellDome(r: Rig, inset = 3, h = 2) {
  const b = r.mb.get('body');
  const { bodyW, bodyTop, bodyFront, bodyBack } = r.a;
  b.box([-bodyW / 2 + inset, bodyTop + 1, bodyFront + inset], [bodyW - inset * 2, h, bodyBack - bodyFront - inset * 2], 'armor');
  b.box([-bodyW / 2 + inset * 2, bodyTop + 1 + h, bodyFront + inset * 2], [Math.max(2, bodyW - inset * 4), 1, Math.max(2, bodyBack - bodyFront - inset * 4)], 'armor');
}

/** Long thin spike pair on a bone, leaning back and outwards. */
function spikePair(r: Rig, bone: string, x: number, y: number, z: number, len: number, out = 25, back = -35, w = 1) {
  r.mb.get(bone).pair([x, y, z], [w, len, w], 'plate', { rotation: [back, 0, out], pivot: [x + w / 2, y, z + w / 2] });
}

/** Sideways spike pair (shoulder spikes): horizontal, pointing out and slightly forward. */
function sideSpikes(r: Rig, bone: string, x: number, y: number, z: number, len: number, fwd = 20, w = 2) {
  r.mb.get(bone).pair([x, y, z], [len, w, w], 'plate', { rotation: [0, fwd, 12], pivot: [x, y + w / 2, z + w / 2] });
}

/**
 * Rounds out a quadruped torso: a narrower cap along the spine, a sagging belly and
 * muscle masses at shoulders and hips, so the body reads as a barrel rather than a slab.
 */
function bulkQuad(r: Rig, o: { cap?: number; sag?: number; shoulder?: number; hip?: number; capMat?: Material } = {}) {
  const b = r.mb.get('body');
  const { bodyW: w, bodyH: h, bodyFront: f, bodyBack: k, bodyY: y } = r.a;
  const len = k - f;
  const top = y + h / 2;
  const bot = y - h / 2;
  const cap = o.cap ?? 2;
  if (cap > 0) {
    b.box([-(w - 4) / 2, top - 1, f + 3], [w - 4, cap + 1, len - 6], o.capMat ?? 'skin');
    if (cap > 1) b.box([-(w - 8) / 2, top + cap - 1, f + 6], [Math.max(2, w - 8), 1, len - 12], o.capMat ?? 'skin');
  }
  const sag = o.sag ?? 2;
  if (sag > 0) b.box([-(w - 3) / 2, bot - sag, f + len * 0.22], [w - 3, sag + 1, len * 0.5], 'skin');
  // side muscle bulges over the shoulder and the hip
  const sh = o.shoulder ?? 1;
  const hp = o.hip ?? 1.5;
  b.pair([w / 2 - 1, y - h * 0.3, f + len * 0.1], [1 + sh, h * 0.6, len * 0.22], 'skin');
  b.pair([w / 2 - 1, y - h * 0.25, k - len * 0.36], [1 + hp, h * 0.65, len * 0.28], 'skin');
}

/** Thickens the upper leg bones (humerus/thigh muscle) of a quadruped. */
function muscleLegs(r: Rig, front = 2, back = 3) {
  for (const leg of r.legs) {
    const bone = r.mb.get(leg.chain[0]);
    const c = bone.bone.cubes[0];
    const [x0, y0, z0] = c.origin;
    const [w, hgt, d] = c.size;
    const add = leg.front ? front : back;
    const mh = Math.round(hgt * (leg.front ? 0.55 : 0.65));
    bone.box([x0 - add / 2, y0 + hgt - mh, z0 - add / 2 - (leg.front ? 0 : 1)], [w + add, mh, d + add + (leg.front ? 0 : 2)], 'skin', { tags: ['limb'] });
  }
}

/** Rows of raised oval osteoderms over the back (ankylosaurs/nodosaurs). */
function osteoderms(r: Rig, o: { rows: number; cols: number; size?: number; from?: number; to?: number; spread?: number; lift?: number }) {
  const b = r.mb.get('body');
  const { bodyW: w, bodyFront: f, bodyBack: k, bodyY: y, bodyH: h } = r.a;
  const from = o.from ?? f + 2;
  const to = o.to ?? k - 3;
  const sz = o.size ?? 2;
  const spread = o.spread ?? 0.42;
  for (let i = 0; i < o.rows; i++) {
    const z = from + ((to - from) * i) / Math.max(1, o.rows - 1);
    for (let j = 0; j < o.cols; j++) {
      const t = o.cols === 1 ? 0 : j / (o.cols - 1) - 0.5;
      const x = t * w * 2 * spread;
      // follow the curve of the back: lower towards the flanks
      const yy = y + h / 2 + (o.lift ?? 2) - Math.abs(t) * Math.abs(t) * h * 0.9;
      b.box([x - sz / 2, yy, z - sz / 2 + (j % 2) * 0.8], [sz, Math.max(1, sz - 1), sz], 'plate', { inflate: 0.1 });
    }
  }
}

/** Flat triangular lateral spike made of two stacked slabs (points outward). */
function flankSpike(r: Rig, bone: string, x: number, y: number, z: number, len: number, back = 15, w = 3) {
  const b = r.mb.get(bone);
  b.pair([x, y, z], [len, 1, w], 'plate', { rotation: [0, back, 0], pivot: [x, y, z + w / 2] });
  b.pair([x, y, z + 0.5], [Math.max(1, Math.round(len * 0.55)), 1, Math.max(1, w - 1)], 'plate', { rotation: [0, back, 0], pivot: [x, y, z + w / 2], inflate: 0.2 });
}

const herb = { diet: 'herbivore' as const, habitat: 'land' as const };

// ---------------------------------------------------------------------------

export const ceratopsiansArmoured: CreatureDef[] = [
  {
    ...herb,
    id: 'triceratops',
    name: 'Triceratops',
    info: 'Its three horns and bony frill were used for display and sparring; it was one of the last non-avian dinosaurs to live.',
    period: 'Cretaceous',
    group: 'ceratopsian',
    lengthM: 9,
    scale: 1.6,
    temperament: 'neutral',
    health: 120,
    attack: 12,
    speed: 0.22,
    food: BROWSE,
    tame: { items: ['dino:fern', 'dino:cycad_cone', 'dino:ginkgo_nut'] },
    ride: { mode: 'ground', seats: 2, jump: 0.5 },
    spawn: { biomes: ['prehistoric', 'plains', 'savanna'], weight: 6, herd: [2, 4] },
    sounds: SND.herd,
    prey: true,
    palette: {
      back: '#55513a', side: '#77704f', belly: '#c9bc98', accent: '#7c4c33', accent2: '#b08c58', horn: '#ddd2b6', eye: '#c08a2a',
      pattern: { type: 'mottled', colour: '#3d3a28', scale: 5, coverage: 0.55 },
    },
    build() {
      const r = quadruped('triceratops', {
        frontLeg: 13,
        backLeg: 16,
        body: { len: 30, w: 18, h: 15, belly: 2 },
        neck: { len: 4, w: 12, h: 12, angle: -6 },
        head: { len: 14, w: 15, h: 15, snoutLen: 11, snoutW: 10, snoutH: 11, jawH: 4, eyeR: 1.1, cheek: 2 },
        headAngle: 10,
        tail: { len: 20, segments: 3, w: 10, h: 9, lift: 0 },
        legs: { frontW: 7, backW: 8, footLen: 2, elbow: 12, sprawl: 1 },
      });
      bulkQuad(r, { cap: 2, sag: 2, shoulder: 1.5, hip: 2 });
      muscleLegs(r, 2, 3);
      beak(r, { len: 4, h: 5, w: 5 });
      shield(r, { w: 30, h: 21, tilt: 64, knobs: 13, up: 1, thick: 3, patch: '#7c4c33', patch2: '#a8844a' });
      // epijugal cheek horns flaring down and out
      r.mb.get(r.head).pair([r.a.headW / 2 - 1, r.a.jawY - 3, r.a.craniumZ0 + 3], [2, 4, 2], 'horn', { rotation: [-20, 0, -40], pivot: [r.a.headW / 2, r.a.jawY - 1, r.a.craniumZ0 + 4] });
      F.hornPair(r, { fromTip: 14, len: 16, w: 2, tilt: 62, splay: 6, up: -1 });
      F.noseHorn(r, { fromTip: 4, len: 4, w: 2, tilt: 15, up: 7 });
      return r;
    },
  },
  {
    ...herb,
    id: 'styracosaurus',
    name: 'Styracosaurus',
    info: 'A crown of up to six long spikes radiated from its frill, and its single nose horn could reach 60 cm.',
    period: 'Cretaceous',
    group: 'ceratopsian',
    lengthM: 5.5,
    scale: 1.4,
    temperament: 'neutral',
    health: 80,
    attack: 10,
    speed: 0.24,
    food: BROWSE,
    tame: { items: ['dino:fern', 'dino:cycad_cone', 'dino:ginkgo_nut'] },
    ride: { mode: 'ground', seats: 1, jump: 0.55 },
    spawn: { biomes: ['prehistoric', 'plains', 'forest'], weight: 5, herd: [2, 4] },
    sounds: { ...SND.herd, pitch: 0.65 },
    prey: true,
    palette: {
      back: '#4f5a3e', side: '#717b55', belly: '#d0c59e', accent: '#53624e', accent2: '#b89a52', horn: '#e2d8bc', eye: '#c89a30',
      pattern: { type: 'stripes', colour: '#33402a', scale: 6, coverage: 0.4 },
    },
    build() {
      const r = quadruped('styracosaurus', {
        frontLeg: 11,
        backLeg: 14,
        body: { len: 26, w: 15, h: 14, belly: 2 },
        neck: { len: 4, w: 10, h: 10, angle: -8 },
        head: { len: 11, w: 12, h: 12, snoutLen: 9, snoutW: 8, snoutH: 9, jawH: 3, cheek: 1 },
        headAngle: 10,
        tail: { len: 18, segments: 3, w: 8, h: 8, lift: 0 },
        legs: { frontW: 6, backW: 7, footLen: 2, elbow: 10, sprawl: 1 },
      });
      bulkQuad(r, { cap: 2, sag: 2 });
      muscleLegs(r, 2, 3);
      beak(r, { len: 3, h: 4, w: 4 });
      shield(r, { w: 18, h: 12, tilt: 62, knobs: 5, thick: 3, spikes: { n: 6, len: 14, spread: 78 }, patch: '#5c4a36', patch2: '#b89a52' });
      F.noseHorn(r, { fromTip: 3, len: 13, w: 2, tilt: 14, up: 6 });
      F.hornPair(r, { fromTip: 12, len: 2, w: 1, tilt: 30, splay: 0 });
      return r;
    },
  },
  {
    ...herb,
    id: 'pachyrhinosaurus',
    name: 'Pachyrhinosaurus',
    info: 'Instead of a nose horn it had a massive, flattened bony boss, likely used for head-shoving contests.',
    period: 'Cretaceous',
    group: 'ceratopsian',
    lengthM: 7,
    scale: 1.5,
    temperament: 'neutral',
    health: 100,
    attack: 11,
    speed: 0.23,
    food: BROWSE,
    tame: { items: ['dino:fern', 'dino:cycad_cone', 'dino:ginkgo_nut'] },
    ride: { mode: 'ground', seats: 1, jump: 0.5 },
    spawn: { biomes: ['prehistoric', 'taiga', 'plains'], weight: 4, herd: [2, 4] },
    sounds: { ...SND.herd, pitch: 0.5 },
    prey: true,
    palette: {
      back: '#5e4630', side: '#80654a', belly: '#d8c4a0', accent: '#6a4430', accent2: '#a8805a', horn: '#d9ccb0', eye: '#c98a2a',
      pattern: { type: 'bands', colour: '#43301f', scale: 6, coverage: 0.35 },
    },
    build() {
      const r = quadruped('pachyrhinosaurus', {
        frontLeg: 12,
        backLeg: 15,
        body: { len: 28, w: 17, h: 16, belly: 2 },
        neck: { len: 4, w: 11, h: 11, angle: -8 },
        head: { len: 12, w: 12, h: 13, snoutLen: 10, snoutW: 9, snoutH: 10, jawH: 4 },
        headAngle: 16,
        tail: { len: 18, segments: 3, w: 9, h: 8, lift: 0 },
        legs: { frontW: 7, backW: 8, footLen: 2, elbow: 10, sprawl: 1 },
      });
      bulkQuad(r, { cap: 2, sag: 2, hip: 2 });
      muscleLegs(r, 2, 3);
      beak(r, { len: 3, h: 4, w: 5 });
      const hd = r.mb.get(r.head);
      // nasal boss: big rough pad covering the snout and brow
      hd.box([-4, r.a.headTop - 1, r.a.snoutTip + 2], [8, 3, 13], 'horn', { inflate: 0.2 });
      hd.box([-3, r.a.headTop + 1, r.a.snoutTip + 4], [6, 2, 9], 'horn');
      shield(r, { w: 22, h: 14, tilt: 62, knobs: 6, thick: 3, spikes: { n: 2, len: 8, spread: 24 }, patch: '#6a4430' });
      return r;
    },
  },
  {
    ...herb,
    id: 'protoceratops',
    name: 'Protoceratops',
    info: 'A sheep-sized ceratopsian from Mongolia, famously fossilised locked in combat with a Velociraptor.',
    period: 'Cretaceous',
    group: 'ceratopsian',
    lengthM: 1.8,
    scale: 1.1,
    temperament: 'passive',
    health: 26,
    speed: 0.25,
    food: HERB,
    tame: { items: ['dino:fern', 'dino:ginkgo_nut', 'minecraft:wheat'] },
    spawn: { biomes: ['prehistoric', 'desert', 'mesa', 'savanna'], weight: 8, herd: [2, 4] },
    sounds: { ...SND.small, pitch: 0.6 },
    prey: true,
    palette: {
      back: '#8f7450', side: '#b09465', belly: '#e2d2b0', accent: '#9a6a42', accent2: '#c8a46a', horn: '#e8dcbc', eye: '#3a2a18',
      pattern: { type: 'spots', colour: '#6f5532', scale: 3, coverage: 0.45 },
    },
    build() {
      const r = quadruped('protoceratops', {
        frontLeg: 6,
        backLeg: 7,
        body: { len: 13, w: 8, h: 7 },
        neck: { len: 2, w: 5, h: 5, angle: -5 },
        head: { len: 6, w: 6, h: 7, snoutLen: 5, snoutW: 4, snoutH: 6, jawH: 2, eyeR: 0.8 },
        headAngle: 12,
        tail: { len: 11, segments: 3, w: 4, h: 5, lift: 1, tipW: 1, tipH: 2 },
        legs: { frontW: 3, backW: 3, footLen: 1, elbow: 10 },
      });
      bulkQuad(r, { cap: 1, sag: 1, shoulder: 0.5, hip: 1 });
      muscleLegs(r, 1, 2);
      beak(r, { len: 2, h: 3, w: 3 });
      shield(r, { w: 12, h: 9, tilt: 58, patch: '#9a6a42' });
      // deep, flattened tail typical of Protoceratops
      r.mb.get(r.tail[0]).box([-0.5, r.a.bodyY + 2, r.a.bodyBack], [1, 3, 6], 'skin');
      return r;
    },
  },
  {
    ...herb,
    id: 'psittacosaurus',
    name: 'Psittacosaurus',
    info: 'The "parrot lizard" walked on two legs and had a row of bristle-like quills along its tail.',
    period: 'Cretaceous',
    group: 'ceratopsian',
    lengthM: 2,
    scale: 1.0,
    temperament: 'passive',
    health: 20,
    speed: 0.28,
    food: HERB,
    tame: { items: ['dino:fern', 'dino:ginkgo_nut', 'minecraft:wheat_seeds'] },
    spawn: { biomes: ['prehistoric', 'forest', 'jungle'], weight: 8, herd: [2, 3] },
    sounds: { ...SND.small, pitch: 0.75 },
    prey: true,
    palette: {
      back: '#5a4632', side: '#8a6a48', belly: '#e2d3b4', accent: '#3b2a1c', accent2: '#c9a676', horn: '#7d6a50', eye: '#2a1e12',
      pattern: { type: 'spots', colour: '#3e2f20', scale: 2.5, coverage: 0.5 },
    },
    build() {
      const r = theropod('psittacosaurus', {
        hipY: 10,
        body: { len: 13, w: 6, h: 6, chest: 1, tilt: -10 },
        neck: { len: 3, w: 4, h: 4, angle: 22 },
        head: { len: 4, w: 5, h: 5, snoutLen: 1, snoutW: 4, snoutH: 3, jawH: 2, eyeR: 0.8 },
        tail: { len: 16, segments: 4, lift: 2, w: 4, h: 4, tipW: 1, tipH: 1 },
        arms: { len: 4, w: 1, angle: -30 },
        legs: { thighW: 3, footLen: 3, footW: 2 },
      });
      beak(r, { len: 1, h: 2, w: 3 });
      // jugal (cheek) horns pointing sideways
      r.mb.get(r.head).pair([2.5, r.a.jawY - 1, r.a.craniumZ0 + 1], [2, 1, 1], 'horn', { rotation: [0, 0, 20], pivot: [2.5, r.a.jawY, r.a.craniumZ0 + 1] });
      // tail quills
      r.tail.slice(0, 3).forEach((t, i) => {
        const b = r.mb.get(t);
        const [, py, pz] = b.pivot;
        for (let k = 0; k < 2; k++) b.box([-0.5, py + 1, pz + 1 + k * 2], [1, 4 - i, 1], 'quill', { rotation: [-35, 0, 0], pivot: [0, py + 1, pz + 1 + k * 2] });
      });
      return r;
    },
  },
  {
    ...herb,
    id: 'stegosaurus',
    name: 'Stegosaurus',
    info: 'Its brain was about the size of a lime, but its spiked tail "thagomizer" could pierce an Allosaurus bone.',
    period: 'Jurassic',
    group: 'thyreophoran',
    lengthM: 9,
    scale: 1.6,
    temperament: 'neutral',
    health: 110,
    attack: 13,
    speed: 0.2,
    food: BROWSE,
    tame: { items: ['dino:fern', 'dino:horsetail', 'dino:cycad_cone'] },
    ride: { mode: 'ground', seats: 2, jump: 0.45 },
    spawn: { biomes: ['prehistoric', 'plains', 'forest'], weight: 5, herd: [1, 3] },
    sounds: { ...SND.herd, pitch: 0.45 },
    prey: true,
    palette: {
      back: '#56603f', side: '#767e57', belly: '#d0c8a2', accent: '#8a5634', accent2: '#c09a5a', plateTip: '#9a6a44', eye: '#c0902a',
      pattern: { type: 'blotches', colour: '#3c4629', scale: 5, coverage: 0.5 },
    },
    build() {
      const r = quadruped('stegosaurus', {
        frontLeg: 10,
        backLeg: 19,
        body: { len: 30, w: 14, h: 15, belly: 2, hump: 2 },
        neck: { len: 8, w: 7, h: 7, angle: -12, segments: 2 },
        head: { len: 5, w: 5, h: 5, snoutLen: 4, snoutW: 4, snoutH: 3, jawH: 2, eyeR: 0.7 },
        headAngle: 18,
        tail: { len: 30, segments: 4, w: 9, h: 9, lift: 0 },
        legs: { frontW: 6, backW: 8, footLen: 2, elbow: 8, knee: -6 },
      });
      bulkQuad(r, { cap: 2, sag: 2, shoulder: 1, hip: 2.5 });
      muscleLegs(r, 2, 4);
      beak(r, { len: 1, h: 2, w: 3 });
      // two staggered rows of kite-shaped plates, tallest over the hips
      const n = 8;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const z = r.a.bodyFront + 2 + (r.a.bodyBack - r.a.bodyFront - 4) * t;
        const h = Math.round(3 + 7 * Math.sin(Math.PI * (0.12 + t * 0.78)));
        kitePlate(r, 'body', i % 2 ? 1.2 : -1.2, r.a.bodyTop + 1, z, h, 12);
      }
      r.tail.slice(0, 2).forEach((tn, ti) => {
        const [, py, pz] = r.mb.get(tn).pivot;
        for (let k = 0; k < 2; k++) kitePlate(r, tn, k % 2 ? 1 : -1, py, pz + 3 + k * 5, 8 - ti * 2 - k);
      });
      // small plates along the neck
      for (const [i, n] of r.neck.entries()) {
        const b = r.mb.get(n);
        const [, py, pz] = b.pivot;
        b.box([i % 2 ? 0.2 : -1.2, py + 2, pz - 4], [1, 3, 3], 'plate');
      }
      F.thagomizer(r, { len: 8, pairs: 2 });
      return r;
    },
  },
  {
    ...herb,
    id: 'kentrosaurus',
    name: 'Kentrosaurus',
    info: 'An African cousin of Stegosaurus with small plates up front and long, sharp spikes along its hips and tail.',
    period: 'Jurassic',
    group: 'thyreophoran',
    lengthM: 4.5,
    scale: 1.3,
    temperament: 'neutral',
    health: 60,
    attack: 9,
    speed: 0.22,
    food: HERB,
    tame: { items: ['dino:fern', 'dino:horsetail', 'dino:cycad_cone'] },
    spawn: { biomes: ['prehistoric', 'savanna', 'jungle'], weight: 5, herd: [1, 3] },
    sounds: { ...SND.armoured, pitch: 0.7 },
    prey: true,
    palette: {
      back: '#7a6040', side: '#9a7d55', belly: '#e0cfa8', accent: '#6b3a22', accent2: '#d8a05a', plateTip: '#efe1c0', eye: '#2c1e10',
      pattern: { type: 'stripes', colour: '#553f28', scale: 4, coverage: 0.45 },
    },
    build() {
      const r = quadruped('kentrosaurus', {
        frontLeg: 8,
        backLeg: 13,
        body: { len: 20, w: 10, h: 10, belly: 1 },
        neck: { len: 5, w: 5, h: 5, angle: -10 },
        head: { len: 4, w: 4, h: 4, snoutLen: 3, snoutW: 3, snoutH: 2, jawH: 1, eyeR: 0.6 },
        headAngle: 16,
        tail: { len: 22, segments: 4, w: 6, h: 6, lift: 4 },
        legs: { frontW: 4, backW: 6, footLen: 1, elbow: 8 },
      });
      bulkQuad(r, { cap: 1, sag: 1, hip: 2 });
      muscleLegs(r, 1, 3);
      beak(r, { len: 1, h: 2, w: 2 });
      // paired plates over neck and shoulders, turning into spikes towards the hips
      const b = r.mb.get('body');
      const y = r.a.bodyTop - 1;
      for (let i = 0; i < 4; i++) {
        const z = r.a.bodyFront + 2 + i * 3;
        b.pair([0.3, y, z], [1, 4 + i, 3], 'plate', { rotation: [0, 0, -12], pivot: [0.3, y, z] });
      }
      for (let i = 0; i < 3; i++) spikePair(r, 'body', 1, y - 1, r.a.bodyFront + 14 + i * 3, 7 + i, 18, -30);
      // shoulder spikes (parascapular)
      sideSpikes(r, 'body', r.a.bodyW / 2 - 1, r.a.bodyY - 1, r.a.bodyFront + 4, 7, 35, 1);
      r.tail.forEach((t, i) => {
        const tb = r.mb.get(t);
        const [, py, pz] = tb.pivot;
        spikePair(r, t, 0.5, py + 1, pz + 2, Math.max(3, 8 - i), 22 + i * 4, -55);
      });
      return r;
    },
  },
  {
    ...herb,
    id: 'ankylosaurus',
    name: 'Ankylosaurus',
    info: 'A living tank: bony armour covered even its eyelids, and its tail club could break the bones of a predator.',
    period: 'Cretaceous',
    group: 'thyreophoran',
    lengthM: 8,
    scale: 1.6,
    temperament: 'neutral',
    health: 140,
    attack: 14,
    speed: 0.18,
    food: HERB,
    tame: { items: ['dino:fern', 'dino:horsetail', 'dino:cycad_cone'] },
    ride: { mode: 'ground', seats: 2, jump: 0.4 },
    spawn: { biomes: ['prehistoric', 'plains', 'forest'], weight: 4, herd: [1, 2] },
    sounds: SND.armoured,
    palette: {
      back: '#6a5a40', side: '#887455', belly: '#d2c29e', accent: '#7b4a2a', accent2: '#b88a52', plateTip: '#a8977a', horn: '#cdbf9e', eye: '#c08a2a',
      pattern: { type: 'mottled', colour: '#4a3e2a', scale: 4, coverage: 0.5 }, spine: true,
    },
    build() {
      const r = quadruped('ankylosaurus', {
        frontLeg: 7,
        backLeg: 9,
        body: { len: 30, w: 22, h: 12, belly: 1 },
        neck: { len: 4, w: 11, h: 8, angle: -4 },
        head: { len: 8, w: 13, h: 8, snoutLen: 3, snoutW: 9, snoutH: 5, jawH: 2, eyeR: 0.8 },
        headAngle: 8,
        tail: { len: 24, segments: 4, w: 9, h: 6, lift: 2, tipW: 3, tipH: 3 },
        legs: { frontW: 6, backW: 7, sprawl: 1.5, footLen: 2, elbow: 4, knee: -4 },
      });
      beak(r, { len: 1, h: 3, w: 6 });
      bulkQuad(r, { cap: 2, sag: 1, shoulder: 1, hip: 1 });
      muscleLegs(r, 2, 2);
      osteoderms(r, { rows: 6, cols: 5, size: 2, spread: 0.46 });
      // flat triangular spikes along the flanks, longest over the hips
      for (let i = 0; i < 5; i++) flankSpike(r, 'body', r.a.bodyW / 2 + 0.5, r.a.bodyY - 1, r.a.bodyFront + 3 + i * 5.5, 3 + (i % 3), 10 + i * 4, 3);
      // armoured skull roof and backward-pointing squamosal horns
      const hd = r.mb.get(r.head);
      hd.box([-r.a.headW / 2 - 0.5, r.a.headTop - 1, r.a.craniumZ0 + 1], [r.a.headW + 1, 2, 8], 'armor');
      hd.pair([r.a.headW / 2 - 1, r.a.headTop - 2, r.a.headPivot[2] - 2], [2, 2, 4], 'horn', { rotation: [0, -30, 0], pivot: [r.a.headW / 2, r.a.headTop - 1, r.a.headPivot[2] - 1] });
      hd.pair([r.a.headW / 2 - 1, r.a.jawY - 2, r.a.headPivot[2] - 3], [2, 2, 3], 'horn', { rotation: [0, -25, -15], pivot: [r.a.headW / 2, r.a.jawY - 1, r.a.headPivot[2] - 2] });
      // osteoderm rings on the tail
      r.tail.slice(0, 3).forEach((t) => {
        const tb = r.mb.get(t);
        const [, py, pz] = tb.pivot;
        tb.pair([1.5, py + 0.5, pz + 2], [2, 1, 2], 'plate', { rotation: [0, 0, -40], pivot: [1.5, py + 1, pz + 2] });
      });
      F.tailClub(r, { w: 10, h: 5, len: 6 });
      return r;
    },
  },
  {
    ...herb,
    id: 'euoplocephalus',
    name: 'Euoplocephalus',
    info: 'Its name means "well-armed head" — it even had bony shutters that could close over its eyes.',
    period: 'Cretaceous',
    group: 'thyreophoran',
    lengthM: 6,
    scale: 1.45,
    temperament: 'neutral',
    health: 110,
    attack: 12,
    speed: 0.19,
    food: HERB,
    tame: { items: ['dino:fern', 'dino:horsetail', 'dino:cycad_cone'] },
    spawn: { biomes: ['prehistoric', 'forest', 'taiga'], weight: 4, herd: [1, 2] },
    sounds: { ...SND.armoured, pitch: 0.6 },
    palette: {
      back: '#5a5242', side: '#7a705a', belly: '#cfc4a8', accent: '#463f32', accent2: '#8e8676', plateTip: '#9a8f78', horn: '#c2b79c', eye: '#a8762a',
      pattern: { type: 'mottled', colour: '#463f32', scale: 4, coverage: 0.45 },
    },
    build() {
      const r = quadruped('euoplocephalus', {
        frontLeg: 7,
        backLeg: 9,
        body: { len: 26, w: 18, h: 12, belly: 1, hump: 1 },
        neck: { len: 3, w: 10, h: 8, angle: -4 },
        head: { len: 7, w: 11, h: 8, snoutLen: 3, snoutW: 8, snoutH: 5, jawH: 2, eyeR: 0.7 },
        headAngle: 8,
        tail: { len: 22, segments: 4, w: 8, h: 6, lift: 2, tipW: 3, tipH: 3 },
        legs: { frontW: 5, backW: 6, sprawl: 1.5, footLen: 2, elbow: 4, knee: -4 },
      });
      beak(r, { len: 1, h: 3, w: 5 });
      bulkQuad(r, { cap: 2, sag: 1, shoulder: 1, hip: 1 });
      muscleLegs(r, 2, 2);
      osteoderms(r, { rows: 6, cols: 4, size: 2, spread: 0.4 });
      // bands of tall conical scutes (keeled osteoderms) down the back
      const b = r.mb.get('body');
      for (let i = 0; i < 5; i++) {
        const z = r.a.bodyFront + 4 + i * 4.5;
        b.pair([3, r.a.bodyTop + 2, z], [2, 3, 2], 'plate', { rotation: [0, 0, -8], pivot: [4, r.a.bodyTop + 2, z + 1] });
      }
      for (let i = 0; i < 4; i++) flankSpike(r, 'body', r.a.bodyW / 2 + 0.5, r.a.bodyY - 1, r.a.bodyFront + 4 + i * 5, 2, 12, 2);
      // bony eyelids over the eyes and short head horns
      const hd = r.mb.get(r.head);
      const eyeZ = r.a.craniumZ0 + 2;
      hd.pair([r.a.headW / 2 - 0.5, r.a.headTop - 2, eyeZ - 1], [1, 1, 3], 'horn', { inflate: 0.25 });
      hd.box([-r.a.headW / 2 - 0.5, r.a.headTop - 1, r.a.craniumZ0 + 1], [r.a.headW + 1, 2, 7], 'armor');
      hd.pair([r.a.headW / 2 - 1.5, r.a.headTop - 1, r.a.headPivot[2] - 2], [2, 3, 2], 'horn', { rotation: [-35, 0, -25], pivot: [r.a.headW / 2 - 0.5, r.a.headTop - 1, r.a.headPivot[2] - 1] });
      // rounder, double-lobed club
      const last = r.mb.get(r.tail[r.tail.length - 1]);
      const [, py] = last.pivot;
      const z = r.a.tailEnd;
      last.pair([0, py - 3, z - 6], [4, 5, 6], 'armor', { inflate: 0.3 });
      last.box([-2, py - 2, z - 7], [4, 3, 2], 'armor');
      return r;
    },
  },
  {
    ...herb,
    id: 'nodosaurus',
    name: 'Nodosaurus',
    info: 'A club-less armoured dinosaur covered in rows of bony knobs; one relative was fossilised so well its reddish skin colour survived.',
    period: 'Cretaceous',
    group: 'thyreophoran',
    lengthM: 6,
    scale: 1.4,
    temperament: 'neutral',
    health: 100,
    attack: 10,
    speed: 0.19,
    food: HERB,
    tame: { items: ['dino:fern', 'dino:horsetail', 'dino:cycad_cone'] },
    spawn: { biomes: ['prehistoric', 'forest', 'plains'], weight: 4, herd: [1, 2] },
    sounds: { ...SND.armoured, pitch: 0.5 },
    palette: {
      back: '#7a4630', side: '#9a6244', belly: '#dcc3a0', accent: '#5a2e1e', accent2: '#c48a5a', plateTip: '#b08664', horn: '#d6c4a2', eye: '#2a1a10',
      pattern: { type: 'mottled', colour: '#5a3020', scale: 4, coverage: 0.45 },
    },
    build() {
      const r = quadruped('nodosaurus', {
        frontLeg: 8,
        backLeg: 10,
        body: { len: 26, w: 16, h: 12, belly: 1, hump: 1 },
        neck: { len: 5, w: 8, h: 7, angle: -5 },
        head: { len: 6, w: 7, h: 6, snoutLen: 4, snoutW: 5, snoutH: 4, jawH: 2, eyeR: 0.7 },
        headAngle: 10,
        tail: { len: 24, segments: 4, w: 7, h: 6, lift: 2, tipW: 1, tipH: 1 },
        legs: { frontW: 5, backW: 6, sprawl: 1, footLen: 2 },
      });
      beak(r, { len: 1, h: 2, w: 4 });
      bulkQuad(r, { cap: 2, sag: 1, shoulder: 1, hip: 1 });
      muscleLegs(r, 2, 2);
      osteoderms(r, { rows: 6, cols: 5, size: 2, spread: 0.45 });
      // big forward-curving shoulder spikes
      sideSpikes(r, 'body', r.a.bodyW / 2, r.a.bodyY, r.a.bodyFront + 3, 7, 40, 2);
      sideSpikes(r, 'body', r.a.bodyW / 2, r.a.bodyY + 1, r.a.bodyFront + 7, 5, 25, 2);
      // armour collars on the neck
      const n = r.mb.get(r.neck[0]);
      const [, ny, nz] = n.pivot;
      n.box([-5, ny + 1, nz - 5], [10, 3, 3], 'armor');
      n.pair([4, ny + 1, nz - 4], [3, 2, 2], 'plate', { rotation: [0, 30, 10], pivot: [4, ny + 2, nz - 3] });
      // knobs along the tail sides
      r.tail.forEach((t, i) => {
        const tb = r.mb.get(t);
        const [, py, pz] = tb.pivot;
        if (i < 3) tb.pair([2.5 - i * 0.6, py - 1, pz + 2], [2, 1, 2], 'plate', { rotation: [0, 0, 30], pivot: [2.5, py - 1, pz + 2] });
      });
      return r;
    },
  },
];
