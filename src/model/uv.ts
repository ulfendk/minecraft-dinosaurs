import type { Cube, Model } from './types.js';

/** Box-UV footprint of a cube: [width, height] in texels. */
export function footprint(c: Cube): [number, number] {
  const [w, h, d] = c.size;
  return [2 * (w + d), d + h];
}

/**
 * Shelf-packs every cube's box-UV net into a texture and writes cube.uv.
 * Width/height are powers of two so the texture is mip-friendly.
 */
export function packUV(model: Model, pad = 0): Model {
  const cubes = model.bones.flatMap((b) => b.cubes).filter((c) => {
    const [fw, fh] = footprint(c);
    return fw > 0 && fh > 0;
  });
  const area = cubes.reduce((a, c) => {
    const [fw, fh] = footprint(c);
    return a + (fw + pad) * (fh + pad);
  }, 0);
  const widest = Math.max(16, ...cubes.map((c) => footprint(c)[0] + pad));
  let width = 16;
  while (width < widest || width * width < area * 1.15) width *= 2;

  const order = [...cubes].sort((a, b) => footprint(b)[1] - footprint(a)[1] || footprint(b)[0] - footprint(a)[0]);
  for (;;) {
    let x = 0;
    let y = 0;
    let shelf = 0;
    for (const c of order) {
      const [fw, fh] = footprint(c);
      if (x + fw > width) {
        x = 0;
        y += shelf + pad;
        shelf = 0;
      }
      c.uv = [x, y];
      x += fw + pad;
      shelf = Math.max(shelf, fh);
    }
    const used = y + shelf;
    let height = 16;
    while (height < used) height *= 2;
    if (height <= width * 2) {
      model.textureWidth = width;
      model.textureHeight = height;
      break;
    }
    width *= 2;
  }
  // zero-area cubes still need a uv entry
  for (const b of model.bones) for (const c of b.cubes) c.uv ??= [0, 0];
  return model;
}
