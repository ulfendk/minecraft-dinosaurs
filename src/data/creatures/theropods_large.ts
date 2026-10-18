import { theropod, type Rig, type TheropodSpec } from '../../model/rigs.js';
import * as F from '../../creatures/features.js';
import type { CreatureDef } from '../types.js';
import { MEAT, FISH, SND } from '../common.js';

const carn = { diet: 'carnivore' as const, group: 'theropod' as const, habitat: 'land' as const, food: MEAT };
const fishy = { diet: 'piscivore' as const, group: 'theropod' as const, habitat: 'land' as const, food: FISH };

// ---------------------------------------------------------------------------
// local part helpers

/** Big hooked thumb claws on the hands (spinosaurids). */
function thumbClaws(r: Rig, armLen: number, size = 3) {
  for (const a of r.arms) {
    const b = r.mb.get(a);
    const [px, py, pz] = b.pivot;
    b.box([px - 0.5, py - armLen - size, pz - 2], [1, size, 1], 'claw', { rotation: [-35, 0, 0], pivot: [px, py - armLen, pz - 1] });
  }
}

/** Tall paddle fin on the tail (Spinosaurus), above and below the tail segments. */
function tailPaddle(r: Rig, tailH: number, h: number) {
  const n = r.tail.length;
  r.tail.forEach((t, i) => {
    if (i === 0) return;
    const b = r.mb.get(t);
    const [, py, pz] = b.pivot;
    const next = r.tail[i + 1] ? r.mb.get(r.tail[i + 1]).pivot[2] : r.a.tailEnd;
    const len = Math.max(2, next - pz);
    const top = py + tailH / 2; // tail chain is top-aligned
    const segH = Math.max(1, Math.round(tailH + (2 - tailH) * (i / n)));
    const bottom = top - segH;
    const hh = Math.max(2, Math.round(h * (0.55 + 0.45 * (i / n))));
    b.box([-0.5, top - 1, pz], [1, hh + 1, len], 'accent');
    b.box([-0.5, bottom - Math.round(hh * 0.7), pz + 1], [1, Math.round(hh * 0.7) + 1, Math.max(1, len - 1)], 'accent');
  });
}

/** Row of small osteoderm bumps along the spine (Ceratosaurus). */
function osteoderms(r: Rig, n: number, from: number, to: number) {
  const b = r.mb.get('body');
  const y = r.a.bodyTop - 1;
  for (let i = 0; i < n; i++) {
    const z = from + ((to - from) * i) / Math.max(1, n - 1);
    b.box([-1, y, z - 1], [2, 2, 2], 'plate');
  }
  r.tail.slice(0, 2).forEach((t) => {
    const tb = r.mb.get(t);
    const [, py, pz] = tb.pivot;
    for (let i = 0; i < 3; i++) tb.box([-0.5, py + 3, pz + 1 + i * 4], [1, 2, 2], 'plate');
  });
}

/** Low ridge along the back (Suchomimus). */
function ridge(r: Rig, h: number, from: number, to: number) {
  F.sail(r, { h, from, to, arch: true, mat: 'accent' });
}

/** Paired lacrimal horns / brow bosses directly in front of the eyes. */
function lacrimal(r: Rig, fromTip: number, len = 3, w = 2, tilt = 20) {
  F.hornPair(r, { fromTip, len, w, tilt, splay: 0, out: 0, mat: 'accent' });
}

/**
 * Adds anatomical bulk on top of the theropod rig so the silhouette reads like a
 * real animal instead of slabs: drumstick thighs, calves, toe claws, deep ribcage,
 * thick neck base, caudofemoral tail muscle, sloping snout, brow ridges, jaw muscles.
 */
function sculpt(r: Rig, s: TheropodSpec, o: { thigh?: number; calf?: number; neckBase?: number; tailBulk?: number; brow?: boolean; jowl?: number; snoutSlope?: boolean; rib?: number } = {}) {
  const a = r.a;
  const tw = s.legs.thighW;
  // legs
  for (const leg of r.legs) {
    const [lb, sb, fb] = leg.chain.map((n) => r.mb.get(n));
    const [sx, hipY] = lb.pivot;
    const kneeY = sb.pivot[1];
    const ankleY = fb.pivot[1];
    const thighLen = hipY - kneeY;
    const shinLen = kneeY - ankleY;
    const mw = tw + (o.thigh ?? 2);
    // drumstick: deep at the hip, tapering into the knee
    lb.box([sx - mw / 2, kneeY + thighLen * 0.35, -tw * 0.95], [mw, thighLen * 0.65 + 3, tw * 2], 'skin', { tags: ['limb'] });
    lb.box([sx - (mw - 2) / 2, kneeY + 1, -tw * 0.7], [mw - 2, thighLen * 0.45, tw * 1.45], 'skin', { tags: ['limb'] });
    // calf muscle on the back of the upper shin
    const sw = s.legs.shinW ?? Math.max(2, Math.round(tw * 0.7));
    const cw = sw + (o.calf ?? 1);
    sb.box([sx - cw / 2, kneeY - shinLen * 0.55, -sw / 2], [cw, shinLen * 0.55 + 1, sw + 2], 'skin', { tags: ['limb'] });
    // three forward toes with claws
    const fw = s.legs.footW ?? Math.max(3, sw + 1);
    const fl = s.legs.footLen ?? 6;
    const footBox = fb.bone.cubes[1]; // the rig's toe row
    if (footBox) {
      const [fx0, fy0, fz0] = footBox.origin;
      const w3 = Math.max(1, Math.floor(fw / 3));
      for (let i = 0; i < 3; i++) {
        const x = fx0 + i * (fw - w3) / 2;
        const long = i === 1 ? 1 : 0;
        fb.box([x, fy0, fz0 - 1 - long], [w3, 1, 1 + long], 'claw');
      }
      // hallux (dewclaw) on the inside
      fb.box([sx - 0.5, fy0 + 2, fz0 + fl - 2], [1, 1, 1], 'claw');
    }
  }
  // ribcage: deeper and rounder through the chest, narrowing at the waist
  const body = r.mb.get('body');
  const rib = o.rib ?? Math.round(a.bodyH * 0.22);
  body.box([-(a.bodyW - 1) / 2, a.bodyY - a.bodyH / 2 - rib, a.bodyFront + 3], [a.bodyW - 1, rib + 2, Math.round((a.bodyBack - a.bodyFront) * 0.38)], 'skin');
  body.box([-(a.bodyW - 3) / 2, a.bodyY - a.bodyH / 2 - rib - 1, a.bodyFront + 5], [a.bodyW - 3, 2, Math.round((a.bodyBack - a.bodyFront) * 0.26)], 'skin');
  // rounded back: a narrower top layer
  body.box([-(a.bodyW - 4) / 2, a.bodyTop - 1, a.bodyFront + 4], [a.bodyW - 4, 2, a.bodyBack - a.bodyFront - 8], 'skin');
  // thick neck base sweeping up from the shoulders
  const nb = o.neckBase ?? 2;
  if (nb > 0) {
    const n0 = r.mb.get(r.neck[0]);
    const nw = s.neck.w + nb;
    body.box([-nw / 2, a.bodyY - a.bodyH * 0.2, a.bodyFront - 2], [nw, a.bodyH * 0.7 + 1, 7], 'skin');
    n0.box([-(nw - 1) / 2, n0.pivot[1] - s.neck.h / 2 - 1, n0.pivot[2] - 4], [nw - 1, s.neck.h + 2, 5], 'skin');
  }
  // tail base: caudofemoralis bulge underneath and a thicker root
  const t0 = r.mb.get(r.tail[0]);
  const t1z = r.tail[1] ? r.mb.get(r.tail[1]).pivot[2] : a.tailEnd;
  const c0 = t0.bone.cubes[0];
  if (c0) {
    const [x0, y0, z0] = c0.origin;
    const [w0, h0] = c0.size;
    const bulk = o.tailBulk ?? 2;
    t0.box([x0 + 0.5, y0 - bulk, z0], [w0 - 1, bulk + 1, Math.round((t1z - z0) * 0.75)], 'skin');
    t0.box([x0 - 0.5, y0 + 1, z0], [w0 + 1, h0 - 2, Math.round((t1z - z0) * 0.45)], 'skin');
  }
  // head
  const head = r.mb.get(r.head);
  const cranH = a.headTop - a.jawY;
  const sw = s.head.snoutW ?? Math.max(2, s.head.w - 2);
  const sh = s.head.snoutH ?? Math.max(2, Math.round(cranH * 0.75));
  if (o.snoutSlope !== false && s.head.snoutLen > 3) {
    // maxilla step: snout height rises towards the eyes so the profile slopes
    const stepH = Math.round(sh + (cranH - sh) * 0.55);
    head.box([-(sw + 1) / 2, a.jawY, a.craniumZ0 - Math.round(s.head.snoutLen * 0.5)], [sw + 1, stepH, Math.round(s.head.snoutLen * 0.5) + 1], 'skin', { tags: ['jawU'] });
  }
  if (o.brow !== false) {
    // bony brow ridges over the eyes
    head.pair([s.head.w / 2 - 2, a.headTop - 1, a.craniumZ0 + 1], [2, 1, Math.max(3, Math.round(s.head.len * 0.4))], 'skin');
  }
  const jowl = o.jowl ?? 1;
  if (jowl > 0) {
    // jaw-closing muscles bulging behind the eyes
    const jl = Math.max(3, Math.round(s.head.len * 0.45));
    head.pair([s.head.w / 2 - 1, a.jawY - 1, a.headPivot[2] - jl], [jowl + 1, Math.max(2, Math.round(cranH * 0.55)), jl], 'skin');
  }
}

const base = (o: Partial<TheropodSpec> & Pick<TheropodSpec, 'hipY' | 'body' | 'neck' | 'head' | 'tail' | 'arms' | 'legs'>) => o as TheropodSpec;

type SculptOpts = Parameters<typeof sculpt>[2];
/** Builds the rig and sculpts it. */
function make(id: string, spec: TheropodSpec, o: SculptOpts = {}) {
  const r = theropod(id, spec);
  sculpt(r, spec, o);
  return r;
}

// ---------------------------------------------------------------------------

export const theropodsLarge: CreatureDef[] = [
  {
    ...fishy,
    id: 'spinosaurus',
    name: 'Spinosaurus',
    info: 'The longest known predatory dinosaur hunted giant fish in North African rivers, using a sail and a paddle-shaped tail.',
    period: 'Cretaceous',
    lengthM: 14,
    scale: 1.85,
    temperament: 'aggressive',
    health: 170,
    attack: 16,
    speed: 0.25,
    tame: 'egg',
    ride: { mode: 'ground', seats: 2, jump: 0.6 },
    // the sail would otherwise make the hitbox ~5.6 blocks tall
    hitbox: { width: 2.3, height: 4.6 },
    spawn: { biomes: ['prehistoric', 'river', 'swamp'], weight: 2, herd: [1, 1] },
    sounds: SND.huge,
    palette: {
      back: '#4c4033', side: '#76644c', belly: '#d0be98', accent: '#9a4a2e', accent2: '#c8924a', eye: '#d9b02a',
      pattern: { type: 'blotches', colour: '#3d3226', scale: 6, coverage: 0.45 }, teeth: true, spine: true,
    },
    build() {
      const r = make('spinosaurus', base({
        hipY: 21,
        body: { len: 46, w: 13, h: 15, chest: 3 },
        neck: { len: 16, w: 8, h: 9, angle: 34, segments: 2 },
        head: { len: 9, w: 9, h: 9, snoutLen: 7, snoutW: 6, snoutH: 5, jawH: 3, rostrum: { len: 9, w: 5, h: 5 } },
        tail: { len: 56, segments: 6, lift: 1, h: 10 },
        arms: { len: 11, w: 3, angle: -45, big: true },
        legs: { thighW: 8, footLen: 8, footW: 7 },
      }));
      F.sail(r, { h: 26, from: r.a.bodyFront + 3, to: r.a.bodyBack - 1, arch: true });
      // sail continues low onto the tail base
      F.sail(r, { h: 7, from: r.mb.get('tail0').pivot[2], to: r.mb.get('tail0').pivot[2] + 10, arch: true, bone: 'tail0' });
      thumbClaws(r, 11, 3);
      tailPaddle(r, 10, 7);
      // small crest bump on the snout
      F.crest(r, { fromTip: 6, len: 5, h: 2, w: 2 });
      return r;
    },
  },
  {
    ...carn,
    id: 'allosaurus',
    name: 'Allosaurus',
    info: 'The top predator of the Late Jurassic hacked at prey with its upper jaw like an axe, and had little horns in front of its eyes.',
    period: 'Jurassic',
    lengthM: 9.5,
    scale: 1.4,
    temperament: 'aggressive',
    health: 110,
    attack: 13,
    speed: 0.28,
    tame: 'egg',
    spawn: { biomes: ['prehistoric', 'plains', 'savanna'], weight: 2, herd: [1, 2] },
    sounds: SND.bigCarn,
    palette: {
      back: '#5e3e2c', side: '#8c6044', belly: '#d9c39e', accent: '#a8402a', eye: '#e8b33a',
      pattern: { type: 'stripes', colour: '#3e2a1e', scale: 5, coverage: 0.4 }, teeth: true, spine: true,
    },
    build() {
      const r = make('allosaurus', base({
        hipY: 28,
        body: { len: 32, w: 12, h: 15, chest: 3 },
        neck: { len: 14, w: 8, h: 10, angle: 32, segments: 2 },
        head: { len: 10, w: 10, h: 11, snoutLen: 10, snoutW: 8, snoutH: 7, jawH: 4 },
        tail: { len: 46, segments: 5, lift: 2 },
        arms: { len: 10, w: 3, angle: -45, big: true },
        legs: { thighW: 8, footLen: 8, footW: 5 },
      }));
      lacrimal(r, 11, 3, 2, 15);
      // nasal ridge
      F.crest(r, { fromTip: 2, len: 8, h: 1, w: 2, mat: 'accent' });
      thumbClaws(r, 10, 2);
      return r;
    },
  },
  {
    ...carn,
    id: 'carnotaurus',
    name: 'Carnotaurus',
    info: 'The "meat-eating bull" had thick horns over its eyes, comically tiny arms and long legs built for speed.',
    period: 'Cretaceous',
    lengthM: 8,
    scale: 1.35,
    temperament: 'aggressive',
    health: 95,
    attack: 12,
    speed: 0.34,
    tame: { items: MEAT },
    ride: { mode: 'ground', seats: 1, speed: 0.36, jump: 0.8 },
    spawn: { biomes: ['prehistoric', 'savanna', 'desert', 'mesa'], weight: 2, herd: [1, 1] },
    sounds: SND.bigCarn,
    palette: {
      back: '#673a2c', side: '#93583e', belly: '#dcc6a2', accent: '#2d1b14', eye: '#f0c040',
      pattern: { type: 'rosettes', colour: '#46281e', scale: 4, coverage: 0.5 }, teeth: true, spine: true,
    },
    build() {
      const r = make('carnotaurus', base({
        hipY: 31,
        body: { len: 30, w: 12, h: 14, chest: 2 },
        neck: { len: 12, w: 8, h: 10, angle: 32, segments: 2 },
        head: { len: 9, w: 10, h: 12, snoutLen: 5, snoutW: 9, snoutH: 9, jawH: 4 },
        tail: { len: 42, segments: 5, lift: 2 },
        arms: { len: 3, w: 2, angle: -20, hand: 1 },
        legs: { thighW: 8, footLen: 8, footW: 5 },
      }));
      // thick bull horns sticking out sideways over the eyes
      const h = r.mb.get('head');
      const z = r.a.craniumZ0 + 3;
      const y = r.a.headTop - 2;
      h.pair([r.a.headW / 2 - 1, y, z], [5, 3, 3], 'horn', { rotation: [0, 0, -30], pivot: [r.a.headW / 2 - 1, y + 1, z + 1] });
      // bumpy osteoderm rows along the flanks
      const b = r.mb.get('body');
      for (let i = 0; i < 5; i++) b.pair([r.a.bodyW / 2 - 0.5, r.a.bodyY + 2, r.a.bodyFront + 4 + i * 5], [1, 2, 2], 'plate');
      return r;
    },
  },
  {
    ...carn,
    id: 'giganotosaurus',
    name: 'Giganotosaurus',
    info: 'One of the largest meat-eaters ever, this South American giant rivalled T. rex in length but had a longer, slimmer skull.',
    period: 'Cretaceous',
    lengthM: 13,
    scale: 1.8,
    temperament: 'aggressive',
    health: 175,
    attack: 19,
    speed: 0.26,
    tame: 'egg',
    ride: { mode: 'ground', seats: 2, jump: 0.6 },
    spawn: { biomes: ['prehistoric', 'plains', 'savanna'], weight: 1, herd: [1, 1] },
    sounds: SND.huge,
    palette: {
      back: '#55504a', side: '#857a6c', belly: '#d8cfbf', accent: '#7a3a2a', eye: '#e04a2a',
      pattern: { type: 'stripes', colour: '#38332e', scale: 8, coverage: 0.38 }, teeth: true, spine: true,
    },
    build() {
      const r = make('giganotosaurus', base({
        hipY: 31,
        body: { len: 38, w: 15, h: 18, chest: 3 },
        neck: { len: 13, w: 11, h: 12, angle: 28, segments: 2 },
        head: { len: 12, w: 11, h: 13, snoutLen: 13, snoutW: 9, snoutH: 9, jawH: 5 },
        tail: { len: 50, segments: 5, lift: 3 },
        arms: { len: 9, w: 3, angle: -45, big: true },
        legs: { thighW: 10, footLen: 9, footW: 6 },
      }));
      // rugose brow ridges and a bumpy nasal crest
      lacrimal(r, 14, 2, 3, 60);
      for (let i = 0; i < 3; i++) F.crest(r, { fromTip: 2 + i * 4, len: 3, h: 1, w: 3 });
      return r;
    },
  },
  {
    ...fishy,
    id: 'baryonyx',
    name: 'Baryonyx',
    info: 'Found in England with fish scales in its stomach, Baryonyx had a crocodile-like snout and a huge hooked thumb claw.',
    period: 'Cretaceous',
    lengthM: 9,
    scale: 1.3,
    temperament: 'neutral',
    health: 90,
    attack: 11,
    speed: 0.27,
    tame: 'egg',
    spawn: { biomes: ['prehistoric', 'river', 'swamp'], weight: 2, herd: [1, 1] },
    sounds: SND.bigCarn,
    palette: {
      back: '#3f4f3a', side: '#64765a', belly: '#d4d0a8', accent: '#b6862a', eye: '#e8c040',
      pattern: { type: 'spots', colour: '#2c3a28', scale: 4, coverage: 0.4 }, teeth: true, spine: true,
    },
    build() {
      const r = make('baryonyx', base({
        hipY: 26,
        body: { len: 32, w: 11, h: 13, chest: 2 },
        neck: { len: 13, w: 7, h: 8, angle: 24, segments: 2 },
        head: { len: 8, w: 7, h: 8, snoutLen: 6, snoutW: 5, snoutH: 4, jawH: 3, rostrum: { len: 8, w: 4, h: 4 } },
        tail: { len: 44, segments: 5, lift: 2 },
        arms: { len: 11, w: 3, angle: -50, big: true },
        legs: { thighW: 7, footLen: 8, footW: 5 },
      }));
      thumbClaws(r, 11, 4);
      F.crest(r, { fromTip: 10, len: 3, h: 2, w: 2 });
      return r;
    },
  },
  {
    ...carn,
    id: 'ceratosaurus',
    name: 'Ceratosaurus',
    info: 'This Jurassic hunter sported a blade-like horn on its nose and a row of bony armour plates down its back.',
    period: 'Jurassic',
    lengthM: 6,
    scale: 1.25,
    temperament: 'aggressive',
    health: 80,
    attack: 11,
    speed: 0.3,
    tame: 'egg',
    spawn: { biomes: ['prehistoric', 'forest', 'jungle'], weight: 2, herd: [1, 1] },
    sounds: SND.bigCarn,
    palette: {
      back: '#2f2f2a', side: '#4f5044', belly: '#c9bf9a', accent: '#d2502a', accent2: '#f0b040', eye: '#f0c030',
      pattern: { type: 'bands', colour: '#8e5432', scale: 6, coverage: 0.3, strength: 0.6 }, teeth: true, horn: '#e0b080',
    },
    build() {
      const r = make('ceratosaurus', base({
        hipY: 24,
        body: { len: 28, w: 10, h: 12, chest: 2 },
        neck: { len: 12, w: 7, h: 8, angle: 32, segments: 2 },
        head: { len: 9, w: 8, h: 10, snoutLen: 8, snoutW: 7, snoutH: 7, jawH: 3 },
        tail: { len: 44, segments: 5, lift: 2, h: 10 },
        arms: { len: 7, w: 2, angle: -45 },
        legs: { thighW: 7, footLen: 7, footW: 5 },
      }));
      // blade-like nasal horn
      const h = r.mb.get('head');
      h.box([-1, r.a.jawY + 6, r.a.snoutTip + 2], [2, 5, 4], 'horn', { rotation: [12, 0, 0], pivot: [0, r.a.jawY + 6, r.a.snoutTip + 4] });
      lacrimal(r, 12, 3, 2, 10);
      osteoderms(r, 7, r.a.bodyFront + 3, r.a.bodyBack - 2);
      return r;
    },
  },
  {
    ...fishy,
    id: 'suchomimus',
    name: 'Suchomimus',
    info: 'The "crocodile mimic" waded through Saharan rivers spearing fish with a long snout and a low ridge along its back.',
    period: 'Cretaceous',
    lengthM: 10,
    scale: 1.35,
    temperament: 'neutral',
    health: 95,
    attack: 11,
    speed: 0.27,
    tame: 'egg',
    spawn: { biomes: ['prehistoric', 'river', 'swamp', 'jungle'], weight: 2, herd: [1, 1] },
    sounds: SND.bigCarn,
    palette: {
      back: '#6a5232', side: '#9a7b4c', belly: '#e2d2a8', accent: '#3f6a7a', accent2: '#8ab0b8', eye: '#e0a830',
      pattern: { type: 'stripes', colour: '#4a3820', scale: 5, coverage: 0.35 }, teeth: true,
    },
    build() {
      const r = make('suchomimus', base({
        hipY: 27,
        body: { len: 34, w: 12, h: 14, chest: 2 },
        neck: { len: 13, w: 7, h: 8, angle: 26, segments: 2 },
        head: { len: 8, w: 8, h: 8, snoutLen: 7, snoutW: 5, snoutH: 4, jawH: 3, rostrum: { len: 9, w: 4, h: 4 } },
        tail: { len: 46, segments: 5, lift: 2 },
        arms: { len: 12, w: 3, angle: -48, big: true },
        legs: { thighW: 8, footLen: 8, footW: 5 },
      }));
      ridge(r, 6, r.a.bodyFront + 4, r.a.bodyBack + 2);
      thumbClaws(r, 12, 4);
      return r;
    },
  },
  {
    ...carn,
    id: 'carcharodontosaurus',
    name: 'Carcharodontosaurus',
    info: 'The "shark-toothed lizard" of North Africa had serrated, blade-like teeth up to 20 cm long.',
    period: 'Cretaceous',
    lengthM: 12.5,
    scale: 1.75,
    temperament: 'aggressive',
    health: 165,
    attack: 18,
    speed: 0.26,
    tame: 'egg',
    spawn: { biomes: ['prehistoric', 'desert', 'savanna'], weight: 1, herd: [1, 1] },
    sounds: SND.huge,
    palette: {
      back: '#7a5a34', side: '#b08850', belly: '#e8d8b0', accent: '#5a2a1a', eye: '#d84a20',
      pattern: { type: 'stripes', colour: '#4e3820', scale: 6, coverage: 0.45 }, teeth: true, spine: true,
    },
    build() {
      const r = make('carcharodontosaurus', base({
        hipY: 30,
        body: { len: 37, w: 14, h: 17, chest: 3 },
        neck: { len: 13, w: 10, h: 12, angle: 28, segments: 2 },
        head: { len: 12, w: 11, h: 13, snoutLen: 12, snoutW: 9, snoutH: 9, jawH: 5 },
        tail: { len: 48, segments: 5, lift: 3 },
        arms: { len: 8, w: 3, angle: -45, big: true },
        legs: { thighW: 10, footLen: 9, footW: 6 },
      }));
      lacrimal(r, 13, 2, 3, 70);
      // pronounced sagittal hump over the shoulders
      r.mb.get('body').box([-3, r.a.bodyTop - 1, r.a.bodyFront + 3], [6, 3, 12], 'skin');
      return r;
    },
  },
  {
    ...carn,
    id: 'herrerasaurus',
    name: 'Herrerasaurus',
    info: 'One of the earliest dinosaurs, this agile Triassic hunter from Argentina had a flexible jaw joint to grip struggling prey.',
    period: 'Triassic',
    lengthM: 5,
    scale: 1,
    temperament: 'neutral',
    health: 30,
    attack: 6,
    speed: 0.33,
    tame: { items: MEAT },
    spawn: { biomes: ['prehistoric', 'forest', 'savanna'], weight: 3, herd: [1, 2] },
    sounds: SND.raptor,
    palette: {
      back: '#5a4a2a', side: '#8a7442', belly: '#e0d4a8', accent: '#3a6a3a', eye: '#f0d040',
      pattern: { type: 'stripes', colour: '#2e2414', scale: 3, coverage: 0.4 }, teeth: true, spine: true,
    },
    build() {
      return make('herrerasaurus', base({
        hipY: 14,
        body: { len: 16, w: 6, h: 7, chest: 1 },
        neck: { len: 8, w: 4, h: 4, angle: 32, segments: 2 },
        head: { len: 5, w: 5, h: 5, snoutLen: 5, snoutW: 4, snoutH: 3, jawH: 2 },
        tail: { len: 28, segments: 5, lift: 2, w: 4, h: 4, tipW: 1, tipH: 1 },
        arms: { len: 6, w: 1, angle: -40 },
        legs: { thighW: 4, footLen: 5, footW: 3 },
      }), { thigh: 1, calf: 0, neckBase: 1, tailBulk: 1, jowl: 0 });
    },
  },
  {
    ...carn,
    id: 'albertosaurus',
    name: 'Albertosaurus',
    info: 'A lighter, faster cousin of T. rex; a bonebed of 26 individuals suggests Albertosaurus may have hunted in packs.',
    period: 'Cretaceous',
    lengthM: 9,
    scale: 1.35,
    temperament: 'aggressive',
    health: 100,
    attack: 12,
    speed: 0.31,
    tame: 'egg',
    spawn: { biomes: ['prehistoric', 'forest', 'taiga', 'plains'], weight: 2, herd: [1, 2] },
    sounds: SND.bigCarn,
    palette: {
      back: '#4a4a3c', side: '#76735c', belly: '#dad4bc', accent: '#a8623a', eye: '#e8b030',
      pattern: { type: 'stripes', colour: '#2e2e24', scale: 5, coverage: 0.4 }, teeth: true, spine: true,
    },
    build() {
      const r = make('albertosaurus', base({
        hipY: 28,
        body: { len: 28, w: 11, h: 14, chest: 2 },
        neck: { len: 8, w: 8, h: 10, angle: 28 },
        head: { len: 10, w: 10, h: 11, snoutLen: 9, snoutW: 7, snoutH: 7, jawH: 4, cheek: 1 },
        tail: { len: 42, segments: 5, lift: 3 },
        arms: { len: 5, w: 2, angle: -45 },
        legs: { thighW: 7, footLen: 8, footW: 5 },
      }));
      lacrimal(r, 11, 3, 2, 20);
      return r;
    },
  },
  {
    ...carn,
    id: 'gorgosaurus',
    name: 'Gorgosaurus',
    info: 'This sleek tyrannosaur shared its Canadian floodplains with other giant predators and grew to adult size in just two decades.',
    period: 'Cretaceous',
    lengthM: 9,
    scale: 1.35,
    temperament: 'aggressive',
    health: 100,
    attack: 12,
    speed: 0.31,
    tame: 'egg',
    spawn: { biomes: ['prehistoric', 'plains', 'river'], weight: 2, herd: [1, 1] },
    sounds: SND.bigCarn,
    palette: {
      back: '#4a3a2a', side: '#7a6040', belly: '#e0cfa8', accent: '#a0302a', accent2: '#e0603a', eye: '#f0c040',
      pattern: { type: 'mottled', colour: '#2a2018', scale: 4, coverage: 0.45 }, teeth: true, spine: true,
    },
    build() {
      const r = make('gorgosaurus', base({
        hipY: 28,
        body: { len: 29, w: 11, h: 14, chest: 2 },
        neck: { len: 8, w: 8, h: 10, angle: 28 },
        head: { len: 10, w: 10, h: 11, snoutLen: 10, snoutW: 7, snoutH: 7, jawH: 4 },
        tail: { len: 44, segments: 5, lift: 3 },
        arms: { len: 5, w: 2, angle: -45 },
        legs: { thighW: 7, footLen: 8, footW: 5 },
      }));
      // taller triangular brow horns
      lacrimal(r, 11, 4, 2, 5);
      return r;
    },
  },
  {
    ...carn,
    id: 'majungasaurus',
    name: 'Majungasaurus',
    info: 'Madagascar’s top predator had a single knobbly horn on its forehead and is one of the few dinosaurs known to have eaten its own kind.',
    period: 'Cretaceous',
    lengthM: 7,
    scale: 1.25,
    temperament: 'aggressive',
    health: 85,
    attack: 12,
    speed: 0.27,
    tame: 'egg',
    spawn: { biomes: ['prehistoric', 'savanna', 'jungle'], weight: 2, herd: [1, 1] },
    sounds: SND.bigCarn,
    palette: {
      back: '#5a4436', side: '#866650', belly: '#ddc8ae', accent: '#c88a40', eye: '#f0d040',
      pattern: { type: 'spots', colour: '#3a2a22', scale: 3, coverage: 0.5 }, teeth: true, spine: true,
    },
    build() {
      const r = make('majungasaurus', base({
        hipY: 23,
        body: { len: 28, w: 12, h: 14, chest: 2 },
        neck: { len: 8, w: 9, h: 10, angle: 28 },
        head: { len: 9, w: 10, h: 11, snoutLen: 5, snoutW: 9, snoutH: 8, jawH: 4 },
        tail: { len: 38, segments: 5, lift: 2 },
        arms: { len: 3, w: 2, angle: -20, hand: 1 },
        legs: { thighW: 8, footLen: 7, footW: 5 },
      }));
      // single dome knob on the forehead
      const h = r.mb.get('head');
      const z = r.a.craniumZ0 + 1;
      h.box([-2, r.a.headTop - 1, z], [4, 3, 4], 'accent');
      h.box([-1, r.a.headTop + 1, z + 1], [2, 1, 2], 'accent');
      return r;
    },
  },
];
