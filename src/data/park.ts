// Park equipment: electric fence + generator textures and safari vehicles.
import type { PNG } from 'pngjs';
import { ModelBuilder } from '../model/builder.js';
import type { Palette } from '../texture/painter.js';
import { hex, darken, lighten, shade, type RGB } from '../texture/color.js';
import { blank, fill, set, jitter } from '../texture/pixelart.js';
import { hash3 } from '../texture/noise.js';

// ---------------------------------------------------------------- electric fence

/**
 * 16×16 atlas used by geometry.dino.electric_fence:
 *   row 0      wire
 *   [0,1]4×15  post sides        [4,1]4×4  post ends
 *   [8,1]4×2   insulator sides   [8,3]4×4  insulator ends
 *   [12,1]4×2  cap sides         [12,3]4×4 cap top
 */
function fenceTex(on: boolean): PNG {
  const p = blank();
  const metal = hex('#6b7077'), metalD = hex('#454a50'), metalL = hex('#9aa0a7');
  const wire = on ? hex('#9ff3ff') : hex('#8a8f96');
  for (let x = 0; x < 16; x++) set(p, x, 0, on ? (x % 4 === 0 ? hex('#ffffff') : wire) : x % 3 ? wire : darken(wire, 0.2));
  // post: galvanised steel with bolts and hazard band at the top
  for (let y = 1; y < 16; y++)
    for (let x = 0; x < 4; x++) {
      let c: RGB = x === 0 ? metalL : x === 3 ? metalD : metal;
      if (y < 4) c = (x + y) % 2 ? hex('#e3b51e') : hex('#262626');
      if ((y === 7 || y === 12) && (x === 1 || x === 2)) c = darken(metal, 0.4);
      set(p, x, y, shade(c, 0.95 + hash3(x, y, 7) * 0.1));
    }
  for (let y = 1; y < 5; y++) for (let x = 4; x < 8; x++) set(p, x, y, (x + y) % 2 ? metalD : metal);
  const ins = on ? hex('#ffd34a') : hex('#d8d2bf');
  for (let y = 1; y < 3; y++) for (let x = 8; x < 12; x++) set(p, x, y, y === 1 ? lighten(ins, 0.2) : ins);
  for (let y = 3; y < 7; y++) for (let x = 8; x < 12; x++) set(p, x, y, ins);
  const cap = on ? hex('#ff4a3a') : hex('#7a2a24');
  for (let y = 1; y < 3; y++) for (let x = 12; x < 16; x++) set(p, x, y, y === 1 ? lighten(cap, 0.25) : cap);
  for (let y = 3; y < 7; y++) for (let x = 12; x < 16; x++) set(p, x, y, on && (x === 13 || x === 14) && (y === 4 || y === 5) ? hex('#ffffff') : cap);
  return p;
}

export const fenceTextures = () => ({ off: fenceTex(false), on: fenceTex(true) });

export function generatorTextures() {
  const body = hex('#3d4248');
  const side = (on: boolean) =>
    jitter(
      fill(16, 16, (x, y) => {
        if (x === 0 || y === 0 || x === 15 || y === 15) return hex('#24282c');
        if (y <= 3 || y >= 12) return (x + y) % 4 < 2 ? hex('#e3b51e') : hex('#1e1e1e'); // hazard stripes
        // lightning bolt symbol
        const bolt = ['......YY', '.....YY.', '....YYYY', '......Y.', '.....Y..'];
        const by = y - 5, bx = x - 4;
        if (by >= 0 && by < bolt.length && bx >= 0 && bx < 8 && bolt[by][bx] === 'Y') return on ? hex('#fff38a') : hex('#b8a33a');
        if (y === 11 && x > 10 && x < 14) return on ? hex('#5cff6a') : hex('#2a4a2c'); // status lamp
        return shade(body, 0.95 + hash3(x, y, 3) * 0.1);
      }),
      0.03,
      5,
    );
  const top = fill(16, 16, (x, y) => {
    if (x === 0 || y === 0 || x === 15 || y === 15) return hex('#24282c');
    if (y % 3 === 1 && x > 2 && x < 13) return hex('#16181a'); // vents
    return shade(body, 0.9 + hash3(x, y, 9) * 0.15);
  });
  return { side: side(false), sideOn: side(true), top };
}

// ---------------------------------------------------------------- vehicles

export interface VehicleDef {
  id: string;
  name: string;
  info: string;
  seats: number;
  speed: number;
  health: number;
  scale: number;
  palette: Palette;
  /** collision box in blocks at scale 1 (multiplied by scale) */
  hitbox: { width: number; height: number };
  /** seat centres in model pixels: [x, seat surface y, z] (model faces -z) */
  seatsPx: [number, number, number][];
  build(): ModelBuilder;
  wheels: string[];
  spinBone?: string;
}

/** Common wheel: tyre + hub, on its own bone so it can spin. */
function wheel(mb: ModelBuilder, name: string, x: number, z: number, r: number, w: number) {
  const b = mb.bone(name, 'chassis', [x, r, z]);
  const x0 = x > 0 ? x - w / 2 : x - w / 2;
  b.box([x0, 0, z - r], [w, 2 * r, 2 * r], 'tyre');
  b.box([x0 - 0.2, r - r / 2, z - r / 2], [w + 0.4, r, r], 'chrome', { inflate: 0.05 });
}

export const VEHICLES: VehicleDef[] = [
  {
    id: 'safari_truck',
    name: 'Safari Truck',
    info: 'An open-top park ranger truck. Seats four. Hop in and drive with WASD.',
    seats: 4,
    speed: 0.32,
    health: 60,
    scale: 1.45,
    hitbox: { width: 1.7, height: 1.4 },
    seatsPx: [[5.5, 12, 1.5], [-5.5, 12, 1.5], [5.5, 12, 15.5], [-5.5, 12, 15.5]],
    wheels: ['wheel_fl', 'wheel_fr', 'wheel_bl', 'wheel_br'],
    palette: { back: '#3f6b2f', side: '#3f6b2f', belly: '#2b2b2b', accent: '#3f6b2f', accent2: '#e3b43a' },
    build() {
      const mb = new ModelBuilder('safari_truck');
      mb.bone('root', undefined, [0, 0, 0]);
      const c = mb.bone('chassis', 'root', [0, 6, 0]);
      c.box([-12, 5, -20], [24, 3, 42], 'tyre'); // frame
      // lower body
      c.box([-13, 8, -21], [26, 7, 44], 'paint');
      c.box([-13.5, 12, -21], [27, 2, 44], 'paint2', { inflate: 0.05 }); // stripe
      // hood + grille + bumper
      c.box([-12, 15, -21], [24, 3, 12], 'paint');
      c.box([-11, 9, -22], [22, 6, 1], 'metal');
      c.box([-13, 7, -23], [26, 2, 2], 'metal');
      c.box([-11, 12, -22.5], [3, 2, 1], 'lamp');
      c.box([8, 12, -22.5], [3, 2, 1], 'lamp');
      // windscreen frame + glass
      c.box([-12, 18, -9], [24, 1, 1], 'metal');
      c.box([-12, 18, -9], [1, 9, 1], 'metal');
      c.box([11, 18, -9], [1, 9, 1], 'metal');
      c.box([-12, 26, -9], [24, 1, 1], 'metal');
      c.box([-11, 19, -8.8], [22, 7, 0], 'glass');
      // roll cage
      c.box([-12, 15, 6], [1, 18, 1], 'metal');
      c.box([11, 15, 6], [1, 18, 1], 'metal');
      c.box([-12, 32, 6], [24, 1, 1], 'metal');
      c.box([-12, 32, -9], [1, 1, 16], 'metal');
      c.box([11, 32, -9], [1, 1, 16], 'metal');
      c.box([-12, 33, -8], [24, 1, 14], 'canvas'); // sun canopy
      c.box([-10, 33.6, -2], [20, 1, 2], 'lamp'); // light bar
      // seats
      // seats sit low in the tub, like a real open 4x4
      for (const [x, z] of [[-5.5, -4], [5.5, -4], [-5.5, 12], [5.5, 12]]) {
        c.box([x - 4, 10, z - 2], [8, 2, 7], 'seat');
        c.box([x - 4, 12, z + 4], [8, 9, 1], 'seat');
      }
      // steering wheel + column
      c.box([-8, 17, -6], [5, 5, 1], 'tyre', { rotation: [-30, 0, 0] });
      c.box([-6, 13, -7], [1, 5, 1], 'metal', { rotation: [-30, 0, 0] });
      // rear spare tyre
      c.box([-5, 12, 23], [10, 10, 3], 'tyre');
      // fenders
      c.box([-14, 13, -18], [5, 2, 10], 'paint');
      c.box([9, 13, -18], [5, 2, 10], 'paint');
      c.box([-14, 13, 9], [5, 2, 10], 'paint');
      c.box([9, 13, 9], [5, 2, 10], 'paint');
      wheel(mb, 'wheel_fl', 11.5, -13, 5.5, 4);
      wheel(mb, 'wheel_fr', -11.5, -13, 5.5, 4);
      wheel(mb, 'wheel_bl', 11.5, 14, 5.5, 4);
      wheel(mb, 'wheel_br', -11.5, 14, 5.5, 4);
      return mb;
    },
  },
  {
    id: 'tour_car',
    name: 'Park Tour Car',
    info: 'A closed tour SUV with a panoramic glass roof. Seats four.',
    seats: 4,
    speed: 0.3,
    health: 80,
    scale: 1.45,
    hitbox: { width: 1.7, height: 1.6 },
    seatsPx: [[5.5, 12, 0.5], [-5.5, 12, 0.5], [5.5, 12, 14.5], [-5.5, 12, 14.5]],
    wheels: ['wheel_fl', 'wheel_fr', 'wheel_bl', 'wheel_br'],
    palette: { back: '#ecebe4', side: '#ecebe4', belly: '#2b2b2b', accent: '#ecebe4', accent2: '#c0392b' },
    build() {
      const mb = new ModelBuilder('tour_car');
      mb.bone('root', undefined, [0, 0, 0]);
      const c = mb.bone('chassis', 'root', [0, 6, 0]);
      c.box([-12, 5, -20], [24, 3, 42], 'tyre');
      c.box([-13, 8, -22], [26, 9, 46], 'paint');
      c.box([-13.5, 12, -22], [27, 2, 46], 'paint2', { inflate: 0.05 });
      c.box([-12, 17, -22], [24, 2, 11], 'paint'); // hood
      c.box([-11, 9, -23], [22, 6, 1], 'chrome');
      c.box([-13, 7, -24], [26, 2, 2], 'metal');
      c.box([-11, 13, -23.5], [4, 2, 1], 'lamp');
      c.box([7, 13, -23.5], [4, 2, 1], 'lamp');
      // cabin: pillars + glass + white roof with glass bubble
      c.box([-12, 19, -11], [24, 14, 1], 'glass');
      // lower door panels, window pillars and side glass
      c.box([-13, 17, -10], [1, 4, 33], 'paint');
      c.box([12, 17, -10], [1, 4, 33], 'paint');
      for (const z of [-10, 5, 20]) {
        c.box([-13, 21, z], [1, 12, 2], 'paint');
        c.box([12, 21, z], [1, 12, 2], 'paint');
      }
      c.box([-12.6, 21, -8], [0, 12, 28], 'glass');
      c.box([12.6, 21, -8], [0, 12, 28], 'glass');
      c.box([-12, 17, 22], [24, 16, 1], 'paint');
      c.box([-10, 24, 22.2], [20, 7, 1], 'glass');
      c.box([-13, 33, -11], [26, 2, 34], 'paint');
      c.box([-8, 35, -6], [16, 3, 22], 'glass'); // bubble roof
      c.box([-13.5, 29, -11], [27, 1, 34], 'paint2', { inflate: 0.05 });
      for (const [x, z] of [[-5.5, -5], [5.5, -5], [-5.5, 11], [5.5, 11]]) {
        c.box([x - 4, 10, z - 2], [8, 2, 7], 'seat');
        c.box([x - 4, 12, z + 4], [8, 10, 1], 'seat');
      }
      c.box([-8, 18, -7], [5, 5, 1], 'tyre', { rotation: [-30, 0, 0] }); // steering wheel
      wheel(mb, 'wheel_fl', 11.5, -14, 5.5, 4);
      wheel(mb, 'wheel_fr', -11.5, -14, 5.5, 4);
      wheel(mb, 'wheel_bl', 11.5, 14, 5.5, 4);
      wheel(mb, 'wheel_br', -11.5, 14, 5.5, 4);
      return mb;
    },
  },
  {
    id: 'gyrosphere',
    name: 'Gyrosphere',
    info: 'A self-balancing glass sphere for two. Rolls right up to the herds.',
    seats: 2,
    speed: 0.28,
    health: 40,
    scale: 1.4,
    hitbox: { width: 1.8, height: 1.9 },
    seatsPx: [[4.5, 8, 1.5], [-4.5, 8, 1.5]],
    wheels: [],
    spinBone: 'shell',
    palette: { back: '#c8ccd0', side: '#c8ccd0', belly: '#2b2b2b', accent: '#c8ccd0', accent2: '#2f6f8f' },
    build() {
      const mb = new ModelBuilder('gyrosphere');
      mb.bone('root', undefined, [0, 0, 0]);
      mb.bone('chassis', 'root', [0, 15, 0]);
      // glass shell made of stacked rings so it reads as a sphere
      const shell = mb.bone('shell', 'chassis', [0, 15, 0]);
      const R = 15;
      for (let i = 0; i < 10; i++) {
        const y0 = -R + (i * 2 * R) / 10;
        const yc = y0 + R / 10;
        const r = Math.sqrt(Math.max(0, R * R - yc * yc));
        const s = Math.max(2, Math.round(r * 2));
        shell.box([-s / 2, 15 + y0, -s / 2], [s, Math.round((2 * R) / 10), s], 'glass');
      }
      // metal equator ring (four bars, so the sphere stays see-through)
      shell.box([-15.5, 14, -15.5], [31, 2, 2], 'chrome', { inflate: 0.1 });
      shell.box([-15.5, 14, 13.5], [31, 2, 2], 'chrome', { inflate: 0.1 });
      shell.box([-15.5, 14, -13.5], [2, 2, 27], 'chrome', { inflate: 0.1 });
      shell.box([13.5, 14, -13.5], [2, 2, 27], 'chrome', { inflate: 0.1 });
      // inner gimballed cabin stays upright
      const cab = mb.bone('cabin', 'chassis', [0, 15, 0]);
      cab.box([-9, 3, -6], [18, 3, 12], 'paint2');
      cab.box([-8, 6, -2], [7, 2, 7], 'seat');
      cab.box([1, 6, -2], [7, 2, 7], 'seat');
      cab.box([-8, 8, 4], [7, 8, 1], 'seat');
      cab.box([1, 8, 4], [7, 8, 1], 'seat');
      cab.box([-4, 7, -7], [8, 5, 2], 'metal'); // dashboard
      cab.box([-3, 11, -6.5], [6, 2, 0], 'lamp');
      return mb;
    },
  },
];
