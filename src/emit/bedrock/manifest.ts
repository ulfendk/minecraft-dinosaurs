import fs from 'node:fs';
import { MIN_ENGINE, PACK_NAME, SCRIPT_MODULES } from './constants.js';

const uuids = JSON.parse(fs.readFileSync(new URL('../../../packs/static/uuids.json', import.meta.url), 'utf8'));

export function packVersion(): [number, number, number] {
  const v = (process.env.PACK_VERSION ?? JSON.parse(fs.readFileSync(new URL('../../../package.json', import.meta.url), 'utf8')).version).replace(/^v/, '');
  const [a, b, c] = v.split(/[.-]/).map((n: string) => parseInt(n, 10) || 0);
  return [a, b, c];
}

export function bpManifest() {
  const version = packVersion();
  return {
    format_version: 2,
    header: {
      name: `${PACK_NAME} BP v${version.join('.')}`,
      description: `Dinosaurs, prehistoric creatures, ancient plants and park gear. v${version.join('.')}`,
      uuid: uuids.bp.header,
      version,
      min_engine_version: MIN_ENGINE,
    },
    modules: [
      { type: 'data', uuid: uuids.bp.data, version },
      { type: 'script', language: 'javascript', uuid: uuids.bp.script, version, entry: 'scripts/main.js' },
    ],
    dependencies: [
      { uuid: uuids.rp.header, version },
      { module_name: '@minecraft/server', version: SCRIPT_MODULES.server },
      { module_name: '@minecraft/server-ui', version: SCRIPT_MODULES.ui },
    ],
    metadata: { authors: ['minecraft-dinosaurs contributors'], license: 'MIT', url: 'https://github.com/ulfendk/minecraft-dinosaurs' },
  };
}

export function rpManifest() {
  const version = packVersion();
  return {
    format_version: 2,
    header: {
      name: `${PACK_NAME} RP v${version.join('.')}`,
      description: `Models, textures and sounds for ${PACK_NAME}. v${version.join('.')}`,
      uuid: uuids.rp.header,
      version,
      min_engine_version: MIN_ENGINE,
    },
    modules: [{ type: 'resources', uuid: uuids.rp.resources, version }],
    metadata: { authors: ['minecraft-dinosaurs contributors'], license: 'MIT', url: 'https://github.com/ulfendk/minecraft-dinosaurs' },
  };
}
