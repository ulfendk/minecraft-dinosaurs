// Java resources for the park & gear subsystem: electric fence, fence generator,
// electric prod, tranquilizer rifle and darts (models, blockstates, recipes, loot, lang).
import { fenceTextures, generatorTextures } from '../../data/park.js';
import { DA_GAME_NAMES } from '../../data/i18n/game.js';
import type { JavaCtx } from './subsystems.js';

const MOD = 'dinosaurs';
const WIRE_YS = [4, 10, 16, 21];

type Face = { uv: number[]; texture: string; cullface?: string };
const faces = (side: number[], end: number[]): Record<string, Face> => ({
  north: { uv: side, texture: '#fence' },
  south: { uv: side, texture: '#fence' },
  east: { uv: side, texture: '#fence' },
  west: { uv: side, texture: '#fence' },
  up: { uv: end, texture: '#fence' },
  down: { uv: end, texture: '#fence' },
});

/** Post with insulators and a cap; 24 px tall to match the 1.5-block collision. */
const POST = {
  textures: { particle: '#fence' },
  elements: [
    { from: [6, 0, 6], to: [10, 24, 10], faces: faces([0, 1, 4, 16], [4, 1, 8, 5]) },
    ...WIRE_YS.map((y) => ({ from: [5.5, y - 0.5, 5.5], to: [10.5, y + 1.5, 10.5], faces: faces([8, 1, 12, 3], [8, 3, 12, 7]) })),
    { from: [5, 24, 5], to: [11, 26, 11], faces: faces([12, 1, 16, 3], [12, 3, 16, 7]) },
  ],
};

/** Wires running from the post to the north edge (rotated by the blockstate for other sides). */
const SIDE = {
  textures: { particle: '#fence' },
  elements: WIRE_YS.map((y) => ({ from: [7.5, y, 0], to: [8.5, y + 1, 6], faces: faces([0, 0, 16, 1], [0, 0, 16, 1]) })),
};

export async function emitJavaGear({ out, en, da }: JavaCtx) {
  // ---- textures
  const ft = fenceTextures();
  const gt = generatorTextures();
  out.png(`assets/${MOD}/textures/block/electric_fence.png`, ft.off);
  out.png(`assets/${MOD}/textures/block/electric_fence_on.png`, ft.on);
  out.png(`assets/${MOD}/textures/block/fence_generator_side.png`, gt.side);
  out.png(`assets/${MOD}/textures/block/fence_generator_side_on.png`, gt.sideOn);
  out.png(`assets/${MOD}/textures/block/fence_generator_top.png`, gt.top);

  // ---- electric fence models + multipart blockstate
  out.json(`assets/${MOD}/models/block/template_electric_fence_post.json`, POST);
  out.json(`assets/${MOD}/models/block/template_electric_fence_side.json`, SIDE);
  for (const [suffix, tex] of [['', 'electric_fence'], ['_on', 'electric_fence_on']]) {
    out.json(`assets/${MOD}/models/block/electric_fence_post${suffix}.json`, { parent: `${MOD}:block/template_electric_fence_post`, textures: { fence: `${MOD}:block/${tex}` } });
    out.json(`assets/${MOD}/models/block/electric_fence_side${suffix}.json`, { parent: `${MOD}:block/template_electric_fence_side`, textures: { fence: `${MOD}:block/${tex}` } });
  }
  out.json(`assets/${MOD}/models/block/electric_fence_inventory.json`, {
    textures: { fence: `${MOD}:block/electric_fence`, particle: `${MOD}:block/electric_fence` },
    elements: [
      ...POST.elements,
      ...SIDE.elements,
      ...SIDE.elements.map((e) => ({ ...e, from: [e.from[0], e.from[1], 10], to: [e.to[0], e.to[1], 16] })),
    ],
    display: { gui: { rotation: [30, 135, 0], translation: [0, -2, 0], scale: [0.55, 0.55, 0.55] } },
  });
  const multipart: unknown[] = [];
  for (const powered of [false, true]) {
    const s = powered ? '_on' : '';
    multipart.push({ when: { powered: String(powered) }, apply: { model: `${MOD}:block/electric_fence_post${s}` } });
    for (const [dir, y] of [['north', 0], ['east', 90], ['south', 180], ['west', 270]] as const)
      multipart.push({ when: { [dir]: 'true', powered: String(powered) }, apply: { model: `${MOD}:block/electric_fence_side${s}`, ...(y ? { y } : {}) } });
  }
  out.json(`assets/${MOD}/blockstates/electric_fence.json`, { multipart });
  out.json(`assets/${MOD}/items/electric_fence.json`, { model: { type: 'minecraft:model', model: `${MOD}:block/electric_fence_inventory` } });

  // ---- fence generator
  for (const [suffix, side] of [['', 'fence_generator_side'], ['_on', 'fence_generator_side_on']])
    out.json(`assets/${MOD}/models/block/fence_generator${suffix}.json`, {
      parent: 'minecraft:block/cube_bottom_top',
      textures: { side: `${MOD}:block/${side}`, top: `${MOD}:block/fence_generator_top`, bottom: `${MOD}:block/fence_generator_top` },
    });
  const variants: Record<string, unknown> = {};
  for (const on of [false, true]) for (const powered of [false, true]) variants[`on=${on},powered=${powered}`] = { model: `${MOD}:block/fence_generator${on ? '_on' : ''}` };
  out.json(`assets/${MOD}/blockstates/fence_generator.json`, { variants });
  out.json(`assets/${MOD}/items/fence_generator.json`, { model: { type: 'minecraft:model', model: `${MOD}:block/fence_generator` } });

  // ---- block loot (vanilla 26.3 format)
  for (const id of ['electric_fence', 'fence_generator'])
    out.json(`data/${MOD}/loot_table/blocks/${id}.json`, {
      type: 'minecraft:block',
      pools: [{ condition: { type: 'minecraft:survives_explosion' }, entries: [{ type: 'minecraft:item', name: `${MOD}:${id}` }], rolls: 1 }],
      random_sequence: `${MOD}:blocks/${id}`,
    });

  // ---- recipes (same as Bedrock)
  const shaped = (id: string, pattern: string[], key: Record<string, string>, count = 1) =>
    out.json(`data/${MOD}/recipe/${id}.json`, { type: 'minecraft:crafting_shaped', category: 'equipment', key, pattern, result: { count, id: `${MOD}:${id}` } });
  shaped('electric_fence', ['ICI', 'IRI', 'ICI'], { I: 'minecraft:iron_ingot', C: 'minecraft:copper_ingot', R: 'minecraft:redstone' }, 4);
  shaped('fence_generator', ['IRI', 'RCR', 'IRI'], { I: 'minecraft:iron_ingot', R: 'minecraft:redstone_block', C: 'minecraft:copper_block' });
  shaped('electric_prod', ['  C', ' R ', 'I  '], { C: 'minecraft:copper_ingot', R: 'minecraft:redstone_block', I: 'minecraft:iron_ingot' });
  shaped('tranquilizer_rifle', ['III', ' TS', '  S'], { I: 'minecraft:iron_ingot', T: 'minecraft:tripwire_hook', S: 'minecraft:stick' });
  out.json(`data/${MOD}/recipe/tranq_dart.json`, {
    type: 'minecraft:crafting_shapeless',
    category: 'equipment',
    ingredients: ['minecraft:arrow', 'minecraft:arrow', 'minecraft:arrow', 'minecraft:arrow', 'minecraft:fermented_spider_eye'],
    result: { count: 4, id: `${MOD}:tranq_dart` },
  });

  // ---- lang
  const names: Record<string, [string, string]> = {
    'block.dinosaurs.electric_fence': ['Electric Fence', DA_GAME_NAMES.electric_fence ?? 'Elektrisk hegn'],
    'block.dinosaurs.fence_generator': ['Fence Generator', DA_GAME_NAMES.fence_generator ?? 'Hegnsgenerator'],
    'entity.dinosaurs.tranq_dart': ['Tranquilizer Dart', DA_GAME_NAMES.tranq_dart ?? 'Bedøvelsespil'],
  };
  for (const [k, [e, d]] of Object.entries(names)) {
    en[k] = e;
    da[k] = d;
  }
}
