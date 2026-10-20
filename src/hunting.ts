// Realistic Hunting support: every creature as a hunting target profile (game data plus a hit
// model built from its own geometry, with organ boxes placed inside the torso, neck and head).
// The profiles are sent to the hunting add-on when both are installed (Bedrock: the scripts
// bundle, Java: hunting/targets/dinosaurs.json); see README, "Realistic Hunting".
import { buildHitModel, fishOrgans, headOrgans, neckOrgans, torsoOrgans } from '../tools/vendor/hunting-kit/hitmodel.mjs';
import { PROTOCOL } from '../tools/vendor/hunting-kit/protocol.js';
import type { Assembled } from './creatures/assemble.js';
import type { CreatureDef, Group } from './data/types.js';
import type { Bone, Cube } from './model/types.js';

type Box = { origin: [number, number, number]; size: [number, number, number] };
type Organ = { bone: string; zone: string; origin: number[]; size: number[] };

/** Mass in kg ≈ k × length³ (length in metres), by body plan. */
const DENSITY: Record<Group, number> = {
  theropod: 4.3, sauropod: 3.8, ornithopod: 3.5, ceratopsian: 12, thyreophoran: 10, pterosaur: 0.12,
  marine_reptile: 4.4, fish: 8, crocodilian: 6, snake: 0.5, synapsid: 4.7, bird: 4,
};

/** Trophies by body plan (the hunting add-on's trophy items). */
const TROPHY: Partial<Record<Group, string>> = { ceratopsian: 'trophy_skull', thyreophoran: 'trophy_skull' };

/** Per-creature adjustments. */
const OVERRIDES: Record<string, { minEnergy?: number }> = {
  // A barrel of blubber and muscle: it takes a .30-06 to reach the heart.
  plesiosaurus: { minEnergy: 3600 },
};

const SENSES = {
  aggressive: { sight: 1.1, hearing: 1.2, smell: 1.6, alertTime: 10, herd: 0 },
  neutral: { sight: 1.0, hearing: 1.2, smell: 1.3, alertTime: 12, herd: 12 },
  passive: { sight: 1.2, hearing: 1.3, smell: 1.3, alertTime: 12, herd: 18 },
  skittish: { sight: 1.4, hearing: 1.5, smell: 1.2, alertTime: 8, herd: 10 },
};
const FISH_SENSES = { sight: 1.0, hearing: 1.4, smell: 1.6, alertTime: 4, herd: 0 };

const volume = (c: Cube) => c.size[0] * c.size[1] * c.size[2];

/** Bounding box of a bone's main cubes (leaving out spikes, plates and rotated bits). */
function mainBox(bone: Bone | undefined): Box | null {
  const cubes = (bone?.cubes ?? []).filter((c) => !c.rotation && volume(c) > 0);
  if (!cubes.length) return null;
  const big = Math.max(...cubes.map(volume));
  const main = cubes.filter((c) => volume(c) >= big * 0.25);
  const min = [0, 1, 2].map((i) => Math.min(...main.map((c) => c.origin[i]))) as Box['origin'];
  const max = [0, 1, 2].map((i) => Math.max(...main.map((c) => c.origin[i] + c.size[i])));
  return { origin: min, size: max.map((v, i) => v - min[i]) as Box['size'] };
}

/** The biggest unrotated cube of a bone (the cranium of a head with crests and horns). */
function biggestCube(bone: Bone | undefined): Box | null {
  const cubes = (bone?.cubes ?? []).filter((c) => !c.rotation && volume(c) > 0).sort((a, b) => volume(b) - volume(a));
  return cubes.length ? { origin: [...cubes[0].origin], size: [...cubes[0].size] } : null;
}

/** A box inside `box`: a centred width fraction, and fractions along y and z. */
function inner(bone: string, zone: string, box: Box, w: number, [g0, g1]: number[], [f0, f1]: number[]): Organ {
  const [x0, y0, z0] = box.origin;
  const [W, H, L] = box.size;
  return { bone, zone, origin: [x0 + (W * (1 - w)) / 2, y0 + H * g0, z0 + L * f0], size: [W * w, H * (g1 - g0), L * (f1 - f0)] };
}

/** Snakes: body, then tail0..tailN (front to back). */
function snakeOrgans(bones: Bone[]): Organ[] {
  const segs = [bones.find((b) => b.name === 'body')!, ...bones.filter((b) => /^tail\d+$/.test(b.name))];
  const n = segs.length;
  const at = (f: number) => Math.min(n - 1, Math.floor(n * f));
  const organs: Organ[] = segs.map((s) => inner(s.name, 'spine', mainBox(s)!, 0.34, [0.66, 1], [0, 1]));
  const add = (i: number, zone: string, f: number[]) => organs.push(inner(segs[i].name, zone, mainBox(segs[i])!, zone === 'heart' ? 0.6 : 0.8, [0.1, 0.62], f));
  add(at(0.15), 'heart', [0.1, 0.5]);
  add(at(0.15), 'lungs', [0.5, 1]);
  if (at(0.3) !== at(0.15)) add(at(0.3), 'lungs', [0, 1]);
  add(at(0.45), 'liver', [0, 1]);
  if (at(0.6) !== at(0.45)) add(at(0.6), 'stomach', [0, 1]);
  const head = biggestCube(bones.find((b) => b.name === 'head'));
  if (head) organs.push(...headOrgans('head', head));
  return organs;
}

/**
 * Pillar-legged animals: the top of the front leg and the shoulder blade cover the low heart
 * from the side. As on an elephant, the shot that counts goes just behind the shoulder: their
 * heart sits there, above the leg, with the lungs around it.
 */
function clearOfLegs(body: Box, bones: Bone[], scale: number) {
  const [, y0, z0] = body.origin;
  const [, H, L] = body.size;
  const z = (f: number) => z0 + L * f;
  const legTop = (f0: number, f1: number) => {
    let top = -Infinity;
    for (const b of bones.filter((x) => /^(leg|shin)_f[lr]$/.test(x.name))) {
      for (const c of b.cubes) if (c.origin[2] < z(f1) && c.origin[2] + c.size[2] > z(f0)) top = Math.max(top, c.origin[1] + c.size[1]);
    }
    return (top - y0) / H;
  };
  if (legTop(0.13, 0.3) + 0.06 <= 0.08) return {};
  const g = Math.min(0.6, Math.max(0.12, legTop(0.36, 0.52) + 0.06));
  return {
    // The giants' hearts are big enough to reach with a rifle.
    heart: [[0.36, 0.52], [g, g + 0.3], Math.min(0.7, 0.4 * Math.max(1, scale / 2))],
    lungs: [[0.3, 0.62], [Math.max(0.25, g - 0.05), 0.9], 0.72],
    liver: [[0.62, 0.72], [0.18, 0.72], 0.78],
    stomach: [[0.7, 0.88], [0.04, 0.74], 0.86],
  };
}

/** Organ boxes for a creature, from its bones. */
export function organsFor(def: CreatureDef, bones: Bone[]): Organ[] {
  if (def.group === 'snake') return snakeOrgans(bones);
  const body = mainBox(bones.find((b) => b.name === 'body'));
  if (!body) throw new Error(`${def.id}: no body bone to put the organs in`);
  const head = biggestCube(bones.find((b) => b.name === 'head'));
  if (def.group === 'fish') return fishOrgans('body', body, head ? 'head' : 'body', head ?? { origin: body.origin, size: [body.size[0], body.size[1], body.size[2] * 0.3] });
  const organs: Organ[] = [...torsoOrgans('body', body, clearOfLegs(body, bones, def.scale))];
  for (const neck of bones.filter((b) => /^neck\d+$/.test(b.name))) {
    const box = mainBox(neck);
    if (box) organs.push(...neckOrgans(neck.name, box));
  }
  if (head) organs.push(...headOrgans('head', head));
  return organs;
}

function gameData(def: CreatureDef) {
  const k = DENSITY[def.group];
  const mass = k * def.lengthM ** 3;
  const weight = [Math.round(mass * 0.7 * 10) / 10, Math.round(mass * 1.1 * 10) / 10];
  const max = weight[1];
  const dangerous = def.temperament === 'aggressive' || (def.diet === 'carnivore' && max >= 50);
  const cls = max < 30 ? 'small' : dangerous ? 'dangerous' : max > 300 ? 'big' : 'medium';
  // Below the muzzle energy of the rifle meant for it (.30-06 3900 J, .338 5300 J), so it stays ethical out to 30-80 m.
  const minEnergy = OVERRIDES[def.id]?.minEnergy ?? { small: max < 2 ? 150 : 300, medium: max < 60 ? 1000 : 1600, big: max < 800 ? 2000 : max < 5000 ? 2700 : max < 100000 ? 3300 : 5000, dangerous: max >= 1000 ? 5000 : 2700 }[cls];
  const trophy = def.id === 'megalodon' ? 'trophy_shark_jaw' : cls === 'small' && def.diet !== 'carnivore' ? null : TROPHY[def.group] ?? 'trophy_skull';
  const score = trophy ? Math.round((60 * Math.log10(Math.max(2, max)) + 20) * (cls === 'dangerous' ? 1.2 : 1)) : 0;
  return {
    class: cls,
    minEnergy,
    ...(cls === 'small' ? { minShotEnergy: max < 2 ? 3 : 5 } : {}),
    weight,
    score,
    trophy,
    maleTrophy: false,
    ...(def.diet === 'carnivore' && def.habitat !== 'water' ? { call: 'predator' } : {}),
  };
}

/** Bedrock items a carcass gives when field dressed (like the loot table, without the luck). */
function loot(def: CreatureDef) {
  const size = Math.max(1, Math.min(6, Math.round(def.lengthM / 2)));
  const meat = def.group === 'fish' ? 'minecraft:cod' : 'dino:raw_dino_meat';
  const out = [{ item: meat, min: Math.ceil(size / 2), max: size }];
  const byproduct = def.group === 'fish' ? null : def.group === 'pterosaur' || def.group === 'bird' ? 'dino:prehistoric_feather' : def.group === 'thyreophoran' ? 'dino:armor_scute' : 'dino:dino_hide';
  if (byproduct) out.push({ item: byproduct, min: 0, max: Math.max(1, Math.round(size / 2)) });
  for (const d of def.drops ?? []) out.push({ item: d.item, min: d.min, max: d.max });
  return out;
}

/** The hunting target profile of a creature. `ns` is the entity namespace (dino on Bedrock, dinosaurs on Java). */
export function huntingProfile(x: Assembled, { ns = 'dino', name }: { ns?: string; name?: string } = {}) {
  const { def, model } = x;
  const spec = { id: def.id, model: { bones: model.bones }, organs: organsFor(def, model.bones) };
  const fish = def.group === 'fish';
  return {
    v: PROTOCOL,
    id: `${ns}:${def.id}`,
    name: name ?? `entity.${ns}:${def.id}.name`,
    game: gameData(def),
    senses: fish ? FISH_SENSES : SENSES[def.temperament],
    scale: def.scale,
    health: def.health,
    bird: def.habitat === 'air',
    fish,
    hitModel: buildHitModel(spec),
    hitModelFemale: null,
    sex: 'random',
    sounds: { warn: def.sounds.ambient, death: def.sounds.death, pitch: [def.sounds.pitch * 0.9, def.sounds.pitch * 1.1] },
    entry: `dino.info.${def.id}`,
    loot: loot(def),
    bedrock: { state: 'dino:hunt_state', events: { carcass: 'dino:hunt_carcass', lure: 'dino:hunt_lure', unlure: 'dino:hunt_unlure' } },
  };
}
