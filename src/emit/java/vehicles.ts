// Java resources for the park vehicles: GeckoLib models/animations/textures, a spec
// file the Java code reads, placer item assets, recipes and names.
import { ICONS } from '../../data/icons.js';
import { DA_GAME_NAMES } from '../../data/i18n/game.js';
import { VEHICLES } from '../../data/park.js';
import { toGeoJson } from '../../model/geo.js';
import { vehicleAssets, vehicleSeats } from '../bedrock/vehicles.js';
import type { JavaCtx } from './subsystems.js';

const MOD = 'dinosaurs';
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Bedrock recipes (src/emit/bedrock/world.ts) in Java 26.3 crafting JSON. */
const RECIPES: Record<string, { pattern: string[]; key: Record<string, string> }> = {
  safari_truck: { pattern: ['  G', 'IHI', 'C C'], key: { G: 'minecraft:glass_pane', I: 'minecraft:iron_block', H: `${MOD}:dino_hide`, C: 'minecraft:coal_block' } },
  tour_car: { pattern: ['GGG', 'IHI', 'C C'], key: { G: 'minecraft:glass_pane', I: 'minecraft:iron_block', H: `${MOD}:dino_hide`, C: 'minecraft:coal_block' } },
  gyrosphere: { pattern: ['GGG', 'GIG', 'GGG'], key: { G: 'minecraft:glass', I: 'minecraft:iron_block' } },
};

export async function emitJavaVehicles({ out, en, da }: JavaCtx) {
  const specs = [];
  for (const v of VEHICLES) {
    const { model, texture } = vehicleAssets(v);
    out.json(`assets/${MOD}/geckolib/models/entity/${v.id}.geo.json`, toGeoJson(model, `geometry.${MOD}.${v.id}`, v.scale));
    out.png(`assets/${MOD}/textures/entity/${v.id}.png`, texture);

    // wheels / shell roll with the distance driven; the chassis bobs a little while moving
    const bones: Record<string, unknown> = {};
    for (const w of v.wheels) bones[w] = { rotation: ['variable.veh_dist * -95', 0, 0] };
    if (v.spinBone) bones[v.spinBone] = { rotation: ['variable.veh_dist * -60', 0, 0] };
    bones.chassis = { position: [0, 'math.sin(variable.veh_dist * 300) * 0.15 * math.min(1, variable.veh_speed * 4)', 0] };
    out.json(`assets/${MOD}/geckolib/animations/entity/${v.id}.animation.json`, {
      format_version: '1.8.0',
      animations: { [`animation.${MOD}.${v.id}.drive`]: { loop: true, bones } },
    });

    // placer item
    out.png(`assets/${MOD}/textures/item/${v.id}.png`, ICONS[v.id]());
    out.json(`assets/${MOD}/items/${v.id}.json`, { model: { type: 'minecraft:model', model: `${MOD}:item/${v.id}` } });
    out.json(`assets/${MOD}/models/item/${v.id}.json`, { parent: 'minecraft:item/generated', textures: { layer0: `${MOD}:item/${v.id}` } });

    const rec = RECIPES[v.id];
    out.json(`data/${MOD}/recipe/${v.id}.json`, {
      type: 'minecraft:crafting_shaped',
      category: 'misc',
      key: rec.key,
      pattern: rec.pattern,
      result: { count: 1, id: `${MOD}:${v.id}` },
    });

    en[`entity.${MOD}.${v.id}`] = v.name;
    en[`item.${MOD}.${v.id}`] = v.name;
    da[`entity.${MOD}.${v.id}`] = DA_GAME_NAMES[v.id] ?? v.name;
    da[`item.${MOD}.${v.id}`] = DA_GAME_NAMES[v.id] ?? v.name;

    specs.push({
      id: v.id,
      scale: v.scale,
      width: r2(v.hitbox.width * v.scale),
      height: r2(v.hitbox.height * v.scale),
      speed: v.speed,
      health: v.health,
      // entity space, blocks, +z forward; a seated player's hips end up 0.15 above this point
      seats: vehicleSeats(v),
      translucent: true,
    });
  }
  out.json(`${MOD}/vehicles.json`, specs);
}
