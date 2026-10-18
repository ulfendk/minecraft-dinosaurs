import { marine, pterosaur, quadruped, snake, type Rig } from '../../model/rigs.js';
import * as F from '../../creatures/features.js';
import type { Material } from '../../model/types.js';
import type { CreatureDef } from '../types.js';
import { FISH, MEAT, SMALL_MEAT, SND } from '../common.js';

// ---------------------------------------------------------------------------
// local helpers

/** Rows of raised scutes along the back and first tail segments (crocodilians). */
function scuteRows(r: Rig, o: { rows: number; from: number; to: number; tail?: boolean }) {
  const b = r.mb.get('body');
  const y = r.a.bodyTop - 1;
  const step = 3;
  for (let z = o.from; z < o.to - 1; z += step) {
    for (let i = 0; i < o.rows; i++) {
      const x = (i - (o.rows - 1) / 2) * 2.5 - 0.5;
      b.box([x, y, z], [1, 2, 2], 'armor');
    }
  }
  if (o.tail) {
    r.tail.forEach((tn, ti) => {
      const t = r.mb.get(tn);
      const [, , pz] = t.pivot;
      const cube = t.bone.cubes[0];
      const top = cube.origin[1] + cube.size[1];
      const len = cube.size[2];
      const rows = ti < 2 ? 2 : 1;
      for (let z = pz + 1; z < pz + len - 2; z += step)
        for (let i = 0; i < rows; i++) t.box([(rows === 1 ? -0.5 : i ? 0.5 : -1.5), top - 1, z], [1, 2, 2], 'armor');
    });
  }
}

/** Gill slits painted as dark stripes behind the head of fish. */
function gills(r: Rig, n: number) {
  const z0 = r.a.bodyFront + 2;
  for (let i = 0; i < n; i++)
    r.mb.decal({ kind: 'stripe', center: [r.a.bodyW / 2, r.a.bodyY + 0.5, z0 + i * 1.6], radius: [0.6, r.a.bodyH * 0.22, 0.3], colour: '#3e4954', mirrorX: true });
}

/**
 * Adds rounded slices along z to a bone: each slice is two overlapping boxes (wide-low and
 * narrow-tall) so the cross-section reads as an octagon rather than a square.
 */
function slices(
  r: Rig,
  bone: string,
  o: { z0: number; z1: number; yc: (z: number) => number; w: (z: number) => number; h: (z: number) => number; step?: number; mat?: Material; tags?: string[] },
) {
  const b = r.mb.get(bone);
  const step = o.step ?? 2;
  const z0 = Math.round(o.z0), z1 = Math.round(o.z1);
  for (let z = z0; z < z1; z += step) {
    const len = Math.min(step, z1 - z);
    const zc = z + len / 2;
    const w = Math.max(1, Math.round(o.w(zc)));
    const h = Math.max(1, Math.round(o.h(zc)));
    const yc = o.yc(zc);
    const opts = o.tags ? { tags: o.tags } : {};
    if (w >= 4 && h >= 4) {
      const iw = Math.max(2, Math.round(w * 0.7));
      const ih = Math.max(2, Math.round(h * 0.7));
      b.box([-w / 2, yc - ih / 2, z], [w, ih, len], o.mat ?? 'skin', opts);
      b.box([-iw / 2, yc - h / 2, z], [iw, h, len], o.mat ?? 'skin', opts);
    } else b.box([-w / 2, yc - h / 2, z], [w, h, len], o.mat ?? 'skin', opts);
  }
}

const clearBone = (r: Rig, bone: string) => (r.mb.get(bone).bone.cubes.length = 0);
const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * Rebuilds neck (optional), body and tail of a swimming rig as one continuous fusiform shape.
 * prof(t) gives [width, height] multipliers along the animal (t = 0 at front, 1 at tail tip).
 */
function streamline(r: Rig, o: { w: number; h: number; prof: (t: number) => [number, number]; yc: number; neck?: boolean; tailYc?: number }) {
  const segs: { bone: string; z0: number; z1: number }[] = [];
  if (o.neck)
    for (const n of r.neck) {
      const c = r.mb.get(n).bone.cubes[0];
      segs.push({ bone: n, z0: c.origin[2], z1: c.origin[2] + c.size[2] });
    }
  segs.push({ bone: 'body', z0: r.a.bodyFront, z1: r.a.bodyBack });
  r.tail.forEach((t, i) => {
    const z0 = r.mb.get(t).pivot[2];
    const z1 = i + 1 < r.tail.length ? r.mb.get(r.tail[i + 1]).pivot[2] : r.a.tailEnd;
    segs.push({ bone: t, z0: z0 - 1, z1 });
  });
  const zA = segs[0].z0, zB = r.a.tailEnd;
  for (const s of segs) {
    clearBone(r, s.bone);
    const tailY = o.tailYc ?? o.yc;
    slices(r, s.bone, {
      z0: s.z0,
      z1: s.z1,
      yc: (z) => o.yc + (tailY - o.yc) * Math.max(0, (z - r.a.bodyBack) / (zB - r.a.bodyBack)),
      w: (z) => o.w * o.prof((z - zA) / (zB - zA))[0],
      h: (z) => o.h * o.prof((z - zA) / (zB - zA))[1],
    });
  }
}

/** Replaces a straight beak/snout with one that tapers to a point (pterosaurs). */
function taperBeak(r: Rig, o: { w: number; h: number; tipW?: number; drop?: number }) {
  const head = r.mb.get('head').bone;
  const jaw = r.mb.get('jaw').bone;
  const z0 = r.a.snoutTip, z1 = r.a.craniumZ0;
  head.cubes = head.cubes.filter((c) => c.origin[2] >= z1 - 0.5);
  jaw.cubes = jaw.cubes.filter((c) => c.origin[2] >= z1 - 0.5);
  const len = z1 - z0;
  const tipW = o.tipW ?? 1;
  for (let z = z0; z < z1; z += 2) {
    const t = (z - z0 + 1) / len; // 0 at tip
    // laterally compressed: width tapers less than height
    const w = Math.max(tipW, Math.round(tipW + (o.w - tipW) * Math.sqrt(t)));
    const hu = Math.max(1, Math.round(1 + (o.h - 1) * t));
    const hl = Math.max(1, Math.round(hu * 0.6));
    const sz = Math.min(2, z1 - z);
    r.mb.get('head').box([-w / 2, r.a.jawY, z], [w, hu, sz], 'horn', { tags: ['jawU'] });
    r.mb.get('jaw').box([-Math.max(1, w - 1) / 2, r.a.jawY - hl, z + (t < 0.1 ? 1 : 0)], [Math.max(1, w - 1), hl, sz], 'horn', { tags: ['jawL'] });
  }
}

/** Sprawling posture for crocodilians and synapsids: upper limbs splay out, forearms stay vertical. */
function sprawl(r: Rig, deg: number) {
  for (const leg of r.legs) {
    const up = r.mb.get(leg.chain[0]).bone;
    const lo = r.mb.get(leg.chain[1]).bone;
    up.rotation = [up.rotation?.[0] ?? 0, 0, -leg.side * deg];
    lo.rotation = [lo.rotation?.[0] ?? 0, 0, leg.side * deg];
  }
}

/** Narrows the inner wing membrane so folded wings sit tight against the body on the ground. */
function trimMembrane(r: Rig, k: number) {
  for (const w of r.wings)
    for (const c of r.mb.get(w.name).bone.cubes) if (c.mat === 'membrane') c.size[2] = Math.max(2, Math.round(c.size[2] * k));
}

const sea = { habitat: 'water' as const, food: FISH };
const ptero = { group: 'pterosaur' as const, habitat: 'air' as const, diet: 'piscivore' as const, food: FISH, sounds: SND.ptero };

export const prehistoricOthers: CreatureDef[] = [
  // ------------------------------------------------------------- crocodilian
  {
    id: 'sarcosuchus',
    name: 'Sarcosuchus',
    info: 'Nicknamed "SuperCroc", Sarcosuchus grew as long as a city bus and had a bulbous knob called a bulla on the tip of its snout.',
    period: 'Cretaceous',
    group: 'crocodilian',
    diet: 'carnivore',
    temperament: 'aggressive',
    habitat: 'amphibious',
    lengthM: 11,
    scale: 1.5,
    health: 110,
    attack: 14,
    speed: 0.2,
    food: MEAT,
    tame: { items: ['dino:raw_dino_meat', 'minecraft:salmon'] },
    ride: { mode: 'ground', seats: 2, jump: 0.4 },
    spawn: { biomes: ['swamp', 'river', 'jungle', 'prehistoric'], weight: 3, herd: [1, 2] },
    sounds: SND.croc,
    palette: {
      back: '#3e4430', side: '#5b5f3c', belly: '#c9c29a', accent: '#6d6a3a', eye: '#d9c34a', claw: '#2b2a22',
      pattern: { type: 'bands', colour: '#2c3022', scale: 6, coverage: 0.35 }, teeth: true,
    },
    build() {
      const r = quadruped('sarcosuchus', {
        frontLeg: 6,
        backLeg: 7,
        body: { len: 34, w: 16, h: 9 },
        neck: { len: 4, w: 11, h: 7, angle: 0 },
        head: { len: 8, w: 10, h: 6, snoutLen: 8, snoutW: 6, snoutH: 3, jawH: 2, eyeR: 0.8, rostrum: { len: 12, w: 5, h: 3 } },
        headAngle: 2,
        tail: { len: 44, w: 10, h: 9, segments: 5, lift: 0, tipW: 2, tipH: 5 },
        legs: { frontW: 4, backW: 5, sprawl: 3, footLen: 3, elbow: 0, knee: 0 },
      });
      sprawl(r, 40);
      const h = r.mb.get('head');
      const tip = r.a.snoutTip;
      // bulla: bulbous knob on the snout tip
      h.box([-3.5, r.a.jawY, tip - 1], [7, 4, 5], 'skin', { tags: ['jawU'] });
      // raised eye bumps
      h.pair([2, r.a.headTop - 1, r.a.craniumZ0 + 2], [3, 2, 3], 'skin');
      // fangs poking out over the jaw
      h.pair([2.5, r.a.jawY - 1, tip + 3], [1, 2, 1], 'tooth');
      h.pair([2, r.a.jawY - 1, tip + 9], [1, 1, 1], 'tooth');
      // tail crest scutes, back armour
      scuteRows(r, { rows: 4, from: r.a.bodyFront + 2, to: r.a.bodyBack, tail: true });
      return r;
    },
  },

  // ------------------------------------------------------------- fish
  {
    ...sea,
    id: 'megalodon',
    name: 'Megalodon',
    info: 'The largest shark that ever lived, Megalodon had teeth the size of a human hand and hunted whales in warm Miocene seas.',
    period: 'Neogene',
    group: 'fish',
    diet: 'carnivore',
    temperament: 'aggressive',
    lengthM: 16,
    scale: 2.2,
    health: 180,
    attack: 20,
    speed: 0.32,
    spawn: { biomes: ['ocean', 'warm_ocean', 'deep_ocean'], weight: 2, herd: [1, 1] },
    sounds: SND.fish,
    drops: [{ item: 'dino:megalodon_tooth', min: 1, max: 3 }],
    palette: { back: '#4b555d', side: '#76818a', belly: '#f0f0ea', accent: '#4b555d', eye: '#101418', mouth: '#9a3c46', teeth: true, spine: false },
    build() {
      const r = marine(
        'megalodon',
        {
          bodyY: 9,
          body: { len: 26, w: 13, h: 15 },
          neck: { len: 2, w: 11, h: 13 },
          head: { len: 8, w: 11, h: 12, snoutLen: 5, snoutW: 9, snoutH: 6, jawH: 4, eyeR: 0.9 },
          tail: { len: 22, segments: 4, fluke: 'none', w: 10, h: 11 },
          flippers: { front: [12, 7] },
          fishFins: true,
        },
        'fish',
      );
      // fusiform body: deepest a third of the way back, narrow caudal peduncle
      streamline(r, {
        w: 13,
        h: 15,
        yc: r.a.bodyY,
        neck: true,
        prof: (t) => (t < 0.3 ? [0.86 + 0.14 * smooth(t / 0.3), 0.88 + 0.12 * smooth(t / 0.3)] : ((f) => [0.2 + 0.8 * f, 0.22 + 0.78 * f])(1 - smooth((t - 0.3) / 0.7))),
      });
      // conical snout overhanging the mouth
      const h = r.mb.get('head');
      slices(r, 'head', { z0: r.a.snoutTip - 4, z1: r.a.snoutTip + 2, yc: () => r.a.jawY + 3, w: (z) => 4 + (z - r.a.snoutTip + 4) * 0.8, h: (z) => 3 + (z - r.a.snoutTip + 4) * 0.4, step: 2, tags: ['jawU'] });
      void h;
      // big triangular dorsal fin and smaller second dorsal
      F.fin(r, { bone: 'body', y: r.a.bodyTop - 1, z0: -4, len: 10, h: 11, sweep: 1, mat: 'dark' });
      F.fin(r, { bone: r.tail[1], y: r.a.bodyY + 4, z0: r.mb.get(r.tail[1]).pivot[2] + 1, len: 3, h: 3, sweep: 1, mat: 'dark' });
      // pelvic & anal fins
      F.fin(r, { bone: 'body', y: r.a.bodyY - r.a.bodyH / 2 - 0, z0: 8, len: 5, h: 4, sweep: 1, down: true, x: 3, mat: 'dark' });
      F.fin(r, { bone: 'body', y: r.a.bodyY - r.a.bodyH / 2 - 0, z0: 8, len: 5, h: 4, sweep: 1, down: true, x: -3, mat: 'dark' });
      // crescent (lunate) tail
      const last = r.tail[r.tail.length - 1];
      const tz = r.a.tailEnd - 3;
      F.fin(r, { bone: last, y: r.a.bodyY + 0.5, z0: tz, len: 6, h: 16, sweep: 1.4, mat: 'dark' });
      F.fin(r, { bone: last, y: r.a.bodyY + 0.5, z0: tz, len: 6, h: 13, sweep: 1.4, down: true, mat: 'dark' });
      // keels on the caudal peduncle
      r.mb.get(last).pair([1, r.a.bodyY - 0.5, tz - 4], [1, 1, 5], 'dark');
      gills(r, 5);
      return r;
    },
  },
  {
    ...sea,
    id: 'dunkleosteus',
    name: 'Dunkleosteus',
    info: 'A Devonian armoured fish whose head was covered in bony plates; instead of teeth it sliced prey with self-sharpening bony blades.',
    period: 'Devonian',
    group: 'fish',
    diet: 'carnivore',
    temperament: 'aggressive',
    lengthM: 6,
    scale: 1.6,
    health: 70,
    attack: 12,
    speed: 0.22,
    spawn: { biomes: ['ocean', 'deep_ocean'], weight: 3, herd: [1, 1] },
    sounds: SND.fish,
    palette: {
      back: '#4b5258', side: '#6e6a5e', belly: '#d8d2c0', accent: '#8a7c62', horn: '#d6ccb4', eye: '#c8a23a', mouth: '#5a2c2c',
      pattern: { type: 'mottled', colour: '#3a3e40', scale: 4, coverage: 0.4 },
    },
    build() {
      const r = marine(
        'dunkleosteus',
        {
          bodyY: 9,
          body: { len: 18, w: 11, h: 13 },
          neck: { len: 2, w: 12, h: 14 },
          head: { len: 9, w: 11, h: 12, snoutLen: 3, snoutW: 9, snoutH: 5, jawH: 4, eyeR: 1.2 },
          tail: { len: 20, segments: 4, fluke: 'none', w: 9, h: 9 },
          flippers: { front: [8, 5] },
          fishFins: true,
        },
        'fish',
      );
      // heavy armoured front, long eel-like rear body
      streamline(r, { w: 11, h: 13, yc: r.a.bodyY, neck: true, prof: (t) => (t < 0.18 ? [1, 1] : ((f) => [0.22 + 0.78 * f, 0.24 + 0.76 * f])(1 - smooth((t - 0.18) / 0.82))) });
      const h = r.mb.get('head');
      const j = r.mb.get('jaw');
      const { craniumZ0, headPivot, jawY, headTop, snoutTip } = r.a;
      // armoured head shield: blunt rounded front sloping up to the back of the skull
      const shieldLen = headPivot[2] + 2 - snoutTip;
      const sh = (z: number) => smooth(Math.min(1, (z - snoutTip) / (shieldLen * 0.6)));
      slices(r, 'head', { z0: snoutTip, z1: headPivot[2] + 2, yc: (z) => jawY + 0.5 + (4 + 5 * sh(z)) / 2, w: (z) => 9 + 4 * sh(z), h: (z) => 4 + 5 * sh(z), mat: 'armor', tags: ['jawU'] });
      // eyes set into the shield
      const ez = craniumZ0 + 2;
      h.pair([(9 + 4 * sh(ez + 1)) / 2 - 0.6, jawY + 4, ez], [1, 1, 1], 'eye');
      // bony blade "fangs" at the front of both jaws
      h.pair([3, jawY - 2, snoutTip], [2, 3, 2], 'horn');
      h.box([-1, jawY - 2, snoutTip - 1], [2, 3, 2], 'horn');
      j.pair([3, jawY - 1, snoutTip + 1], [2, 2, 2], 'horn');
      j.box([-1, jawY - 1, snoutTip], [2, 2, 2], 'horn');
      // jaw plate
      j.box([-6, jawY - 5.5, snoutTip + 1], [12, 1, headPivot[2] - snoutTip - 2], 'armor');
      // thoracic shield ring behind the head
      slices(r, 'body', { z0: r.a.bodyFront - 1, z1: r.a.bodyFront + 5, yc: () => r.a.bodyY, w: () => 13, h: () => 14, mat: 'armor' });
      F.fin(r, { bone: 'body', y: r.a.bodyTop - 1, z0: 0, len: 7, h: 6, sweep: 1, mat: 'dark' });
      const last = r.tail[r.tail.length - 1];
      const tz = r.a.tailEnd - 3;
      F.fin(r, { bone: last, y: r.a.bodyY + 0.5, z0: tz, len: 5, h: 10, sweep: 1.3, mat: 'dark' });
      F.fin(r, { bone: last, y: r.a.bodyY + 0.5, z0: tz, len: 5, h: 6, sweep: 1.3, down: true, mat: 'dark' });
      // pelvic fins
      F.fin(r, { bone: r.tail[0], y: r.a.bodyY - 3, z0: r.mb.get(r.tail[0]).pivot[2], len: 4, h: 3, down: true, x: 2, mat: 'dark' });
      F.fin(r, { bone: r.tail[0], y: r.a.bodyY - 3, z0: r.mb.get(r.tail[0]).pivot[2], len: 4, h: 3, down: true, x: -2, mat: 'dark' });
      return r;
    },
  },

  // ------------------------------------------------------------- marine reptiles
  {
    ...sea,
    id: 'mosasaurus',
    name: 'Mosasaurus',
    info: 'A giant marine lizard related to monitor lizards and snakes, Mosasaurus had a second row of teeth on the roof of its mouth to grip slippery prey.',
    period: 'Cretaceous',
    group: 'marine_reptile',
    diet: 'carnivore',
    temperament: 'aggressive',
    lengthM: 15,
    scale: 2,
    health: 150,
    attack: 16,
    speed: 0.3,
    tame: { items: ['minecraft:salmon', 'minecraft:tropical_fish'] },
    ride: { mode: 'swim', seats: 2, speed: 0.07 },
    spawn: { biomes: ['ocean', 'warm_ocean', 'deep_ocean'], weight: 2, herd: [1, 1] },
    sounds: SND.sea,
    palette: {
      back: '#2e3940', side: '#56646c', belly: '#ddd8c8', accent: '#2e3940', eye: '#d8b030', mouth: '#8c3a40',
      pattern: { type: 'mottled', colour: '#232c32', scale: 5, coverage: 0.3, strength: 0.6 }, teeth: true,
    },
    build() {
      const r = marine('mosasaurus', {
        bodyY: 8,
        body: { len: 30, w: 12, h: 11 },
        neck: { len: 5, w: 9, h: 9 },
        head: { len: 9, w: 8, h: 7, snoutLen: 12, snoutW: 6, snoutH: 4, jawH: 3, eyeR: 0.9, cheek: 1 },
        tail: { len: 40, segments: 5, fluke: 'none', w: 10, h: 9 },
        flippers: { front: [10, 6], back: [8, 5] },
      });
      // long lizard body; tail flattens sideways towards the fluke and bends down at the tip
      streamline(r, {
        w: 12,
        h: 11,
        yc: r.a.bodyY,
        tailYc: r.a.bodyY - 2,
        neck: true,
        prof: (t) => (t < 0.22 ? [0.72 + 0.28 * smooth(t / 0.22), 0.75 + 0.25 * smooth(t / 0.22)] : ((f) => [0.18 + 0.82 * f, 0.42 + 0.58 * f])(1 - smooth((t - 0.22) / 0.78))),
      });
      // shark-like tail fluke: big downturned lower lobe, small upper lobe
      const last = r.tail[r.tail.length - 1];
      F.fin(r, { bone: last, y: r.a.bodyY - 2, z0: r.a.tailEnd - 7, len: 7, h: 12, sweep: 1.6, down: true, mat: 'dark' });
      F.fin(r, { bone: last, y: r.a.bodyY - 1, z0: r.a.tailEnd - 6, len: 5, h: 4, sweep: 1.2, mat: 'dark' });
      // pointed snout tip and brow ridge
      const h = r.mb.get('head');
      h.box([-2, r.a.jawY, r.a.snoutTip - 2], [4, 3, 3], 'skin', { tags: ['jawU'] });
      h.pair([2.5, r.a.headTop - 1, r.a.craniumZ0 + 1], [2, 1, 4], 'skin');
      // low keel along back
      F.fin(r, { bone: 'body', y: r.a.bodyTop - 1, z0: -6, len: 16, h: 2, sweep: 0, mat: 'dark' });
      return r;
    },
  },
  {
    ...sea,
    id: 'plesiosaurus',
    name: 'Plesiosaurus',
    info: 'Plesiosaurus "rowed" through Jurassic seas with four flippers and used its long neck to sneak up on schools of fish.',
    period: 'Jurassic',
    group: 'marine_reptile',
    diet: 'piscivore',
    temperament: 'passive',
    lengthM: 3.5,
    scale: 1.5,
    health: 50,
    attack: 5,
    speed: 0.24,
    tame: { items: ['minecraft:cod', 'minecraft:salmon'] },
    ride: { mode: 'swim', seats: 1, speed: 0.06 },
    spawn: { biomes: ['ocean', 'warm_ocean'], weight: 5, herd: [1, 3] },
    sounds: SND.sea,
    palette: {
      back: '#3a5562', side: '#5f8090', belly: '#e0e4dc', accent: '#3a5562', eye: '#e2b84a',
      pattern: { type: 'spots', colour: '#2a3f4c', scale: 4, coverage: 0.45 }, teeth: true,
    },
    build() {
      const r = marine('plesiosaurus', {
        bodyY: 8,
        body: { len: 20, w: 14, h: 9 },
        neck: { len: 26, w: 6, h: 6, segments: 5, angle: 18 },
        head: { len: 4, w: 5, h: 4, snoutLen: 4, snoutW: 3, snoutH: 2, jawH: 1, eyeR: 0.8 },
        tail: { len: 12, segments: 3, fluke: 'none', w: 9, h: 6 },
        flippers: { front: [15, 6], back: [13, 5] },
      });
      // broad, flat teardrop body with a short tapering tail
      streamline(r, { w: 15, h: 9, yc: r.a.bodyY, prof: (t) => [Math.max(0.16, Math.sin(Math.PI * Math.min(1, 0.16 + t * 0.95))), Math.max(0.22, Math.sin(Math.PI * Math.min(1, 0.2 + t * 0.9)))] });
      // small tail fin
      const last = r.tail[r.tail.length - 1];
      F.fin(r, { bone: last, y: r.a.bodyY + 1, z0: r.a.tailEnd - 5, len: 5, h: 3, sweep: 1, mat: 'dark' });
      return r;
    },
  },
  {
    ...sea,
    id: 'ichthyosaurus',
    name: 'Ichthyosaurus',
    info: 'Dolphin-shaped Ichthyosaurus gave birth to live young at sea and had huge eyes ringed with bone for seeing in deep, dark water.',
    period: 'Jurassic',
    group: 'marine_reptile',
    diet: 'piscivore',
    temperament: 'passive',
    lengthM: 3.3,
    scale: 1.3,
    health: 40,
    attack: 4,
    speed: 0.34,
    tame: { items: ['minecraft:cod', 'minecraft:salmon', 'minecraft:tropical_fish'] },
    ride: { mode: 'swim', seats: 1, speed: 0.08 },
    spawn: { biomes: ['ocean', 'warm_ocean'], weight: 6, herd: [2, 4] },
    sounds: SND.sea,
    palette: { back: '#384756', side: '#6c7f8f', belly: '#eceee8', accent: '#384756', eye: '#e8d27a', teeth: true },
    build() {
      const r = marine('ichthyosaurus', {
        bodyY: 8,
        body: { len: 18, w: 9, h: 11 },
        neck: { len: 2, w: 8, h: 9 },
        head: { len: 6, w: 7, h: 7, snoutLen: 9, snoutW: 3, snoutH: 2, jawH: 1, eyeR: 1.8 },
        tail: { len: 16, segments: 4, fluke: 'none', w: 7, h: 7 },
        flippers: { front: [8, 4], back: [5, 3] },
      });
      // bony eye ring
      r.mb.decal({ kind: 'colour', center: [3.5, r.a.jawY + 3.4, r.a.craniumZ0 + 2], radius: [0.7, 2.6, 2.6], colour: '#d6d0bc', mirrorX: true });
      r.mb.decal({ kind: 'eye', center: [3.5, r.a.jawY + 3.4, r.a.craniumZ0 + 2], radius: [0.7, 1.7, 1.7], mirrorX: true });
      // dolphin-like body: deep chest, slim tail stock
      streamline(r, { w: 9, h: 11, yc: r.a.bodyY, neck: true, prof: (t) => (t < 0.28 ? [0.8 + 0.2 * smooth(t / 0.28), 0.82 + 0.18 * smooth(t / 0.28)] : ((f) => [0.18 + 0.82 * f, 0.2 + 0.8 * f])(1 - smooth((t - 0.28) / 0.72))) });
      F.fin(r, { bone: 'body', y: r.a.bodyY + 4.5, z0: -2, len: 7, h: 7, sweep: 1.2, mat: 'dark' });
      const last = r.tail[r.tail.length - 1];
      const tz = r.a.tailEnd - 3;
      F.fin(r, { bone: last, y: r.a.bodyY, z0: tz, len: 5, h: 10, sweep: 1.4, mat: 'dark' });
      F.fin(r, { bone: last, y: r.a.bodyY, z0: tz, len: 5, h: 9, sweep: 1.4, down: true, mat: 'dark' });
      return r;
    },
  },

  // ------------------------------------------------------------- pterosaurs
  {
    ...ptero,
    id: 'pteranodon',
    name: 'Pteranodon',
    info: 'Pteranodon soared over Cretaceous seas on a 6-metre wingspan; its toothless beak scooped up fish like a pelican.',
    period: 'Cretaceous',
    temperament: 'skittish',
    lengthM: 1.8,
    scale: 1.5,
    health: 30,
    attack: 4,
    speed: 0.3,
    tame: { items: ['minecraft:cod', 'minecraft:salmon'] },
    ride: { mode: 'fly', seats: 1, speed: 0.3 },
    spawn: { biomes: ['mountain', 'beach', 'prehistoric'], weight: 6, herd: [1, 3] },
    palette: { back: '#55595c', side: '#9b9e9a', belly: '#ece8de', accent: '#b4482e', accent2: '#d9883a', horn: '#d8c79a', membrane: '#7a5442', eye: '#e8b83a' },
    build() {
      const r = pterosaur('pteranodon', {
        bodyY: 12,
        body: { len: 10, w: 6, h: 6 },
        neck: { len: 7, w: 3, h: 3, angle: 26, segments: 2 },
        head: { len: 4, w: 4, h: 4, snoutLen: 13, snoutW: 2, snoutH: 2, jawH: 1, beak: true, eyeR: 0.7 },
        wing: { span: 36, chord: 9, armW: 2 },
        legs: { len: 10, w: 2 },
      });
      taperBeak(r, { w: 3, h: 3 });
      // long crest sweeping back and up from the skull, as long as the beak
      const h = r.mb.get('head');
      const y = r.a.headTop - 1;
      const cz = r.a.craniumZ0 + 1;
      const crest = (z0: number, len: number, hh: number, dy: number) =>
        h.box([-0.5, y + dy, z0], [1, hh, len], 'accent', { rotation: [-22, 0, 0], pivot: [0, y, cz] });
      crest(cz, 6, 4, 0);
      crest(cz + 6, 5, 3, 0.5);
      crest(cz + 11, 4, 2, 1);
      trimMembrane(r, 0.65);
      return r;
    },
  },
  {
    ...ptero,
    id: 'pterodactylus',
    name: 'Pterodactylus',
    info: 'The first pterosaur ever named, Pterodactylus was roughly the size of a raven and snapped up insects and small fish with needle-like teeth.',
    period: 'Jurassic',
    temperament: 'skittish',
    lengthM: 0.9,
    scale: 0.8,
    health: 12,
    attack: 2,
    speed: 0.32,
    tame: { items: ['minecraft:cod', 'minecraft:salmon', 'minecraft:tropical_fish'] },
    spawn: { biomes: ['mountain', 'beach', 'prehistoric', 'jungle'], weight: 8, herd: [2, 4] },
    palette: { back: '#6b4e3a', side: '#a07a58', belly: '#e8d8bc', accent: '#d8a23a', horn: '#d9c9a2', membrane: '#9c6a48', eye: '#f0c84a', teeth: true },
    build() {
      const r = pterosaur('pterodactylus', {
        bodyY: 10,
        body: { len: 9, w: 6, h: 6 },
        neck: { len: 6, w: 3, h: 3, angle: 30, segments: 2 },
        head: { len: 4, w: 4, h: 4, snoutLen: 8, snoutW: 2, snoutH: 2, jawH: 1, eyeR: 0.8 },
        wing: { span: 26, chord: 8, armW: 2 },
        legs: { len: 8, w: 2 },
        tail: { len: 3 },
      });
      // small soft crest at back of skull
      F.crest(r, { fromTip: 10, len: 4, h: 2, w: 1 });
      trimMembrane(r, 0.7);
      return r;
    },
  },
  {
    ...ptero,
    id: 'quetzalcoatlus',
    name: 'Quetzalcoatlus',
    info: 'One of the largest flying animals ever, Quetzalcoatlus stood as tall as a giraffe and stalked small prey on the ground like a giant stork.',
    period: 'Cretaceous',
    diet: 'carnivore',
    food: [...FISH, ...SMALL_MEAT],
    temperament: 'neutral',
    lengthM: 11,
    scale: 2.2,
    health: 70,
    attack: 9,
    speed: 0.32,
    tame: { items: ['minecraft:salmon', 'dino:raw_dino_meat'] },
    ride: { mode: 'fly', seats: 2, speed: 0.34 },
    hitbox: { width: 2.2, height: 3.6 },
    spawn: { biomes: ['mountain', 'savanna', 'prehistoric'], weight: 3, herd: [1, 2] },
    palette: { back: '#62625a', side: '#aeac9c', belly: '#ebe6da', accent: '#b8503a', accent2: '#3a3f4a', horn: '#d9c896', membrane: '#665044', eye: '#e0b040' },
    build() {
      const r = pterosaur('quetzalcoatlus', {
        bodyY: 18,
        body: { len: 11, w: 7, h: 7 },
        neck: { len: 26, w: 3, h: 3, angle: 62, segments: 4 },
        head: { len: 5, w: 4, h: 5, snoutLen: 14, snoutW: 3, snoutH: 3, jawH: 2, beak: true, eyeR: 0.8 },
        wing: { span: 44, chord: 12, armW: 3 },
        legs: { len: 15, w: 3 },
      });
      taperBeak(r, { w: 3, h: 6 });
      trimMembrane(r, 0.7);
      // modest bony crest
      const h = r.mb.get('head');
      h.box([-0.5, r.a.headTop - 1, r.a.craniumZ0 - 2], [1, 4, 7], 'accent', { rotation: [-10, 0, 0], pivot: [0, r.a.headTop, r.a.craniumZ0 + 5] });
      return r;
    },
  },
  {
    ...ptero,
    id: 'dimorphodon',
    name: 'Dimorphodon',
    info: 'Dimorphodon had a big, puffin-like head with two kinds of teeth and a long stiff tail tipped with a diamond-shaped vane.',
    period: 'Jurassic',
    diet: 'insectivore',
    food: [...SMALL_MEAT, 'minecraft:cod'],
    temperament: 'neutral',
    lengthM: 1,
    scale: 0.85,
    health: 14,
    attack: 3,
    speed: 0.3,
    tame: { items: ['minecraft:cod', 'dino:raw_dino_meat'] },
    spawn: { biomes: ['beach', 'jungle', 'prehistoric'], weight: 7, herd: [2, 4] },
    palette: { back: '#3f3a34', side: '#6e6458', belly: '#d9cdb8', accent: '#c88a3a', accent2: '#8a3b2a', membrane: '#5c4636', eye: '#ffd24a', teeth: true },
    build() {
      const r = pterosaur('dimorphodon', {
        bodyY: 10,
        body: { len: 9, w: 5, h: 5 },
        neck: { len: 4, w: 3, h: 3, angle: 30, segments: 1 },
        head: { len: 4, w: 4, h: 5, snoutLen: 4, snoutW: 3, snoutH: 4, jawH: 2, eyeR: 0.9 },
        wing: { span: 24, chord: 7, armW: 2 },
        legs: { len: 7, w: 2 },
        tail: { len: 16, vane: true },
      });
      trimMembrane(r, 0.7);
      // colourful puffin-like snout bands
      const tip = r.a.snoutTip;
      r.mb.decal({ kind: 'colour', center: [0, r.a.jawY + 3, tip + 2], radius: [4, 4, 1.2], colour: '#c88a3a' });
      r.mb.decal({ kind: 'colour', center: [0, r.a.jawY + 3, tip + 4], radius: [4, 4, 0.8], colour: '#8a3b2a' });
      return r;
    },
  },

  // ------------------------------------------------------------- synapsid
  {
    id: 'dimetrodon',
    name: 'Dimetrodon',
    info: 'Not a dinosaur at all, Dimetrodon lived 40 million years before them and is more closely related to mammals; its tall sail may have helped it warm up.',
    period: 'Permian',
    group: 'synapsid',
    diet: 'carnivore',
    temperament: 'neutral',
    habitat: 'land',
    lengthM: 3.5,
    scale: 1.2,
    health: 45,
    attack: 7,
    speed: 0.22,
    food: MEAT,
    tame: { items: ['dino:raw_dino_meat', 'minecraft:beef'] },
    spawn: { biomes: ['desert', 'mesa', 'savanna', 'prehistoric'], weight: 6, herd: [1, 2] },
    sounds: SND.croc,
    palette: {
      back: '#6a4a32', side: '#8c6644', belly: '#d6c19a', accent: '#c4632e', accent2: '#e8b048', eye: '#e8c04a',
      pattern: { type: 'stripes', colour: '#4a3222', scale: 4, coverage: 0.35 }, teeth: true,
    },
    build() {
      const r = quadruped('dimetrodon', {
        frontLeg: 6,
        backLeg: 7,
        body: { len: 22, w: 11, h: 9 },
        neck: { len: 4, w: 7, h: 7, angle: 0 },
        head: { len: 7, w: 7, h: 8, snoutLen: 5, snoutW: 5, snoutH: 5, jawH: 3 },
        headAngle: 4,
        tail: { len: 26, w: 7, h: 6, segments: 4, lift: -1 },
        legs: { frontW: 3, backW: 4, sprawl: 2.5, footLen: 2, elbow: 0, knee: 0 },
      });
      sprawl(r, 35);
      // the famous sail: spines + webbing
      F.sail(r, { h: 18, from: r.a.bodyFront + 1, to: r.a.bodyBack - 2, arch: true });
      const b = r.mb.get('body');
      const y = r.a.bodyTop - 1;
      for (let z = r.a.bodyFront + 2; z < r.a.bodyBack - 2; z += 3) {
        const t = (z - r.a.bodyFront) / (r.a.bodyBack - r.a.bodyFront);
        const hh = Math.round(18 * Math.sin(Math.PI * (0.15 + t * 0.7))) + 1;
        b.box([-0.5, y, z], [1, hh, 1], 'horn', { inflate: 0.15 });
      }
      // canine-like fangs
      r.mb.get('head').pair([1.5, r.a.jawY - 1, r.a.snoutTip + 1], [1, 2, 1], 'tooth');
      return r;
    },
  },

  // ------------------------------------------------------------- snake
  {
    id: 'titanoboa',
    name: 'Titanoboa',
    info: 'The largest snake ever found, Titanoboa lived in steamy Paleocene rainforests just after the dinosaurs vanished and weighed over a tonne.',
    period: 'Paleogene',
    group: 'snake',
    diet: 'carnivore',
    temperament: 'aggressive',
    habitat: 'amphibious',
    lengthM: 13,
    scale: 1.4,
    health: 90,
    attack: 12,
    speed: 0.2,
    food: MEAT,
    tame: 'egg',
    spawn: { biomes: ['swamp', 'river', 'jungle', 'prehistoric'], weight: 2, herd: [1, 1] },
    sounds: SND.snake,
    palette: {
      back: '#4a4a2e', side: '#6f6b44', belly: '#d9cf9c', accent: '#4a4a2e', eye: '#d8b030', mouth: '#8a3a44',
      pattern: { type: 'rosettes', colour: '#2a271a', scale: 3.5, coverage: 0.55 }, teeth: true,
    },
    build() {
      const r = snake('titanoboa', { w: 10, h: 9, segments: 14, segLen: 7, head: { len: 7, w: 10, h: 6, snoutLen: 5, snoutW: 6, snoutH: 3, jawH: 2, eyeR: 0.8, cheek: 2 } });
      // rounded, heavy body: slimmer neck, thickest in the middle, long tapering tail
      const segs = ['body', ...r.tail];
      const n = segs.length;
      segs.forEach((bn, i) => {
        const c = r.mb.get(bn).bone.cubes[0];
        const z0 = c.origin[2], z1 = c.origin[2] + c.size[2];
        clearBone(r, bn);
        const prof = (z: number) => {
          const t = (i + (z - z0) / (z1 - z0)) / n;
          return t < 0.25 ? 0.72 + 0.28 * smooth(t / 0.25) : t < 0.55 ? 1 : 1 - 0.8 * smooth((t - 0.55) / 0.45);
        };
        slices(r, bn, { z0, z1, yc: (z) => (9 * prof(z)) / 2, w: (z) => 10 * prof(z), h: (z) => 9 * prof(z), step: 3 });
      });
      // flicking tongue
      r.mb.get('jaw').box([-0.5, r.a.jawY - 0.5, r.a.snoutTip - 3], [1, 0, 4], 'mouth');
      return r;
    },
  },
];
