import type { Bone, Cube, Decal, Material, Model, Vec3 } from './types.js';

export interface BoxOpts {
  inflate?: number;
  pivot?: Vec3;
  rotation?: Vec3;
  tags?: string[];
}

/**
 * Small fluent builder for Bedrock-style models.
 * All coordinates are absolute model-space pixels.
 */
export class ModelBuilder {
  readonly bones: Bone[] = [];
  readonly decals: Decal[] = [];
  private byName = new Map<string, Bone>();

  constructor(readonly id: string) {}

  bone(name: string, parent: string | undefined, pivot: Vec3, rotation?: Vec3): BoneHandle {
    if (this.byName.has(name)) throw new Error(`${this.id}: duplicate bone ${name}`);
    if (parent && !this.byName.has(parent)) throw new Error(`${this.id}: bone ${name} has unknown parent ${parent}`);
    const b: Bone = { name, parent, pivot: round3(pivot), cubes: [] };
    if (rotation && rotation.some((r) => r !== 0)) b.rotation = rotation;
    this.bones.push(b);
    this.byName.set(name, b);
    return new BoneHandle(this, b);
  }

  has(name: string) {
    return this.byName.has(name);
  }

  get(name: string): BoneHandle {
    const b = this.byName.get(name);
    if (!b) throw new Error(`${this.id}: unknown bone ${name}`);
    return new BoneHandle(this, b);
  }

  /** Add a paint decal; mirrorX also adds the mirrored copy on the other side. */
  decal(d: Decal) {
    const { mirrorX, ...rest } = d;
    this.decals.push(rest);
    if (mirrorX) this.decals.push({ ...rest, center: [-d.center[0], d.center[1], d.center[2]] });
    return this;
  }

  build(): Model {
    return { id: this.id, bones: this.bones, decals: this.decals, textureWidth: 0, textureHeight: 0 };
  }
}

export class BoneHandle {
  constructor(readonly mb: ModelBuilder, readonly bone: Bone) {}

  get name() {
    return this.bone.name;
  }
  get pivot() {
    return this.bone.pivot;
  }

  /** Box from a min corner and integer size. */
  box(origin: Vec3, size: Vec3, mat: Material, opts: BoxOpts = {}): this {
    const s = size.map((v) => Math.max(0, Math.round(v))) as Vec3;
    const c: Cube = { origin: round3(origin), size: s, mat };
    if (opts.inflate) c.inflate = opts.inflate;
    if (opts.rotation && opts.rotation.some((r) => r !== 0)) {
      c.rotation = opts.rotation;
      c.pivot = round3(opts.pivot ?? [origin[0] + s[0] / 2, origin[1] + s[1] / 2, origin[2] + s[2] / 2]);
    }
    if (opts.tags) c.tags = opts.tags;
    this.bone.cubes.push(c);
    return this;
  }

  /** Box centred on x = cx, with given bottom y and front z (min z). */
  boxC(cx: number, y: number, z: number, size: Vec3, mat: Material, opts: BoxOpts = {}): this {
    return this.box([cx - Math.round(size[0]) / 2, y, z], size, mat, opts);
  }

  /** Mirrored pair of boxes: given for the +X (left) side, mirrored to -X. */
  pair(origin: Vec3, size: Vec3, mat: Material, opts: BoxOpts = {}): this {
    this.box(origin, size, mat, opts);
    const mo: Vec3 = [-origin[0] - Math.round(size[0]), origin[1], origin[2]];
    const mopts: BoxOpts = { ...opts };
    if (opts.rotation) mopts.rotation = [opts.rotation[0], -opts.rotation[1], -opts.rotation[2]];
    if (opts.pivot) mopts.pivot = [-opts.pivot[0], opts.pivot[1], opts.pivot[2]];
    else if (opts.rotation) {
      const p: Vec3 = [origin[0] + size[0] / 2, origin[1] + size[1] / 2, origin[2] + size[2] / 2];
      mopts.pivot = [-p[0], p[1], p[2]];
    }
    this.box(mo, size, mat, mopts);
    return this;
  }
}

export function round3(v: Vec3): Vec3 {
  return v.map((x) => Math.round(x * 1000) / 1000) as Vec3;
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
