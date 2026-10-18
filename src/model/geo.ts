import type { Model, Vec3 } from './types.js';

/** Axis-aligned bounds of all cubes (ignores rotations), in model pixels. */
export function bounds(model: Model): { min: Vec3; max: Vec3 } {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const b of model.bones)
    for (const c of b.cubes)
      for (let i = 0; i < 3; i++) {
        min[i] = Math.min(min[i], c.origin[i]);
        max[i] = Math.max(max[i], c.origin[i] + c.size[i]);
      }
  return { min, max };
}

/** Serialises a packed model to a Bedrock `minecraft:geometry` document (1.16.0). */
export function toGeoJson(model: Model, identifier: string, extraScale = 1) {
  const { min, max } = bounds(model);
  const toBlocks = extraScale / 16;
  const extent = Math.max(Math.abs(min[0]), Math.abs(max[0]), Math.abs(min[2]), Math.abs(max[2])) * 2 * toBlocks;
  const height = max[1] * toBlocks;
  return {
    format_version: '1.16.0',
    'minecraft:geometry': [
      {
        description: {
          identifier,
          texture_width: model.textureWidth,
          texture_height: model.textureHeight,
          visible_bounds_width: Math.ceil(extent + 2),
          visible_bounds_height: Math.ceil(height + 2),
          visible_bounds_offset: [0, Math.round((height / 2) * 100) / 100, 0],
        },
        bones: model.bones.map((b) => ({
          name: b.name,
          ...(b.parent ? { parent: b.parent } : {}),
          pivot: b.pivot,
          ...(b.rotation ? { rotation: b.rotation } : {}),
          ...(b.cubes.length
            ? {
                cubes: b.cubes.map((c) => ({
                  origin: c.origin,
                  size: c.size,
                  uv: c.uv,
                  ...(c.inflate ? { inflate: c.inflate } : {}),
                  ...(c.rotation ? { pivot: c.pivot, rotation: c.rotation } : {}),
                })),
              }
            : {}),
        })),
      },
    ],
  };
}
