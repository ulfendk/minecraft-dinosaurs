// Validates generated pack files against Mojang's official JSON schemas.
import fs from 'node:fs';
import path from 'node:path';
import AjvModule from 'ajv';
// ajv ships CJS; under NodeNext the default import is the module namespace
const Ajv = (AjvModule as any).default ?? AjvModule;
type Ajv = any;

export const SCHEMA_DIR = path.resolve(process.env.MC_SCHEMAS ?? '.cache/bedrock-samples/metadata/json_schemas');

export interface Check {
  /** glob-ish: directory inside the pack, relative */
  dir: string;
  schema: string;
  /** pick the part of the document the schema describes */
  pick: (doc: any) => any;
}

export const CHECKS: Check[] = [
  { dir: 'dinosaurs_BP/entities', schema: '/server/entity/1.26.50/ActorDocument.json', pick: (d) => d['minecraft:entity'] },
  { dir: 'dinosaurs_BP/blocks', schema: '/server/block/1.26.20/Blocks.json', pick: (d) => d['minecraft:block'] },
  { dir: 'dinosaurs_BP/items', schema: '/server/item/1.26.30/ItemDocument.json', pick: (d) => d['minecraft:item'] },
  { dir: 'dinosaurs_BP/spawn_rules', schema: '/server/spawn/1.21.50/Spawn Rules.json', pick: (d) => d['minecraft:spawn_rules'] },
  { dir: 'dinosaurs_BP/biomes', schema: '/server/biome/beta/Biome Document.json', pick: (d) => d },
];

export function loadAjv() {
  const ajv = new Ajv({ strict: false, allErrors: true, validateFormats: false });
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.json')) {
        // Mojang's schemas use oneOf where branches overlap (vanilla files fail them too); treat as anyOf.
        const s = JSON.parse(fs.readFileSync(p, 'utf8').replace(/"oneOf"/g, '"anyOf"'));
        const id = s.$id ?? '/' + path.relative(SCHEMA_DIR, p).split(path.sep).join('/');
        delete s.$schema;
        try {
          ajv.addSchema({ ...s, $id: id });
        } catch {
          /* duplicate ids are fine */
        }
      }
    }
  };
  walk(SCHEMA_DIR);
  return ajv;
}

type Schema = Record<string, any>;

/** Resolve a $ref relative to the schema that contains it. */
function resolve(ajv: Ajv, base: string, ref: string): { s: Schema; base: string } | undefined {
  const url = new URL(ref, 'file://' + base).pathname;
  const decoded = decodeURI(url);
  const v = ajv.getSchema(url) ?? ajv.getSchema(decoded) ?? ajv.getSchema(encodeURI(decoded));
  return v ? { s: v.schema as Schema, base: url } : undefined;
}

/**
 * Collect object keys the schema does not know about (typos, invented components).
 * Only flags keys when every applicable schema branch declares explicit properties.
 */
export function unknownKeys(ajv: Ajv, schema: Schema, base: string, inst: unknown, at: string, out: string[], depth = 0) {
  if (depth > 40 || inst === null || typeof inst !== 'object') return;
  const branches: { s: Schema; base: string }[] = [];
  const expand = (s: Schema, b: string, d = 0) => {
    if (!s || d > 20) return;
    if (s.$ref) {
      const r = resolve(ajv, b, s.$ref);
      if (r) expand(r.s, r.base, d + 1);
      return;
    }
    if (s.anyOf || s.oneOf || s.allOf) for (const x of s.anyOf ?? s.oneOf ?? s.allOf) expand(x, b, d + 1);
    if (s.properties || s.items || s.additionalProperties || s.patternProperties || s.type) branches.push({ s, base: b });
  };
  expand(schema, base);
  if (Array.isArray(inst)) {
    const items = branches.filter((b) => b.s.items && !Array.isArray(b.s.items));
    if (items.length === 1) inst.forEach((v, i) => unknownKeys(ajv, items[0].s.items, items[0].base, v, `${at}/${i}`, out, depth + 1));
    return;
  }
  const objs = branches.filter((b) => b.s.properties || b.s.additionalProperties || b.s.patternProperties);
  if (!objs.length) return;
  for (const [k, v] of Object.entries(inst as Record<string, unknown>)) {
    const owners = objs.filter((b) => b.s.properties?.[k]);
    const open = objs.some((b) => b.s.additionalProperties || Object.keys(b.s.patternProperties ?? {}).some((re) => new RegExp(re).test(k)));
    if (!owners.length) {
      if (!open && !k.startsWith('dino:')) out.push(`${at}/${k}: unknown key`);
      const ap = objs.find((b) => typeof b.s.additionalProperties === 'object');
      if (ap) unknownKeys(ajv, ap.s.additionalProperties, ap.base, v, `${at}/${k}`, out, depth + 1);
      continue;
    }
    if (owners.length === 1) unknownKeys(ajv, owners[0].s.properties[k], owners[0].base, v, `${at}/${k}`, out, depth + 1);
  }
}

export function validateBuild(buildDir: string) {
  const ajv = loadAjv();
  const problems: string[] = [];
  let checked = 0;
  for (const c of CHECKS) {
    const dir = path.join(buildDir, c.dir);
    if (!fs.existsSync(dir)) continue;
    const validate = ajv.getSchema(c.schema) ?? ajv.getSchema(encodeURI(c.schema));
    if (!validate) throw new Error(`schema ${c.schema} not found`);
    for (const f of fs.readdirSync(dir, { recursive: true }) as string[]) {
      if (!f.endsWith('.json')) continue;
      const doc = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      checked++;
      const before = problems.length;
      const unk: string[] = [];
      unknownKeys(ajv, validate.schema as Schema, decodeURI(c.schema), c.pick(doc), '', unk);
      for (const u of unk) problems.push(`${c.dir}/${f}: ${u}`);
      void before;
      if (!validate(c.pick(doc))) {
        for (const e of (validate.errors ?? []).filter((e: any) => e.keyword !== 'anyOf')) problems.push(`${c.dir}/${f}: ${e.instancePath} ${e.message} ${JSON.stringify(e.params)}`);
      }
    }
  }
  return { checked, problems };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { checked, problems } = validateBuild(path.resolve(process.argv[2] ?? 'build'));
  console.log(`checked ${checked} files, ${problems.length} problems`);
  // collapse noisy anyOf/oneOf duplicates
  for (const p of [...new Set(problems)].slice(0, 80)) console.log(' -', p);
  process.exit(problems.length ? 1 : 0);
}
