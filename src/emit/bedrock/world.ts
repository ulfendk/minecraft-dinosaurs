// Emits everything that is not a creature: blocks, items, eggs, vehicles,
// recipes, world generation, textures atlases, language strings and scripts.
import path from 'node:path';
import esbuild from 'esbuild';
import type { Assembled } from '../../creatures/assemble.js';
import { PLANTS, TREES } from '../../data/plants.js';
import { toGeoJson } from '../../model/geo.js';
import type { OutDir } from '../writer.js';
import { buildBlocks, fenceGeometry } from './blocks.js';
import { FORMAT, NS } from './constants.js';
import { EGG_ANIMATION, eggBehavior, eggClient, eggLoot, eggModel, eggTexture } from './eggs.js';
import { buildItems, hasEgg } from './items.js';
import { VEHICLES, vehicleAnimation, vehicleAssets, vehicleBehavior, vehicleClient, vehicleLoot } from './vehicles.js';
import { emitWorldgen } from './worldgen.js';

export interface WorldCtx {
  bp: OutDir;
  rp: OutDir;
  lang: string[];
  sounds: Record<string, unknown>;
  assembled: Assembled[];
}

const shaped = (id: string, pattern: string[], key: Record<string, string>, result: string, count = 1, tags = ['crafting_table']) => ({
  format_version: FORMAT.recipe,
  'minecraft:recipe_shaped': {
    description: { identifier: `${NS}:${id}` },
    tags,
    pattern,
    key: Object.fromEntries(Object.entries(key).map(([k, v]) => [k, { item: v }])),
    result: { item: result, count },
  },
});
const shapeless = (id: string, ingredients: string[], result: string, count = 1) => ({
  format_version: FORMAT.recipe,
  'minecraft:recipe_shapeless': { description: { identifier: `${NS}:${id}` }, tags: ['crafting_table'], ingredients: ingredients.map((item) => ({ item })), result: { item: result, count } },
});
const smelt = (id: string, input: string, output: string) => ({
  format_version: FORMAT.recipe,
  'minecraft:recipe_furnace': { description: { identifier: `${NS}:${id}` }, tags: ['furnace', 'smoker', 'campfire', 'soul_campfire'], input, output },
});

export async function emitWorld({ bp, rp, lang, assembled }: WorldCtx) {
  const terrain: Record<string, { textures: string }> = {};
  const itemTex: Record<string, { textures: string }> = {};
  const blockSounds: Record<string, unknown> = { format_version: [1, 1, 0] };

  // ---- blocks
  for (const b of buildBlocks()) {
    bp.json(`blocks/${b.id}.json`, b.json);
    for (const [key, png] of Object.entries(b.textures)) {
      rp.png(`textures/blocks/dino/${key}.png`, png);
      terrain[key] = { textures: `textures/blocks/dino/${key}` };
    }
    if (b.loot) bp.json(`loot_tables/blocks/${b.id}.json`, b.loot);
    blockSounds[`${NS}:${b.id}`] = { sound: b.sound };
    lang.push(`tile.${NS}:${b.id}.name=${b.name}`);
  }
  bp.json('loot_tables/empty.json', { pools: [] });
  rp.json('models/blocks/dino/electric_fence.geo.json', fenceGeometry());

  // ---- items
  for (const it of buildItems(assembled)) {
    bp.json(`items/${it.id}.json`, it.json);
    rp.png(`textures/items/dino/${it.id}.png`, it.icon);
    itemTex[`${NS}_${it.id}`] = { textures: `textures/items/dino/${it.id}` };
    lang.push(`item.${NS}:${it.id}.name=${it.name}`);
  }

  // ---- eggs (entities)
  rp.json('models/entity/dino/egg.geo.json', toGeoJson(eggModel('egg'), 'geometry.dino.egg'));
  rp.json('animations/dino/egg.animation.json', EGG_ANIMATION);
  for (const x of assembled.filter(hasEgg)) {
    const id = `egg_${x.def.id}`;
    bp.json(`entities/${id}.json`, eggBehavior(x));
    bp.json(`loot_tables/entities/${id}.json`, eggLoot(x));
    rp.json(`entity/dino/${id}.entity.json`, eggClient(x));
    rp.png(`textures/entity/dino/${id}.png`, eggTexture(x));
    lang.push(`entity.${NS}:${id}.name=${x.def.name} Egg`);
  }

  // ---- vehicles
  for (const v of VEHICLES) {
    const { model, texture } = vehicleAssets(v);
    bp.json(`entities/${v.id}.json`, vehicleBehavior(v));
    bp.json(`loot_tables/entities/${v.id}.json`, vehicleLoot(v));
    rp.json(`entity/dino/${v.id}.entity.json`, vehicleClient(v));
    rp.json(`models/entity/dino/${v.id}.geo.json`, toGeoJson(model, `geometry.dino.${v.id}`, v.scale));
    rp.json(`animations/dino/${v.id}.animation.json`, vehicleAnimation(v));
    rp.png(`textures/entity/dino/${v.id}.png`, texture);
    lang.push(`entity.${NS}:${v.id}.name=${v.name}`);
  }

  // ---- recipes
  const r = (id: string, data: unknown) => bp.json(`recipes/${id}.json`, data);
  for (const t of TREES) {
    r(`${t.id}_planks`, shapeless(`${t.id}_planks`, [`${NS}:${t.id}_log`], `${NS}:${t.id}_planks`, 4));
    r(`${t.id}_sticks`, shaped(`${t.id}_sticks`, ['P', 'P'], { P: `${NS}:${t.id}_planks` }, 'minecraft:stick', 4));
    r(`${t.id}_crafting_table`, shaped(`${t.id}_crafting_table`, ['PP', 'PP'], { P: `${NS}:${t.id}_planks` }, 'minecraft:crafting_table'));
  }
  r('cooked_dino_meat', smelt('cooked_dino_meat', `${NS}:raw_dino_meat`, `${NS}:cooked_dino_meat`));
  r('saddle_from_hide', shaped('saddle_from_hide', ['HHH', 'HIH'], { H: `${NS}:dino_hide`, I: 'minecraft:iron_ingot' }, 'minecraft:saddle'));
  r('leather_from_hide', shapeless('leather_from_hide', [`${NS}:dino_hide`], 'minecraft:leather', 2));
  r('field_guide', shapeless('field_guide', ['minecraft:book', `${NS}:fern`], `${NS}:field_guide`));
  r('field_guide_alt', shapeless('field_guide_alt', ['minecraft:book', `${NS}:fossil_fragment`], `${NS}:field_guide`));
  r('bone_meal_from_fossil', shapeless('bone_meal_from_fossil', [`${NS}:fossil_fragment`], 'minecraft:bone_meal', 3));
  r('electric_fence', shaped('electric_fence', ['ICI', 'IRI', 'ICI'], { I: 'minecraft:iron_ingot', C: 'minecraft:copper_ingot', R: 'minecraft:redstone' }, `${NS}:electric_fence`, 4));
  r('fence_generator', shaped('fence_generator', ['IRI', 'RCR', 'IRI'], { I: 'minecraft:iron_ingot', R: 'minecraft:redstone_block', C: 'minecraft:copper_block' }, `${NS}:fence_generator`));
  r('safari_truck', shaped('safari_truck', ['  G', 'IHI', 'C C'], { G: 'minecraft:glass_pane', I: 'minecraft:iron_block', H: `${NS}:dino_hide`, C: 'minecraft:coal_block' }, `${NS}:safari_truck`));
  r('tour_car', shaped('tour_car', ['GGG', 'IHI', 'C C'], { G: 'minecraft:glass_pane', I: 'minecraft:iron_block', H: `${NS}:dino_hide`, C: 'minecraft:coal_block' }, `${NS}:tour_car`));
  r('gyrosphere', shaped('gyrosphere', ['GGG', 'GIG', 'GGG'], { G: 'minecraft:glass', I: 'minecraft:iron_block' }, `${NS}:gyrosphere`));

  // ---- world generation
  const structures = emitWorldgen(bp, rp, lang);

  // ---- atlases + block sounds
  rp.json('textures/terrain_texture.json', { resource_pack_name: 'dinosaurs', texture_name: 'atlas.terrain', padding: 8, num_mip_levels: 4, texture_data: terrain });
  rp.json('textures/item_texture.json', { resource_pack_name: 'dinosaurs', texture_name: 'atlas.items', texture_data: itemTex });
  rp.json('blocks.json', blockSounds);

  // ---- scripts (bundled), with generated data the scripts need
  const data = {
    creatures: assembled.map((x) => ({
      id: x.def.id,
      name: x.def.name,
      info: x.def.info,
      period: x.def.period,
      diet: x.def.diet,
      group: x.def.group,
      lengthM: x.def.lengthM,
      temperament: x.def.temperament,
      tame: x.def.tame === 'egg' ? 'egg' : x.def.tame ? 'feed' : 'no',
      ride: x.def.ride?.mode ?? null,
      seats: x.def.ride?.seats ?? 0,
    })),
    structures,
    plants: PLANTS.map((p) => ({ id: p.id, name: p.name, info: p.info })),
    trees: TREES.map((t) => ({ id: t.id, name: t.name, info: t.info })),
  };
  const result = await esbuild.build({
    entryPoints: [path.resolve('src/scripts/main.ts')],
    bundle: true,
    format: 'esm',
    target: 'es2022',
    platform: 'neutral',
    external: ['@minecraft/server', '@minecraft/server-ui'],
    define: { __DINO_DATA__: JSON.stringify(data) },
    write: false,
    legalComments: 'none',
  });
  bp.write('scripts/main.js', result.outputFiles[0].text);
}
