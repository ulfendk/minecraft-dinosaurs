import type { PNG } from 'pngjs';
import { buildAnimations, type AnimSet } from '../anim/anims.js';
import type { CreatureDef } from '../data/types.js';
import { bounds } from '../model/geo.js';
import type { Rig } from '../model/rigs.js';
import type { Model } from '../model/types.js';
import { packUV } from '../model/uv.js';
import { paint } from '../texture/painter.js';

export interface Assembled {
  def: CreatureDef;
  rig: Rig;
  model: Model;
  texture: PNG;
  anims: AnimSet;
  hitbox: { width: number; height: number };
  seat: { y: number; z: number };
}

const round = (v: number, p = 100) => Math.round(v * p) / p;

/** Adds a saddle (seat, straps, stirrups) on the rig's back; hidden unless saddled. */
export function addSaddle(rig: Rig) {
  const { a, mb } = rig;
  const [, sy, sz] = a.seat;
  const w = Math.max(4, Math.round(a.bodyW * 0.7));
  const len = Math.max(5, Math.round(Math.min(a.bodyW * 0.9, 12)));
  const s = mb.bone('saddle', 'body', [0, sy, sz]);
  s.box([-w / 2, sy - 0.5, sz - len / 2], [w, 2, len], 'saddle');
  s.box([-w / 2 + 1, sy + 1.5, sz + len / 2 - 2], [w - 2, 2, 2], 'saddle'); // cantle
  s.box([-1, sy + 1.5, sz - len / 2], [2, 2, 1], 'saddle'); // horn
  // girth strap down both flanks
  s.box([-a.bodyW / 2 - 0.2, sy - a.bodyH * 0.8, sz - 1], [a.bodyW, Math.round(a.bodyH * 0.8), 2], 'strap', { inflate: 0.15 });
  // stirrups
  s.pair([a.bodyW / 2 + 0.3, sy - a.bodyH * 0.55, sz], [1, Math.round(a.bodyH * 0.45), 1], 'strap');
  s.pair([a.bodyW / 2, sy - a.bodyH * 0.55 - 1, sz - 1], [2, 1, 3], 'metal');
}

export function assemble(def: CreatureDef): Assembled {
  const rig = def.build();
  if (def.ride) addSaddle(rig);
  const model = packUV(rig.mb.build());
  const texture = paint(model, def.palette);
  const anims = buildAnimations(def.id, rig, def.scale);
  const b = bounds(model);
  const k = def.scale / 16;
  const len = (b.max[2] - b.min[2]) * k;
  const wide = (b.max[0] - b.min[0]) * k;
  const hitbox = def.hitbox ?? {
    width: round(Math.min(5, Math.max(0.4, Math.min(len * 0.45, Math.max(wide, rig.a.bodyW * k * 1.6))))),
    height: round(Math.min(10, Math.max(0.4, b.max[1] * k * 0.92))),
  };
  // Bedrock entity space faces +Z while the model faces -Z, so flip z.
  const seat = { y: round(rig.a.seat[1] * k - 0.3), z: round(-rig.a.seat[2] * k) };
  return { def, rig, model, texture, anims, hitbox, seat };
}
