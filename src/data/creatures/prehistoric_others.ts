import { marine, pterosaur, quadruped, snake, type Rig } from '../../model/rigs.js';
import * as F from '../../creatures/features.js';
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
        tail: { len: 44, w: 12, h: 8, segments: 5, lift: 0, tipW: 2, tipH: 4 },
        legs: { frontW: 4, backW: 5, sprawl: 3, footLen: 3, elbow: 0, knee: 0 },
      });
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
    palette: { back: '#46525e', side: '#6b7986', belly: '#eef0f0', accent: '#46525e', eye: '#101418', mouth: '#9a3c46', teeth: true, spine: false },
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
      // conical snout overhang
      const h = r.mb.get('head');
      h.box([-3.5, r.a.jawY + 2, r.a.snoutTip - 3], [7, 4, 4], 'skin', { tags: ['jawU'] });
      // big triangular dorsal fin and smaller second dorsal
      F.fin(r, { bone: 'body', y: r.a.bodyTop - 1, z0: -4, len: 10, h: 11, sweep: 1, mat: 'dark' });
      F.fin(r, { bone: r.tail[1], y: r.a.bodyY + 4, z0: r.mb.get(r.tail[1]).pivot[2] + 1, len: 3, h: 3, sweep: 1, mat: 'dark' });
      // pelvic & anal fins
      F.fin(r, { bone: 'body', y: r.a.bodyY - r.a.bodyH / 2 - 0, z0: 8, len: 5, h: 4, sweep: 1, down: true, x: 3, mat: 'dark' });
      F.fin(r, { bone: 'body', y: r.a.bodyY - r.a.bodyH / 2 - 0, z0: 8, len: 5, h: 4, sweep: 1, down: true, x: -3, mat: 'dark' });
      // crescent (lunate) tail
      const last = r.tail[r.tail.length - 1];
      const tz = r.a.tailEnd - 3;
      F.fin(r, { bone: last, y: r.a.bodyY + 0.5, z0: tz, len: 6, h: 16, sweep: 1.3, mat: 'dark' });
      F.fin(r, { bone: last, y: r.a.bodyY + 0.5, z0: tz, len: 6, h: 11, sweep: 1.3, down: true, mat: 'dark' });
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
          head: { len: 9, w: 13, h: 14, snoutLen: 3, snoutW: 11, snoutH: 7, jawH: 5, eyeR: 1.4 },
          tail: { len: 20, segments: 4, fluke: 'none', w: 9, h: 9 },
          flippers: { front: [8, 5] },
          fishFins: true,
        },
        'fish',
      );
      const h = r.mb.get('head');
      const j = r.mb.get('jaw');
      const { craniumZ0, headPivot, jawY, headTop, snoutTip } = r.a;
      // armoured head shield (plates slightly bigger than skull)
      h.box([-7, jawY + 2, craniumZ0 + 1], [14, headTop - jawY - 1, headPivot[2] - craniumZ0 + 2], 'armor', { inflate: 0.2 });
      h.box([-6, headTop, craniumZ0 + 2], [12, 1, headPivot[2] - craniumZ0], 'armor');
      // bony blade "fangs" at the front of both jaws
      h.pair([3, jawY - 2, snoutTip], [2, 3, 2], 'horn');
      h.box([-1, jawY - 2, snoutTip - 1], [2, 3, 2], 'horn');
      j.pair([3, jawY - 1, snoutTip + 1], [2, 2, 2], 'horn');
      j.box([-1, jawY - 1, snoutTip], [2, 2, 2], 'horn');
      // jaw plate
      j.box([-6, jawY - 5.5, snoutTip + 1], [12, 1, headPivot[2] - snoutTip - 2], 'armor');
      // thoracic shield behind head
      r.mb.get('body').box([-6, r.a.bodyY - 6, r.a.bodyFront - 1], [12, 13, 5], 'armor', { inflate: 0.3 });
      F.fin(r, { bone: 'body', y: r.a.bodyTop - 1, z0: 0, len: 7, h: 6, sweep: 1, mat: 'dark' });
      const last = r.tail[r.tail.length - 1];
      const tz = r.a.tailEnd - 3;
      F.fin(r, { bone: last, y: r.a.bodyY + 0.5, z0: tz, len: 5, h: 10, sweep: 1.2, mat: 'dark' });
      F.fin(r, { bone: last, y: r.a.bodyY + 0.5, z0: tz, len: 5, h: 6, sweep: 1.2, down: true, mat: 'dark' });
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
      back: '#2c3e4c', side: '#486273', belly: '#e2e1d6', accent: '#2c3e4c', eye: '#d8b030', mouth: '#8c3a40',
      pattern: { type: 'mottled', colour: '#1f2e3a', scale: 5, coverage: 0.4 }, teeth: true,
    },
    build() {
      const r = marine('mosasaurus', {
        bodyY: 8,
        body: { len: 30, w: 12, h: 11 },
        neck: { len: 5, w: 9, h: 9 },
        head: { len: 9, w: 9, h: 9, snoutLen: 10, snoutW: 6, snoutH: 4, jawH: 3, eyeR: 0.9 },
        tail: { len: 40, segments: 5, fluke: 'mosasaur', flukeH: 12, w: 10, h: 9 },
        flippers: { front: [10, 6], back: [8, 5] },
      });
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
      // rounder, deeper belly
      r.mb.get('body').box([-6, r.a.bodyY - 6, r.a.bodyFront + 4], [12, 3, 12], 'skin');
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
    palette: { back: '#3a4f6b', side: '#6f8aa6', belly: '#eef0ea', accent: '#3a4f6b', eye: '#e8d27a', teeth: true },
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
      F.fin(r, { bone: 'body', y: r.a.bodyTop - 1, z0: -2, len: 7, h: 7, sweep: 1, mat: 'dark' });
      const last = r.tail[r.tail.length - 1];
      const tz = r.a.tailEnd - 3;
      F.fin(r, { bone: last, y: r.a.bodyY, z0: tz, len: 5, h: 10, sweep: 1.2, mat: 'dark' });
      F.fin(r, { bone: last, y: r.a.bodyY, z0: tz, len: 5, h: 9, sweep: 1.2, down: true, mat: 'dark' });
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
    palette: { back: '#5c636b', side: '#a3aaae', belly: '#ece8de', accent: '#c6402e', accent2: '#e88a2c', horn: '#e2d4a8', membrane: '#8a5d45', eye: '#e8b83a' },
    build() {
      const r = pterosaur('pteranodon', {
        bodyY: 12,
        body: { len: 10, w: 6, h: 6 },
        neck: { len: 7, w: 3, h: 3, angle: 26, segments: 2 },
        head: { len: 4, w: 4, h: 4, snoutLen: 13, snoutW: 2, snoutH: 2, jawH: 1, beak: true, eyeR: 0.7 },
        wing: { span: 36, chord: 9, armW: 2 },
        legs: { len: 10, w: 2 },
      });
      // long backward-sweeping crest
      const h = r.mb.get('head');
      const y = r.a.headTop - 1;
      h.box([-0.5, y, r.a.headPivot[2] - 2], [1, 3, 11], 'accent', { rotation: [-18, 0, 0], pivot: [0, y, r.a.headPivot[2] - 2] });
      h.box([-0.5, y + 2, r.a.headPivot[2] + 3], [1, 2, 6], 'accent', { rotation: [-18, 0, 0], pivot: [0, y, r.a.headPivot[2] - 2] });
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
    palette: { back: '#6a6c64', side: '#b8b6a8', belly: '#efeae0', accent: '#d64a32', accent2: '#2f3a52', horn: '#e6d6a4', membrane: '#6f5446', eye: '#e0b040' },
    build() {
      const r = pterosaur('quetzalcoatlus', {
        bodyY: 18,
        body: { len: 11, w: 7, h: 7 },
        neck: { len: 26, w: 3, h: 3, angle: 62, segments: 4 },
        head: { len: 5, w: 4, h: 5, snoutLen: 14, snoutW: 3, snoutH: 3, jawH: 2, beak: true, eyeR: 0.8 },
        wing: { span: 44, chord: 12, armW: 3 },
        legs: { len: 15, w: 3 },
      });
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
    palette: { back: '#3d3a46', side: '#6a5f74', belly: '#d8cfc2', accent: '#e0a42c', accent2: '#c2452c', membrane: '#5a4358', eye: '#ffd24a', teeth: true },
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
      // colourful puffin-like snout bands
      const tip = r.a.snoutTip;
      r.mb.decal({ kind: 'colour', center: [0, r.a.jawY + 3, tip + 2], radius: [4, 4, 1.2], colour: '#e0a42c' });
      r.mb.decal({ kind: 'colour', center: [0, r.a.jawY + 3, tip + 4], radius: [4, 4, 0.8], colour: '#c2452c' });
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
      back: '#3f4a2a', side: '#66703e', belly: '#d7cd96', accent: '#3f4a2a', eye: '#d8b030', mouth: '#8a3a44',
      pattern: { type: 'blotches', colour: '#25231a', scale: 4, coverage: 0.65 }, teeth: true,
    },
    build() {
      const r = snake('titanoboa', { w: 10, h: 8, segments: 14, segLen: 7, head: { len: 7, w: 10, h: 7, snoutLen: 4, snoutW: 6, snoutH: 3, jawH: 2, eyeR: 0.8 } });
      // flicking tongue
      r.mb.get('jaw').box([-0.5, r.a.jawY - 0.5, r.a.snoutTip - 3], [1, 0, 4], 'mouth');
      return r;
    },
  },
];
