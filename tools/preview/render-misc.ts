// Renders vehicles, item icons, block textures and tree structures for QA and the website.
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { VEHICLES } from '../../src/data/park.js';
import { vehicleAssets } from '../../src/emit/bedrock/vehicles.js';
import { buildItems } from '../../src/emit/bedrock/items.js';
import { buildBlocks } from '../../src/emit/bedrock/blocks.js';
import { TREES } from '../../src/data/plants.js';
import { SHAPES } from '../../src/data/treeshapes.js';
import { treeTextures } from '../../src/data/plants.js';
import { toGeoJson } from '../../src/model/geo.js';
import { upscale, blank } from '../../src/texture/pixelart.js';
import { collectTris, renderView, sheet } from './render.js';
import { seatedDummies } from './dummy.js';

const OUT = path.resolve(process.env.PREVIEW_OUT ?? 'docs/gallery');
fs.mkdirSync(OUT, { recursive: true });
const grid = (imgs: PNG[], cols: number, cell: number) => {
  const rows = Math.ceil(imgs.length / cols);
  const out = new PNG({ width: cols * cell, height: rows * cell });
  out.data.fill(0);
  imgs.forEach((img, i) => PNG.bitblt(img, out, 0, 0, Math.min(cell, img.width), Math.min(cell, img.height), (i % cols) * cell, Math.floor(i / cols) * cell));
  return out;
};

// vehicles, with a seated player-sized dummy (1.8 blocks tall) in every seat for scale
for (const v of VEHICLES) {
  const { model, texture } = vehicleAssets(v);
  const bones = toGeoJson(model, 'g')['minecraft:geometry'][0].bones as any;
  const scaled = collectTris(bones).map((t) => ({ ...t, p: t.p.map((q) => q.map((c) => c * v.scale) as [number, number, number]) }));
  const tris = [...scaled, ...seatedDummies(v.seatsPx, v.scale)];
  fs.writeFileSync(path.join(OUT, `vehicle_${v.id}.png`), PNG.sync.write(sheet([renderView(tris, texture, { yaw: 35, pitch: 20 }, 300), renderView(tris, texture, { yaw: 90, pitch: 5 }, 300), renderView(tris, texture, { yaw: 215, pitch: 30 }, 300)], 3)));
}
// item icons
const items = buildItems([]).map((i) => upscale(i.icon, 4));
fs.writeFileSync(path.join(OUT, 'items.png'), PNG.sync.write(grid(items, 8, 64)));
// block textures
const tex = buildBlocks().flatMap((b) => Object.values(b.textures)).map((t) => upscale(t, 4));
fs.writeFileSync(path.join(OUT, 'blocks.png'), PNG.sync.write(grid(tex, 8, 64)));
// trees: voxels rendered as textured cubes
TREES.forEach((t, ti) => {
  const tt = treeTextures(t, 100 + ti * 10);
  // tiny atlas: log side, log top, leaves (16px each) + per-face uv cubes
  const atlas = blank(48, 16);
  [tt.log_side, tt.leaves, tt.log_top].forEach((p, i) => PNG.bitblt(p, atlas, 0, 0, 16, 16, i * 16, 0));
  const views: PNG[] = [];
  for (let variant = 0; variant < 3; variant++) {
    const shape = SHAPES[t.id](1000 + variant * 37 + t.id.length, 'log', 'leaf');
    const cubes: any[] = [];
    for (const [k, b] of shape.blocks) {
      const [x, y, z] = k.split(',').map(Number);
      // box uv on a 48x16 atlas is awkward; emulate with a 1×1×1 cube scaled ×16 using uv offsets
      cubes.push({ origin: [(x - shape.base[0]) * 16, y * 16, (z - shape.base[2]) * 16], size: [16, 16, 16], uv: [b.name === 'log' ? 0 : 16, 0], log: b.name === 'log' });
    }
    // Build a texture where each cube's box-uv net resolves to a flat colour region: use a 128x64 atlas per material
    const net = (src: PNG) => { const p = blank(64, 32); for (const [ox, oy] of [[16, 0], [32, 0], [0, 16], [16, 16], [32, 16], [48, 16]]) PNG.bitblt(src, p, 0, 0, 16, 16, ox, oy); return p; };
    const both = blank(128, 32);
    PNG.bitblt(net(tt.log_side), both, 0, 0, 64, 32, 0, 0);
    PNG.bitblt(net(tt.leaves), both, 0, 0, 64, 32, 64, 0);
    const bones = [{ name: 'root', pivot: [0, 0, 0], cubes: cubes.map((c) => ({ origin: c.origin, size: c.size, uv: [c.log ? 0 : 64, 0] })) }];
    views.push(renderView(collectTris(bones as any), both, { yaw: 30 + variant * 40, pitch: 15 }, 240));
  }
  fs.writeFileSync(path.join(OUT, `tree_${t.id}.png`), PNG.sync.write(sheet(views, 3)));
});
console.log('ok');
