// Custom blocks: ancient plants, prehistoric trees, fossils/amber, electric fence + generator.
import type { PNG } from 'pngjs';
import { PLANTS, SOIL, TREES, amberOreTexture, fossilTexture, treeTextures } from '../../data/plants.js';
import { fenceTextures, generatorTextures } from '../../data/park.js';
import { FORMAT, NS } from './constants.js';

export interface BlockOut {
  id: string;
  name: string;
  json: unknown;
  textures: Record<string, PNG>; // terrain key → texture
  sound: string;
  loot?: unknown;
}

const block = (id: string, description: Record<string, unknown>, components: Record<string, unknown>, permutations?: unknown[]) => ({
  format_version: FORMAT.block,
  'minecraft:block': {
    description: { identifier: `${NS}:${id}`, ...description },
    components,
    ...(permutations ? { permutations } : {}),
  },
});

const display = (id: string) => ({ 'minecraft:display_name': `tile.${NS}:${id}.name` });
const selfLoot = (id: string) => ({ pools: [{ rolls: 1, entries: [{ type: 'item', name: `${NS}:${id}`, weight: 1 }] }] });

export function buildBlocks(): BlockOut[] {
  const out: BlockOut[] = [];

  // ---- plants (cross geometry)
  for (const p of PLANTS) {
    const key = `${NS}_${p.id}`;
    out.push({
      id: p.id,
      name: p.name,
      sound: 'grass',
      textures: { [key]: p.texture() },
      json: block(
        p.id,
        { menu_category: { category: 'nature', group: 'minecraft:itemGroup.name.flower' } },
        {
          ...display(p.id),
          'minecraft:geometry': 'minecraft:geometry.cross',
          'minecraft:material_instances': { '*': { texture: key, render_method: 'alpha_test', ambient_occlusion: 0, face_dimming: false } },
          'minecraft:collision_box': false,
          'minecraft:selection_box': { origin: [-6, 0, -6], size: [12, p.height, 12] },
          'minecraft:destructible_by_mining': { seconds_to_destroy: 0 },
          'minecraft:light_dampening': 0,
          'minecraft:flammable': { catch_chance_modifier: 60, destroy_chance_modifier: 100 },
          'minecraft:map_color': p.mapColor,
          'minecraft:placement_filter': { conditions: [{ allowed_faces: ['up'], block_filter: p.soil ?? SOIL }] },
          'minecraft:replaceable': {},
        },
      ),
    });
  }

  // ---- trees
  TREES.forEach((t, ti) => {
    const tex = treeTextures(t, 100 + ti * 10);
    const k = (s: string) => `${NS}_${t.id}_${s}`;
    // log (rotatable pillar)
    out.push({
      id: `${t.id}_log`,
      name: `${t.name} Log`,
      sound: 'wood',
      textures: { [k('log_side')]: tex.log_side, [k('log_top')]: tex.log_top },
      json: block(
        `${t.id}_log`,
        { menu_category: { category: 'nature', group: 'minecraft:itemGroup.name.log' }, traits: { 'minecraft:placement_position': { enabled_states: ['minecraft:block_face'] } } },
        {
          ...display(`${t.id}_log`),
          'minecraft:destructible_by_mining': { seconds_to_destroy: 2 },
          'minecraft:destructible_by_explosion': { explosion_resistance: 2 },
          'minecraft:flammable': { catch_chance_modifier: 5, destroy_chance_modifier: 5 },
          'minecraft:map_color': t.wood.bark,
          'minecraft:geometry': 'minecraft:geometry.full_block',
          'minecraft:material_instances': { '*': { texture: k('log_side') }, up: { texture: k('log_top') }, down: { texture: k('log_top') } },
          'minecraft:tags': ['minecraft:is_axe_item_destructible', 'dino:log'],
        },
        [
          { condition: "q.block_state('minecraft:block_face') == 'east' || q.block_state('minecraft:block_face') == 'west'", components: { 'minecraft:transformation': { rotation: [0, 0, 90] } } },
          { condition: "q.block_state('minecraft:block_face') == 'north' || q.block_state('minecraft:block_face') == 'south'", components: { 'minecraft:transformation': { rotation: [90, 0, 0] } } },
        ],
      ),
    });
    out.push({
      id: `${t.id}_planks`,
      name: `${t.name} Planks`,
      sound: 'wood',
      textures: { [k('planks')]: tex.planks },
      json: block(
        `${t.id}_planks`,
        { menu_category: { category: 'construction', group: 'minecraft:itemGroup.name.planks' } },
        {
          ...display(`${t.id}_planks`),
          'minecraft:destructible_by_mining': { seconds_to_destroy: 2 },
          'minecraft:destructible_by_explosion': { explosion_resistance: 3 },
          'minecraft:flammable': { catch_chance_modifier: 5, destroy_chance_modifier: 20 },
          'minecraft:map_color': t.wood.wood,
          'minecraft:geometry': 'minecraft:geometry.full_block',
          'minecraft:material_instances': { '*': { texture: k('planks') } },
          'minecraft:tags': ['minecraft:is_axe_item_destructible', 'dino:planks'],
        },
      ),
    });
    out.push({
      id: `${t.id}_leaves`,
      name: `${t.name} Leaves`,
      sound: 'grass',
      textures: { [k('leaves')]: tex.leaves },
      loot: {
        pools: [
          { rolls: 1, conditions: [{ condition: 'random_chance', chance: 0.06 }], entries: [{ type: 'item', name: `${NS}:${t.id}_sapling`, weight: 1 }] },
          { rolls: 1, conditions: [{ condition: 'random_chance', chance: 0.04 }], entries: [{ type: 'item', name: 'minecraft:stick', weight: 1 }] },
          ...(t.id === 'ginkgo' ? [{ rolls: 1, conditions: [{ condition: 'random_chance', chance: 0.08 }], entries: [{ type: 'item', name: `${NS}:ginkgo_nut`, weight: 1 }] }] : []),
        ],
      },
      json: block(
        `${t.id}_leaves`,
        { menu_category: { category: 'nature', group: 'minecraft:itemGroup.name.leaves' }, states: { 'dino:natural': ['no', 'yes'] } },
        {
          ...display(`${t.id}_leaves`),
          'minecraft:destructible_by_mining': { seconds_to_destroy: 0.3 },
          'minecraft:flammable': { catch_chance_modifier: 30, destroy_chance_modifier: 60 },
          'minecraft:map_color': t.leafColour,
          'minecraft:light_dampening': 1,
          'minecraft:geometry': { identifier: 'minecraft:geometry.full_block', culling_layer: 'minecraft:culling_layer.leaves' },
          'minecraft:material_instances': { '*': { texture: k('leaves'), render_method: 'alpha_test_single_sided' } },
          'minecraft:loot': `loot_tables/blocks/${t.id}_leaves.json`,
          'dino:leaves': {},
          'minecraft:tags': ['minecraft:is_hoe_item_destructible', 'dino:leaves'],
        },
      ),
    });
    out.push({
      id: `${t.id}_sapling`,
      name: `${t.name} Sapling`,
      sound: 'grass',
      textures: { [k('sapling')]: t.sapling() },
      json: block(
        `${t.id}_sapling`,
        { menu_category: { category: 'nature', group: 'minecraft:itemGroup.name.sapling' } },
        {
          ...display(`${t.id}_sapling`),
          'minecraft:geometry': 'minecraft:geometry.cross',
          'minecraft:material_instances': { '*': { texture: k('sapling'), render_method: 'alpha_test', ambient_occlusion: 0, face_dimming: false } },
          'minecraft:collision_box': false,
          'minecraft:selection_box': { origin: [-5, 0, -5], size: [10, 13, 10] },
          'minecraft:destructible_by_mining': { seconds_to_destroy: 0 },
          'minecraft:light_dampening': 0,
          'minecraft:placement_filter': { conditions: [{ allowed_faces: ['up'], block_filter: SOIL }] },
          'minecraft:map_color': t.mapColor,
          'dino:sapling': { tree: t.id },
        },
      ),
    });
  });

  // ---- minerals
  const mineral = (id: string, name: string, tex: PNG, loot: unknown, secs: number, map: string) =>
    out.push({
      id,
      name,
      sound: 'stone',
      textures: { [`${NS}_${id}`]: tex },
      loot,
      json: block(id, { menu_category: { category: 'nature', group: 'minecraft:itemGroup.name.ore' } }, {
        ...display(id),
        'minecraft:destructible_by_mining': { seconds_to_destroy: secs },
        'minecraft:destructible_by_explosion': { explosion_resistance: 6 },
        'minecraft:map_color': map,
        'minecraft:geometry': 'minecraft:geometry.full_block',
        'minecraft:material_instances': { '*': { texture: `${NS}_${id}` } },
        'minecraft:loot': `loot_tables/blocks/${id}.json`,
        'minecraft:tags': ['minecraft:is_pickaxe_item_destructible'],
      }),
    });
  mineral('fossil_block', 'Fossil Block', fossilTexture(), { pools: [{ rolls: 1, entries: [{ type: 'item', name: `${NS}:fossil_fragment`, weight: 1, functions: [{ function: 'set_count', count: { min: 1, max: 3 } }] }] }] }, 3, '#c9bfa8');
  mineral('amber_ore', 'Amber Ore', amberOreTexture(), { pools: [{ rolls: 1, entries: [{ type: 'item', name: `${NS}:amber`, weight: 12 }, { type: 'item', name: `${NS}:amber_mosquito`, weight: 1 }] }] }, 3, '#e09a20');
  mineral('deepslate_amber_ore', 'Deepslate Amber Ore', amberOreTexture(true), { pools: [{ rolls: 1, entries: [{ type: 'item', name: `${NS}:amber`, weight: 8 }, { type: 'item', name: `${NS}:amber_mosquito`, weight: 1 }] }] }, 4.5, '#b07a20');

  // ---- park: electric fence (2-block tall, connects like fences) and its generator
  const ft = fenceTextures();
  const fenceVis = {
    post: 1,
    cap: 1,
    wire_n: "q.block_state('minecraft:connection_north')",
    wire_e: "q.block_state('minecraft:connection_east')",
    wire_s: "q.block_state('minecraft:connection_south')",
    wire_w: "q.block_state('minecraft:connection_west')",
  };
  out.push({
    id: 'electric_fence',
    name: 'Electric Fence',
    sound: 'metal',
    textures: { [`${NS}_electric_fence`]: ft.off, [`${NS}_electric_fence_on`]: ft.on },
    loot: selfLoot('electric_fence'),
    json: block(
      'electric_fence',
      {
        menu_category: { category: 'construction' },
        states: { 'dino:powered': ['off', 'on'] },
        traits: { 'minecraft:connection': { enabled_states: ['minecraft:cardinal_connections'] } },
      },
      {
        ...display('electric_fence'),
        'minecraft:destructible_by_mining': { seconds_to_destroy: 4 },
        'minecraft:destructible_by_explosion': { explosion_resistance: 20 },
        'minecraft:map_color': '#5a5f66',
        'minecraft:geometry': { identifier: 'geometry.dino.electric_fence', bone_visibility: fenceVis },
        'minecraft:material_instances': { '*': { texture: `${NS}_electric_fence`, render_method: 'alpha_test' } },
        // 1.5 blocks tall like vanilla fences, so creatures cannot step over it
        'minecraft:collision_box': { origin: [-8, 0, -8], size: [16, 24, 16] },
        'minecraft:selection_box': { origin: [-3, 0, -3], size: [6, 16, 6] },
        'minecraft:connection_rule': { accepts_connections_from: 'all' },
        'minecraft:light_dampening': 0,
        'minecraft:loot': 'loot_tables/blocks/electric_fence.json',
        'dino:electric_fence': {},
      },
      [
        { condition: "q.block_state('dino:powered') == 'on'", components: { 'minecraft:material_instances': { '*': { texture: `${NS}_electric_fence_on`, render_method: 'alpha_test' } }, 'minecraft:light_emission': 4 } },
      ],
    ),
  });
  const gt = generatorTextures();
  out.push({
    id: 'fence_generator',
    name: 'Fence Generator',
    sound: 'metal',
    textures: { [`${NS}_generator_side`]: gt.side, [`${NS}_generator_top`]: gt.top, [`${NS}_generator_side_on`]: gt.sideOn },
    loot: selfLoot('fence_generator'),
    json: block(
      'fence_generator',
      { menu_category: { category: 'items' }, states: { 'dino:on': ['off', 'on'] } },
      {
        ...display('fence_generator'),
        'minecraft:destructible_by_mining': { seconds_to_destroy: 4 },
        'minecraft:destructible_by_explosion': { explosion_resistance: 20 },
        'minecraft:map_color': '#d0b020',
        'minecraft:geometry': 'minecraft:geometry.full_block',
        'minecraft:material_instances': { '*': { texture: `${NS}_generator_side` }, up: { texture: `${NS}_generator_top` }, down: { texture: `${NS}_generator_top` } },
        'minecraft:redstone_consumer': { min_power: 0 },
        'minecraft:loot': 'loot_tables/blocks/fence_generator.json',
        'dino:fence_generator': {},
      },
      [{ condition: "q.block_state('dino:on') == 'on'", components: { 'minecraft:material_instances': { '*': { texture: `${NS}_generator_side_on` }, up: { texture: `${NS}_generator_top` }, down: { texture: `${NS}_generator_top` } }, 'minecraft:light_emission': 7 } }],
    ),
  });
  return out;
}

/** Block geometry for the electric fence: post, top cap, and 3 wires per direction. */
export function fenceGeometry() {
  const wires = (name: string, size: number[], origins: number[][]) => ({ name, parent: 'root', pivot: [0, 0, 0], cubes: origins.map((o) => ({ origin: o, size, uv: { north: { uv: [0, 0], uv_size: [16, 1] }, south: { uv: [0, 0], uv_size: [16, 1] }, east: { uv: [0, 0], uv_size: [16, 1] }, west: { uv: [0, 0], uv_size: [16, 1] }, up: { uv: [0, 0], uv_size: [16, 1] }, down: { uv: [0, 0], uv_size: [16, 1] } } })) });
  const ys = [4, 10, 16, 21];
  const face = (u: number, v: number, w: number, h: number) => ({ uv: [u, v], uv_size: [w, h] });
  const post = {
    name: 'post',
    parent: 'root',
    pivot: [0, 0, 0],
    cubes: [{ origin: [-2, 0, -2], size: [4, 24, 4], uv: { north: face(0, 1, 4, 15), south: face(0, 1, 4, 15), east: face(0, 1, 4, 15), west: face(0, 1, 4, 15), up: face(4, 1, 4, 4), down: face(4, 1, 4, 4) } }],
  };
  // insulators on the post at each wire height
  for (const y of ys) post.cubes.push({ origin: [-2.5, y - 0.5, -2.5], size: [5, 2, 5], uv: { north: face(8, 1, 4, 2), south: face(8, 1, 4, 2), east: face(8, 1, 4, 2), west: face(8, 1, 4, 2), up: face(8, 3, 4, 4), down: face(8, 3, 4, 4) } } as any);
  return {
    format_version: '1.21.0',
    'minecraft:geometry': [
      {
        description: { identifier: 'geometry.dino.electric_fence', texture_width: 16, texture_height: 16 },
        bones: [
          { name: 'root', pivot: [0, 0, 0] },
          post,
          {
            name: 'cap',
            parent: 'root',
            pivot: [0, 0, 0],
            cubes: [{ origin: [-3, 24, -3], size: [6, 2, 6], uv: { north: face(12, 1, 4, 2), south: face(12, 1, 4, 2), east: face(12, 1, 4, 2), west: face(12, 1, 4, 2), up: face(12, 3, 4, 4), down: face(12, 3, 4, 4) } }],
          },
          wires('wire_n', [1, 1, 6], ys.map((y) => [-0.5, y, -8])),
          wires('wire_s', [1, 1, 6], ys.map((y) => [-0.5, y, 2])),
          wires('wire_e', [6, 1, 1], ys.map((y) => [2, y, -0.5])),
          wires('wire_w', [6, 1, 1], ys.map((y) => [-8, y, -0.5])),
        ],
      },
    ],
  };
}
