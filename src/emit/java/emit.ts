// Generates the Java Edition (Fabric + GeckoLib) mod resources from the same data as
// the Bedrock packs. Output: java/src/generated/resources (gitignored).
import path from 'node:path';
import { assemble, type Assembled } from '../../creatures/assemble.js';
import { CREATURES } from '../../data/registry.js';
import type { SpawnBiome } from '../../data/types.js';
import { ICONS, eggColours, eggIcon } from '../../data/icons.js';
import { DA_GAME_NAMES, UI } from '../../data/i18n/game.js';
import { DA_INFO } from '../../data/i18n/da.js';
import { toGeoJson } from '../../model/geo.js';
import { clean, OutDir } from '../writer.js';
import { lootTable } from '../bedrock/creatureFiles.js';
import { seatPositions } from '../bedrock/entity.js';
import { GEAR_ICONS } from '../bedrock/gear.js';
import { mergedAnimation } from './anim.js';
import { eggModel, eggTexture } from '../bedrock/eggs.js';

export const JAVA_RES = path.resolve('java/src/generated/resources');
export const MOD = 'dinosaurs';

/** Biome selectors understood by the mod (#tag or biome key). */
const BIOMES: Record<SpawnBiome, string[]> = {
  prehistoric: ['#minecraft:is_jungle'],
  jungle: ['#minecraft:is_jungle'],
  swamp: ['minecraft:swamp', 'minecraft:mangrove_swamp'],
  savanna: ['#minecraft:is_savanna'],
  plains: ['minecraft:plains', 'minecraft:sunflower_plains', 'minecraft:meadow'],
  forest: ['#minecraft:is_forest'],
  taiga: ['#minecraft:is_taiga'],
  desert: ['minecraft:desert'],
  mesa: ['#minecraft:is_badlands'],
  mountain: ['#minecraft:is_mountain'],
  beach: ['#minecraft:is_beach'],
  river: ['#minecraft:is_river'],
  ocean: ['#minecraft:is_ocean'],
  warm_ocean: ['minecraft:warm_ocean', 'minecraft:lukewarm_ocean', 'minecraft:deep_lukewarm_ocean'],
  deep_ocean: ['#minecraft:is_deep_ocean'],
};

/** Bedrock sound event → Java sound event id. */
export function javaSound(bedrock: string | undefined): string | null {
  if (!bedrock) return null;
  const m = bedrock.match(/^mob\.([a-z_]+)\.([a-z_]+)$/);
  if (!m) return null;
  const [, mob, ev] = m;
  const kind = ({ say: 'ambient', idle: 'ambient', ambient: 'ambient', hurt: 'hurt', hit: 'hurt', death: 'death', step: 'step', hiss: 'hiss' } as Record<string, string>)[ev] ?? ev;
  return `minecraft:entity.${mob}.${kind}`;
}

const javaItem = (id: string) => id.replace(/^dino:/, `${MOD}:`);

/** The data the Java code reads at startup (resource: /dinosaurs/creatures.json). */
export function creatureSpec(x: Assembled) {
  const d = x.def;
  const big = x.hitbox.height > 3;
  return {
    id: d.id,
    name: d.name,
    group: d.group,
    diet: d.diet,
    temperament: d.temperament,
    habitat: d.habitat,
    scale: d.scale,
    width: x.hitbox.width,
    height: x.hitbox.height,
    big,
    health: d.health,
    attack: d.attack ?? 0,
    speed: d.speed,
    tame: d.tame === 'egg' ? 'egg' : d.tame ? 'feed' : 'none',
    tameItems: d.tame && d.tame !== 'egg' ? d.tame.items.map(javaItem) : [],
    food: d.food.map(javaItem),
    prey: !!d.prey,
    ride: d.ride ? { mode: d.ride.mode, seats: d.ride.seats, speed: d.ride.speed ?? null, jump: d.ride.jump ?? 0.6, seatPositions: seatPositions(x) } : null,
    spawn: d.spawn ? { biomes: [...new Set(d.spawn.biomes.flatMap((b) => BIOMES[b]))], weight: d.spawn.weight, min: d.spawn.herd[0], max: d.spawn.herd[1] } : null,
    lays: d.habitat !== 'water',
    sounds: { ambient: javaSound(d.sounds.ambient), hurt: javaSound(d.sounds.hurt), death: javaSound(d.sounds.death), step: javaSound(d.sounds.step), pitch: d.sounds.pitch },
  };
}

function itemModel(out: OutDir, id: string) {
  out.json(`assets/${MOD}/items/${id}.json`, { model: { type: 'minecraft:model', model: `${MOD}:item/${id}` } });
  out.json(`assets/${MOD}/models/item/${id}.json`, { parent: 'minecraft:item/generated', textures: { layer0: `${MOD}:item/${id}` } });
}

/** Java item ids for the generic items (food, materials, gear, vehicles) – shared with the Java code. */
export const SIMPLE_ITEMS = [
  'raw_dino_meat', 'cooked_dino_meat', 'ginkgo_nut', 'cycad_cone', 'dino_hide', 'prehistoric_feather', 'armor_scute',
  'megalodon_tooth', 'fossil_fragment', 'amber', 'amber_mosquito', 'field_guide',
];

export async function buildJavaResources(opts: { quiet?: boolean } = {}) {
  clean(JAVA_RES);
  const out = new OutDir(JAVA_RES);
  const en: Record<string, string> = {};
  const da: Record<string, string> = {};
  const assembled = CREATURES.map(assemble);

  // ---- creatures
  for (const x of assembled) {
    const id = x.def.id;
    out.json(`assets/${MOD}/geckolib/models/entity/${id}.geo.json`, toGeoJson(x.model, `geometry.${MOD}.${id}`, 1));
    out.json(`assets/${MOD}/geckolib/animations/entity/${id}.animation.json`, mergedAnimation(id, x.anims));
    out.png(`assets/${MOD}/textures/entity/${id}.png`, x.texture);
    out.json(`data/${MOD}/loot_table/entities/${id}.json`, { type: 'minecraft:entity', ...javaLoot(lootTable(x.def)) });
    // spawn egg + creature egg items
    const [base, spots] = eggColours(x.def.palette.side, x.def.palette.pattern?.colour ?? x.def.palette.back);
    out.png(`assets/${MOD}/textures/item/${id}_spawn_egg.png`, eggIcon(x.def.palette.side, x.def.palette.accent, 500));
    itemModel(out, `${id}_spawn_egg`);
    en[`entity.${MOD}.${id}`] = x.def.name;
    da[`entity.${MOD}.${id}`] = x.def.name;
    en[`item.${MOD}.${id}_spawn_egg`] = `${x.def.name} Spawn Egg`;
    da[`item.${MOD}.${id}_spawn_egg`] = `${x.def.name} – fremkaldelsesæg`;
    if (x.def.habitat !== 'water') {
      out.png(`assets/${MOD}/textures/item/${id}_egg.png`, eggIcon(base, spots, 200));
      itemModel(out, `${id}_egg`);
      en[`item.${MOD}.${id}_egg`] = `${x.def.name} Egg`;
      da[`item.${MOD}.${id}_egg`] = `${x.def.name}-æg`;
    }
    en[`${MOD}.info.${id}`] = x.def.info;
    da[`${MOD}.info.${id}`] = DA_INFO[id] ?? x.def.info;
  }
  out.json(`${MOD}/creatures.json`, assembled.map(creatureSpec));

  // ---- placed eggs (one model, a texture per species)
  out.json(`assets/${MOD}/geckolib/models/entity/egg.geo.json`, toGeoJson(eggModel('egg'), `geometry.${MOD}.egg`));
  out.json(`assets/${MOD}/geckolib/animations/entity/egg.animation.json`, {
    format_version: '1.8.0',
    animations: { 'animation.dinosaurs.egg.wobble': { loop: true, bones: { egg: { rotation: [0, 0, 'math.pow(math.max(0, math.sin(query.life_time * 40)), 12) * math.sin(query.life_time * 900) * 8'] } } } },
  });
  for (const x of assembled.filter((a) => a.def.habitat !== 'water')) out.png(`assets/${MOD}/textures/entity/egg_${x.def.id}.png`, eggTexture(x));
  en[`entity.${MOD}.egg`] = 'Egg';
  da[`entity.${MOD}.egg`] = 'Æg';
  // saddles fit the rideable species
  out.json('data/minecraft/tags/entity_type/can_equip_saddle.json', { replace: false, values: assembled.filter((a) => a.def.ride).map((a) => `${MOD}:${a.def.id}`) });

  // ---- simple items
  const EN_NAMES: Record<string, string> = {
    raw_dino_meat: 'Raw Dino Meat', cooked_dino_meat: 'Dino Steak', ginkgo_nut: 'Ginkgo Nut', cycad_cone: 'Cycad Cone', dino_hide: 'Dino Hide',
    prehistoric_feather: 'Prehistoric Feather', armor_scute: 'Armour Scute', megalodon_tooth: 'Megalodon Tooth', fossil_fragment: 'Fossil Fragment',
    amber: 'Amber', amber_mosquito: 'Mosquito in Amber', field_guide: 'Dino Field Guide',
    electric_prod: 'Electric Prod', tranquilizer_rifle: 'Tranquilizer Rifle', tranq_dart: 'Tranquilizer Dart',
  };
  for (const id of SIMPLE_ITEMS) {
    out.png(`assets/${MOD}/textures/item/${id}.png`, ICONS[id]());
    itemModel(out, id);
  }
  for (const [id, f] of Object.entries(GEAR_ICONS)) {
    out.png(`assets/${MOD}/textures/item/${id}.png`, f());
    itemModel(out, id);
  }
  for (const [id, name] of Object.entries(EN_NAMES)) {
    en[`item.${MOD}.${id}`] = name;
    da[`item.${MOD}.${id}`] = DA_GAME_NAMES[id] ?? name;
  }
  for (const [k, v] of Object.entries(UI)) {
    en[`${MOD}.ui.${k}`] = v.en_US.replace(/%s/g, '%s');
    da[`${MOD}.ui.${k}`] = v.da_DK;
  }
  en[`itemGroup.${MOD}`] = 'Prehistoric Dinosaurs';
  da[`itemGroup.${MOD}`] = 'Forhistoriske Dinosaurer';

  // other subsystems (blocks, worldgen, gear, vehicles) add their own files
  const extra = await import('./subsystems.js');
  await extra.emitSubsystems({ out, en, da, assembled });

  out.json(`assets/${MOD}/lang/en_us.json`, en);
  out.json(`assets/${MOD}/lang/da_dk.json`, da);
  out.copy(`assets/${MOD}/icon.png`, path.resolve('packs/static/pack_icon.png'));
  if (!opts.quiet) console.log(`java resources: ${out.files.length} files`);
  return out;
}

/** Bedrock loot pools → Java 26.3 loot table pools ("modifier" lists, single "condition"). */
export function javaLoot(t: { pools: any[] }) {
  const one = (cs: any[]) => (cs.length === 1 ? cs[0] : { type: 'minecraft:all_of', terms: cs });
  return {
    pools: t.pools.map((p) => {
      const conds = (p.conditions ?? []).map(javaCondition).filter(Boolean);
      return {
        rolls: p.rolls,
        ...(conds.length ? { condition: one(conds) } : {}),
        entries: p.entries.map((e: any) => {
          const mods = (e.functions ?? []).map(javaFunction).filter(Boolean);
          return {
            type: 'minecraft:item',
            name: javaItem(e.name),
            ...(e.weight && e.weight !== 1 ? { weight: e.weight } : {}),
            ...(mods.length ? { modifier: mods } : {}),
          };
        }),
      };
    }),
  };
}

function javaCondition(c: any) {
  if (c.condition === 'killed_by_player') return { type: 'minecraft:killed_by_player' };
  if (c.condition === 'random_chance' || c.condition === 'random_chance_with_looting') return { type: 'minecraft:random_chance', chance: c.chance };
  return null;
}

function javaFunction(f: any) {
  if (f.function === 'set_count') return { type: 'minecraft:set_count', count: { type: 'minecraft:uniform', min: f.count.min, max: f.count.max } };
  if (f.function === 'looting_enchant') return { type: 'minecraft:enchanted_count_increase', count: { type: 'minecraft:uniform', min: 0, max: 1 }, enchantment: 'minecraft:looting' };
  if (f.function === 'furnace_smelt') return { type: 'minecraft:furnace_smelt', condition: { type: 'minecraft:entity_properties', entity: 'this', predicate: { 'minecraft:flags': { is_on_fire: true } } } };
  return null;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildJavaResources().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
