import type { CreatureDef } from '../../data/types.js';
import { NS, FORMAT } from './constants.js';

type J = Record<string, any>;

/** Vanilla animals carnivores will hunt. */
const VANILLA_PREY = ['cow', 'pig', 'sheep', 'chicken', 'rabbit', 'goat', 'llama', 'horse', 'donkey', 'camel'];
const VANILLA_FISH = ['fish', 'salmon', 'cod', 'tropicalfish', 'squid', 'pufferfish'];

export interface EntityCtx {
  hitbox: { width: number; height: number };
  seat: { y: number; z: number };
  eggItem?: string;
}

const isFamily = (value: string, subject = 'other') => ({ test: 'is_family', subject, value });

export function behaviorEntity(c: CreatureDef, ctx: EntityCtx): J {
  const id = `${NS}:${c.id}`;
  const g: Record<string, J> = {};
  const big = ctx.hitbox.height > 3;
  const flyer = c.habitat === 'air';
  const swimmer = c.habitat === 'water';
  const amphibious = c.habitat === 'amphibious';
  const hunts = c.diet === 'carnivore' || c.diet === 'piscivore';
  const tameItems = c.tame && c.tame !== 'egg' ? c.tame.items : [];

  // ---------------------------------------------------------------- base
  const comp: J = {
    'minecraft:type_family': {
      family: [
        'prehistoric',
        c.id,
        c.diet,
        c.group,
        ...(c.group !== 'pterosaur' && c.group !== 'marine_reptile' && c.group !== 'fish' && c.group !== 'crocodilian' && c.group !== 'snake' && c.group !== 'synapsid' ? ['dinosaur'] : []),
        ...(c.prey ? ['dino_prey'] : []),
        big ? 'dino_large' : 'dino_small',
        'mob',
      ],
    },
    'minecraft:health': { value: c.health, max: c.health },
    'minecraft:movement': { value: c.speed },
    'minecraft:physics': {},
    'minecraft:pushable_by_entity': {},
    'minecraft:pushable_by_block': {},
    'minecraft:nameable': {},
    'minecraft:is_hidden_when_invisible': {},
    'minecraft:conditional_bandwidth_optimization': {},
    'minecraft:despawn': { despawn_from_distance: { min_distance: 48, max_distance: 128 } },
    'minecraft:hurt_on_condition': { damage_conditions: [{ filters: { test: 'in_lava', subject: 'self' }, cause: 'lava', damage_per_tick: 4 }] },
    'minecraft:ambient_sound_interval': { value: 10, range: 14, event_name: 'ambient' },
    'minecraft:healable': { items: c.food.map((item) => ({ item, heal_amount: 6 })) },
    'minecraft:spawn_egg_interaction': {},
    'minecraft:offspring': { offspring_pairs: { [id]: id } },
    'minecraft:behavior.look_at_player': { priority: 8, look_distance: 10, probability: 0.02 },
    'minecraft:behavior.random_look_around': { priority: 9 },
  };
  if (big) {
    comp['minecraft:knockback_resistance'] = { value: Math.min(1, ctx.hitbox.height / 8) };
    comp['minecraft:variable_max_auto_step'] = { base_value: 1.0625, controlled_value: 1.5625, jump_prevented_value: 0.5625 };
  }
  if (c.attack) {
    comp['minecraft:attack'] = { damage: c.attack };
    comp['minecraft:behavior.melee_box_attack'] = { priority: 3, speed_multiplier: 1.25, track_target: true };
  }

  if (flyer) {
    Object.assign(comp, {
      'minecraft:can_fly': {},
      'minecraft:movement.fly': {},
      'minecraft:navigation.fly': { can_path_from_air: true, can_path_over_water: true, avoid_damage_blocks: true },
      'minecraft:flying_speed': { value: Math.max(0.1, c.speed * 0.6) },
      'minecraft:jump.static': {},
      'minecraft:breathable': { total_supply: 15, suffocate_time: 0 },
      'minecraft:damage_sensor': { triggers: { cause: 'fall', deals_damage: 'no' } },
      'minecraft:behavior.float': { priority: 0 },
      'minecraft:behavior.random_fly': { priority: 6, xz_dist: 24, y_dist: 8, speed_multiplier: 1.0, can_land_on_trees: true },
    });
  } else if (swimmer) {
    Object.assign(comp, {
      'minecraft:underwater_movement': { value: Math.max(0.05, c.speed * 0.6) },
      'minecraft:movement.sway': { sway_amplitude: 0.0 },
      'minecraft:navigation.generic': { is_amphibious: false, can_path_over_water: false, can_swim: true, can_walk: false, can_breach: true, can_sink: false },
      'minecraft:breathable': { total_supply: 15, suffocate_time: 0, breathes_air: false, breathes_water: true },
      'minecraft:behavior.random_swim': { priority: 6, speed_multiplier: 1.2, xz_dist: 20, y_dist: 6, interval: 0 },
      'minecraft:behavior.swim_wander': { priority: 7, interval: 10, look_ahead: 2.0, speed_multiplier: 1.0, wander_time: 5.0 },
      'minecraft:behavior.swim_idle': { priority: 8, idle_time: 5, success_rate: 0.1 },
    });
    // marine reptiles breathe air in reality, but staying underwater plays better
  } else {
    Object.assign(comp, {
      'minecraft:movement.basic': {},
      'minecraft:jump.static': {},
      'minecraft:navigation.walk': { can_path_over_water: true, avoid_water: !amphibious, avoid_damage_blocks: true, can_swim: amphibious },
      'minecraft:breathable': { total_supply: amphibious ? 120 : 15, suffocate_time: 0 },
      'minecraft:behavior.float': { priority: 0 },
      'minecraft:behavior.random_stroll': { priority: 7, speed_multiplier: 0.9 },
    });
    if (amphibious) {
      comp['minecraft:underwater_movement'] = { value: c.speed * 0.8 };
      delete comp['minecraft:behavior.float'];
    }
  }

  // temperament
  if (c.temperament === 'passive' || c.temperament === 'skittish') {
    comp['minecraft:behavior.panic'] = { priority: 1, speed_multiplier: c.temperament === 'skittish' ? 1.6 : 1.3 };
  }
  if (c.temperament === 'skittish') {
    comp['minecraft:behavior.avoid_mob_type'] = {
      priority: 2,
      entity_types: [{ filters: { all_of: [isFamily('carnivore'), isFamily('dino_large')] }, max_dist: 14, walk_speed_multiplier: 1.3, sprint_speed_multiplier: 1.6 }],
    };
  }
  if (c.temperament === 'neutral' || c.temperament === 'aggressive') comp['minecraft:behavior.hurt_by_target'] = { priority: 2 };

  // ---------------------------------------------------------------- age
  const babyScale = c.ride || big ? 0.3 : 0.45;
  g['dino:baby'] = {
    'minecraft:is_baby': {},
    'minecraft:scale': { value: babyScale },
    'minecraft:collision_box': { width: round(Math.max(0.3, ctx.hitbox.width * babyScale)), height: round(Math.max(0.3, ctx.hitbox.height * babyScale)) },
    'minecraft:ageable': { duration: big ? 2400 : 1200, feed_items: c.food, grow_up: { event: 'dino:grow_up', target: 'self' } },
    'minecraft:behavior.follow_parent': { priority: 5, speed_multiplier: 1.1 },
  };
  g['dino:adult'] = {
    'minecraft:collision_box': { width: ctx.hitbox.width, height: ctx.hitbox.height },
    'minecraft:loot': { table: `loot_tables/entities/${c.id}.json` },
    'minecraft:experience_reward': { on_death: `query.last_hit_by_player ? ${Math.max(1, Math.round(c.health / 10))} : 0`, on_bred: 'Math.Random(1,7)' },
    'minecraft:breedable': { require_tame: false, breeds_with: { [id]: {} }, breed_items: c.food },
    'minecraft:behavior.breed': { priority: 4, speed_multiplier: 1.0 },
  };
  if (ctx.eggItem) {
    g['dino:adult']['minecraft:spawn_entity'] = {
      entities: [{ min_wait_time: 1200, max_wait_time: 2400, spawn_sound: 'plop', spawn_item: ctx.eggItem, filters: [{ test: 'rider_count', subject: 'self', operator: '==', value: 0 }] }],
    };
  }

  // ---------------------------------------------------------------- wild
  const wild: J = {
    'minecraft:leashable': { presets: [{ soft_distance: 4, hard_distance: 6, max_distance: 10 }] },
  };
  if (tameItems.length) {
    wild['minecraft:tameable'] = { probability: big ? 0.2 : 0.33, tame_items: tameItems, tame_event: { event: 'dino:on_tame', target: 'self' } };
    wild['minecraft:behavior.tempt'] = { priority: 5, speed_multiplier: 1.1, items: tameItems };
  }
  const targets: J[] = [];
  if (c.temperament === 'aggressive') targets.push({ filters: { all_of: [isFamily('player'), { test: 'is_sneaking', subject: 'other', value: false }] }, max_dist: big ? 24 : 16 }, { filters: isFamily('player'), max_dist: 6 });
  if (hunts && c.attack) {
    const prey = c.diet === 'piscivore' ? VANILLA_FISH : big ? [...VANILLA_PREY] : ['chicken', 'rabbit', 'sheep', 'pig'];
    targets.push({ filters: { any_of: prey.map((p) => isFamily(p)) }, max_dist: 16 });
    if (big) targets.push({ filters: { all_of: [isFamily('dino_prey'), { test: 'is_family', subject: 'other', operator: '!=', value: c.id }] }, max_dist: 20 });
  }
  if (targets.length) {
    wild['minecraft:behavior.nearest_attackable_target'] = { priority: 3, must_see: true, reselect_targets: true, within_radius: 24, entity_types: targets };
  }
  g['dino:wild'] = wild;
  // freshly hatched babies imprint on whoever placed the egg (scripts call tame()), or on the first feeder
  g['dino:hatchling'] = {
    'minecraft:tameable': { probability: 1.0, tame_items: c.food, tame_event: { event: 'dino:on_tame', target: 'self' } },
    'minecraft:leashable': { presets: [{ soft_distance: 4, hard_distance: 6, max_distance: 10 }] },
  };

  // ---------------------------------------------------------------- tame
  const tame: J = {
    'minecraft:is_tamed': {},
    'minecraft:sittable': {},
    'minecraft:leashable': { presets: [{ soft_distance: 4, hard_distance: 6, max_distance: 10 }] },
    'minecraft:behavior.stay_while_sitting': { priority: 1 },
    'minecraft:behavior.follow_owner': { priority: 5, speed_multiplier: 1.0, start_distance: big ? 16 : 10, stop_distance: big ? 6 : 3 },
  };
  if (c.attack) {
    tame['minecraft:behavior.owner_hurt_by_target'] = { priority: 2 };
    tame['minecraft:behavior.owner_hurt_target'] = { priority: 2 };
  }
  if (!big) tame['minecraft:behavior.teleport_to_owner'] = { priority: 1, filters: { test: 'owner_distance', operator: '>', value: 24 } };
  g['dino:tame'] = tame;

  // ---------------------------------------------------------------- riding
  if (c.ride) {
    const R = c.ride;
    g['dino:tame_adult_rideable'] = {
      'minecraft:interact': {
        interactions: [
          {
            on_interact: {
              filters: { all_of: [{ test: 'has_equipment', subject: 'other', domain: 'hand', value: 'saddle' }, { test: 'is_sneak_held', subject: 'other', value: false }] },
              event: 'dino:on_saddled',
              target: 'self',
            },
            use_item: true,
            swing: true,
            play_sounds: ['saddle'],
            interact_text: 'action.interact.saddle',
          },
        ],
      },
    };
    const seats = seatList(R.seats, ctx);
    const saddled: J = {
      'minecraft:is_saddled': {},
      'minecraft:rideable': {
        seat_count: R.seats,
        crouching_skip_interact: true,
        family_types: ['player'],
        interact_text: 'action.interact.ride.horse',
        ...(R.mode !== 'ground' ? { on_rider_enter_event: 'dino:on_mount', on_rider_exit_event: 'dino:on_dismount' } : {}),
        seats,
      },
      'minecraft:behavior.player_ride_tamed': { priority: 0 },
      'minecraft:interact': {
        interactions: [
          {
            on_interact: {
              filters: {
                all_of: [
                  { test: 'is_sneak_held', subject: 'other', value: false },
                  { test: 'has_equipment', subject: 'other', domain: 'hand', value: 'shears' },
                  { test: 'rider_count', subject: 'self', operator: 'equals', value: 0 },
                ],
              },
              event: 'dino:on_unsaddled',
              target: 'self',
            },
            hurt_item: 1,
            spawn_items: { table: 'loot_tables/entities/dino_saddle.json' },
            interact_text: 'action.interact.removesaddle',
            play_sounds: ['unsaddle'],
          },
        ],
      },
      'minecraft:loot': { table: `loot_tables/entities/${c.id}_saddled.json` },
    };
    if (R.mode === 'ground') {
      saddled['minecraft:input_ground_controlled'] = {};
      saddled['minecraft:can_power_jump'] = {};
      saddled['minecraft:horse.jump_strength'] = { value: R.jump ?? 0.7 };
    }
    g['dino:saddled'] = saddled;
    if (R.mode === 'fly') {
      g['dino:ridden_fly'] = {
        'minecraft:physics': { has_gravity: false },
        'minecraft:free_camera_controlled': { strafe_speed_modifier: 0.8, backwards_movement_modifier: 0.5 },
        'minecraft:vertical_movement_action': { vertical_velocity: 0.5 },
        'minecraft:flying_speed': { value: R.speed ?? 0.3 },
        'minecraft:movement': { value: R.speed ?? 0.3 },
      };
    }
    if (R.mode === 'swim') {
      g['dino:ridden_swim'] = {
        'minecraft:free_camera_controlled': { strafe_speed_modifier: 0.7, backwards_movement_modifier: 0.5 },
        'minecraft:dash_action': { cooldown_time: 2, horizontal_momentum: 60.0, vertical_momentum: 0.1, can_dash_underwater: true, direction: 'passenger' },
        'minecraft:underwater_mount_breathing': {},
        'minecraft:underwater_movement': { value: R.speed ?? 0.06 },
        'minecraft:movement': { value: 0.02 },
      };
    }
  }

  // ---------------------------------------------------------------- events
  const tameAdultGroups = c.ride ? ['dino:tame_adult_rideable'] : [];
  const events: J = {
    'minecraft:entity_spawned': {
      randomize: [
        { weight: 90, trigger: 'dino:spawn_adult' },
        { weight: 10, trigger: 'dino:spawn_baby' },
      ],
    },
    'dino:spawn_adult': { add: { component_groups: ['dino:adult', 'dino:wild'] } },
    'dino:spawn_baby': { add: { component_groups: ['dino:baby', 'dino:wild'] } },
    'minecraft:entity_born': { add: { component_groups: ['dino:baby', 'dino:tame'] } },
    'dino:hatch_egg': { remove: { component_groups: ['dino:adult', 'dino:wild'] }, add: { component_groups: ['dino:baby', 'dino:hatchling'] } },
    'dino:grow_up': {
      sequence: [
        { remove: { component_groups: ['dino:baby'] }, add: { component_groups: ['dino:adult'] } },
        ...(tameAdultGroups.length ? [{ filters: { test: 'has_component', value: 'minecraft:is_tamed' }, add: { component_groups: tameAdultGroups } }] : []),
      ],
    },
    'dino:on_tame': {
      sequence: [
        { remove: { component_groups: ['dino:wild', 'dino:hatchling'] }, add: { component_groups: ['dino:tame'] } },
        ...(tameAdultGroups.length ? [{ filters: { test: 'has_component', operator: '!=', value: 'minecraft:is_baby' }, add: { component_groups: tameAdultGroups } }] : []),
      ],
    },
  };
  if (c.ride) {
    events['dino:on_saddled'] = { remove: { component_groups: ['dino:tame_adult_rideable'] }, add: { component_groups: ['dino:saddled'] } };
    const rideGroup = c.ride.mode === 'fly' ? 'dino:ridden_fly' : c.ride.mode === 'swim' ? 'dino:ridden_swim' : undefined;
    events['dino:on_unsaddled'] = { remove: { component_groups: ['dino:saddled', ...(rideGroup ? [rideGroup] : [])] }, add: { component_groups: ['dino:tame_adult_rideable'] } };
    if (rideGroup) {
      events['dino:on_mount'] = { add: { component_groups: [rideGroup] } };
      events['dino:on_dismount'] = { remove: { component_groups: [rideGroup] } };
    }
  }

  const properties: J = { 'dino:sedated': { type: 'bool', default: false, client_sync: true } };
  huntingHooks(c, ctx, comp, g, events, properties, babyScale);

  return {
    format_version: FORMAT.entity,
    'minecraft:entity': {
      description: { identifier: id, properties, spawn_category: swimmer ? 'water_creature' : c.temperament === 'aggressive' ? 'monster' : 'creature', is_spawnable: true, is_summonable: true },
      component_groups: g,
      components: comp,
      events,
    },
  };
}

/** Realistic Hunting states, set by the hunting add-on's scripts (see src/hunting.ts). */
const HUNT = { calm: 0, alert: 1, flee: 2, wounded: 3, carcass: 4 };

/**
 * Realistic Hunting hooks. Nothing here does anything on its own: when the hunting add-on is
 * installed, its scripts set dino:hunt_state (spooked creatures run from hunters) and fire
 * dino:hunt_carcass when one is brought down. A carcass loses everything a living creature
 * does (AI and navigation, which live in the dino:hunt_alive group), lies still, can't be hurt
 * and rots away after 20 minutes unless it's field dressed with a knife.
 */
function huntingHooks(c: CreatureDef, ctx: EntityCtx, comp: J, g: Record<string, J>, events: J, properties: J, babyScale: number) {
  const state = 'dino:hunt_state';
  const stateIs = (operator: string, value: number) => ({ test: 'int_property', subject: 'self', domain: state, operator, value });
  properties[state] = { type: 'int', range: [0, 4], default: 0, client_sync: true };
  comp['minecraft:type_family'].family.push('hunting_target');

  // Spooked or wounded: run from hunters, their dogs and the place a shot came from.
  const avoid = comp['minecraft:behavior.avoid_mob_type'] ?? { priority: 1, entity_types: [] };
  avoid.priority = 1;
  avoid.remove_target = true;
  avoid.entity_types.push({
    filters: { all_of: [{ any_of: [isFamily('player'), isFamily('hunting_scare'), isFamily('hunting_dog')] }, stateIs('>=', HUNT.flee), stateIs('<=', HUNT.wounded)] },
    max_dist: 96,
    walk_speed_multiplier: 1.6,
    sprint_speed_multiplier: 1.8,
  });
  comp['minecraft:behavior.avoid_mob_type'] = avoid;

  const alive: J = {};
  for (const key of Object.keys(comp)) {
    if (/^minecraft:(behavior\.|navigation\.|ambient_sound_interval|healable)/.test(key)) {
      alive[key] = comp[key];
      delete comp[key];
    }
  }
  g['dino:hunt_alive'] = alive;
  // Gives creatures from before this version their dino:hunt_alive group.
  const navigation = Object.keys(alive).find((k) => k.startsWith('minecraft:navigation.'));
  if (navigation) {
    comp['minecraft:environment_sensor'] = {
      triggers: [{ filters: { all_of: [stateIs('!=', HUNT.carcass), { test: 'has_component', subject: 'self', operator: '!=', value: navigation }] }, event: 'dino:hunt_revive' }],
    };
  }
  const water = c.habitat === 'water';
  g['dino:hunt_carcass'] = {
    // The hunting add-on field dresses on interaction with a knife; this just shows the button.
    'minecraft:interact': { interactions: [{ on_interact: { event: 'dino:hunt_field_dress', target: 'self' }, swing: true, interact_text: 'action.interact.hunting.field_dress' }] },
    'minecraft:timer': { looping: false, time: 1200, time_down_event: { event: 'dino:hunt_rot', target: 'self' } },
    'minecraft:collision_box': { width: ctx.hitbox.width, height: ctx.hitbox.height },
    ...(water ? {
      'minecraft:buoyant': { base_buoyancy: 1.0, apply_gravity: true, liquid_blocks: ['minecraft:water', 'minecraft:flowing_water'] },
      'minecraft:breathable': { total_supply: 15, suffocate_time: 0, breathes_air: true, breathes_water: true },
    } : {}),
  };
  // A young creature stays small when it's a carcass.
  g['dino:hunt_young'] = {
    'minecraft:is_baby': {},
    'minecraft:scale': { value: babyScale },
    'minecraft:collision_box': { width: round(Math.max(0.3, ctx.hitbox.width * babyScale)), height: round(Math.max(0.3, ctx.hitbox.height * babyScale)) },
  };
  g['dino:hunt_despawn'] = { 'minecraft:instant_despawn': {} };
  g['dino:hunt_lured'] = {
    'minecraft:behavior.nearest_attackable_target': {
      priority: 2, must_see: false, reselect_targets: true, within_radius: 80,
      entity_types: [{ filters: isFamily('hunting_lure'), max_dist: 80 }],
    },
    'minecraft:behavior.move_towards_target': { priority: 2, speed_multiplier: 1.0, within_radius: 80 },
  };

  for (const e of ['dino:spawn_adult', 'dino:spawn_baby', 'minecraft:entity_born']) events[e].add.component_groups.unshift('dino:hunt_alive');
  const life = Object.keys(g).filter((k) => !['dino:hunt_carcass', 'dino:hunt_young', 'dino:hunt_despawn'].includes(k));
  events['dino:hunt_carcass'] = {
    sequence: [
      { filters: { test: 'is_baby', subject: 'self', value: true }, add: { component_groups: ['dino:hunt_young'] } },
      { remove: { component_groups: life }, add: { component_groups: ['dino:hunt_carcass'] }, set_property: { [state]: HUNT.carcass, 'dino:sedated': false } },
    ],
  };
  events['dino:hunt_revive'] = { add: { component_groups: ['dino:hunt_alive'] } };
  events['dino:hunt_field_dress'] = {};
  events['dino:hunt_rot'] = { add: { component_groups: ['dino:hunt_despawn'] } };
  events['dino:hunt_lure'] = { add: { component_groups: ['dino:hunt_lured'] } };
  events['dino:hunt_unlure'] = { remove: { component_groups: ['dino:hunt_lured'] } };
  const ds = comp['minecraft:damage_sensor'];
  const old = ds ? (Array.isArray(ds.triggers) ? ds.triggers : [ds.triggers]) : [];
  comp['minecraft:damage_sensor'] = { triggers: [{ on_damage: { filters: stateIs('==', HUNT.carcass) }, deals_damage: 'no' }, ...old] };
}

function seatList(n: number, ctx: EntityCtx) {
  const y = round(ctx.seat.y);
  if (n <= 1) return { position: [0, y, round(ctx.seat.z)], third_person_camera_radius: Math.max(4, Math.round(ctx.hitbox.height * 2.2)) };
  return Array.from({ length: n }, (_, i) => ({
    min_rider_count: 0,
    max_rider_count: n,
    // seat 0 (the rider who steers) is in front; entity space faces +z
    position: [0, y, round(ctx.seat.z + ((n - 1) / 2 - i) * 1.0)],
    third_person_camera_radius: Math.max(5, Math.round(ctx.hitbox.height * 2.2)),
  }));
}

const round = (v: number) => Math.round(v * 100) / 100;

/** Seat positions in entity space (blocks) for a rideable creature; used by previews. */
export function seatPositions(x: { def: CreatureDef; hitbox: EntityCtx['hitbox']; seat: EntityCtx['seat'] }): [number, number, number][] {
  if (!x.def.ride) return [];
  const s = seatList(x.def.ride.seats, { hitbox: x.hitbox, seat: x.seat });
  return (Array.isArray(s) ? s : [s]).map((p) => p.position as [number, number, number]);
}
