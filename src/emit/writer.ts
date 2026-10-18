import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

export class OutDir {
  readonly files: string[] = [];
  constructor(readonly root: string) {}

  json(rel: string, data: unknown) {
    this.write(rel, JSON.stringify(data, null, 2) + '\n');
  }

  png(rel: string, png: PNG) {
    this.write(rel, PNG.sync.write(png));
  }

  write(rel: string, data: string | Uint8Array) {
    const p = path.join(this.root, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, data);
    this.files.push(rel);
  }

  copy(rel: string, from: string) {
    this.write(rel, fs.readFileSync(from));
  }
}

export function clean(dir: string) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}
