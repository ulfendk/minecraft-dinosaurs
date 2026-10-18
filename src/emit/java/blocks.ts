// Java Edition blocks & world generation: ancient plants, prehistoric trees (logs, planks,
// leaves, saplings + structure files), fossil and amber ores, biome features, recipes.
import { PLANTS, TREES } from '../../data/plants.js';
import { SHAPES } from '../../data/treeshapes.js';
import { DA_GAME_NAMES } from '../../data/i18n/game.js';
import { buildBlocks } from '../bedrock/blocks.js';
import { javaStructure, type JBlock } from './nbt.js';
import type { JavaCtx } from './subsystems.js';

const MOD = 'dinosaurs';
/** World data version of Minecraft Java 26.3 (version.json "world_version"). */
const DATA_VERSION = 5023;
export const TREE_VARIANTS = 3;

/** Biome selectors (#tag or biome key) – mirrors the Bedrock fallback biomes in worldgen.ts. */
const SEL: Record<string, string[]> = {
  jungle: ['#minecraft:is_jungle'],
  forest: ['#minecraft:is_forest'],
  swamp: ['minecraft:swamp', 'minecraft:mangrove_swamp'],
  mangrove_swamp: ['minecraft:mangrove_swamp'],
  taiga: ['#minecraft:is_taiga'],
  river: ['#minecraft:is_river'],
  savanna: ['#minecraft:is_savanna'],
  desert: ['minecraft:desert'],
  mesa: ['#minecraft:is_badlands'],
  flower_forest: ['minecraft:flower_forest'],
};
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

const id = (s: string) => `${MOD}:${s}`;
const selectors = (groups: string[]) => [...new Set(groups.flatMap((g) => SEL[g]))];

/** Shapes of the generated blocks, used by the Java code (resource /dinosaurs/blocks.json). */
export function javaBlockSpec() {
  return {
    plants: PLANTS.map((p) => ({ id: p.id, height: p.height, mapColor: p.mapColor })),
    trees: TREES.map((t) => ({ id: t.id, structures: Array.from({ length: TREE_VARIANTS }, (_, i) => id(`${t.id}_${i}`)) })),
    features: [
      ...PLANTS.map((p) => ({ feature: id(`${p.id}_patch`), step: 'VEGETAL_DECORATION', biomes: selectors(PLANT_BIOMES[p.id]) })),
      ...TREES.map((t) => ({ feature: id(`${t.id}_tree`), step: 'VEGETAL_DECORATION', biomes: selectors(TREE_BIOMES[t.id].tags) })),
      { feature: id('amber_ore'), step: 'UNDERGROUND_ORES', biomes: ['#minecraft:is_overworld'] },
      { feature: id('fossil_block'), step: 'UNDERGROUND_ORES', biomes: ['#minecraft:is_overworld'] },
    ],
  };
}

/** Converts a Bedrock voxel tree to Java blocks, with correct leaf distances so vanilla decay works. */
function javaTree(treeId: string, seed: number) {
  const shape = SHAPES[treeId](seed, 'LOG', 'LEAF');
  const blocks = new Map<string, JBlock>();
  const isLog = new Set<string>();
  const leaves: string[] = [];
  for (const [k, b] of shape.blocks) {
    if (b.name === 'LOG') {
      isLog.add(k);
      const face = String(b.states?.['minecraft:block_face'] ?? 'up');
      blocks.set(k, { name: id(`${treeId}_log`), properties: { axis: face === 'east' ? 'x' : face === 'north' ? 'z' : 'y' } });
    } else leaves.push(k);
  }
  // breadth-first distance from logs through leaves (vanilla caps at 7 = decaying)
  const dist = new Map<string, number>();
  const leafSet = new Set(leaves);
  let frontier = [...isLog];
  for (let d = 1; d <= 6 && frontier.length; d++) {
    const next: string[] = [];
    for (const k of frontier) {
      const [x, y, z] = k.split(',').map(Number);
      for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
        const n = `${x + dx},${y + dy},${z + dz}`;
        if (leafSet.has(n) && !dist.has(n)) {
          dist.set(n, d);
          next.push(n);
        }
      }
    }
    frontier = next;
  }
  for (const k of leaves) {
    const d = dist.get(k);
    if (d === undefined) continue; // unattached leaves would decay immediately; leave them out
    blocks.set(k, { name: id(`${treeId}_leaves`), properties: { distance: String(d), persistent: 'false', waterlogged: 'false' } });
  }
  return javaStructure(shape.size, blocks, DATA_VERSION);
}

const cubeAll = (tex: string) => ({ parent: 'minecraft:block/cube_all', textures: { all: `${MOD}:block/${tex}` } });

export async function emitJavaBlocks({ out, en, da }: JavaCtx) {
  const textures = new Map(buildBlocks().flatMap((b) => Object.entries(b.textures)));
  const tex = (key: string, name: string) => {
    const png = textures.get(key);
    if (!png) throw new Error(`missing texture ${key}`);
    out.png(`assets/${MOD}/textures/block/${name}.png`, png);
  };
  const blockItem = (blockId: string, model: string) => out.json(`assets/${MOD}/items/${blockId}.json`, { model: { type: 'minecraft:model', model } });
  const simpleState = (blockId: string) => out.json(`assets/${MOD}/blockstates/${blockId}.json`, { variants: { '': { model: id(`block/${blockId}`) } } });
  const selfLoot = (blockId: string) =>
    out.json(`data/${MOD}/loot_table/blocks/${blockId}.json`, {
      type: 'minecraft:block',
      pools: [{ rolls: 1, condition: { type: 'minecraft:survives_explosion' }, entries: [{ type: 'minecraft:item', name: id(blockId) }] }],
      random_sequence: id(`blocks/${blockId}`),
    });
  const name = (blockId: string, enName: string) => {
    en[`block.${MOD}.${blockId}`] = enName;
    da[`block.${MOD}.${blockId}`] = DA_GAME_NAMES[blockId] ?? enName;
  };
  const tags: Record<string, string[]> = {};
  const tag = (t: string, v: string) => (tags[t] ??= []).push(v);

  // ---- plants (cross models)
  for (const p of PLANTS) {
    tex(`dino_${p.id}`, p.id);
    simpleState(p.id);
    out.json(`assets/${MOD}/models/block/${p.id}.json`, { parent: 'minecraft:block/cross', textures: { cross: `${MOD}:block/${p.id}` } });
    out.json(`assets/${MOD}/models/item/${p.id}.json`, { parent: 'minecraft:item/generated', textures: { layer0: `${MOD}:block/${p.id}` } });
    blockItem(p.id, id(`item/${p.id}`));
    out.json(`data/${MOD}/loot_table/blocks/${p.id}.json`, {
      type: 'minecraft:block',
      pools: [{ rolls: 1, condition: { type: 'minecraft:survives_explosion' }, entries: [{ type: 'minecraft:item', name: id(p.id) }] }],
      random_sequence: id(`blocks/${p.id}`),
    });
    name(p.id, p.name);
    tag('block:minecraft:mineable/hoe', id(p.id));
    tag('block:minecraft:replaceable_by_trees', id(p.id));
    // worldgen: one plant, scattered in patches like vanilla flowers
    out.json(`data/${MOD}/worldgen/feature/${p.id}.json`, { type: 'minecraft:simple_block', to_place: { id: id(p.id) } });
    out.json(`data/${MOD}/worldgen/placed_feature/${p.id}_patch.json`, {
      feature: id(p.id),
      placement: [
        { type: 'minecraft:rarity_filter', chance: 3 },
        { type: 'minecraft:in_square' },
        { type: 'minecraft:heightmap', heightmap: 'MOTION_BLOCKING' },
        { type: 'minecraft:biome' },
        { type: 'minecraft:count', count: 20 },
        {
          type: 'minecraft:offset',
          x: { type: 'minecraft:trapezoid', max: 5, min: -5, plateau: 0 },
          y: { type: 'minecraft:trapezoid', max: 2, min: -2, plateau: 0 },
          z: { type: 'minecraft:trapezoid', max: 5, min: -5, plateau: 0 },
        },
        { type: 'minecraft:block_predicate_filter', predicate: { type: 'minecraft:matching_block_tag', tag: 'minecraft:air' } },
      ],
    });
  }

  // ---- trees
  for (const t of TREES) {
    const log = `${t.id}_log`, planks = `${t.id}_planks`, leaves = `${t.id}_leaves`, sapling = `${t.id}_sapling`;
    tex(`dino_${t.id}_log_side`, log);
    tex(`dino_${t.id}_log_top`, `${log}_top`);
    tex(`dino_${t.id}_planks`, planks);
    tex(`dino_${t.id}_leaves`, leaves);
    tex(`dino_${t.id}_sapling`, sapling);
    // log
    out.json(`assets/${MOD}/blockstates/${log}.json`, {
      variants: {
        'axis=x': { model: id(`block/${log}_horizontal`), x: 90, y: 90 },
        'axis=y': { model: id(`block/${log}`) },
        'axis=z': { model: id(`block/${log}_horizontal`), x: 90 },
      },
    });
    out.json(`assets/${MOD}/models/block/${log}.json`, { parent: 'minecraft:block/cube_column', textures: { end: `${MOD}:block/${log}_top`, side: `${MOD}:block/${log}` } });
    out.json(`assets/${MOD}/models/block/${log}_horizontal.json`, { parent: 'minecraft:block/cube_column_horizontal', textures: { end: `${MOD}:block/${log}_top`, side: `${MOD}:block/${log}` } });
    blockItem(log, id(`block/${log}`));
    // planks
    simpleState(planks);
    out.json(`assets/${MOD}/models/block/${planks}.json`, cubeAll(planks));
    blockItem(planks, id(`block/${planks}`));
    // leaves (pre-coloured textures, no tint)
    simpleState(leaves);
    out.json(`assets/${MOD}/models/block/${leaves}.json`, { parent: 'minecraft:block/leaves', textures: { all: `${MOD}:block/${leaves}` } });
    blockItem(leaves, id(`block/${leaves}`));
    // sapling
    out.json(`assets/${MOD}/blockstates/${sapling}.json`, { variants: { 'stage=0': { model: id(`block/${sapling}`) }, 'stage=1': { model: id(`block/${sapling}`) } } });
    out.json(`assets/${MOD}/models/block/${sapling}.json`, { parent: 'minecraft:block/cross', textures: { cross: `${MOD}:block/${sapling}` } });
    out.json(`assets/${MOD}/models/item/${sapling}.json`, { parent: 'minecraft:item/generated', textures: { layer0: `${MOD}:block/${sapling}` } });
    blockItem(sapling, id(`item/${sapling}`));

    selfLoot(log);
    selfLoot(planks);
    selfLoot(sapling);
    const notShears = { type: 'minecraft:inverted', term: { type: 'minecraft:any_of', terms: ['minecraft:tool/can_shear', 'minecraft:tool/can_silk_touch'] } };
    out.json(`data/${MOD}/loot_table/blocks/${leaves}.json`, {
      type: 'minecraft:block',
      pools: [
        {
          rolls: 1,
          entries: [
            {
              type: 'minecraft:alternatives',
              children: [
                { type: 'minecraft:item', condition: { type: 'minecraft:any_of', terms: ['minecraft:tool/can_shear', 'minecraft:tool/can_silk_touch'] }, name: id(leaves) },
                {
                  type: 'minecraft:item',
                  condition: { type: 'minecraft:all_of', terms: [{ type: 'minecraft:survives_explosion' }, { type: 'minecraft:table_bonus', chances: [0.06, 0.075, 0.1, 0.12], enchantment: 'minecraft:fortune' }] },
                  name: id(sapling),
                },
              ],
            },
          ],
        },
        {
          rolls: 1,
          condition: notShears,
          entries: [
            {
              type: 'minecraft:item',
              condition: { type: 'minecraft:table_bonus', chances: [0.04, 0.044, 0.05, 0.066, 0.2], enchantment: 'minecraft:fortune' },
              modifier: [{ type: 'minecraft:set_count', count: { type: 'minecraft:uniform', max: 2, min: 1 } }, { type: 'minecraft:explosion_decay' }],
              name: 'minecraft:stick',
            },
          ],
        },
        ...(t.id === 'ginkgo'
          ? [{ rolls: 1, condition: notShears, entries: [{ type: 'minecraft:item', condition: { type: 'minecraft:random_chance', chance: 0.08 }, name: id('ginkgo_nut') }] }]
          : []),
      ],
      random_sequence: id(`blocks/${leaves}`),
    });

    name(log, `${t.name} Log`);
    name(planks, `${t.name} Planks`);
    name(leaves, `${t.name} Leaves`);
    name(sapling, `${t.name} Sapling`);
    for (const [k, v] of [
      ['block:minecraft:logs', log], ['block:minecraft:logs_that_burn', log], ['item:minecraft:logs', log], ['item:minecraft:logs_that_burn', log],
      ['block:minecraft:mineable/axe', log], ['block:minecraft:mineable/axe', planks],
      ['block:minecraft:planks', planks], ['item:minecraft:planks', planks],
      ['block:minecraft:leaves', leaves], ['item:minecraft:leaves', leaves], ['block:minecraft:mineable/hoe', leaves],
      ['block:minecraft:saplings', sapling], ['item:minecraft:saplings', sapling],
    ] as const)
      tag(k, id(v));

    // planks recipe
    out.json(`data/${MOD}/recipe/${planks}.json`, { type: 'minecraft:crafting_shapeless', category: 'building', group: 'planks', ingredients: [id(log)], result: { count: 4, id: id(planks) } });

    // tree structures + worldgen
    for (let i = 0; i < TREE_VARIANTS; i++) out.write(`data/${MOD}/structure/${t.id}_${i}.nbt`, javaTree(t.id, 1000 + i * 37 + t.id.length));
    out.json(`data/${MOD}/worldgen/feature/${t.id}_tree.json`, { type: id('structure_tree'), structures: Array.from({ length: TREE_VARIANTS }, (_, i) => id(`${t.id}_${i}`)) });
    out.json(`data/${MOD}/worldgen/placed_feature/${t.id}_tree.json`, {
      feature: id(`${t.id}_tree`),
      placement: [
        { type: 'minecraft:rarity_filter', chance: TREE_BIOMES[t.id].chance },
        { type: 'minecraft:in_square' },
        { type: 'minecraft:heightmap', heightmap: 'WORLD_SURFACE_WG' },
        { type: 'minecraft:biome' },
      ],
    });
  }

  // ---- fossils and amber
  const mineral = (blockId: string, enName: string) => {
    tex(`dino_${blockId}`, blockId);
    simpleState(blockId);
    out.json(`assets/${MOD}/models/block/${blockId}.json`, cubeAll(blockId));
    blockItem(blockId, id(`block/${blockId}`));
    name(blockId, enName);
    tag('block:minecraft:mineable/pickaxe', id(blockId));
  };
  mineral('fossil_block', 'Fossil Block');
  mineral('amber_ore', 'Amber Ore');
  mineral('deepslate_amber_ore', 'Deepslate Amber Ore');
  tag('block:minecraft:needs_stone_tool', id('amber_ore'));
  tag('block:minecraft:needs_stone_tool', id('deepslate_amber_ore'));
  const silk = (self: string, drop: unknown) => ({
    type: 'minecraft:block',
    pools: [{ rolls: 1, entries: [{ type: 'minecraft:alternatives', children: [{ type: 'minecraft:item', condition: 'minecraft:tool/can_silk_touch', name: id(self) }, drop] }] }],
    random_sequence: id(`blocks/${self}`),
  });
  for (const ore of ['amber_ore', 'deepslate_amber_ore'])
    out.json(
      `data/${MOD}/loot_table/blocks/${ore}.json`,
      silk(ore, {
        type: 'minecraft:alternatives',
        children: [
          { type: 'minecraft:item', condition: { type: 'minecraft:random_chance', chance: ore === 'amber_ore' ? 1 / 13 : 1 / 9 }, name: id('amber_mosquito') },
          { type: 'minecraft:item', modifier: [{ type: 'minecraft:apply_bonus', enchantment: 'minecraft:fortune', formula: 'minecraft:ore_drops' }, { type: 'minecraft:explosion_decay' }], name: id('amber') },
        ],
      }),
    );
  out.json(
    `data/${MOD}/loot_table/blocks/fossil_block.json`,
    silk('fossil_block', { type: 'minecraft:item', modifier: [{ type: 'minecraft:set_count', count: { type: 'minecraft:uniform', min: 1, max: 3 } }, { type: 'minecraft:explosion_decay' }], name: id('fossil_fragment') }),
  );
  const oreTarget = (tagName: string) => ({ predicate_type: 'minecraft:tag_match', tag: tagName });
  out.json(`data/${MOD}/worldgen/feature/amber_ore.json`, {
    type: 'minecraft:ore',
    discard_chance_on_air_exposure: 0.0,
    size: 5,
    targets: [
      { state: id('amber_ore'), target: oreTarget('minecraft:stone_ore_replaceables') },
      { state: id('deepslate_amber_ore'), target: oreTarget('minecraft:deepslate_ore_replaceables') },
    ],
  });
  out.json(`data/${MOD}/worldgen/feature/fossil_block.json`, {
    type: 'minecraft:ore',
    discard_chance_on_air_exposure: 0.0,
    size: 7,
    targets: [{ state: id('fossil_block'), target: oreTarget('minecraft:stone_ore_replaceables') }],
  });
  const orePlaced = (feature: string, count: number, min: number, max: number) => ({
    feature: id(feature),
    placement: [
      { type: 'minecraft:count', count },
      { type: 'minecraft:in_square' },
      { type: 'minecraft:height_range', height: { type: 'minecraft:uniform', max_inclusive: { absolute: max }, min_inclusive: { absolute: min } } },
      { type: 'minecraft:biome' },
    ],
  });
  out.json(`data/${MOD}/worldgen/placed_feature/amber_ore.json`, orePlaced('amber_ore', 6, -40, 70));
  out.json(`data/${MOD}/worldgen/placed_feature/fossil_block.json`, orePlaced('fossil_block', 3, -10, 60));

  // ---- tags
  for (const [k, values] of Object.entries(tags)) {
    const [kind, ns, ...rest] = k.split(':');
    const path = rest.join(':');
    out.json(`data/${ns}/tags/${kind}/${path}.json`, { replace: false, values: [...new Set(values)] });
  }

  // ---- recipes (food, materials, field guide)
  const cook = (type: string, file: string, time: number) =>
    out.json(`data/${MOD}/recipe/${file}.json`, { type: `minecraft:${type}`, category: 'food', cookingtime: time, experience: 0.35, ingredient: id('raw_dino_meat'), result: { id: id('cooked_dino_meat') } });
  cook('smelting', 'cooked_dino_meat', 200);
  cook('smoking', 'cooked_dino_meat_from_smoking', 100);
  cook('campfire_cooking', 'cooked_dino_meat_from_campfire_cooking', 600);
  out.json(`data/${MOD}/recipe/saddle_from_hide.json`, { type: 'minecraft:crafting_shaped', category: 'misc', key: { H: id('dino_hide'), I: 'minecraft:iron_ingot' }, pattern: ['HHH', 'HIH'], result: { count: 1, id: 'minecraft:saddle' } });
  out.json(`data/${MOD}/recipe/leather_from_hide.json`, { type: 'minecraft:crafting_shapeless', category: 'misc', ingredients: [id('dino_hide')], result: { count: 2, id: 'minecraft:leather' } });
  out.json(`data/${MOD}/recipe/field_guide.json`, { type: 'minecraft:crafting_shapeless', category: 'misc', group: 'field_guide', ingredients: ['minecraft:book', id('fern')], result: { count: 1, id: id('field_guide') } });
  out.json(`data/${MOD}/recipe/field_guide_from_fossil.json`, { type: 'minecraft:crafting_shapeless', category: 'misc', group: 'field_guide', ingredients: ['minecraft:book', id('fossil_fragment')], result: { count: 1, id: id('field_guide') } });
  out.json(`data/${MOD}/recipe/bone_meal_from_fossil.json`, { type: 'minecraft:crafting_shapeless', category: 'misc', group: 'bonemeal', ingredients: [id('fossil_fragment')], result: { count: 3, id: 'minecraft:bone_meal' } });

  out.json(`${MOD}/blocks.json`, javaBlockSpec());
}
