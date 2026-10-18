// A seated player-sized dummy (1.8 blocks tall) for checking rider fit in previews.
import { ModelBuilder } from '../../src/model/builder.js';
import { toGeoJson } from '../../src/model/geo.js';
import { packUV } from '../../src/model/uv.js';
import { paint } from '../../src/texture/painter.js';
import type { Vec3 } from '../../src/model/types.js';
import { collectTris, type Tri } from './render.js';

/** Dummies with their seat (hips) at the given model-pixel positions, facing -z. `scale` maps seats into render space. */
export function seatedDummies(seats: Vec3[], scale = 1): Tri[] {
  const mb = new ModelBuilder('dummy');
  mb.bone('root', undefined, [0, 0, 0]);
  const b = mb.bone('p', 'root', [0, 0, 0]);
  for (const [x0, y0, z0] of seats) {
    const [x, y, z] = [x0 * scale, y0 * scale, z0 * scale];
    b.box([x - 4, y, z - 2], [8, 12, 4], 'paint'); // torso
    b.box([x - 4, y + 12, z - 4], [8, 8, 8], 'skin'); // head
    b.box([x - 4, y, z - 12], [4, 4, 12], 'paint2'); // legs forward
    b.box([x, y, z - 12], [4, 4, 12], 'paint2');
    b.box([x - 8, y + 2, z - 2], [4, 10, 4], 'skin'); // arms
    b.box([x + 4, y + 2, z - 2], [4, 10, 4], 'skin');
  }
  const m = packUV(mb.build());
  const tex = paint(m, { back: '#c8956c', side: '#c8956c', belly: '#b07a55', accent: '#2f8fa8', accent2: '#3a3a8a' });
  return collectTris(toGeoJson(m, 'd')['minecraft:geometry'][0].bones as any).map((t) => ({ ...t, tex }));
}
