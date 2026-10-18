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

const base = (o: Partial<TheropodSpec> & Pick<TheropodSpec, 'hipY' | 'body' | 'neck' | 'head' | 'tail' | 'arms' | 'legs'>) => o as TheropodSpec;

// ---------------------------------------------------------------------------

export const theropodsLarge: CreatureDef[] = [
  {
    ...fishy,
    id: 'spinosaurus',
    name: 'Spinosaurus',
    info: 'The longest known predatory dinosaur hunted giant fish in North African rivers, using a sail and a paddle-shaped tail.',
    period: 'Cretaceous',
    lengthM: 14,
    scale: 1.75,
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
      back: '#55473a', side: '#806a50', belly: '#d2c09a', accent: '#b4462c', accent2: '#e2a548', eye: '#d9b02a',
      pattern: { type: 'blotches', colour: '#3d3226', scale: 6, coverage: 0.45 }, teeth: true, spine: true,
    },
    build() {
      const r = theropod('spinosaurus', base({
        hipY: 26,
        body: { len: 40, w: 13, h: 16, chest: 3 },
        neck: { len: 12, w: 8, h: 9, angle: 30, segments: 2 },
        head: { len: 9, w: 9, h: 9, snoutLen: 7, snoutW: 6, snoutH: 5, jawH: 3, rostrum: { len: 9, w: 5, h: 5 } },
        tail: { len: 52, segments: 5, lift: 2, h: 10 },
        arms: { len: 11, w: 3, angle: -45, big: true },
        legs: { thighW: 8, footLen: 8, footW: 6 },
      }));
      F.sail(r, { h: 22, from: r.a.bodyFront + 3, to: r.a.bodyBack - 1, arch: true });
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
      back: '#6a3d2a', side: '#9a5d3a', belly: '#dcc39b', accent: '#c23a22', eye: '#e8b33a',
      pattern: { type: 'stripes', colour: '#4a2a1c', scale: 5, coverage: 0.4 }, teeth: true, spine: true,
    },
    build() {
      const r = theropod('allosaurus', base({
        hipY: 28,
        body: { len: 32, w: 12, h: 15, chest: 3 },
        neck: { len: 10, w: 8, h: 10, angle: 30 },
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
      back: '#7a2e24', side: '#a84a32', belly: '#e0c8a0', accent: '#2d1b14', eye: '#f0c040',
      pattern: { type: 'rosettes', colour: '#4e1a14', scale: 4, coverage: 0.5 }, teeth: true, spine: true,
    },
    build() {
      const r = theropod('carnotaurus', base({
        hipY: 31,
        body: { len: 30, w: 12, h: 14, chest: 2 },
        neck: { len: 10, w: 8, h: 10, angle: 30 },
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
      back: '#4b4a52', side: '#77727a', belly: '#d6d0c4', accent: '#7a2f2a', eye: '#e04a2a',
      pattern: { type: 'stripes', colour: '#2e2d33', scale: 8, coverage: 0.38 }, teeth: true, spine: true,
    },
    build() {
      const r = theropod('giganotosaurus', base({
        hipY: 31,
        body: { len: 38, w: 15, h: 18, chest: 3 },
        neck: { len: 9, w: 11, h: 12, angle: 26 },
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
      const r = theropod('baryonyx', base({
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
      pattern: { type: 'bands', colour: '#c45a2c', scale: 6, coverage: 0.3, strength: 0.6 }, teeth: true, horn: '#e0b080',
    },
    build() {
      const r = theropod('ceratosaurus', base({
        hipY: 24,
        body: { len: 28, w: 10, h: 12, chest: 2 },
        neck: { len: 9, w: 7, h: 8, angle: 30 },
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
      const r = theropod('suchomimus', base({
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
      const r = theropod('carcharodontosaurus', base({
        hipY: 30,
        body: { len: 37, w: 14, h: 17, chest: 3 },
        neck: { len: 9, w: 10, h: 12, angle: 26 },
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
      return theropod('herrerasaurus', base({
        hipY: 14,
        body: { len: 16, w: 6, h: 7, chest: 1 },
        neck: { len: 6, w: 4, h: 4, angle: 32 },
        head: { len: 5, w: 5, h: 5, snoutLen: 5, snoutW: 4, snoutH: 3, jawH: 2 },
        tail: { len: 28, segments: 5, lift: 2, w: 4, h: 4, tipW: 1, tipH: 1 },
        arms: { len: 6, w: 1, angle: -40 },
        legs: { thighW: 4, footLen: 5, footW: 3 },
      }));
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
      back: '#3a4a52', side: '#5f7480', belly: '#d8d4c4', accent: '#c06a2a', eye: '#e8b030',
      pattern: { type: 'stripes', colour: '#24323a', scale: 5, coverage: 0.4 }, teeth: true, spine: true,
    },
    build() {
      const r = theropod('albertosaurus', base({
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
      const r = theropod('gorgosaurus', base({
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
      back: '#5a3a4a', side: '#8a5a6a', belly: '#e0c8b8', accent: '#e0a040', eye: '#f0d040',
      pattern: { type: 'spots', colour: '#3a2230', scale: 3, coverage: 0.5 }, teeth: true, spine: true,
    },
    build() {
      const r = theropod('majungasaurus', base({
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
