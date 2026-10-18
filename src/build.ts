// Builds the Bedrock behavior + resource packs into build/.
import path from 'node:path';
import { assemble, type Assembled } from './creatures/assemble.js';
import { CREATURES } from './data/registry.js';
import { animationFile, clientEntity, renderControllers } from './emit/bedrock/client.js';
import { NS } from './emit/bedrock/constants.js';
import { lootTable, saddledLoot, SADDLE_LOOT, soundEntry, spawnRule } from './emit/bedrock/creatureFiles.js';
import { behaviorEntity } from './emit/bedrock/entity.js';
import { bpManifest, packDescription, rpManifest } from './emit/bedrock/manifest.js';
import { emitWorld } from './emit/bedrock/world.js';
import { toGeoJson } from './model/geo.js';
import { danishLang, guideLang } from './data/i18n/game.js';
import { PLANTS, TREES } from './data/plants.js';
import { clean, OutDir } from './emit/writer.js';

export const BUILD = path.resolve('build');
export const BP_DIR = path.join(BUILD, 'dinosaurs_BP');
export const RP_DIR = path.join(BUILD, 'dinosaurs_RP');

export async function build(opts: { quiet?: boolean } = {}) {
  clean(BUILD);
  const bp = new OutDir(BP_DIR);
  const rp = new OutDir(RP_DIR);
  const lang: string[] = [];
  const sounds: Record<string, unknown> = {};

  const assembled: Assembled[] = [];
  for (const def of CREATURES) {
    const x = assemble(def);
    assembled.push(x);
    const id = def.id;
    bp.json(`entities/${id}.json`, behaviorEntity(def, { hitbox: x.hitbox, seat: x.seat, eggItem: def.group === 'fish' || def.group === 'marine_reptile' ? undefined : `${NS}:${id}_egg` }));
    bp.json(`loot_tables/entities/${id}.json`, lootTable(def));
    if (def.ride) bp.json(`loot_tables/entities/${id}_saddled.json`, saddledLoot(def));
    const sr = spawnRule(def);
    if (sr) bp.json(`spawn_rules/${id}.json`, sr);
    rp.json(`entity/dino/${id}.entity.json`, clientEntity(x));
    rp.json(`models/entity/dino/${id}.geo.json`, toGeoJson(x.model, `geometry.dino.${id}`, def.scale));
    rp.json(`animations/dino/${id}.animation.json`, animationFile(x));
    rp.png(`textures/entity/dino/${id}.png`, x.texture);
    sounds[`${NS}:${id}`] = soundEntry(def);
    lang.push(`entity.${NS}:${id}.name=${def.name}`, `item.spawn_egg.entity.${NS}:${id}.name=${def.name} Spawn Egg`);
  }
  bp.json('loot_tables/entities/dino_saddle.json', SADDLE_LOOT);
  rp.json('render_controllers/dino.render_controllers.json', renderControllers());

  // items, blocks, world generation, scripts, vehicles…
  await emitWorld({ bp, rp, lang, sounds, assembled });

  bp.copy('pack_icon.png', path.resolve('packs/static/pack_icon.png'));
  rp.copy('pack_icon.png', path.resolve('packs/static/pack_icon.png'));
  bp.json('manifest.json', bpManifest());
  rp.json('manifest.json', rpManifest());
  rp.json('sounds.json', { entity_sounds: { entities: sounds } });
  const plants = [...PLANTS, ...TREES];
  const creatures = CREATURES.map((c) => ({ id: c.id, info: c.info }));
  rp.write('texts/en_US.lang', [`pack.description=${packDescription('en_US')}`, ...lang, ...guideLang('en_US', creatures, plants)].join('\n') + '\n');
  rp.write('texts/da_DK.lang', [`pack.description=${packDescription('da_DK')}`, ...danishLang(lang), ...guideLang('da_DK', creatures, plants)].join('\n') + '\n');
  rp.json('texts/languages.json', ['en_US', 'da_DK']);
  bp.write('texts/en_US.lang', `pack.description=${packDescription('en_US')}
`);
  bp.write('texts/da_DK.lang', `pack.description=${packDescription('da_DK')}
`);
  bp.json('texts/languages.json', ['en_US', 'da_DK']);
  if (!opts.quiet) console.log(`built ${assembled.length} creatures, ${bp.files.length} BP files, ${rp.files.length} RP files`);
  return { bp, rp, assembled };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  build().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
