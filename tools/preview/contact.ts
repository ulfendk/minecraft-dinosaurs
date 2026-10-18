// Builds a contact sheet from gallery images: panel N of every creature in a grid.
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
const [dir, out, panelArg, cellArg, colsArg] = process.argv.slice(2);
const panel = Number(panelArg ?? 0), cell = Number(cellArg ?? 150), cols = Number(colsArg ?? 8);
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
const rows = Math.ceil(files.length / cols);
const sheet = new PNG({ width: cols * cell, height: rows * cell });
sheet.data.fill(255);
files.forEach((f, i) => {
  const img = PNG.sync.read(fs.readFileSync(path.join(dir, f)));
  const s = img.height; // square panels
  const ox = (i % cols) * cell, oy = Math.floor(i / cols) * cell;
  for (let y = 0; y < cell; y++)
    for (let x = 0; x < cell; x++) {
      const sx = panel * s + Math.floor((x * s) / cell), sy = Math.floor((y * s) / cell);
      const k = (sy * img.width + sx) * 4, o = ((oy + y) * sheet.width + ox + x) * 4;
      for (let c = 0; c < 4; c++) sheet.data[o + c] = img.data[k + c];
    }
});
fs.writeFileSync(out, PNG.sync.write(sheet));
console.log(files.map((f, i) => `${i}:${f.replace('.png', '')}`).join(' '));
