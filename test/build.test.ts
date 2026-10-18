import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { compile } from '../src/anim/molang.js';
import { BP_DIR, RP_DIR, build } from '../src/build.js';
import { CREATURES } from '../src/data/registry.js';
import { SCHEMA_DIR, validateBuild } from '../tools/schemas.js';

const VANILLA_ITEMS = new Set(
  [...fs.readFileSync('node_modules/@minecraft/vanilla-data/lib/mojang-item.d.ts', 'utf8').matchAll(/"(minecraft:[a-z0-9_]+)"/g), ...fs.readFileSync('node_modules/@minecraft/vanilla-data/lib/mojang-block.d.ts', 'utf8').matchAll(/"(minecraft:[a-z0-9_]+)"/g)].map((m) => m[1]),
);

const VANILLA_BIOMES = new Set([...fs.readFileSync('node_modules/@minecraft/vanilla-data/lib/mojang-biome.d.ts', 'utf8').matchAll(/"(minecraft:[a-z0-9_]+)"/g)].map((m) => m[1]));

const readJson = (p: string) => JSON.parse(fs.readFileSync(p, 'utf8'));
function walk(dir: string, ext = '.json'): string[] {
  if (!fs.existsSync(dir)) return [];
  return (fs.readdirSync(dir, { recursive: true }) as string[]).filter((f) => f.endsWith(ext)).map((f) => path.join(dir, f));
}
const ids = (dir: string, key: string) => new Set(walk(dir).map((f) => readJson(f)[key]?.description?.identifier).filter(Boolean));

let entities: Set<string>, items: Set<string>, blocks: Set<string>;

beforeAll(async () => {
  await build({ quiet: true });
  entities = ids(path.join(BP_DIR, 'entities'), 'minecraft:entity');
  items = ids(path.join(BP_DIR, 'items'), 'minecraft:item');
  blocks = ids(path.join(BP_DIR, 'blocks'), 'minecraft:block');
}, 120_000);

describe('content', () => {
  it('has 50 dinosaurs plus the other prehistoric creatures', () => {
    const dinos = CREATURES.filter((c) => ['theropod', 'sauropod', 'ceratopsian', 'thyreophoran', 'ornithopod', 'bird'].includes(c.group));
    expect(dinos.length).toBe(50);
    for (const id of ['sarcosuchus', 'megalodon', 'pteranodon', 'pterodactylus', 'quetzalcoatlus', 'mosasaurus', 'plesiosaurus', 'titanoboa']) expect(CREATURES.some((c) => c.id === id)).toBe(true);
  });

  it('has tameable and rideable creatures on land, in the air and in water', () => {
    expect(CREATURES.filter((c) => c.tame).length).toBeGreaterThan(30);
    for (const mode of ['ground', 'fly', 'swim']) expect(CREATURES.some((c) => c.ride?.mode === mode)).toBe(true);
  });
});

describe('official schemas', () => {
  it.skipIf(!fs.existsSync(SCHEMA_DIR))('every generated document validates against Mojang JSON schemas', () => {
    const { checked, problems } = validateBuild(path.dirname(BP_DIR));
    expect(checked).toBeGreaterThan(200);
    expect(problems).toEqual([]);
  });
});

describe('cross references', () => {
  it('client entities point at real geometry, textures and animations', () => {
    const geos = new Set(walk(path.join(RP_DIR, 'models')).flatMap((f) => (readJson(f)['minecraft:geometry'] ?? []).map((g: any) => g.description.identifier)));
    const anims = new Set(walk(path.join(RP_DIR, 'animations')).flatMap((f) => Object.keys(readJson(f).animations)));
    const rcs = new Set(walk(path.join(RP_DIR, 'render_controllers')).flatMap((f) => Object.keys(readJson(f).render_controllers)));
    for (const f of walk(path.join(RP_DIR, 'entity'))) {
      const d = readJson(f)['minecraft:client_entity'].description;
      expect(entities.has(d.identifier), d.identifier).toBe(true);
      for (const g of Object.values<string>(d.geometry)) expect(geos.has(g), `${f}: ${g}`).toBe(true);
      for (const t of Object.values<string>(d.textures)) expect(fs.existsSync(path.join(RP_DIR, t + '.png')), `${f}: ${t}`).toBe(true);
      for (const a of Object.values<string>(d.animations ?? {})) expect(anims.has(a), `${f}: ${a}`).toBe(true);
      for (const rc of d.render_controllers) expect(rcs.has(rc)).toBe(true);
    }
  });

  it('geometry UVs fit inside their textures', () => {
    for (const f of walk(path.join(RP_DIR, 'models/entity'))) {
      for (const g of readJson(f)['minecraft:geometry']) {
        const { texture_width: tw, texture_height: th } = g.description;
        const names = new Set(g.bones.map((b: any) => b.name));
        for (const b of g.bones) {
          if (b.parent) expect(names.has(b.parent), `${f}: ${b.name} parent`).toBe(true);
          for (const c of b.cubes ?? []) {
            const [w, h, d] = c.size;
            expect(c.uv[0] + 2 * (w + d), `${f} ${b.name} u`).toBeLessThanOrEqual(tw);
            expect(c.uv[1] + d + h, `${f} ${b.name} v`).toBeLessThanOrEqual(th);
          }
        }
      }
    }
  });

  it('all referenced items, blocks and entities exist', () => {
    const known = (id: string) => VANILLA_ITEMS.has(id) || items.has(id) || blocks.has(id);
    const missing: string[] = [];
    const check = (id: unknown, where: string) => {
      if (typeof id !== 'string') return;
      const name = id.includes(':') ? id : `minecraft:${id}`;
      if (!known(name.split(':').slice(0, 2).join(':'))) missing.push(`${where}: ${id}`);
    };
    for (const f of walk(path.join(BP_DIR, 'loot_tables'))) for (const p of readJson(f).pools) for (const e of p.entries) check(e.name, f);
    for (const f of walk(path.join(BP_DIR, 'recipes'))) {
      const r = Object.values<any>(readJson(f)).find((x) => typeof x === 'object');
      for (const k of Object.values<any>(r.key ?? {})) check(k.item, f);
      for (const i of r.ingredients ?? []) check(i.item, f);
      check(r.result?.item, f);
      check(r.input, f);
      check(r.output, f);
    }
    for (const f of walk(path.join(BP_DIR, 'entities'))) {
      const text = fs.readFileSync(f, 'utf8');
      const e = JSON.parse(text)['minecraft:entity'];
      const all = [e.components, ...Object.values(e.component_groups ?? {})] as any[];
      for (const c of all) {
        for (const i of c['minecraft:tameable']?.tame_items ?? []) check(i, f);
        for (const i of c['minecraft:breedable']?.breed_items ?? []) check(i, f);
        for (const i of c['minecraft:ageable']?.feed_items ?? []) check(i, f);
        for (const i of c['minecraft:healable']?.items ?? []) check(i.item, f);
        for (const s of c['minecraft:spawn_entity']?.entities ?? []) check(s.spawn_item, f);
        // every triggered event exists
        for (const m of JSON.stringify(c).matchAll(/"event":"([^"]+)"/g)) expect((e.events ?? {})[m[1]], `${f}: event ${m[1]}`).toBeTruthy();
      }
      for (const ev of Object.values<any>(e.events ?? {})) for (const m of JSON.stringify(ev).matchAll(/"component_groups":\[([^\]]*)\]/g)) for (const g of m[1].split(',').map((x: string) => JSON.parse(x))) expect(e.component_groups[g], `${f}: group ${g}`).toBeTruthy();
    }
    for (const f of walk(path.join(BP_DIR, 'items'))) {
      const placer = readJson(f)['minecraft:item'].components['minecraft:entity_placer'];
      if (placer) expect(entities.has(placer.entity), placer.entity).toBe(true);
    }
    for (const f of walk(path.join(BP_DIR, 'spawn_rules'))) expect(entities.has(readJson(f)['minecraft:spawn_rules'].description.identifier)).toBe(true);
    expect(missing).toEqual([]);
  });

  it('every vanilla block/item id we mention exists', () => {
    const bad = new Set<string>();
    const NOT_IDS = /^minecraft:(geometry|overworld|nether|culling_layer|itemGroup|is_|fog_|warmish|default_|unit_cube|empty|block_face|cardinal_connections)/;
    const visit = (v: unknown, f: string) => {
      if (typeof v === 'string') {
        if (/^minecraft:[a-z0-9_]+$/.test(v) && !NOT_IDS.test(v) && !VANILLA_ITEMS.has(v) && !VANILLA_BIOMES.has(v)) bad.add(`${path.basename(f)}: ${v}`);
      } else if (Array.isArray(v)) v.forEach((x) => visit(x, f));
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (!['spawn_category', 'interact_text'].includes(k)) visit(x, f);
    };
    for (const dir of ['blocks', 'features', 'spawn_rules', 'biomes', 'recipes', 'loot_tables']) for (const f of walk(path.join(BP_DIR, dir))) visit(readJson(f), f);
    expect([...bad]).toEqual([]);
  });

  const VANILLA_BIOME_DIR = path.join(SCHEMA_DIR, '../../behavior_pack/biomes');
  it.skipIf(!fs.existsSync(VANILLA_BIOME_DIR))('spawn and feature rules only use biome tags that vanilla biomes have', () => {
    const tags = new Set<string>(['dino_prehistoric']);
    for (const f of walk(VANILLA_BIOME_DIR)) {
      const doc = JSON.parse(fs.readFileSync(f, 'utf8').replace(/(?<![:"])\/\/[^\n]*/g, ''));
      for (const t of doc['minecraft:biome'].components['minecraft:tags']?.tags ?? []) tags.add(t);
    }
    const used = new Set<string>();
    for (const dir of ['feature_rules', 'spawn_rules'])
      for (const f of walk(path.join(BP_DIR, dir))) for (const m of fs.readFileSync(f, 'utf8').matchAll(/"test": "has_biome_tag",\s*"operator": "==",\s*"value": "([a-z_]+)"/g)) used.add(m[1]);
    expect(used.size).toBeGreaterThan(10);
    expect([...used].filter((t) => !tags.has(t))).toEqual([]);
  });

  it('textures used by items and blocks are in the atlases', () => {
    const itemTex = readJson(path.join(RP_DIR, 'textures/item_texture.json')).texture_data;
    const terrain = readJson(path.join(RP_DIR, 'textures/terrain_texture.json')).texture_data;
    for (const t of [...Object.values<any>(itemTex), ...Object.values<any>(terrain)]) expect(fs.existsSync(path.join(RP_DIR, t.textures + '.png')), t.textures).toBe(true);
    for (const f of walk(path.join(BP_DIR, 'items'))) expect(itemTex[readJson(f)['minecraft:item'].components['minecraft:icon'].textures.default]).toBeTruthy();
    for (const f of walk(path.join(BP_DIR, 'blocks'))) {
      for (const m of fs.readFileSync(f, 'utf8').matchAll(/"texture": "([^"]+)"/g)) expect(terrain[m[1]], `${f}: ${m[1]}`).toBeTruthy();
    }
  });

  it('features and feature rules are wired up', () => {
    const features = new Map(walk(path.join(BP_DIR, 'features')).map((f) => {
      const d = readJson(f);
      const body = Object.values<any>(d).find((x) => typeof x === 'object');
      return [body.description.identifier, { file: path.basename(f, '.json'), body }];
    }));
    for (const [id, { file, body }] of features) {
      expect(id.split(':')[1]).toBe(file); // filename must match the feature name
      for (const ref of [body.places_feature, ...(body.features ?? []).map((x: any) => x[0])].filter(Boolean)) expect(features.has(ref), `${id} → ${ref}`).toBe(true);
      if (body.structure_name) expect(fs.existsSync(path.join(BP_DIR, 'structures', ...body.structure_name.split(':')) + '.mcstructure')).toBe(true);
      if (body.places_block) expect(blocks.has(body.places_block), body.places_block).toBe(true);
    }
    for (const f of walk(path.join(BP_DIR, 'feature_rules'))) {
      const d = readJson(f)['minecraft:feature_rules'];
      expect(d.description.identifier.split(':')[1]).toBe(path.basename(f, '.json'));
      expect(features.has(d.description.places_feature), d.description.places_feature).toBe(true);
    }
  });

  it('every entity, item and block has an English name', () => {
    const lang = new Set(fs.readFileSync(path.join(RP_DIR, 'texts/en_US.lang'), 'utf8').split('\n').map((l) => l.split('=')[0]));
    for (const e of entities) expect(lang.has(`entity.${e}.name`), e).toBe(true);
    for (const i of items) expect(lang.has(`item.${i}.name`), i).toBe(true);
    for (const b of blocks) expect(lang.has(`tile.${b}.name`), b).toBe(true);
  });

  it('Danish lang file covers exactly the same keys as English, and every script text key exists', () => {
    const keys = (f: string) => fs.readFileSync(path.join(RP_DIR, 'texts', f), 'utf8').split('\n').filter(Boolean).map((l) => l.split('=')[0]);
    const en = keys('en_US.lang');
    const da = keys('da_DK.lang');
    expect(new Set(da)).toEqual(new Set(en));
    expect(readJson(path.join(RP_DIR, 'texts/languages.json'))).toContain('da_DK');
    const js = fs.readFileSync(path.join(BP_DIR, 'scripts/main.js'), 'utf8');
    for (const m of js.matchAll(/tr\(\s*"([a-z_.0-9]+)"/g)) expect(en, m[1]).toContain(`dino.ui.${m[1]}`);
  });

  it('all Molang expressions parse', () => {
    const exprs: string[] = [];
    for (const f of walk(path.join(RP_DIR, 'animations'))) JSON.stringify(readJson(f), (_k, v) => (typeof v === 'string' && /query|variable|math/.test(v) ? exprs.push(v) : 0, v));
    for (const f of walk(path.join(RP_DIR, 'entity'))) {
      const s = readJson(f)['minecraft:client_entity'].description.scripts ?? {};
      exprs.push(...(s.pre_animation ?? []));
      for (const a of s.animate ?? []) if (typeof a === 'object') exprs.push(...Object.values<string>(a));
    }
    expect(exprs.length).toBeGreaterThan(100);
    for (const e of exprs) expect(() => compile(e)({ q: {}, v: {} }), e).not.toThrow();
  });

  it('bundled script is valid JavaScript and registers every custom block component', () => {
    const js = fs.readFileSync(path.join(BP_DIR, 'scripts/main.js'), 'utf8');
    const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dino-')), 'main.mjs');
    fs.writeFileSync(tmp, js);
    execFileSync(process.execPath, ['--check', tmp]);
    const used = new Set<string>();
    for (const f of walk(path.join(BP_DIR, 'blocks'))) for (const m of fs.readFileSync(f, 'utf8').matchAll(/"(dino:[a-z_]+)": \{/g)) used.add(m[1]);
    for (const c of used) expect(js.includes(`\${NS}:${c.split(':')[1]}`) || js.includes(`"${c}"`) || js.includes(`\`dino:${c.split(':')[1]}\``), c).toBe(true);
  });

  it('manifests reference each other', () => {
    const bp = readJson(path.join(BP_DIR, 'manifest.json'));
    const rp = readJson(path.join(RP_DIR, 'manifest.json'));
    expect(bp.dependencies.some((d: any) => d.uuid === rp.header.uuid)).toBe(true);
    const uuids = [bp.header.uuid, ...bp.modules.map((m: any) => m.uuid), rp.header.uuid, ...rp.modules.map((m: any) => m.uuid)];
    expect(new Set(uuids).size).toBe(uuids.length);
  });

  it('creature sizes stay playable', () => {
    for (const f of walk(path.join(BP_DIR, 'entities'))) {
      const e = readJson(f)['minecraft:entity'];
      const box = e.component_groups?.['dino:adult']?.['minecraft:collision_box'];
      if (!box) continue;
      expect(box.height, f).toBeLessThanOrEqual(10);
      expect(box.width, f).toBeLessThanOrEqual(5);
    }
  });
});
