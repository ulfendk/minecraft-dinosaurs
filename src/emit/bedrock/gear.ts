// Park ranger gear: electric prod (melee shock), tranquilizer rifle and darts.
import type { PNG } from 'pngjs';
import { ModelBuilder } from '../../model/builder.js';
import { toGeoJson } from '../../model/geo.js';
import { packUV } from '../../model/uv.js';
import { paint } from '../../texture/painter.js';
import { jitter, outline, sprite } from '../../texture/pixelart.js';
import { FORMAT, NS } from './constants.js';

export const SEDATED = 'dino:sedated';

const icon = (rows: string[], pal: Record<string, string>, seed: number) => outline(jitter(sprite(rows, pal), 0.04, seed));

export const GEAR_ICONS: Record<string, () => PNG> = {
  electric_prod: () =>
    icon(
      [
        '...........yy...',
        '..........yccy..',
        '..........cyyc..',
        '.........cccc...',
        '........kyk.....',
        '.......kyk......',
        '......kyk.......',
        '.....kyk........',
        '....kgk.........',
        '...kgrk.........',
        '..kggk..........',
        '.kgggk..........',
        '.kggk...........',
        '..kk............',
        '................',
        '................',
      ],
      { y: '#f2c94a', c: '#c8743a', k: '#2a2a2a', g: '#3e4a52', r: '#ff4a3a' },
      61,
    ),
  tranquilizer_rifle: () =>
    icon(
      [
        '................',
        '................',
        '................',
        '..........ss....',
        '.mmmmmmmmmsmmmm.',
        '.mMMMMMMMMMMMMMm',
        '.mmmmmmwwwmmmmm.',
        '.......wWw.t....',
        '......wWw..t....',
        '.....wWWw..tt...',
        '....wWWww.......',
        '...wWWw.........',
        '...www..........',
        '................',
        '................',
        '................',
      ],
      { m: '#3d4248', M: '#6b7178', s: '#1e1e1e', w: '#6b4a2b', W: '#8a6238', t: '#2a2a2a' },
      62,
    ),
  tranq_dart: () =>
    icon(
      [
        '................',
        '................',
        '..rr............',
        '..rRr...........',
        '...rRg..........',
        '....gGg.........',
        '.....gGg........',
        '......gGg.......',
        '.......gGg......',
        '........gGg.....',
        '.........gGs....',
        '..........ss....',
        '...........s....',
        '............s...',
        '................',
        '................',
      ],
      { r: '#c0392b', R: '#e74c3c', g: '#7fb8d8', G: '#cfeaf7', s: '#c8ccd0' },
      63,
    ),
};

const item = (id: string, category: string, components: Record<string, unknown>) => ({
  format_version: FORMAT.item,
  'minecraft:item': {
    description: { identifier: `${NS}:${id}`, menu_category: { category } },
    components: { 'minecraft:icon': { textures: { default: `${NS}_${id}` } }, 'minecraft:display_name': { value: `item.${NS}:${id}.name` }, ...components },
  },
});

export const GEAR_ITEMS: { id: string; name: string; json: unknown }[] = [
  {
    id: 'electric_prod',
    name: 'Electric Prod',
    json: item('electric_prod', 'equipment', {
      'minecraft:max_stack_size': 1,
      'minecraft:hand_equipped': true,
      'minecraft:damage': 4,
      'minecraft:durability': { max_durability: 250 },
      'minecraft:cooldown': { category: 'dino_prod', duration: 0.8 },
    }),
  },
  {
    id: 'tranquilizer_rifle',
    name: 'Tranquilizer Rifle',
    json: item('tranquilizer_rifle', 'equipment', {
      'minecraft:max_stack_size': 1,
      'minecraft:hand_equipped': true,
      'minecraft:durability': { max_durability: 384 },
      'minecraft:use_animation': 'crossbow',
      'minecraft:use_modifiers': { use_duration: 3600, movement_modifier: 0.6 },
      'minecraft:shooter': {
        ammunition: [{ item: `${NS}:tranq_dart`, use_offhand: true, search_inventory: true, use_in_creative: true }],
        max_draw_duration: 0.5,
        scale_power_by_draw_duration: false,
        charge_on_draw: false,
      },
    }),
  },
  {
    id: 'tranq_dart',
    name: 'Tranquilizer Dart',
    json: item('tranq_dart', 'equipment', { 'minecraft:max_stack_size': 64, 'minecraft:projectile': { projectile_entity: `${NS}:tranq_dart` } }),
  },
];

/** The flying dart entity. Hits are handled in scripts (sedation). */
export const DART_ENTITY = {
  format_version: FORMAT.entity,
  'minecraft:entity': {
    description: { identifier: `${NS}:tranq_dart`, is_spawnable: false, is_summonable: true },
    components: {
      'minecraft:type_family': { family: ['projectile', 'dino_dart'] },
      'minecraft:collision_box': { width: 0.25, height: 0.25 },
      'minecraft:physics': {},
      'minecraft:pushable_by_block': {},
      'minecraft:projectile': {
        anchor: 'eye_height',
        gravity: 0.02,
        power: 3.2,
        hit_sound: 'bow.hit',
        offset: [0, -0.1, 0],
        uncertainty_base: 1,
        uncertainty_multiplier: 0,
        on_hit: {
          impact_damage: { damage: { min: 1, max: 1 }, knockback: false, destroy_on_hit: true },
          stick_in_ground: { shake_time: 0.2 },
        },
      },
    },
  },
};

export function dartAssets() {
  const mb = new ModelBuilder('tranq_dart');
  mb.bone('root', undefined, [0, 0, 0]);
  const b = mb.bone('body', 'root', [0, 0, 0]);
  b.box([-0.5, -0.5, -5], [1, 1, 3], 'metal'); // needle
  b.box([-1, -1, -2], [2, 2, 5], 'glass'); // syringe barrel
  b.box([-1.5, -1.5, 3], [3, 3, 2], 'paint'); // red tuft
  const model = packUV(mb.build());
  const texture = paint(model, { back: '#c0392b', side: '#c0392b', belly: '#c0392b', accent: '#d03a2c', accent2: '#f05040' });
  // the glass barrel holds a coloured sedative instead of being clear
  for (let i = 3; i < texture.data.length; i += 4) texture.data[i] = 255;
  return {
    geo: toGeoJson(model, 'geometry.dino.tranq_dart'),
    texture,
    client: {
      format_version: FORMAT.clientEntity,
      'minecraft:client_entity': {
        description: {
          identifier: `${NS}:tranq_dart`,
          materials: { default: 'entity_alphatest' },
          textures: { default: 'textures/entity/dino/tranq_dart' },
          geometry: { default: 'geometry.dino.tranq_dart' },
          animations: { move: 'animation.dino.tranq_dart.move' },
          scripts: { animate: ['move'] },
          render_controllers: ['controller.render.dino.default'],
        },
      },
    },
    animation: {
      format_version: FORMAT.animation,
      animations: { 'animation.dino.tranq_dart.move': { loop: true, bones: { body: { rotation: ['-query.target_x_rotation', '-query.target_y_rotation', 0] } } } },
    },
  };
}
