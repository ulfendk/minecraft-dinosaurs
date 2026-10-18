import type { Vec3 } from './types.js';

/**
 * Box-UV face layout shared by the texture painter and the preview renderer.
 *
 * For a cube of size (w,h,d) at uv (u,v) the net is:
 *
 *            u+d      u+d+w    u+d+2w
 *   v        [  up   ][ down  ]
 *   v+d [xmin][ zmin  ][ xmax ][ zmax  ]
 *
 * In Bedrock model space the creature faces -Z ("zmin" = front) and +X is the
 * creature's left. Each face maps texel (i, j) -- column i, row j inside its
 * rectangle -- to a point on the cube surface.
 */
export type FaceName = 'xmin' | 'zmin' | 'xmax' | 'zmax' | 'up' | 'down';

export interface FaceLayout {
  face: FaceName;
  rect: [number, number, number, number]; // u, v, width, height
  normal: Vec3;
  /** texel (i,j) centre → surface point, given cube min/max */
  point(i: number, j: number): Vec3;
  /** corner (s,t) in [0,1]² of the rect → surface point (for rendering) */
  corner(s: number, t: number): Vec3;
}

export function boxFaces(origin: Vec3, size: Vec3, uv: [number, number]): FaceLayout[] {
  const [x0, y0, z0] = origin;
  const [w, h, d] = size;
  const x1 = x0 + w,
    y1 = y0 + h,
    z1 = z0 + d;
  const [u, v] = uv;
  return [
    {
      face: 'xmin',
      rect: [u, v + d, d, h],
      normal: [-1, 0, 0],
      point: (i, j) => [x0, y1 - (j + 0.5), z1 - (i + 0.5)],
      corner: (s, t) => [x0, y1 - t * h, z1 - s * d],
    },
    {
      face: 'zmin',
      rect: [u + d, v + d, w, h],
      normal: [0, 0, -1],
      point: (i, j) => [x0 + (i + 0.5), y1 - (j + 0.5), z0],
      corner: (s, t) => [x0 + s * w, y1 - t * h, z0],
    },
    {
      face: 'xmax',
      rect: [u + d + w, v + d, d, h],
      normal: [1, 0, 0],
      point: (i, j) => [x1, y1 - (j + 0.5), z0 + (i + 0.5)],
      corner: (s, t) => [x1, y1 - t * h, z0 + s * d],
    },
    {
      face: 'zmax',
      rect: [u + 2 * d + w, v + d, w, h],
      normal: [0, 0, 1],
      point: (i, j) => [x1 - (i + 0.5), y1 - (j + 0.5), z1],
      corner: (s, t) => [x1 - s * w, y1 - t * h, z1],
    },
    {
      face: 'up',
      rect: [u + d, v, w, d],
      normal: [0, 1, 0],
      point: (i, j) => [x0 + (i + 0.5), y1, z1 - (j + 0.5)],
      corner: (s, t) => [x0 + s * w, y1, z1 - t * d],
    },
    {
      face: 'down',
      rect: [u + d + w, v, w, d],
      normal: [0, -1, 0],
      point: (i, j) => [x0 + (i + 0.5), y0, z0 + (j + 0.5)],
      corner: (s, t) => [x0 + s * w, y0, z0 + t * d],
    },
  ];
}
