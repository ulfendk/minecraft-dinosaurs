// Renders packs/static/pack_icon.png: a T. rex portrait on a jungle backdrop.
import fs from 'node:fs';
import { PNG } from 'pngjs';
import { assemble } from '../src/creatures/assemble.js';
import { CREATURES } from '../src/data/registry.js';
import { toGeoJson } from '../src/model/geo.js';
import { collectTris, renderView } from './preview/render.js';

const x = assemble(CREATURES.find((c) => c.id === 'tyrannosaurus')!);
const bones = toGeoJson(x.model, 'g')['minecraft:geometry'][0].bones as any;
// open the jaws a little for the portrait
const tris = collectTris(bones, { jaw: { rotation: [24, 0, 0] }, head: { rotation: [-8, -20, 0] } }, ['saddle', 'tail1', 'tail2', 'tail3', 'tail4']);
const big = renderView(tris, x.texture, { yaw: 28, pitch: 8 }, 640, x.model.textureWidth, x.model.textureHeight, [1, 2, 3]);
const S = 256;
const out = new PNG({ width: S, height: S });
// crop a square around the head: top-right corner of the creature's bounding box
let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1;
for (let y = 0; y < big.height; y++)
  for (let X = 0; X < big.width; X++) {
    const k = (y * big.width + X) * 4;
    if (big.data[k] === 1 && big.data[k + 1] === 2 && big.data[k + 2] === 3) continue;
    minX = Math.min(minX, X); maxX = Math.max(maxX, X); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
const cs = Math.round((maxY - minY) * 0.82);
const cx = Math.max(0, maxX - cs + Math.round(cs * 0.04)), cy = Math.max(0, minY - Math.round(cs * 0.08));
for (let y = 0; y < S; y++)
  for (let X = 0; X < S; X++) {
    const t = y / S;
    let r = 32 + 40 * t, g = 70 + 50 * t, b = 34 + 20 * t; // jungle gradient
    const d = Math.hypot(X - S * 0.62, y - S * 0.4) / S;
    r += 60 * Math.max(0, 0.35 - d); g += 70 * Math.max(0, 0.35 - d); b += 30 * Math.max(0, 0.35 - d);
    const sx = Math.floor(cx + (X * cs) / S), sy = Math.floor(cy + (y * cs) / S);
    const k = (sy * big.width + sx) * 4;
    if (sx < big.width && sy < big.height && !(big.data[k] === 1 && big.data[k + 1] === 2 && big.data[k + 2] === 3)) {
      r = big.data[k]; g = big.data[k + 1]; b = big.data[k + 2];
    }
    const o = (y * S + X) * 4;
    out.data[o] = r; out.data[o + 1] = g; out.data[o + 2] = b; out.data[o + 3] = 255;
  }
fs.writeFileSync('packs/static/pack_icon.png', PNG.sync.write(out));
console.log('icon written');
