import type { CreatureDef, SpawnBiome } from '../../data/types.js';
import { NS } from './constants.js';

const BIOME_TAGS: Record<SpawnBiome, string[]> = {
  prehistoric: ['dino_prehistoric'],
  jungle: ['jungle'],
  swamp: ['swamp', 'mangrove_swamp'],
  savanna: ['savanna'],
  plains: ['plains'],
  forest: ['forest'],
  taiga: ['taiga'],
  desert: ['desert'],
  mesa: ['mesa'],
  mountain: ['mountain', 'extreme_hills'],
  beach: ['beach'],
  river: ['river'],
  ocean: ['ocean'],
  warm_ocean: ['warm'],
  deep_ocean: ['deep'],
};

export function lootTable(c: CreatureDef) {
  const meat = c.habitat === 'water' && c.group === 'fish' ? 'minecraft:cod' : 'dino:raw_dino_meat';
  const size = Math.max(1, Math.min(6, Math.round(c.lengthM / 2)));
  const pools: any[] = [
    {
      rolls: 1,
      entries: [{ type: 'item', name: meat, weight: 1, functions: [{ function: 'set_count', count: { min: Math.ceil(size / 2), max: size } }, { function: 'furnace_smelt', conditions: [{ condition: 'entity_properties', entity: 'this', properties: { on_fire: true } }] }, { function: 'looting_enchant', count: { min: 0, max: 1 } }] }],
    },
  ];
  const byproduct = c.group === 'fish' ? null : c.group === 'pterosaur' || c.group === 'bird' ? 'dino:prehistoric_feather' : c.group === 'thyreophoran' ? 'dino:armor_scute' : 'dino:dino_hide';
  if (byproduct) pools.push({ rolls: 1, entries: [{ type: 'item', name: byproduct, weight: 1, functions: [{ function: 'set_count', count: { min: 0, max: Math.max(1, Math.round(size / 2)) } }, { function: 'looting_enchant', count: { min: 0, max: 1 } }] }] });
  pools.push({ rolls: 1, conditions: [{ condition: 'killed_by_player' }, { condition: 'random_chance_with_looting', chance: 0.04, looting_multiplier: 0.02 }], entries: [{ type: 'item', name: 'dino:fossil_fragment', weight: 1 }] });
  for (const d of c.drops ?? []) pools.push({ rolls: 1, ...(d.chance ? { conditions: [{ condition: 'random_chance', chance: d.chance }] } : {}), entries: [{ type: 'item', name: d.item, weight: 1, functions: [{ function: 'set_count', count: { min: d.min, max: d.max } }] }] });
  return { pools };
}

export function saddledLoot(c: CreatureDef) {
  const base = lootTable(c);
  base.pools.push({ rolls: 1, entries: [{ type: 'item', name: 'minecraft:saddle', weight: 1 }] });
  return base;
}

export const SADDLE_LOOT = { pools: [{ rolls: 1, entries: [{ type: 'item', name: 'minecraft:saddle', weight: 1 }] }] };

export function spawnRule(c: CreatureDef) {
  if (!c.spawn) return null;
  const tags = [...new Set(c.spawn.biomes.flatMap((b) => BIOME_TAGS[b]))];
  const biome = { any_of: tags.map((t) => ({ test: 'has_biome_tag', operator: '==', value: t })) };
  const base: any = {
    'minecraft:weight': { default: c.spawn.weight },
    'minecraft:herd': { min_size: c.spawn.herd[0], max_size: c.spawn.herd[1] },
    'minecraft:biome_filter': biome,
  };
  let cond: any;
  if (c.habitat === 'water') {
    cond = { 'minecraft:spawns_underwater': {}, 'minecraft:height_filter': { min: -20, max: 62 }, 'minecraft:density_limit': { surface: 2, underground: 2 }, ...base };
  } else if (c.habitat === 'air') {
    cond = { 'minecraft:spawns_on_surface': {}, 'minecraft:brightness_filter': { min: 7, max: 15, adjust_for_weather: false }, 'minecraft:density_limit': { surface: 3 }, ...base };
  } else {
    cond = {
      'minecraft:spawns_on_surface': {},
      'minecraft:spawns_on_block_filter': ['minecraft:grass_block', 'minecraft:dirt', 'minecraft:coarse_dirt', 'minecraft:podzol', 'minecraft:mud', 'minecraft:moss_block', 'minecraft:sand', 'minecraft:red_sand'],
      'minecraft:brightness_filter': { min: 7, max: 15, adjust_for_weather: false },
      'minecraft:density_limit': { surface: c.lengthM > 8 ? 2 : 4 },
      ...base,
    };
  }
  return {
    format_version: '1.8.0',
    'minecraft:spawn_rules': {
      description: { identifier: `${NS}:${c.id}`, population_control: c.habitat === 'water' ? 'water_animal' : c.temperament === 'aggressive' ? 'monster' : 'animal' },
      conditions: [cond],
    },
  };
}

export function soundEntry(c: CreatureDef) {
  const s = c.sounds;
  return {
    volume: c.lengthM > 8 ? 1.4 : 1.0,
    pitch: [s.pitch * 0.92, s.pitch * 1.08],
    events: {
      ambient: s.ambient,
      hurt: s.hurt,
      death: s.death,
      ...(s.step ? { step: { sound: s.step, volume: 0.35, pitch: s.pitch } } : {}),
    },
  };
}
