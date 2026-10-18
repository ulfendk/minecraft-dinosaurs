// Drivable park vehicles (safari truck, tour car, gyrosphere).
import { VEHICLES, type VehicleDef } from '../../data/park.js';
import { packUV } from '../../model/uv.js';
import { paint } from '../../texture/painter.js';
import { FORMAT, NS } from './constants.js';

export function vehicleAssets(v: VehicleDef) {
  const model = packUV(v.build().build());
  const texture = paint(model, v.palette);
  return { model, texture };
}

export function vehicleBehavior(v: VehicleDef) {
  const seats = v.seatPos.map((p) => ({ min_rider_count: 0, max_rider_count: v.seats, position: p, third_person_camera_radius: 6 }));
  return {
    format_version: FORMAT.entity,
    'minecraft:entity': {
      description: { identifier: `${NS}:${v.id}`, is_spawnable: false, is_summonable: true },
      components: {
        'minecraft:type_family': { family: ['dino_vehicle', 'inanimate'] },
        'minecraft:collision_box': v.hitbox,
        'minecraft:health': { value: v.health, max: v.health },
        'minecraft:physics': {},
        'minecraft:pushable_by_block': {},
        'minecraft:knockback_resistance': { value: 1 },
        'minecraft:nameable': {},
        'minecraft:persistent': {},
        'minecraft:is_tamed': {},
        'minecraft:is_saddled': {},
        'minecraft:movement': { value: v.speed },
        'minecraft:movement.basic': {},
        'minecraft:jump.static': {},
        'minecraft:navigation.walk': { can_path_over_water: false, avoid_water: true },
        'minecraft:variable_max_auto_step': { base_value: 1.0625, controlled_value: 1.0625, jump_prevented_value: 0.5625 },
        'minecraft:input_ground_controlled': {},
        'minecraft:behavior.player_ride_tamed': { priority: 0 },
        'minecraft:rideable': { seat_count: v.seats, crouching_skip_interact: true, family_types: ['player'], interact_text: 'action.interact.ride.boat', seats },
        'minecraft:breathable': { breathes_air: true, breathes_water: true, suffocate_time: 0, total_supply: 15 },
        'minecraft:fire_immune': {},
        'minecraft:damage_sensor': {
          triggers: [
            { cause: 'fall', deals_damage: 'no' },
            { cause: 'drowning', deals_damage: 'no' },
            { cause: 'suffocation', deals_damage: 'no' },
          ],
        },
        'minecraft:loot': { table: `loot_tables/entities/${v.id}.json` },
        'minecraft:conditional_bandwidth_optimization': {},
      },
    },
  };
}

export function vehicleLoot(v: VehicleDef) {
  return { pools: [{ rolls: 1, entries: [{ type: 'item', name: `${NS}:${v.id}`, weight: 1 }] }] };
}

export function vehicleClient(v: VehicleDef) {
  return {
    format_version: FORMAT.clientEntity,
    'minecraft:client_entity': {
      description: {
        identifier: `${NS}:${v.id}`,
        materials: { default: 'entity_alphablend' },
        textures: { default: `textures/entity/dino/${v.id}` },
        geometry: { default: `geometry.dino.${v.id}` },
        animations: { drive: `animation.dino.${v.id}.drive` },
        scripts: { scale: String(v.scale), animate: ['drive'] },
        render_controllers: ['controller.render.dino.default'],
      },
    },
  };
}

export function vehicleAnimation(v: VehicleDef) {
  const bones: Record<string, unknown> = {};
  for (const w of v.wheels) bones[w] = { rotation: ['query.modified_distance_moved * -95', 0, 0] };
  if (v.spinBone) bones[v.spinBone] = { rotation: ['query.modified_distance_moved * -60', 0, 0] };
  bones.chassis = { position: [0, 'math.sin(query.modified_distance_moved * 300) * 0.15 * math.min(1, query.modified_move_speed * 4)', 0] };
  return { format_version: FORMAT.animation, animations: { [`animation.dino.${v.id}.drive`]: { loop: true, bones } } };
}

export { VEHICLES };
