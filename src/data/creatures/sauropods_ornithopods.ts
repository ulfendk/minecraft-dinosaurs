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
      back: '#5f6b4e', side: '#7d8a63', belly: '#c9c4a0', accent: '#8a6a3a',
      pattern: { type: 'mottled', colour: '#4b5640', scale: 6, coverage: 0.45 },
    },
    build() {
      const r = quadruped('brachiosaurus', {
        frontLeg: 26,
        backLeg: 19,
        body: { len: 30, w: 15, h: 15, belly: 2 },
        neck: { len: 46, w: 8, h: 8, angle: 64, segments: 5, tipW: 5, tipH: 5 },
        head: { len: 6, w: 6, h: 6, snoutLen: 4, snoutW: 5, snoutH: 3, jawH: 2 },
        headAngle: 58,
        tail: { len: 22, w: 8, h: 8, segments: 4, lift: -4 },
        legs: { frontW: 6, backW: 7, elbow: 4, knee: -4 },
      });
      nasalDome(r, 3);
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
      pattern: { type: 'bands', colour: '#54493a', scale: 7, coverage: 0.35, strength: 0.6 },
    },
    build() {
      const r = quadruped('diplodocus', {
        frontLeg: 16,
        backLeg: 19,
        body: { len: 30, w: 14, h: 15, belly: 2 },
        neck: { len: 38, w: 7, h: 7, angle: 18, segments: 5, tipW: 4, tipH: 4 },
        head: { len: 5, w: 5, h: 4, snoutLen: 5, snoutW: 4, snoutH: 3, jawH: 1 },
        headAngle: 16,
        tail: { len: 66, w: 8, h: 8, segments: 6, lift: 3, tipW: 1, tipH: 1 },
        legs: { frontW: 5, backW: 6 },
      });
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
      return quadruped('apatosaurus', {
        frontLeg: 15,
        backLeg: 18,
        body: { len: 28, w: 16, h: 16, belly: 3 },
        neck: { len: 30, w: 10, h: 11, angle: 34, segments: 4, tipW: 6, tipH: 6 },
        head: { len: 5, w: 6, h: 5, snoutLen: 4, snoutW: 5, snoutH: 3, jawH: 2 },
        headAngle: 30,
        tail: { len: 52, w: 10, h: 10, segments: 6, lift: 2, tipW: 1, tipH: 1 },
        legs: { frontW: 7, backW: 8 },
      });
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
      return quadruped('brontosaurus', {
        frontLeg: 16,
        backLeg: 19,
        body: { len: 27, w: 15, h: 15, belly: 2, hump: 2 },
        neck: { len: 34, w: 9, h: 9, angle: 42, segments: 4, tipW: 5, tipH: 5 },
        head: { len: 5, w: 6, h: 5, snoutLen: 4, snoutW: 5, snoutH: 3, jawH: 2 },
        headAngle: 38,
        tail: { len: 48, w: 9, h: 9, segments: 5, lift: 2, tipW: 1, tipH: 1 },
        legs: { frontW: 6, backW: 7 },
      });
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
        frontLeg: 17,
        backLeg: 17,
        body: { len: 28, w: 15, h: 15, belly: 2, hump: 2 },
        neck: { len: 28, w: 8, h: 8, angle: 40, segments: 4, tipW: 4, tipH: 4 },
        head: { len: 4, w: 5, h: 4, snoutLen: 3, snoutW: 4, snoutH: 2, jawH: 1 },
        headAngle: 36,
        tail: { len: 30, w: 8, h: 8, segments: 4, lift: 0 },
        legs: { frontW: 6, backW: 6 },
      });
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
      return quadruped('mamenchisaurus', {
        frontLeg: 16,
        backLeg: 18,
        body: { len: 22, w: 13, h: 13, belly: 2 },
        neck: { len: 62, w: 7, h: 7, angle: 36, segments: 6, tipW: 4, tipH: 4 },
        head: { len: 5, w: 5, h: 4, snoutLen: 3, snoutW: 4, snoutH: 3, jawH: 1 },
        headAngle: 32,
        tail: { len: 34, w: 8, h: 8, segments: 5, lift: 1, tipW: 1, tipH: 1 },
        legs: { frontW: 5, backW: 6 },
      });
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
      back: '#7a5c3e', side: '#9a7a54', belly: '#dcc9a2', accent: '#b8432f', accent2: '#e8b04a',
      pattern: { type: 'stripes', colour: '#5d4430', scale: 5, coverage: 0.4 },
    },
    build() {
      const r = quadruped('amargasaurus', {
        frontLeg: 13,
        backLeg: 16,
        body: { len: 22, w: 12, h: 12, belly: 1 },
        neck: { len: 18, w: 6, h: 6, angle: 18, segments: 3, tipW: 4, tipH: 4 },
        head: { len: 5, w: 5, h: 4, snoutLen: 4, snoutW: 4, snoutH: 3, jawH: 1 },
        headAngle: 16,
        tail: { len: 30, w: 7, h: 7, segments: 5, lift: 2, tipW: 1, tipH: 1 },
        legs: { frontW: 5, backW: 6 },
      });
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
      back: '#6a3f2e', side: '#8e5e44', belly: '#d9bf9c', accent: '#94754f',
      pattern: { type: 'blotches', colour: '#4e2f22', scale: 5, coverage: 0.45 },
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
        legs: { frontW: 6, backW: 7 },
      });
      // scattered titanosaur osteoderms along the back
      const b = r.mb.get('body');
      for (let i = 0; i < 5; i++) b.pair([2 + (i % 2) * 2, r.a.bodyTop - 1, -9 + i * 4], [2, 1, 2], 'armor');
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
      return theropod('plateosaurus', {
        hipY: 20,
        body: { len: 22, w: 10, h: 11, chest: 2 },
        neck: { len: 16, w: 5, h: 5, angle: 30, segments: 2 },
        head: { len: 4, w: 5, h: 5, snoutLen: 4, snoutW: 4, snoutH: 3, jawH: 2 },
        tail: { len: 34, segments: 5, lift: 2 },
        arms: { len: 9, w: 3, angle: -30, big: true },
        legs: { thighW: 6, footLen: 6, footW: 4 },
      });
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
      back: '#5b6a3f', side: '#7f8d55', belly: '#dccf9c', accent: '#c4582b', accent2: '#f0b43c',
      pattern: { type: 'stripes', colour: '#3f4a2c', scale: 5, coverage: 0.4 },
    },
    build() {
      const r = quadruped('parasaurolophus', {
        frontLeg: 15,
        backLeg: 19,
        body: { len: 24, w: 12, h: 12, belly: 2 },
        neck: { len: 10, w: 6, h: 7, angle: 34, segments: 2 },
        head: { len: 6, w: 6, h: 6, snoutLen: 6, snoutW: 6, snoutH: 3, jawH: 2, beak: true },
        headAngle: 30,
        tail: { len: 30, w: 7, h: 9, segments: 4, lift: -3 },
        legs: { frontW: 4, backW: 8, elbow: 2, knee: -10 },
      });
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
        head: { len: 6, w: 6, h: 7, snoutLen: 6, snoutW: 4, snoutH: 4, jawH: 2, beak: true },
        headAngle: 26,
        tail: { len: 30, w: 8, h: 10, segments: 4, lift: -3 },
        legs: { frontW: 5, backW: 8, elbow: 2, knee: -10 },
      });
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
        head: { len: 6, w: 6, h: 6, snoutLen: 8, snoutW: 7, snoutH: 3, jawH: 2, beak: true },
        headAngle: 28,
        tail: { len: 32, w: 7, h: 9, segments: 4, lift: -3 },
        legs: { frontW: 4, backW: 8, elbow: 2, knee: -10 },
      });
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
        head: { len: 6, w: 6, h: 6, snoutLen: 6, snoutW: 5, snoutH: 3, jawH: 2, beak: true },
        headAngle: 28,
        tail: { len: 28, w: 7, h: 9, segments: 4, lift: -3 },
        legs: { frontW: 4, backW: 7, elbow: 2, knee: -10 },
      });
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
      back: '#3e5a5a', side: '#5d7d78', belly: '#d7d6b8', accent: '#d2462f', accent2: '#f2c94c',
      pattern: { type: 'stripes', colour: '#2e4545', scale: 5, coverage: 0.4 },
    },
    build() {
      const r = quadruped('corythosaurus', {
        frontLeg: 14,
        backLeg: 18,
        body: { len: 22, w: 12, h: 12, belly: 2 },
        neck: { len: 9, w: 6, h: 7, angle: 32, segments: 2 },
        head: { len: 6, w: 6, h: 6, snoutLen: 5, snoutW: 5, snoutH: 3, jawH: 2, beak: true },
        headAngle: 30,
        tail: { len: 28, w: 7, h: 9, segments: 4, lift: -3 },
        legs: { frontW: 4, backW: 7, elbow: 2, knee: -10 },
      });
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
      back: '#6e5a3c', side: '#937a52', belly: '#e0cfa6', accent: '#3f6a8a', horn: '#d9c9a2',
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
        legs: { thighW: 5, footLen: 5, footW: 3 },
      });
      F.dome(r, { h: 4, knobs: true });
      return r;
    },
  },
];
