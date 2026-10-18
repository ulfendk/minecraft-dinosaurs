import { theropod, type Rig } from '../../model/rigs.js';
import * as F from '../../creatures/features.js';
import type { CreatureDef } from '../types.js';
import { MEAT, SMALL_MEAT, SEEDS, HERB, SND } from '../common.js';

const base = { group: 'theropod' as const, habitat: 'land' as const };
const carn = { ...base, diet: 'carnivore' as const, food: MEAT };
const smallCarn = { ...base, diet: 'carnivore' as const, food: SMALL_MEAT };
const omni = { ...base, diet: 'omnivore' as const, food: [...SMALL_MEAT, ...SEEDS] };

/** Feathered "wing" on the forearm: a stack of quill slabs trailing back from the arm. */
function wingFeathers(r: Rig, o: { len: number; h: number; spread?: number }) {
  for (const a of r.arms) {
    const b = r.mb.get(a);
    const [px, py, pz] = b.pivot;
    const side = px > 0 ? 1 : -1;
    b.box([px + side * 0.6 - 0.5, py - o.h, pz - 1], [1, o.h, o.len], 'quill');
    if (o.spread) b.box([px + side * 1.2 - 0.5, py - o.h + 1, pz + 1], [1, o.h - 1, Math.round(o.len * 0.7)], 'feather');
  }
}

/** Feathers on the hind legs (Microraptor's "hind wings"). */
function legFeathers(r: Rig, o: { len: number; h: number }) {
  for (const leg of r.legs) {
    const b = r.mb.get(leg.chain[1]);
    const [px, py, pz] = b.pivot;
    b.box([px - 0.5, py - o.h, pz], [1, o.h, o.len], 'quill');
  }
}

/** Fluffy back/neck crest of longer feathers along the top line. */
function backFluff(r: Rig, o: { h: number }) {
  const b = r.mb.get('body');
  const { bodyTop, bodyFront, bodyBack } = r.a;
  b.box([-1, bodyTop - 1, bodyFront + 2], [2, o.h + 1, bodyBack - bodyFront - 4], 'feather');
}

export const theropodsSmall: CreatureDef[] = [
  {
    ...smallCarn,
    id: 'velociraptor',
    name: 'Velociraptor',
    info: 'The real Velociraptor was a feathered, turkey-sized hunter, famously fossilised locked in combat with a Protoceratops.',
    period: 'Cretaceous',
    lengthM: 2,
    scale: 0.7,
    temperament: 'aggressive',
    health: 14,
    attack: 4,
    speed: 0.34,
    tame: { items: SMALL_MEAT },
    spawn: { biomes: ['prehistoric', 'desert', 'savanna', 'mesa'], weight: 6, herd: [2, 4] },
    sounds: SND.raptor,
    palette: {
      back: '#6e4a2c', side: '#a8794a', belly: '#e6d3b0', accent: '#3a2a1f', accent2: '#d9c3a0', eye: '#e8b22a',
      pattern: { type: 'stripes', colour: '#4a2e1a', scale: 3, coverage: 0.45 }, teeth: true,
    },
    build() {
      const r = theropod('velociraptor', {
        hipY: 14,
        feathered: true,
        body: { len: 16, w: 6, h: 7, chest: 1, tilt: -6 },
        neck: { len: 6, w: 4, h: 4, angle: 38, segments: 2 },
        head: { len: 4, w: 4, h: 4, snoutLen: 5, snoutW: 3, snoutH: 2, jawH: 1, eyeR: 0.8 },
        tail: { len: 24, segments: 5, lift: 6, w: 4, h: 4, tipW: 1, tipH: 1 },
        arms: { len: 5, w: 1, angle: -30 },
        legs: { thighW: 4, shinW: 2, footLen: 4, footW: 3 },
      });
      wingFeathers(r, { len: 6, h: 4 });
      F.tailFan(r, { w: 4, len: 6 });
      F.sickleClaws(r);
      return r;
    },
  },
  {
    ...carn,
    id: 'deinonychus',
    name: 'Deinonychus',
    info: 'Its name means "terrible claw": the discovery of Deinonychus convinced scientists that dinosaurs were active, bird-like animals.',
    period: 'Cretaceous',
    lengthM: 3.4,
    scale: 0.85,
    temperament: 'aggressive',
    health: 22,
    attack: 5,
    speed: 0.33,
    tame: { items: MEAT },
    spawn: { biomes: ['prehistoric', 'forest', 'plains'], weight: 4, herd: [2, 3] },
    sounds: SND.raptor,
    palette: {
      back: '#2f3a3a', side: '#56645c', belly: '#c9c7b2', accent: '#b8462a', accent2: '#e0d0b0', eye: '#d9a02a',
      pattern: { type: 'stripes', colour: '#1f2626', scale: 4, coverage: 0.4 }, teeth: true, spine: true,
    },
    build() {
      const r = theropod('deinonychus', {
        hipY: 16,
        feathered: true,
        body: { len: 18, w: 7, h: 8, chest: 1, tilt: -5 },
        neck: { len: 6, w: 5, h: 5, angle: 34, segments: 2 },
        head: { len: 5, w: 5, h: 5, snoutLen: 6, snoutW: 4, snoutH: 3, jawH: 2 },
        tail: { len: 26, segments: 5, lift: 5, w: 5, h: 5, tipW: 1, tipH: 1 },
        arms: { len: 6, w: 2, angle: -35 },
        legs: { thighW: 5, shinW: 3, footLen: 5, footW: 3 },
      });
      wingFeathers(r, { len: 7, h: 5 });
      F.tailFan(r, { w: 5, len: 7 });
      F.sickleClaws(r);
      // red display feathers on the head
      r.mb.get('head').box([-1, r.a.headTop - 1, r.a.craniumZ0 + 1], [2, 2, 4], 'accent');
      return r;
    },
  },
  {
    ...carn,
    id: 'utahraptor',
    name: 'Utahraptor',
    info: 'The largest known raptor, Utahraptor was a heavily built, bear-sized predator with a 24 cm sickle claw on each foot.',
    period: 'Cretaceous',
    lengthM: 6,
    scale: 1.2,
    temperament: 'aggressive',
    health: 40,
    attack: 8,
    speed: 0.3,
    tame: { items: MEAT },
    ride: { mode: 'ground', seats: 1, jump: 0.85 },
    spawn: { biomes: ['prehistoric', 'forest', 'taiga'], weight: 3, herd: [1, 2] },
    sounds: { ...SND.raptor, pitch: 0.45 },
    palette: {
      back: '#4b3a2e', side: '#7a6048', belly: '#d8c8a8', accent: '#e8e2d2', accent2: '#2a2018', eye: '#f0c040',
      pattern: { type: 'mottled', colour: '#2e241c', scale: 4, coverage: 0.45 }, teeth: true,
    },
    build() {
      const r = theropod('utahraptor', {
        hipY: 20,
        feathered: true,
        body: { len: 22, w: 9, h: 10, chest: 2, tilt: -4 },
        neck: { len: 7, w: 6, h: 7, angle: 30, segments: 2 },
        head: { len: 6, w: 6, h: 6, snoutLen: 7, snoutW: 5, snoutH: 4, jawH: 2 },
        tail: { len: 30, segments: 5, lift: 4, w: 6, h: 6, tipW: 2, tipH: 2 },
        arms: { len: 8, w: 2, angle: -35 },
        legs: { thighW: 6, shinW: 4, footLen: 6, footW: 4 },
      });
      wingFeathers(r, { len: 8, h: 6, spread: 1 });
      F.tailFan(r, { w: 6, len: 8 });
      F.sickleClaws(r);
      backFluff(r, { h: 1 });
      return r;
    },
  },
  {
    ...smallCarn,
    id: 'microraptor',
    name: 'Microraptor',
    info: 'Microraptor had flight feathers on all four limbs and glossy black, iridescent plumage like a modern crow.',
    period: 'Cretaceous',
    lengthM: 0.8,
    scale: 0.4,
    temperament: 'skittish',
    health: 6,
    attack: 2,
    speed: 0.32,
    tame: { items: SMALL_MEAT },
    spawn: { biomes: ['prehistoric', 'forest', 'jungle'], weight: 6, herd: [1, 3] },
    sounds: { ...SND.small, pitch: 1.3 },
    prey: true,
    palette: {
      back: '#14161f', side: '#232838', belly: '#3a4258', accent: '#2b4a7a', accent2: '#5a2f7a', eye: '#d0c040',
      pattern: { type: 'mottled', colour: '#2f3e66', scale: 3, coverage: 0.4, strength: 0.6 }, teeth: true,
    },
    build() {
      const r = theropod('microraptor', {
        hipY: 12,
        feathered: true,
        body: { len: 12, w: 5, h: 6, chest: 1, tilt: -6 },
        neck: { len: 5, w: 3, h: 3, angle: 40, segments: 2 },
        head: { len: 4, w: 4, h: 4, snoutLen: 3, snoutW: 2, snoutH: 2, jawH: 1, eyeR: 0.9 },
        tail: { len: 18, segments: 4, lift: 6, w: 3, h: 3, tipW: 1, tipH: 1 },
        arms: { len: 6, w: 1, angle: -20 },
        legs: { thighW: 3, shinW: 2, footLen: 3, footW: 2 },
      });
      wingFeathers(r, { len: 10, h: 6, spread: 1 });
      legFeathers(r, { len: 7, h: 6 });
      F.tailFan(r, { w: 7, len: 7 });
      return r;
    },
  },
  {
    ...omni,
    id: 'troodon',
    name: 'Troodon',
    info: 'Troodon had one of the largest brains for its body size of any dinosaur and huge forward-facing eyes for hunting at dusk.',
    period: 'Cretaceous',
    lengthM: 2.4,
    scale: 0.75,
    temperament: 'neutral',
    health: 14,
    attack: 3,
    speed: 0.34,
    tame: { items: [...SMALL_MEAT, ...SEEDS] },
    spawn: { biomes: ['prehistoric', 'taiga', 'forest'], weight: 5, herd: [1, 3] },
    sounds: SND.raptor,
    palette: {
      back: '#5a5e48', side: '#8c8a66', belly: '#e2dcc4', accent: '#3a3a2a', accent2: '#c8b890', eye: '#f2d23a',
      pattern: { type: 'spots', colour: '#3c3e2c', scale: 3, coverage: 0.5 }, teeth: true,
    },
    build() {
      const r = theropod('troodon', {
        hipY: 15,
        feathered: true,
        body: { len: 15, w: 6, h: 7, chest: 1, tilt: -6 },
        neck: { len: 7, w: 4, h: 4, angle: 40, segments: 2 },
        head: { len: 5, w: 5, h: 5, snoutLen: 4, snoutW: 3, snoutH: 2, jawH: 1, eyeR: 1.4 },
        tail: { len: 22, segments: 5, lift: 6, w: 4, h: 4, tipW: 1, tipH: 1 },
        arms: { len: 5, w: 1, angle: -30 },
        legs: { thighW: 4, shinW: 2, footLen: 4, footW: 3 },
      });
      wingFeathers(r, { len: 5, h: 4 });
      F.tailFan(r, { w: 4, len: 5 });
      F.sickleClaws(r);
      return r;
    },
  },
  {
    ...smallCarn,
    id: 'compsognathus',
    name: 'Compsognathus',
    info: 'Barely the size of a chicken, Compsognathus was found with a lizard still preserved in its stomach.',
    period: 'Jurassic',
    lengthM: 1,
    scale: 0.4,
    temperament: 'skittish',
    health: 5,
    attack: 1,
    speed: 0.36,
    tame: { items: SMALL_MEAT },
    spawn: { biomes: ['prehistoric', 'jungle', 'beach', 'plains'], weight: 10, herd: [3, 6] },
    sounds: { ...SND.small, pitch: 1.4 },
    prey: true,
    palette: {
      back: '#55702c', side: '#8aa04a', belly: '#e4e0b0', accent: '#d07a2a', eye: '#e04020',
      pattern: { type: 'stripes', colour: '#3a4e1c', scale: 2.5, coverage: 0.4 }, teeth: true, spine: true,
    },
    build() {
      const r = theropod('compsognathus', {
        hipY: 12,
        body: { len: 11, w: 4, h: 5, chest: 1, tilt: -6 },
        neck: { len: 6, w: 3, h: 3, angle: 38, segments: 2 },
        head: { len: 3, w: 3, h: 3, snoutLen: 3, snoutW: 2, snoutH: 2, jawH: 1, eyeR: 0.7 },
        tail: { len: 18, segments: 5, lift: 5, w: 3, h: 3, tipW: 1, tipH: 1 },
        arms: { len: 3, w: 1, angle: -30 },
        legs: { thighW: 3, shinW: 2, footLen: 3, footW: 2 },
      });
      return r;
    },
  },
  {
    ...smallCarn,
    id: 'coelophysis',
    name: 'Coelophysis',
    info: 'One of the earliest dinosaurs, Coelophysis is known from hundreds of skeletons found together at Ghost Ranch, New Mexico.',
    period: 'Triassic',
    lengthM: 3,
    scale: 0.8,
    temperament: 'neutral',
    health: 12,
    attack: 3,
    speed: 0.35,
    tame: { items: SMALL_MEAT },
    spawn: { biomes: ['prehistoric', 'desert', 'mesa', 'savanna'], weight: 6, herd: [3, 5] },
    sounds: SND.raptor,
    palette: {
      back: '#8a5a30', side: '#c08a4a', belly: '#ecdcb6', accent: '#7a2a1a', eye: '#e8c040',
      pattern: { type: 'bands', colour: '#5e3a1e', scale: 4, coverage: 0.35 }, teeth: true,
    },
    build() {
      const r = theropod('coelophysis', {
        hipY: 15,
        body: { len: 14, w: 5, h: 6, chest: 0, tilt: -8 },
        neck: { len: 10, w: 3, h: 3, angle: 45, segments: 3 },
        head: { len: 4, w: 3, h: 3, snoutLen: 6, snoutW: 2, snoutH: 2, jawH: 1, snoutDrop: -0 },
        tail: { len: 26, segments: 5, lift: 5, w: 4, h: 4, tipW: 1, tipH: 1 },
        arms: { len: 5, w: 1, angle: -30 },
        legs: { thighW: 4, shinW: 2, footLen: 4, footW: 3 },
      });
      // narrow crest of display scales along the neck
      for (const n of r.neck) {
        const b = r.mb.get(n);
        const [, py, pz] = b.pivot;
        b.box([-0.5, py + 1, pz - 3], [1, 1, 3], 'accent');
      }
      return r;
    },
  },
  {
    ...omni,
    id: 'gallimimus',
    name: 'Gallimimus',
    info: 'The "chicken mimic" was one of the fastest dinosaurs, sprinting like an ostrich on long legs with a toothless beak.',
    period: 'Cretaceous',
    lengthM: 6,
    scale: 1.1,
    temperament: 'skittish',
    health: 26,
    speed: 0.38,
    tame: { items: [...HERB, ...SEEDS] },
    food: [...HERB, ...SEEDS],
    ride: { mode: 'ground', seats: 1, speed: 0.38, jump: 0.75 },
    spawn: { biomes: ['prehistoric', 'plains', 'savanna', 'desert'], weight: 8, herd: [3, 6] },
    sounds: { ...SND.small, pitch: 0.7 },
    prey: true,
    palette: {
      back: '#7a6a52', side: '#a89878', belly: '#ece4d0', accent: '#4a3e30', accent2: '#c8b898', eye: '#d0802a',
      pattern: { type: 'mottled', colour: '#5c4e3a', scale: 4, coverage: 0.3, strength: 0.6 },
    },
    build() {
      const r = theropod('gallimimus', {
        hipY: 24,
        feathered: true,
        body: { len: 16, w: 8, h: 9, chest: 1, tilt: -8 },
        neck: { len: 16, w: 3, h: 3, angle: 58, segments: 3 },
        head: { len: 3, w: 4, h: 4, snoutLen: 4, snoutW: 2, snoutH: 2, jawH: 1, beak: true, eyeR: 0.9 },
        tail: { len: 22, segments: 4, lift: 5, w: 5, h: 5, tipW: 1, tipH: 1 },
        arms: { len: 7, w: 1, angle: -25 },
        legs: { thighW: 5, shinW: 3, footLen: 5, footW: 3 },
      });
      wingFeathers(r, { len: 5, h: 4 });
      return r;
    },
  },
  {
    ...omni,
    id: 'oviraptor',
    name: 'Oviraptor',
    info: 'Named "egg thief", Oviraptor was later found brooding its own nest, sheltering its eggs with feathered arms like a bird.',
    period: 'Cretaceous',
    lengthM: 1.8,
    scale: 0.7,
    temperament: 'skittish',
    health: 12,
    attack: 2,
    speed: 0.32,
    spawn: { biomes: ['prehistoric', 'desert', 'mesa', 'savanna'], weight: 6, herd: [1, 3] },
    sounds: { ...SND.small, pitch: 0.9 },
    prey: true,
    palette: {
      back: '#3e4a5a', side: '#6a7a8a', belly: '#e6e2d6', accent: '#d4422a', accent2: '#f0a030', eye: '#e8d040', horn: '#d6c4a0',
      pattern: { type: 'stripes', colour: '#2a3240', scale: 3, coverage: 0.3, strength: 0.6 },
    },
    build() {
      const r = theropod('oviraptor', {
        hipY: 14,
        feathered: true,
        body: { len: 13, w: 6, h: 7, chest: 1, tilt: -8 },
        neck: { len: 8, w: 3, h: 3, angle: 46, segments: 2 },
        head: { len: 4, w: 4, h: 5, snoutLen: 2, snoutW: 3, snoutH: 3, jawH: 2, beak: true, eyeR: 0.9 },
        tail: { len: 14, segments: 4, lift: 6, w: 4, h: 4, tipW: 1, tipH: 1 },
        arms: { len: 6, w: 1, angle: -25 },
        legs: { thighW: 4, shinW: 2, footLen: 4, footW: 3 },
      });
      // tall rounded casque crest over the snout
      const h = r.mb.get('head');
      const cz = r.a.craniumZ0;
      h.box([-0.5, r.a.headTop - 1, cz - 1], [1, 4, 4], 'accent');
      h.box([-0.5, r.a.headTop + 3, cz], [1, 1, 2], 'accent');
      h.box([-0.5, r.a.jawY + 1, cz - 2], [1, r.a.headTop - r.a.jawY + 1, 2], 'accent');
      wingFeathers(r, { len: 6, h: 5, spread: 1 });
      F.tailFan(r, { w: 6, len: 5, mat: 'quill' });
      return r;
    },
  },
  {
    ...base,
    id: 'therizinosaurus',
    name: 'Therizinosaurus',
    info: 'This bizarre plant-eating theropod had the longest claws of any known animal, up to a metre long, used to pull down branches.',
    period: 'Cretaceous',
    diet: 'herbivore',
    food: HERB,
    lengthM: 10,
    scale: 1.6,
    temperament: 'neutral',
    health: 110,
    attack: 14,
    speed: 0.2,
    spawn: { biomes: ['prehistoric', 'forest', 'jungle'], weight: 2, herd: [1, 1] },
    sounds: { ...SND.herd, pitch: 0.4 },
    palette: {
      back: '#5a4636', side: '#86705a', belly: '#d8c6a6', accent: '#b04a2a', accent2: '#e8d8b8', eye: '#c88a2a', claw: '#2a2420',
      pattern: { type: 'mottled', colour: '#3e2f24', scale: 5, coverage: 0.35, strength: 0.6 },
    },
    build() {
      const r = theropod('therizinosaurus', {
        hipY: 24,
        feathered: true,
        body: { len: 24, w: 14, h: 16, chest: 5, tilt: -20 },
        neck: { len: 16, w: 5, h: 6, angle: 30, segments: 3 },
        head: { len: 4, w: 5, h: 5, snoutLen: 3, snoutW: 3, snoutH: 3, jawH: 1, beak: true },
        tail: { len: 18, segments: 4, lift: 0, w: 8, h: 8, tipW: 2, tipH: 2 },
        arms: { len: 14, w: 3, angle: -15, big: true, hand: 2 },
        legs: { thighW: 8, shinW: 5, footLen: 6, footW: 6 },
      });
      // the famous scythe claws: three long blades per hand
      for (const a of r.arms) {
        const b = r.mb.get(a);
        const [px, py, pz] = b.pivot;
        for (let i = -1; i <= 1; i++) b.box([px + i - 0.5, py - 14 - 9, pz - 1.5], [1, 10, 1], 'claw', { rotation: [-18, 0, 0], pivot: [px, py - 14, pz] });
        b.box([px - 2, py - 8, pz + 1], [1, 7, 6], 'feather');
      }
      backFluff(r, { h: 2 });
      return r;
    },
  },
  {
    ...smallCarn,
    id: 'archaeopteryx',
    name: 'Archaeopteryx',
    info: 'The "first bird" combined feathered wings with teeth, clawed fingers and a long bony tail, a perfect link between dinosaurs and birds.',
    period: 'Jurassic',
    lengthM: 0.5,
    scale: 0.35,
    temperament: 'skittish',
    health: 4,
    attack: 1,
    speed: 0.3,
    tame: { items: [...SMALL_MEAT, ...SEEDS] },
    spawn: { biomes: ['prehistoric', 'jungle', 'beach'], weight: 6, herd: [1, 3] },
    sounds: { ...SND.ptero, pitch: 1.4 },
    prey: true,
    group: 'bird',
    palette: {
      back: '#2a2622', side: '#5a4c40', belly: '#ddd0b8', accent: '#141416', accent2: '#c8beb0', eye: '#f0b020',
      pattern: { type: 'stripes', colour: '#1a1714', scale: 2, coverage: 0.25, strength: 0.5 }, teeth: true,
    },
    build() {
      const r = theropod('archaeopteryx', {
        hipY: 12,
        feathered: true,
        body: { len: 10, w: 4, h: 5, chest: 1, tilt: -10 },
        neck: { len: 4, w: 2, h: 3, angle: 40, segments: 1 },
        head: { len: 3, w: 3, h: 3, snoutLen: 3, snoutW: 2, snoutH: 2, jawH: 1, eyeR: 1 },
        tail: { len: 14, segments: 4, lift: 2, w: 2, h: 2, tipW: 1, tipH: 1 },
        arms: { len: 5, w: 1, angle: -10 },
        legs: { thighW: 3, shinW: 2, footLen: 3, footW: 2 },
      });
      wingFeathers(r, { len: 11, h: 5, spread: 1 });
      // feathered tail: a fringe running the whole length of the bony tail
      for (const t of r.tail) {
        const b = r.mb.get(t);
        const [, py, pz] = b.pivot;
        b.box([-2.5, py, pz], [5, 0, 4], 'quill');
      }
      return r;
    },
  },
  {
    ...carn,
    id: 'dilophosaurus',
    name: 'Dilophosaurus',
    info: 'Dilophosaurus wore a pair of thin bony crests on its head; the venom-spitting neck frill is pure movie invention.',
    period: 'Jurassic',
    lengthM: 7,
    scale: 1.15,
    temperament: 'aggressive',
    health: 40,
    attack: 7,
    speed: 0.3,
    tame: { items: MEAT },
    spawn: { biomes: ['prehistoric', 'jungle', 'swamp'], weight: 3, herd: [1, 2] },
    sounds: { ...SND.bigCarn, pitch: 1.0 },
    palette: {
      back: '#3e5a3a', side: '#6e8a50', belly: '#e0d8a8', accent: '#d8402a', accent2: '#f2c030', eye: '#e8c02a',
      pattern: { type: 'spots', colour: '#2a3e26', scale: 3.5, coverage: 0.45 }, teeth: true,
    },
    build() {
      const r = theropod('dilophosaurus', {
        hipY: 22,
        body: { len: 22, w: 8, h: 10, chest: 2, tilt: -5 },
        neck: { len: 10, w: 5, h: 6, angle: 32, segments: 2 },
        head: { len: 6, w: 6, h: 6, snoutLen: 7, snoutW: 4, snoutH: 4, jawH: 2 },
        tail: { len: 32, segments: 5, lift: 3, w: 6, h: 6, tipW: 1, tipH: 1 },
        arms: { len: 7, w: 2, angle: -35 },
        legs: { thighW: 6, shinW: 3, footLen: 6, footW: 4 },
      });
      // twin semicircular crests
      const h = r.mb.get('head');
      for (const x of [-2.5, 1.5]) {
        h.box([x, r.a.jawY + 3, r.a.snoutTip + 1], [1, 2, 3], 'accent');
        h.box([x, r.a.headTop - 1, r.a.snoutTip + 3], [1, 2, 10], 'accent');
        h.box([x, r.a.headTop + 1, r.a.snoutTip + 4], [1, 2, 8], 'accent');
        h.box([x, r.a.headTop + 3, r.a.snoutTip + 6], [1, 1, 4], 'accent');
      }
      return r;
    },
  },
];
