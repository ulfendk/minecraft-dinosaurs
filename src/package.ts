// Zips build/ into installable files in dist/:
//   prehistoric-dinosaurs-<version>.mcaddon   (both packs; double-click to import)
//   prehistoric-dinosaurs-BP-<version>.mcpack / -RP-<version>.mcpack
import fs from 'node:fs';
import path from 'node:path';
import { zipSync, type Zippable } from 'fflate';
import { BP_DIR, RP_DIR, build } from './build.js';
import { packVersion } from './emit/bedrock/manifest.js';

function tree(dir: string, prefix = ''): Zippable {
  const out: Zippable = {};
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = path.join(dir, e.name);
    const k = prefix + e.name;
    if (e.isDirectory()) Object.assign(out, tree(p, k + '/'));
    else out[k] = [fs.readFileSync(p), { mtime: new Date('2026-01-01T00:00:00Z') }];
  }
  return out;
}

export async function packageAll() {
  await build();
  const v = packVersion().join('.');
  const dist = path.resolve('dist');
  fs.rmSync(dist, { recursive: true, force: true });
  fs.mkdirSync(dist, { recursive: true });
  const bp = tree(BP_DIR, 'dinosaurs_BP/');
  const rp = tree(RP_DIR, 'dinosaurs_RP/');
  const files = {
    [`prehistoric-dinosaurs-${v}.mcaddon`]: zipSync({ ...bp, ...rp }, { level: 9 }),
    [`prehistoric-dinosaurs-BP-${v}.mcpack`]: zipSync(tree(BP_DIR), { level: 9 }),
    [`prehistoric-dinosaurs-RP-${v}.mcpack`]: zipSync(tree(RP_DIR), { level: 9 }),
  };
  for (const [name, data] of Object.entries(files)) {
    fs.writeFileSync(path.join(dist, name), data);
    console.log(`${name}  ${(data.length / 1024 / 1024).toFixed(2)} MB`);
  }
  return files;
}

if (import.meta.url === `file://${process.argv[1]}`) packageAll().catch((e) => {
  console.error(e);
  process.exit(1);
});
