// Egg entities: placed from egg items, hatch after a few minutes (hatching is handled in scripts).
import type { Assembled } from '../../creatures/assemble.js';
import { ModelBuilder } from '../../model/builder.js';
import { packUV } from '../../model/uv.js';
import { paint } from '../../texture/painter.js';
import { eggColours } from '../../data/icons.js';
import { FORMAT, NS } from './constants.js';

/** Shared egg model (lightly egg-shaped from stacked boxes). */
export function eggModel(id: string) {
  const mb = new ModelBuilder(id);
  mb.bone('root', undefined, [0, 0, 0]);
  const e = mb.bone('egg', 'root', [0, 0, 0]);
  e.box([-2, 0, -2], [4, 1, 4], 'skin');
  e.box([-3, 1, -3], [6, 4, 6], 'skin');
  e.box([-2.5, 5, -2.5], [5, 2, 5], 'skin');
  e.box([-2, 7, -2], [4, 1, 4], 'skin');
  e.box([-1, 8, -1], [2, 1, 2], 'skin');
  return packUV(mb.build());
}

export function eggScale(x: Assembled) {
  return Math.round(Math.min(2.2, Math.max(0.6, 0.5 + x.def.lengthM / 12)) * 100) / 100;
}

export function eggTexture(x: Assembled) {
  const [base, spots] = eggColours(x.def.palette.side, x.def.palette.pattern?.colour ?? x.def.palette.back);
  const m = eggModel(`egg_${x.def.id}`);
  return paint(m, { back: base, side: base, belly: base, accent: base, pattern: { type: 'spots', colour: spots, scale: 1.6, coverage: 0.35, strength: 0.9 } });
}

export function eggBehavior(x: Assembled) {
  const s = eggScale(x);
  return {
    format_version: FORMAT.entity,
    'minecraft:entity': {
      description: { identifier: `${NS}:egg_${x.def.id}`, is_spawnable: false, is_summonable: true },
      components: {
        'minecraft:type_family': { family: ['dino_egg', 'inanimate'] },
        'minecraft:collision_box': { width: Math.round(0.45 * s * 100) / 100, height: Math.round(0.55 * s * 100) / 100 },
        'minecraft:health': { value: 4, max: 4 },
        'minecraft:physics': {},
        'minecraft:pushable_by_block': {},
        'minecraft:knockback_resistance': { value: 1 },
        'minecraft:nameable': {},
        'minecraft:persistent': {},
        'minecraft:loot': { table: `loot_tables/entities/egg_${x.def.id}.json` },
        'minecraft:damage_sensor': { triggers: [{ cause: 'fall', deals_damage: 'no' }] },
        'minecraft:timer': { looping: false, time: [240, 360], randomInterval: true, time_down_event: { event: 'dino:hatch', target: 'self' } },
      },
      events: { 'dino:hatch': {} },
    },
  };
}

export function eggLoot(x: Assembled) {
  return { pools: [{ rolls: 1, entries: [{ type: 'item', name: `${NS}:${x.def.id}_egg`, weight: 1 }] }] };
}

export function eggClient(x: Assembled) {
  return {
    format_version: FORMAT.clientEntity,
    'minecraft:client_entity': {
      description: {
        identifier: `${NS}:egg_${x.def.id}`,
        materials: { default: 'entity_alphatest' },
        textures: { default: `textures/entity/dino/egg_${x.def.id}` },
        geometry: { default: 'geometry.dino.egg' },
        animations: { wobble: 'animation.dino.egg.wobble' },
        scripts: { scale: String(eggScale(x)), animate: ['wobble'] },
        render_controllers: ['controller.render.dino.default'],
      },
    },
  };
}

export const EGG_ANIMATION = {
  format_version: FORMAT.animation,
  animations: {
    'animation.dino.egg.wobble': {
      loop: true,
      bones: { egg: { rotation: [0, 0, 'math.pow(math.max(0, math.sin(query.life_time * 40)), 12) * math.sin(query.life_time * 900) * 8'] } },
    },
  },
};
