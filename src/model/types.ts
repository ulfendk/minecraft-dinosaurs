// Core model types. Coordinates follow the Bedrock geometry convention:
// units are model pixels (16 = 1 block), Y is up, the creature faces -Z and
// +X is the creature's left side. Cube origins and bone pivots are absolute.

export type Vec3 = [number, number, number];

/** Surface material of a cube; decides how the texture painter colours it. */
export type Material =
  | 'skin'      // patterned hide, countershaded from back to belly
  | 'belly'     // always the light underside colour
  | 'dark'      // darker accent hide (stripes, crest base)
  | 'accent'    // species display colour (crests, frills, sails, wattles)
  | 'horn'      // keratin horn / beak
  | 'claw'
  | 'tooth'
  | 'mouth'     // gums / inside of mouth
  | 'eye'
  | 'feather'   // fluffy feathered coat (uses skin colours with feather texture)
  | 'quill'     // long display feathers using accent colour
  | 'plate'     // osteoderm plates and spikes
  | 'armor'     // ankylosaur scutes
  | 'membrane'  // wing / sail membranes
  | 'fin'       // fish/reptile fins
  | 'saddle'    // leather saddle
  | 'strap'
  | 'metal'
  // vehicle and block materials
  | 'paint' | 'paint2' | 'glass' | 'tyre' | 'chrome' | 'seat' | 'lamp' | 'canvas';

export interface Cube {
  origin: Vec3;
  size: Vec3;
  mat: Material;
  inflate?: number;
  pivot?: Vec3;
  rotation?: Vec3;
  /** assigned by the UV packer */
  uv?: [number, number];
  /** extra tags the painter can use (e.g. 'snout', 'jaw', 'teeth-down') */
  tags?: string[];
}

export interface Bone {
  name: string;
  parent?: string;
  pivot: Vec3;
  rotation?: Vec3;
  cubes: Cube[];
}

/** A paint decal in model space: affects texels whose surface point lies inside. */
export interface Decal {
  kind: 'eye' | 'nostril' | 'spot' | 'stripe' | 'colour';
  center: Vec3;
  radius: Vec3; // ellipsoid radii
  colour?: string;
  /** only paint on cubes with this material (default: any skin-like) */
  onlyMat?: Material[];
  mirrorX?: boolean;
}

export interface Model {
  id: string;            // e.g. "tyrannosaurus"
  bones: Bone[];
  decals: Decal[];
  textureWidth: number;
  textureHeight: number;
}
