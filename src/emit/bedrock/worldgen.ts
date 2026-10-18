// World generation: tree structures, plant/ore features, feature rules, the
// Prehistoric Jungle custom biome (Custom Biomes experiment) and its client look.
import { PLANTS, SOIL, TREES } from '../../data/plants.js';
import { SHAPES } from '../../data/treeshapes.js';
import { FORMAT, NS } from './constants.js';
import { mcstructure } from './nbt.js';
import type { OutDir } from '../writer.js';

export const TREE_VARIANTS = 3;
export const PREHISTORIC_TAG = 'dino_prehistoric';

/** Which vanilla biome tags get each tree / plant without the experiment (fallback). */
const TREE_BIOMES: Record<string, { tags: string[]; chance: number }> = {
  ginkgo: { tags: ['forest', 'jungle'], chance: 12 },
  araucaria: { tags: ['savanna', 'jungle', 'mesa'], chance: 10 },
  dawn_redwood: { tags: ['taiga', 'swamp'], chance: 10 },
  lepidodendron: { tags: ['swamp', 'mangrove_swamp'], chance: 6 },
  tree_fern: { tags: ['jungle', 'swamp'], chance: 6 },
};
const PLANT_BIOMES: Record<string, string[]> = {
  fern: ['jungle', 'forest', 'swamp', 'taiga'],
  horsetail: ['swamp', 'river', 'mangrove_swamp', 'jungle'],
  cycad: ['jungle', 'savanna', 'desert', 'mesa'],
  club_moss: ['forest', 'taiga', 'swamp'],
  williamsonia: ['savanna', 'jungle'],
  magnolia: ['forest', 'jungle', 'flower_forest'],
};

const anyTag = (tags: string[]) => [{ any_of: tags.map((t) => ({ test: 'has_biome_tag', operator: '==', value: t })) }];

function rule(id: string, feature: string, tags: string[], iterations: number, chance?: number, pass = 'surface_pass', y: unknown = 'query.heightmap(variable.worldx, variable.worldz)') {
  return {
    format_version: FORMAT.featureRule,
    'minecraft:feature_rules': {
      description: { identifier: `${NS}:${id}`, places_feature: `${NS}:${feature}` },
      conditions: { placement_pass: pass, 'minecraft:biome_filter': anyTag(tags) },
      distribution: {
        iterations,
        ...(chance ? { scatter_chance: { numerator: 1, denominator: chance } } : {}),
        x: { distribution: 'uniform', extent: [0, 16] },
        y,
        z: { distribution: 'uniform', extent: [0, 16] },
      },
    },
  };
}

export function emitWorldgen(bp: OutDir, rp: OutDir, lang: string[]) {
  const structureInfo: Record<string, { name: string; size: [number, number, number]; base: [number, number, number] }[]> = {};

  // ---- trees: structures + features
  for (const t of TREES) {
    const variants: string[] = [];
    structureInfo[t.id] = [];
    for (let i = 0; i < TREE_VARIANTS; i++) {
      const shape = SHAPES[t.id](1000 + i * 37 + t.id.length, `${NS}:${t.id}_log`, `${NS}:${t.id}_leaves`);
      const name = `${t.id}_${i}`;
      bp.write(`structures/${NS}/${name}.mcstructure`, mcstructure(shape.size, shape.blocks));
      structureInfo[t.id].push({ name: `${NS}:${name}`, size: shape.size, base: shape.base });
      const fid = `${name}_tree_feature`;
      bp.json(`features/${fid}.json`, {
        format_version: FORMAT.feature,
        'minecraft:structure_template_feature': {
          description: { identifier: `${NS}:${fid}` },
          structure_name: `${NS}:${name}`,
          adjustment_radius: 2,
          facing_direction: 'random',
          constraints: {
            grounded: {},
            unburied: {},
            block_intersection: { block_allowlist: ['minecraft:air', 'minecraft:short_grass', 'minecraft:tall_grass', 'minecraft:fern', 'minecraft:large_fern', ...PLANTS.map((p) => `${NS}:${p.id}`), `${NS}:${t.id}_leaves`] },
          },
        },
      });
      variants.push(fid);
    }
    const pick = `${t.id}_tree_random_feature`;
    bp.json(`features/${pick}.json`, {
      format_version: FORMAT.feature,
      'minecraft:weighted_random_feature': { description: { identifier: `${NS}:${pick}` }, features: variants.map((v) => [`${NS}:${v}`, 1]) },
    });
    const tb = TREE_BIOMES[t.id];
    bp.json(`feature_rules/${t.id}_tree_rule.json`, rule(`${t.id}_tree_rule`, pick, tb.tags, 1, tb.chance));
    bp.json(`feature_rules/${t.id}_tree_prehistoric_rule.json`, rule(`${t.id}_tree_prehistoric_rule`, pick, [PREHISTORIC_TAG], 2, 2));
  }

  // ---- plants: single block features + scatter rules
  for (const p of PLANTS) {
    const fid = `${p.id}_plant_feature`;
    bp.json(`features/${fid}.json`, {
      format_version: FORMAT.feature,
      'minecraft:single_block_feature': {
        description: { identifier: `${NS}:${fid}` },
        places_block: `${NS}:${p.id}`,
        enforce_placement_rules: true,
        enforce_survivability_rules: true,
        may_attach_to: { min_sides_must_attach: 1, bottom: p.soil ?? SOIL },
        may_replace: ['minecraft:air'],
      },
    });
    const scatter = `${p.id}_patch_feature`;
    bp.json(`features/${scatter}.json`, {
      format_version: FORMAT.feature,
      'minecraft:scatter_feature': {
        description: { identifier: `${NS}:${scatter}` },
        places_feature: `${NS}:${fid}`,
        iterations: 10,
        x: { distribution: 'gaussian', extent: [-4, 4] },
        y: 'query.heightmap(variable.worldx, variable.worldz)',
        z: { distribution: 'gaussian', extent: [-4, 4] },
      },
    });
    bp.json(`feature_rules/${p.id}_rule.json`, rule(`${p.id}_rule`, scatter, PLANT_BIOMES[p.id], 1, 3));
    bp.json(`feature_rules/${p.id}_prehistoric_rule.json`, rule(`${p.id}_prehistoric_rule`, scatter, [PREHISTORIC_TAG], 2));
  }

  // ---- underground: amber and fossils
  const ore = (id: string, block: string, deep: string | null, count: number, iterations: number, ymin: number, ymax: number) => {
    bp.json(`features/${id}.json`, {
      format_version: FORMAT.feature,
      'minecraft:ore_feature': {
        description: { identifier: `${NS}:${id}` },
        count,
        replace_rules: [
          { places_block: `${NS}:${block}`, may_replace: ['minecraft:stone', 'minecraft:granite', 'minecraft:diorite', 'minecraft:andesite', 'minecraft:tuff'] },
          ...(deep ? [{ places_block: `${NS}:${deep}`, may_replace: ['minecraft:deepslate'] }] : []),
        ],
      },
    });
    bp.json(`feature_rules/${id}_rule.json`, rule(`${id}_rule`, id, ['overworld'], iterations, undefined, 'underground_pass', { distribution: 'uniform', extent: [ymin, ymax] }));
  };
  ore('amber_ore_feature', 'amber_ore', 'deepslate_amber_ore', 5, 6, -40, 70);
  ore('fossil_ore_feature', 'fossil_block', null, 7, 3, -10, 60);

  // ---- the Prehistoric Jungle biome (requires the Custom Biomes experiment)
  bp.json(`biomes/prehistoric_jungle.biome.json`, {
    format_version: FORMAT.biome,
    'minecraft:biome': {
      description: { identifier: `${NS}:prehistoric_jungle` },
      components: {
        'minecraft:climate': { downfall: 0.9, snow_accumulation: [0.0, 0.125], temperature: 0.95 },
        'minecraft:surface_builder': {
          builder: {
            type: 'minecraft:overworld',
            sea_floor_depth: 7,
            sea_floor_material: 'minecraft:mud',
            foundation_material: 'minecraft:stone',
            mid_material: 'minecraft:dirt',
            top_material: 'minecraft:grass_block',
            sea_material: 'minecraft:water',
          },
        },
        'minecraft:surface_material_adjustments': {
          adjustments: [
            { materials: { top_material: 'minecraft:podzol' }, noise_range: [0.25, 0.45], noise_frequency_scale: 0.08 },
            { materials: { top_material: 'minecraft:moss_block' }, noise_range: [-0.6, -0.45], noise_frequency_scale: 0.08 },
            { materials: { top_material: 'minecraft:coarse_dirt' }, noise_range: [0.7, 0.8], noise_frequency_scale: 0.08 },
          ],
        },
        'minecraft:replace_biomes': {
          replacements: [
            { dimension: 'minecraft:overworld', targets: ['jungle', 'bamboo_jungle', 'jungle_edge'], amount: 0.45, noise_frequency_scale: 0.5 },
            { dimension: 'minecraft:overworld', targets: ['swampland', 'mangrove_swamp'], amount: 0.3, noise_frequency_scale: 0.5 },
            { dimension: 'minecraft:overworld', targets: ['savanna', 'savanna_plateau', 'plains', 'forest'], amount: 0.12, noise_frequency_scale: 0.4 },
          ],
        },
        'minecraft:tags': { tags: ['animal', 'monster', 'overworld', PREHISTORIC_TAG] },
      },
    },
  });
  rp.json('biomes/prehistoric_jungle.client_biome.json', {
    format_version: FORMAT.clientBiome,
    'minecraft:client_biome': {
      description: { identifier: `${NS}:prehistoric_jungle` },
      components: {
        'minecraft:sky_color': { sky_color: '#9ec6a8' },
        'minecraft:fog_appearance': { fog_identifier: 'minecraft:fog_jungle' },
        'minecraft:water_appearance': { surface_color: '#2f8f7a' },
        'minecraft:grass_appearance': { color: '#5f9f3a' },
        'minecraft:foliage_appearance': { color: '#3f8a2a' },
        'minecraft:atmosphere_identifier': { atmosphere_identifier: 'minecraft:warmish_atmospherics' },
        'minecraft:lighting_identifier': { lighting_identifier: 'minecraft:warmish_lighting' },
        'minecraft:color_grading_identifier': { color_grading_identifier: 'minecraft:warmish_color_grading' },
        'minecraft:water_identifier': { water_identifier: 'minecraft:default_water' },
        'minecraft:biome_music': { music_definition: 'jungle' },
      },
    },
  });
  lang.push(`biome.${NS}:prehistoric_jungle.name=Prehistoric Jungle`);
  return structureInfo;
}
