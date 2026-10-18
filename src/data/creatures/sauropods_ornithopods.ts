import { quadruped, theropod, type Rig } from '../../model/rigs.js';
import * as F from '../../creatures/features.js';
import type { CreatureDef } from '../types.js';
import { BROWSE, HERB, SND } from '../common.js';

const sauro = { diet: 'herbivore' as const, group: 'sauropod' as const, habitat: 'land' as const, food: BROWSE, tame: { items: BROWSE } };
const orni = { diet: 'herbivore' as const, group: 'ornithopod' as const, habitat: 'land' as const, food: HERB, tame: { items: HERB } };

/** Rounded nasal dome on a sauropod skull (Brachiosaurus). */
function nasalDome(r: Rig, h: number) {
  const hd = r.mb.get(r.head);
  const w = r.a.headW - 2;
  hd.box([-w / 2, r.a.headTop - 1, r.a.craniumZ0 - 1], [w, h, Math.max(2, Math.round((r.a.headPivot[2] - r.a.craniumZ0) * 0.6))], 'skin');
}

/** Thumb spikes on the front legs (Iguanodon). */
function thumbSpikes(r: Rig) {
  for (const leg of r.legs.filter((l) => l.front)) {
    const b = r.mb.get(leg.chain[1]);
    const [x, , z] = b.pivot;
    b.box([x + leg.side * 1.5 - 0.5, 2, z - 3], [1, 3, 1], 'claw', { rotation: [-35, 0, 0], pivot: [x, 2, z - 2] });
  }
}

/** Parasaurolophus tube crest sweeping up and back from the skull. */
function tube(r: Rig, len: number, w = 3, tilt = 30) {
  const z = r.a.craniumZ0 + 1;
  const y = r.a.headTop - 2;
  const hd = r.mb.get(r.head);
  hd.box([-w / 2, y, z], [w, w, len], 'accent', { rotation: [tilt, 0, 0], pivot: [0, y + w / 2, z] });
  hd.box([-(w - 1) / 2, y + 1, z + 1], [w - 1, w - 1, len - 2], 'accent', { rotation: [tilt, 0, 0], pivot: [0, y + w / 2, z], inflate: 0.3 });
}

/** Little brow crest bumps over the eyes (Maiasaura). */
function browCrest(r: Rig) {
  const hd = r.mb.get(r.head);
  const z = r.a.craniumZ0 + 1;
  hd.box([-1.5, r.a.headTop - 1, z], [3, 2, 3], 'accent');
}

// ---------------------------------------------------------------- anatomy helpers (realism pass)

const sizeOf = (r: Rig, bone: string) => r.mb.get(bone).bone.cubes[0]?.size ?? [2, 2, 2];

/**
 * Muscle masses on a quadruped torso: rounded flanks, shoulder girdle and a heavy pelvis,
 * so the body reads as a barrel instead of a slab.
 */
function bodyBulk(r: Rig, o: { flank?: number; shoulder?: number; hip?: number } = {}) {
  const b = r.mb.get('body');
  const { bodyW: w, bodyH: h, bodyY: y, bodyFront: f, bodyBack: k } = r.a;
  const len = k - f;
  const fl = o.flank ?? 2;
  // flanks bulge out below the spine and round the belly line
  b.box([-(w + fl) / 2, y - h * 0.42, f + len * 0.18], [w + fl, Math.round(h * 0.62), Math.round(len * 0.6)], 'skin');
  // shoulder girdle and pelvis masses
  const sh = o.shoulder ?? 1;
  b.box([-(w + sh) / 2, y - h * 0.2, f + 1], [w + sh, Math.round(h * 0.62), Math.round(len * 0.22)], 'skin');
  const hp = o.hip ?? 1;
  b.box([-(w + hp) / 2, y - h * 0.15, k - len * 0.3], [w + hp, Math.round(h * 0.7), Math.round(len * 0.26)], 'skin');
  // chest keel under the shoulders
  b.box([-(w - 4) / 2, y - h / 2 - 1, f + len * 0.08], [w - 4, 2, Math.round(len * 0.3)], 'skin');
}

/** Thick neck root blending the neck into the shoulders. */
function neckRoot(r: Rig, extra = 3) {
  const n = r.mb.get(r.neck[0]);
  const [nw, nh] = sizeOf(r, r.neck[0]);
  const [, py, pz] = n.pivot;
  r.mb.get('body').box([-(nw + extra) / 2, py - (nh + extra) / 2, pz - 3], [nw + extra, nh + extra, 6], 'skin');
}

/** Thick tail root blending the tail into the hips. */
function tailRoot(r: Rig, extra = 2) {
  const t = r.mb.get(r.tail[0]);
  const c = t.bone.cubes[0];
  const [tw, th] = c.size;
  const [, , pz] = t.pivot;
  r.mb.get('body').box([-(tw + extra) / 2, c.origin[1] - extra / 2, pz - 4], [tw + extra, th + extra, 6], 'skin');
}

/**
 * Columnar sauropod-style legs: muscular upper legs, padded elephant-like feet with nails,
 * and a thumb claw on the front feet.
 */
function pillarLegs(r: Rig, o: { thigh?: number; thumb?: boolean; nails?: number } = {}) {
  for (const leg of r.legs) {
    const up = r.mb.get(leg.chain[0]);
    const lo = r.mb.get(leg.chain[1]);
    const [w] = sizeOf(r, leg.chain[0]);
    const [lw] = sizeOf(r, leg.chain[1]);
    const [sx, top, zz] = up.pivot;
    const [, knee] = lo.pivot;
    const bulk = leg.front ? Math.max(1, (o.thigh ?? 2) - 1) : o.thigh ?? 2;
    // muscle mass on the upper leg (thigh / upper arm)
    up.box([sx - (w + bulk) / 2, knee + (top - knee) * 0.35, zz - (w + bulk) / 2], [w + bulk, Math.round((top - knee) * 0.65 + 3), w + bulk], 'skin', { tags: ['limb'] });
    // padded foot
    const fw = lw + (leg.front ? 1 : 2);
    lo.box([sx - fw / 2, 0, zz - fw / 2 - (leg.front ? 0 : 0.5)], [fw, 2, fw + (leg.front ? 0 : 1)], 'skin', { tags: ['limb'] });
    // nails along the front of the pad
    const n = o.nails ?? 3;
    for (let i = 0; i < n; i++) {
      const x = sx - fw / 2 + 0.5 + (i * (fw - 2)) / Math.max(1, n - 1);
      lo.box([x, 0, zz - fw / 2 - 1], [1, 1, 1], 'claw');
    }
    if (leg.front && o.thumb) lo.box([sx - leg.side * (fw / 2) - (leg.side > 0 ? 0 : 1) + leg.side * 0.2, 1, zz - 1], [1, 2, 1], 'claw', { rotation: [-30, 0, 0], pivot: [sx, 2, zz] });
  }
}

/** Ornithopod legs: big drumstick thighs, slender forearms with a hoof-like hand. */
function ornithopodLegs(r: Rig, thigh = 3) {
  for (const leg of r.legs) {
    const up = r.mb.get(leg.chain[0]);
    const lo = r.mb.get(leg.chain[1]);
    const [w] = sizeOf(r, leg.chain[0]);
    const [lw] = sizeOf(r, leg.chain[1]);
    const [sx, top, zz] = up.pivot;
    const [, knee] = lo.pivot;
    if (!leg.front) {
      // drumstick thigh flaring into the hip
      up.box([sx - (w + thigh) / 2, knee + (top - knee) * 0.25, zz - (w + thigh) / 2 - 1], [w + thigh, Math.round((top - knee) * 0.75 + 4), w + thigh + 2], 'skin', { tags: ['limb'] });
      // three-toed foot with hoof-like nails
      lo.box([sx - (lw + 2) / 2, 0, zz - lw / 2 - 3], [lw + 2, 2, lw + 3], 'skin', { tags: ['limb'] });
      for (let i = 0; i < 3; i++) lo.box([sx - (lw + 2) / 2 + 0.5 + i * ((lw + 1) / 2) - 0.5, 0, zz - lw / 2 - 4], [1, 1, 1], 'claw');
    } else {
      // small hoofed hand
      lo.box([sx - (lw + 1) / 2, 0, zz - (lw + 1) / 2 - 1], [lw + 1, 1, lw + 2], 'horn');
    }
  }
}

/** Duck bill: broad keratin beak at the snout tip (upper) and on the lower jaw. */
function duckBill(r: Rig, o: { w: number; flare?: number; len?: number }) {
  const hd = r.mb.get(r.head);
  const jaw = r.mb.get(r.jaw!);
  const tip = r.a.snoutTip;
  const y = r.a.jawY;
  const fw = o.w + (o.flare ?? 2);
  const len = o.len ?? 4;
  hd.box([-fw / 2, y, tip - 1], [fw, 2, len], 'horn', { tags: ['jawU'] });
  jaw.box([-(fw - 1) / 2, y - 1, tip], [fw - 1, 1, len - 1], 'horn', { tags: ['jawL'] });
}

/** Rounded bone dome built from stacked layers, ringed with knobs (Pachycephalosaurus). */
function boneDome(r: Rig, h: number) {
  const hd = r.mb.get(r.head);
  const w = r.a.headW;
  const z0 = r.a.craniumZ0;
  const len = r.a.headPivot[2] - z0;
  const y = r.a.headTop - 1;
  for (let i = 0; i < h; i++) {
    const t = i / h;
    const ww = Math.max(2, Math.round((w + 1) * Math.sqrt(Math.max(0, 1 - t * t))));
    const ll = Math.max(2, Math.round((len + 1) * Math.sqrt(Math.max(0, 1 - t * t * 0.9))));
    hd.box([-ww / 2, y + i, z0 + (len - ll) / 2 + 0.5], [ww, 1, ll], 'horn');
  }
  // ring of bony knobs around the back and sides of the dome, and on the snout
  for (let i = 0; i < 4; i++) hd.pair([w / 2, y - 0.5, z0 + 1 + i * (len / 4)], [1, 1, 1], 'horn');
  for (let i = 0; i < 3; i++) hd.box([-1.5 + i * 1.2, y - 0.5, r.a.headPivot[2] - 0.5], [1, 1, 1], 'horn');
  hd.pair([1, r.a.jawY + 2, r.a.snoutTip + 1], [1, 1, 1], 'horn');
}

/** Titanosaur osteoderms scattered over back and flanks. */
function osteoderms(r: Rig, n: number) {
  const b = r.mb.get('body');
  const { bodyW: w, bodyTop: top, bodyFront: f, bodyBack: k } = r.a;
  for (let i = 0; i < n; i++) {
    const z = f + 3 + ((k - f - 6) * i) / Math.max(1, n - 1);
    const x = 1.5 + ((i * 37) % 5);
    if (x > w / 2 - 1) continue;
    b.pair([x, top - 0.5, z], [2, 1, 2], 'armor');
  }
}

export const sauropodsOrnithopods: CreatureDef[] = [
  // ------------------------------------------------------------------ sauropods
  {
    ...sauro,
    id: 'brachiosaurus',
    name: 'Brachiosaurus',
    info: 'With front legs longer than its hind legs, Brachiosaurus held its neck high like a giraffe to browse treetops 9 metres up.',
    period: 'Jurassic',
    lengthM: 22,
    scale: 2.4,
    temperament: 'neutral',
    health: 220,
    attack: 14,
    speed: 0.16,
    ride: { mode: 'ground', seats: 3, jump: 0.3 },
    spawn: { biomes: ['prehistoric', 'plains', 'savanna', 'forest'], weight: 2, herd: [2, 3] },
    sounds: SND.sauropod,
    palette: {
      back: '#5a5f4a', side: '#7c7f64', belly: '#c8c0a0', accent: '#8a6a3a',
      pattern: { type: 'mottled', colour: '#474b3a', scale: 6, coverage: 0.4, strength: 0.6 },
    },
    build() {
      const r = quadruped('brachiosaurus', {
        frontLeg: 27,
        backLeg: 19,
        body: { len: 30, w: 15, h: 16, belly: 2, hump: 1 },
        neck: { len: 48, w: 10, h: 10, angle: 64, segments: 6, tipW: 5, tipH: 5 },
        head: { len: 6, w: 6, h: 6, snoutLen: 4, snoutW: 5, snoutH: 3, jawH: 2 },
        headAngle: 58,
        tail: { len: 24, w: 9, h: 9, segments: 5, lift: -3 },
        legs: { frontW: 7, backW: 8, elbow: 4, knee: -4 },
      });
      // tall arched nasal crest rising above the eyes
      nasalDome(r, 4);
      const hd = r.mb.get(r.head);
      hd.box([-(r.a.headW - 3) / 2, r.a.headTop + 2, r.a.craniumZ0], [r.a.headW - 3, 2, 3], 'skin');
      bodyBulk(r, { flank: 2 });
      neckRoot(r, 4);
      tailRoot(r);
      pillarLegs(r, { thumb: true });
      return r;
    },
  },
  {
    ...sauro,
    id: 'diplodocus',
    name: 'Diplodocus',
    info: 'Diplodocus could crack its incredibly long, thin tail like a whip, possibly fast enough to make a sonic boom.',
    period: 'Jurassic',
    lengthM: 26,
    scale: 2.2,
    temperament: 'neutral',
    health: 190,
    attack: 16,
    speed: 0.17,
    spawn: { biomes: ['prehistoric', 'plains', 'savanna'], weight: 2, herd: [2, 3] },
    sounds: SND.sauropod,
    palette: {
      back: '#6d5f48', side: '#8e7c5c', belly: '#d5c7a4', accent: '#a0613a',
      pattern: { type: 'bands', colour: '#54493a', scale: 7, coverage: 0.3, strength: 0.45 },
    },
    build() {
      const r = quadruped('diplodocus', {
        frontLeg: 17,
        backLeg: 20,
        body: { len: 30, w: 14, h: 15, belly: 2 },
        neck: { len: 40, w: 9, h: 8, angle: 18, segments: 6, tipW: 4, tipH: 4 },
        // long, low skull
        head: { len: 5, w: 5, h: 4, snoutLen: 6, snoutW: 4, snoutH: 2, jawH: 1 },
        headAngle: 16,
        tail: { len: 70, w: 9, h: 9, segments: 7, lift: 3, tipW: 1, tipH: 1 },
        legs: { frontW: 6, backW: 7 },
      });
      bodyBulk(r);
      neckRoot(r, 3);
      tailRoot(r);
      pillarLegs(r, { thumb: true });
      // low ridge of spines along the back
      F.sail(r, { h: 2, from: -12, to: 12, mat: 'dark', arch: true });
      return r;
    },
  },
  {
    ...sauro,
    id: 'apatosaurus',
    name: 'Apatosaurus',
    info: 'Apatosaurus had an unusually thick, deep neck that may have been used for shoving matches between rivals.',
    period: 'Jurassic',
    lengthM: 22,
    scale: 2.3,
    temperament: 'neutral',
    health: 200,
    attack: 15,
    speed: 0.16,
    spawn: { biomes: ['prehistoric', 'plains', 'swamp'], weight: 2, herd: [2, 3] },
    sounds: SND.sauropod,
    palette: {
      back: '#5a4e45', side: '#7a6a5c', belly: '#c8b8a0', accent: '#7a6a5c',
      pattern: { type: 'blotches', colour: '#463c35', scale: 6, coverage: 0.45 },
    },
    build() {
      const r = quadruped('apatosaurus', {
        frontLeg: 16,
        backLeg: 19,
        body: { len: 28, w: 17, h: 17, belly: 3 },
        // very wide, deep neck (used for shoving contests)
        neck: { len: 30, w: 13, h: 14, angle: 32, segments: 5, tipW: 6, tipH: 7 },
        head: { len: 5, w: 6, h: 5, snoutLen: 4, snoutW: 5, snoutH: 3, jawH: 2 },
        headAngle: 28,
        tail: { len: 54, w: 11, h: 11, segments: 6, lift: 2, tipW: 1, tipH: 1 },
        legs: { frontW: 8, backW: 9, sprawl: 1 },
      });
      bodyBulk(r, { flank: 3 });
      neckRoot(r, 3);
      tailRoot(r);
      pillarLegs(r, { thumb: true, thigh: 3 });
      return r;
    },
  },
  {
    ...sauro,
    id: 'brontosaurus',
    name: 'Brontosaurus',
    info: 'Once thought to be the same animal as Apatosaurus, the "thunder lizard" was restored as its own genus in 2015.',
    period: 'Jurassic',
    lengthM: 22,
    scale: 2.3,
    temperament: 'neutral',
    health: 200,
    attack: 15,
    speed: 0.16,
    spawn: { biomes: ['prehistoric', 'plains', 'forest'], weight: 2, herd: [2, 3] },
    sounds: SND.sauropod,
    palette: {
      back: '#56604f', side: '#7c8670', belly: '#d2cfb0', accent: '#b58a52',
      pattern: { type: 'stripes', colour: '#434b3d', scale: 8, coverage: 0.35, strength: 0.7 },
      spine: true,
    },
    build() {
      const r = quadruped('brontosaurus', {
        frontLeg: 17,
        backLeg: 20,
        body: { len: 27, w: 15, h: 15, belly: 2, hump: 2 },
        // tall-chested neck, a little slimmer and higher than Apatosaurus
        neck: { len: 36, w: 11, h: 11, angle: 42, segments: 5, tipW: 5, tipH: 6 },
        head: { len: 5, w: 6, h: 5, snoutLen: 4, snoutW: 5, snoutH: 3, jawH: 2 },
        headAngle: 38,
        tail: { len: 50, w: 10, h: 10, segments: 6, lift: 2, tipW: 1, tipH: 1 },
        legs: { frontW: 7, backW: 8 },
      });
      bodyBulk(r);
      neckRoot(r, 3);
      tailRoot(r);
      pillarLegs(r, { thumb: true });
      return r;
    },
  },
  {
    ...sauro,
    id: 'argentinosaurus',
    name: 'Argentinosaurus',
    info: 'One of the largest animals ever to walk the Earth, Argentinosaurus may have weighed as much as ten elephants.',
    period: 'Cretaceous',
    lengthM: 35,
    scale: 3.6,
    temperament: 'neutral',
    health: 250,
    attack: 20,
    speed: 0.15,
    spawn: { biomes: ['prehistoric', 'savanna', 'plains'], weight: 1, herd: [1, 2] },
    sounds: SND.sauropod,
    palette: {
      back: '#7a6248', side: '#a88e6a', belly: '#e2d3b2', accent: '#7f5a3a',
      pattern: { type: 'bands', colour: '#5e4a36', scale: 6, coverage: 0.3, strength: 0.6 },
      spine: true,
    },
    build() {
      const r = quadruped('argentinosaurus', {
        frontLeg: 18,
        backLeg: 17,
        body: { len: 28, w: 16, h: 16, belly: 2, hump: 2 },
        neck: { len: 30, w: 10, h: 10, angle: 40, segments: 5, tipW: 5, tipH: 5 },
        head: { len: 4, w: 5, h: 4, snoutLen: 3, snoutW: 4, snoutH: 2, jawH: 1 },
        headAngle: 36,
        tail: { len: 30, w: 9, h: 9, segments: 5, lift: 0 },
        // titanosaur wide-gauge stance
        legs: { frontW: 7, backW: 8, sprawl: 2 },
      });
      bodyBulk(r, { flank: 2 });
      neckRoot(r, 3);
      tailRoot(r);
      pillarLegs(r, { thumb: false, nails: 2 });
      osteoderms(r, 6);
      return r;
    },
  },
  {
    ...sauro,
    id: 'mamenchisaurus',
    name: 'Mamenchisaurus',
    info: 'Mamenchisaurus had one of the longest necks of any animal, making up about half of its total body length.',
    period: 'Jurassic',
    lengthM: 26,
    scale: 2.1,
    temperament: 'neutral',
    health: 180,
    attack: 12,
    speed: 0.17,
    spawn: { biomes: ['prehistoric', 'jungle', 'forest'], weight: 2, herd: [2, 3] },
    sounds: SND.sauropod,
    palette: {
      back: '#4f5a5e', side: '#6f7d80', belly: '#cfd2c2', accent: '#c28b45',
      pattern: { type: 'spots', colour: '#3b4548', scale: 4, coverage: 0.35 },
    },
    build() {
      const r = quadruped('mamenchisaurus', {
        frontLeg: 16,
        backLeg: 18,
        body: { len: 22, w: 13, h: 13, belly: 2 },
        neck: { len: 64, w: 8, h: 8, angle: 34, segments: 8, tipW: 4, tipH: 4 },
        head: { len: 5, w: 5, h: 4, snoutLen: 3, snoutW: 4, snoutH: 3, jawH: 1 },
        headAngle: 30,
        tail: { len: 36, w: 9, h: 9, segments: 5, lift: 1, tipW: 1, tipH: 1 },
        legs: { frontW: 6, backW: 7 },
      });
      bodyBulk(r);
      neckRoot(r, 3);
      tailRoot(r);
      pillarLegs(r, { thumb: true });
      return r;
    },
  },
  {
    ...sauro,
    id: 'amargasaurus',
    name: 'Amargasaurus',
    info: 'Amargasaurus carried two parallel rows of tall spines along its neck, perhaps covered in skin as a display sail.',
    period: 'Cretaceous',
    lengthM: 10,
    scale: 1.6,
    temperament: 'neutral',
    health: 110,
    attack: 10,
    speed: 0.2,
    spawn: { biomes: ['prehistoric', 'savanna', 'desert'], weight: 3, herd: [2, 3] },
    sounds: SND.sauropod,
    palette: {
      back: '#6e5a42', side: '#937c5c', belly: '#d8c8a4', accent: '#a5513a', accent2: '#d9a35a', horn: '#cdbb94',
      pattern: { type: 'stripes', colour: '#544331', scale: 5, coverage: 0.35, strength: 0.6 },
    },
    build() {
      const r = quadruped('amargasaurus', {
        frontLeg: 13,
        backLeg: 16,
        body: { len: 22, w: 12, h: 12, belly: 1 },
        neck: { len: 18, w: 6, h: 6, angle: 18, segments: 3, tipW: 4, tipH: 4 },
        head: { len: 5, w: 5, h: 4, snoutLen: 4, snoutW: 4, snoutH: 3, jawH: 1 },
        headAngle: 16,
        tail: { len: 30, w: 8, h: 8, segments: 5, lift: 2, tipW: 1, tipH: 1 },
        legs: { frontW: 5, backW: 6 },
      });
      bodyBulk(r);
      tailRoot(r);
      pillarLegs(r, { thumb: true });
      // double row of tall neck spines with a skin web between them
      r.neck.forEach((n, i) => {
        const b = r.mb.get(n);
        const [, py, pz] = b.pivot;
        const top = py + 2;
        const h = Math.round(11 - i * 2.5);
        const segLen = i === 0 ? 7 : 6;
        for (let k = 0; k < 2; k++) {
          const z = pz - 2 - k * 3;
          b.pair([0.6, top, z], [1, h, 1], 'horn', { rotation: [-18, 0, -8], pivot: [1, top, z] });
        }
        b.box([-0.5, top, pz - segLen], [1, h - 2, segLen], 'membrane', { rotation: [-18, 0, 0], pivot: [0, top, pz] });
      });
      F.sail(r, { h: 4, from: -10, to: 6, mat: 'accent', arch: true });
      return r;
    },
  },
  {
    ...sauro,
    id: 'dreadnoughtus',
    name: 'Dreadnoughtus',
    info: 'Named "fears nothing", Dreadnoughtus is known from one of the most complete skeletons of any giant titanosaur.',
    period: 'Cretaceous',
    lengthM: 26,
    scale: 3.2,
    temperament: 'neutral',
    health: 240,
    attack: 18,
    speed: 0.15,
    spawn: { biomes: ['prehistoric', 'plains', 'forest'], weight: 1, herd: [1, 2] },
    sounds: SND.sauropod,
    palette: {
      back: '#5e4636', side: '#80654e', belly: '#d2bd9c', accent: '#94754f',
      pattern: { type: 'blotches', colour: '#46342a', scale: 5, coverage: 0.4, strength: 0.6 },
      spine: true,
    },
    build() {
      const r = quadruped('dreadnoughtus', {
        frontLeg: 15,
        backLeg: 15,
        body: { len: 24, w: 15, h: 14, belly: 3 },
        neck: { len: 24, w: 9, h: 9, angle: 36, segments: 3, tipW: 5, tipH: 5 },
        head: { len: 4, w: 5, h: 4, snoutLen: 3, snoutW: 4, snoutH: 2, jawH: 1 },
        headAngle: 32,
        tail: { len: 26, w: 9, h: 8, segments: 4, lift: 1 },
        legs: { frontW: 7, backW: 8, sprawl: 2 },
      });
      bodyBulk(r, { flank: 3 });
      neckRoot(r, 3);
      tailRoot(r);
      pillarLegs(r, { nails: 2 });
      osteoderms(r, 8);
      return r;
    },
  },
  {
    diet: 'herbivore',
    group: 'sauropod',
    habitat: 'land',
    food: HERB,
    tame: { items: HERB },
    id: 'plateosaurus',
    name: 'Plateosaurus',
    info: 'An early relative of the giant sauropods, Plateosaurus walked on two legs and used its clawed hands to pull down branches.',
    period: 'Triassic',
    lengthM: 8,
    scale: 1.3,
    temperament: 'passive',
    health: 60,
    speed: 0.24,
    prey: true,
    spawn: { biomes: ['prehistoric', 'forest', 'plains', 'desert'], weight: 5, herd: [2, 4] },
    sounds: SND.herd,
    palette: {
      back: '#6a6040', side: '#8c8256', belly: '#d8cc9e', accent: '#a65a2e',
      pattern: { type: 'stripes', colour: '#4f4830', scale: 5, coverage: 0.45 },
    },
    build() {
      const r = theropod('plateosaurus', {
        hipY: 20,
        body: { len: 22, w: 10, h: 12, chest: 2 },
        neck: { len: 17, w: 6, h: 6, angle: 30, segments: 3 },
        head: { len: 4, w: 5, h: 5, snoutLen: 4, snoutW: 4, snoutH: 3, jawH: 2 },
        tail: { len: 36, segments: 5, lift: 2 },
        arms: { len: 9, w: 3, angle: -30, big: true },
        legs: { thighW: 7, footLen: 6, footW: 4 },
      });
      neckRoot(r, 2);
      // grasping hands with a big curved thumb claw
      for (const a of r.arms) {
        const b = r.mb.get(a);
        const [x, y, z] = b.pivot;
        b.box([x - 0.5, y - 12, z - 3], [1, 3, 1], 'claw', { rotation: [-25, 0, 0], pivot: [x, y - 10, z - 2] });
      }
      return r;
    },
  },

  // ------------------------------------------------------------------ ornithopods
  {
    ...orni,
    id: 'parasaurolophus',
    name: 'Parasaurolophus',
    info: 'The hollow tube crest of Parasaurolophus worked like a trombone, producing deep calls that carried over long distances.',
    period: 'Cretaceous',
    lengthM: 9.5,
    scale: 1.5,
    temperament: 'passive',
    health: 70,
    speed: 0.25,
    prey: true,
    ride: { mode: 'ground', seats: 2, jump: 0.6 },
    spawn: { biomes: ['prehistoric', 'swamp', 'forest', 'jungle', 'plains'], weight: 6, herd: [3, 5] },
    sounds: SND.hadrosaur,
    palette: {
      horn: '#b8a070',
      back: '#56603f', side: '#78825a', belly: '#d8cc9e', accent: '#b4532c', accent2: '#d99a3e',
      pattern: { type: 'stripes', colour: '#3f4a2c', scale: 5, coverage: 0.35, strength: 0.65 },
    },
    build() {
      const r = quadruped('parasaurolophus', {
        frontLeg: 15,
        backLeg: 19,
        body: { len: 24, w: 12, h: 12, belly: 2 },
        neck: { len: 10, w: 6, h: 7, angle: 34, segments: 2 },
        head: { len: 6, w: 6, h: 6, snoutLen: 6, snoutW: 6, snoutH: 3, jawH: 2 },
        headAngle: 30,
        tail: { len: 30, w: 7, h: 9, segments: 4, lift: -1.5 },
        legs: { frontW: 4, backW: 9, elbow: 2, knee: -10 },
      });
      bodyBulk(r, { flank: 2, hip: 2 });
      neckRoot(r, 2);
      tailRoot(r, 2);
      ornithopodLegs(r);
      duckBill(r, { w: 6, flare: 2 });
      tube(r, 17, 3, 28);
      return r;
    },
  },
  {
    ...orni,
    id: 'iguanodon',
    name: 'Iguanodon',
    info: 'Iguanodon was one of the first dinosaurs ever named; its spiky thumb was once mistakenly placed on its nose.',
    period: 'Cretaceous',
    lengthM: 10,
    scale: 1.5,
    temperament: 'neutral',
    health: 80,
    attack: 8,
    speed: 0.24,
    prey: true,
    ride: { mode: 'ground', seats: 1, jump: 0.6 },
    spawn: { biomes: ['prehistoric', 'forest', 'plains', 'swamp'], weight: 5, herd: [3, 5] },
    sounds: SND.hadrosaur,
    palette: {
      horn: '#9c8a66',
      back: '#4d5a45', side: '#6c7a5c', belly: '#cfc8a6', accent: '#8f6a3c',
      pattern: { type: 'mottled', colour: '#3a4535', scale: 5, coverage: 0.45 },
    },
    build() {
      const r = quadruped('iguanodon', {
        frontLeg: 16,
        backLeg: 19,
        body: { len: 24, w: 13, h: 13, belly: 2 },
        neck: { len: 9, w: 7, h: 8, angle: 28, segments: 2 },
        head: { len: 6, w: 6, h: 7, snoutLen: 6, snoutW: 4, snoutH: 4, jawH: 2 },
        headAngle: 26,
        tail: { len: 30, w: 8, h: 10, segments: 4, lift: -1.5 },
        legs: { frontW: 5, backW: 9, elbow: 2, knee: -10 },
      });
      bodyBulk(r, { flank: 2, hip: 2 });
      neckRoot(r, 2);
      tailRoot(r, 2);
      ornithopodLegs(r);
      duckBill(r, { w: 4, flare: 0, len: 3 });
      thumbSpikes(r);
      return r;
    },
  },
  {
    ...orni,
    id: 'edmontosaurus',
    name: 'Edmontosaurus',
    info: 'Edmontosaurus had hundreds of teeth packed in grinding batteries and a flat, duck-like bill for cropping plants.',
    period: 'Cretaceous',
    lengthM: 12,
    scale: 1.6,
    temperament: 'passive',
    health: 80,
    speed: 0.24,
    prey: true,
    ride: { mode: 'ground', seats: 2, jump: 0.5 },
    spawn: { biomes: ['prehistoric', 'plains', 'forest', 'taiga'], weight: 6, herd: [3, 5] },
    sounds: SND.hadrosaur,
    palette: {
      horn: '#b49a6c',
      back: '#6a5236', side: '#8e7049', belly: '#dccaa0', accent: '#b94f30',
      pattern: { type: 'bands', colour: '#4f3c28', scale: 6, coverage: 0.35 },
    },
    build() {
      const r = quadruped('edmontosaurus', {
        frontLeg: 16,
        backLeg: 20,
        body: { len: 26, w: 13, h: 13, belly: 2 },
        neck: { len: 10, w: 6, h: 7, angle: 30, segments: 2 },
        head: { len: 6, w: 6, h: 6, snoutLen: 8, snoutW: 7, snoutH: 3, jawH: 2 },
        headAngle: 28,
        tail: { len: 32, w: 7, h: 9, segments: 4, lift: -1.5 },
        legs: { frontW: 4, backW: 9, elbow: 2, knee: -10 },
      });
      bodyBulk(r, { flank: 2, hip: 2 });
      neckRoot(r, 2);
      tailRoot(r, 2);
      ornithopodLegs(r);
      duckBill(r, { w: 7, flare: 3 });
      // fleshy comb on top of the head (known from a mummy specimen)
      F.crest(r, { fromTip: 10, len: 6, h: 2, w: 1 });
      return r;
    },
  },
  {
    ...orni,
    id: 'maiasaura',
    name: 'Maiasaura',
    info: 'Maiasaura, the "good mother lizard", nested in huge colonies and cared for its young after they hatched.',
    period: 'Cretaceous',
    lengthM: 9,
    scale: 1.4,
    temperament: 'passive',
    health: 60,
    speed: 0.24,
    prey: true,
    spawn: { biomes: ['prehistoric', 'plains', 'forest'], weight: 6, herd: [3, 5] },
    sounds: SND.hadrosaur,
    palette: {
      horn: '#c2a878',
      back: '#7c6142', side: '#a0825a', belly: '#e6d4ad', accent: '#5f7a3a',
      pattern: { type: 'spots', colour: '#5e4932', scale: 4, coverage: 0.35 },
    },
    build() {
      const r = quadruped('maiasaura', {
        frontLeg: 14,
        backLeg: 18,
        body: { len: 22, w: 12, h: 12, belly: 2 },
        neck: { len: 9, w: 6, h: 7, angle: 30, segments: 2 },
        head: { len: 6, w: 6, h: 6, snoutLen: 6, snoutW: 5, snoutH: 3, jawH: 2 },
        headAngle: 28,
        tail: { len: 28, w: 7, h: 9, segments: 4, lift: -1.5 },
        legs: { frontW: 4, backW: 8, elbow: 2, knee: -10 },
      });
      bodyBulk(r, { flank: 2, hip: 2 });
      neckRoot(r, 2);
      tailRoot(r, 2);
      ornithopodLegs(r);
      duckBill(r, { w: 5, flare: 2 });
      browCrest(r);
      return r;
    },
  },
  {
    ...orni,
    id: 'corythosaurus',
    name: 'Corythosaurus',
    info: 'Corythosaurus is named for its helmet-shaped crest, which held looping nasal passages for resonant calls.',
    period: 'Cretaceous',
    lengthM: 9,
    scale: 1.45,
    temperament: 'passive',
    health: 65,
    speed: 0.25,
    prey: true,
    spawn: { biomes: ['prehistoric', 'swamp', 'forest', 'jungle'], weight: 5, herd: [3, 5] },
    sounds: SND.hadrosaur,
    palette: {
      horn: '#b8a888',
      back: '#4c5a48', side: '#6d7b62', belly: '#d4d0b2', accent: '#c4472f', accent2: '#e8b84a',
      pattern: { type: 'stripes', colour: '#394535', scale: 5, coverage: 0.35, strength: 0.65 },
    },
    build() {
      const r = quadruped('corythosaurus', {
        frontLeg: 14,
        backLeg: 18,
        body: { len: 22, w: 12, h: 12, belly: 2 },
        neck: { len: 9, w: 6, h: 7, angle: 32, segments: 2 },
        head: { len: 6, w: 6, h: 6, snoutLen: 5, snoutW: 5, snoutH: 3, jawH: 2 },
        headAngle: 30,
        tail: { len: 28, w: 7, h: 9, segments: 4, lift: -1.5 },
        legs: { frontW: 4, backW: 8, elbow: 2, knee: -10 },
      });
      bodyBulk(r, { flank: 2, hip: 2 });
      neckRoot(r, 2);
      tailRoot(r, 2);
      ornithopodLegs(r);
      duckBill(r, { w: 5, flare: 1 });
      // semicircular helmet crest
      F.crest(r, { fromTip: 4, len: 8, h: 6, w: 3 });
      F.crest(r, { fromTip: 5, len: 6, h: 8, w: 2 });
      return r;
    },
  },
  {
    ...orni,
    group: 'ornithopod',
    id: 'pachycephalosaurus',
    name: 'Pachycephalosaurus',
    info: 'Pachycephalosaurus had a skull dome up to 25 cm thick, likely used to butt heads or flanks with rivals.',
    period: 'Cretaceous',
    lengthM: 4.5,
    scale: 1.1,
    temperament: 'neutral',
    health: 40,
    attack: 7,
    speed: 0.3,
    prey: true,
    spawn: { biomes: ['prehistoric', 'plains', 'forest', 'mountain'], weight: 5, herd: [2, 4] },
    sounds: SND.armoured,
    palette: {
      back: '#6e5a3c', side: '#937a52', belly: '#e0cfa6', accent: '#3f6a8a', horn: '#a8946c',
      pattern: { type: 'stripes', colour: '#4f402b', scale: 4, coverage: 0.45 },
    },
    build() {
      const r = theropod('pachycephalosaurus', {
        hipY: 17,
        body: { len: 18, w: 9, h: 10, chest: 1 },
        neck: { len: 5, w: 5, h: 6, angle: 18 },
        head: { len: 6, w: 7, h: 6, snoutLen: 3, snoutW: 4, snoutH: 3, jawH: 2, beak: true },
        tail: { len: 24, segments: 4, lift: 2 },
        arms: { len: 5, w: 2, angle: -40 },
        legs: { thighW: 6, footLen: 5, footW: 3 },
      });
      boneDome(r, 4);
      neckRoot(r, 2);
      return r;
    },
  },
];
