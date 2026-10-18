// Signature body parts shared between species. Coordinates are in the rig's
// unrotated model space (see rigs.ts); helpers read anchors from rig.a.

import type { Material, Vec3 } from '../model/types.js';
import type { Rig } from '../model/rigs.js';

const head = (r: Rig) => r.mb.get(r.head);
const body = (r: Rig) => r.mb.get('body');

/** Paired horns on the head. z is measured back from the snout tip (0 = tip). */
export function hornPair(r: Rig, o: { fromTip: number; up?: number; len: number; w?: number; tilt?: number; splay?: number; out?: number; mat?: Material }) {
  const w = o.w ?? 2;
  const z = r.a.snoutTip + o.fromTip;
  const y = r.a.headTop + (o.up ?? 0) - 1;
  const x = r.a.headW / 2 - w + (o.out ?? 0);
  head(r).pair([x, y, z], [w, o.len, w], o.mat ?? 'horn', { rotation: [o.tilt ?? 50, 0, -(o.splay ?? 12)], pivot: [x + w / 2, y, z + w / 2] });
}

/** Single nose horn on the snout. */
export function noseHorn(r: Rig, o: { fromTip: number; len: number; w?: number; tilt?: number; up?: number }) {
  const w = o.w ?? 2;
  const z = r.a.snoutTip + o.fromTip;
  const y = r.a.jawY + (o.up ?? 0);
  head(r).box([-w / 2, y, z], [w, o.len, w], 'horn', { rotation: [o.tilt ?? 25, 0, 0], pivot: [0, y, z + w / 2] });
}

/** Neck frill behind the skull (ceratopsians), with optional spikes/hooks along the edge. */
export function frill(r: Rig, o: { w: number; h: number; tilt?: number; spikes?: number; spikeLen?: number; mat?: Material; thick?: number }) {
  const z = r.a.headPivot[2] - 1;
  const y = r.a.jawY + 1;
  const t = o.thick ?? 2;
  const h = head(r);
  h.box([-o.w / 2, y, z], [o.w, o.h, t], o.mat ?? 'accent', { rotation: [-(o.tilt ?? 40), 0, 0], pivot: [0, y, z] });
  if (o.spikes) {
    for (let i = 0; i < o.spikes; i++) {
      const fx = (i / Math.max(1, o.spikes - 1) - 0.5) * (o.w - 2);
      const ang = fx * 4;
      h.box([fx - 1, y + o.h - 1, z], [2, o.spikeLen ?? 4, 2], 'horn', { rotation: [-(o.tilt ?? 40), 0, -ang], pivot: [fx, y, z] });
    }
  }
}

/** Display crest on top of the skull. */
export function crest(r: Rig, o: { fromTip: number; len: number; h: number; w?: number; back?: number; tilt?: number; mat?: Material }) {
  const w = o.w ?? 2;
  const z = r.a.snoutTip + o.fromTip;
  const y = r.a.headTop - 1;
  head(r).box([-w / 2, y, z], [w, o.h, o.len], o.mat ?? 'accent', o.tilt ? { rotation: [o.tilt, 0, 0], pivot: [0, y, z + o.len] } : {});
}

/** Parasaurolophus-style tube crest sweeping back from the head. */
export function tubeCrest(r: Rig, o: { len: number; w?: number; tilt?: number }) {
  const w = o.w ?? 3;
  const z = r.a.craniumZ0 + 1;
  const y = r.a.headTop - 2;
  head(r).box([-w / 2, y, z], [w, w, o.len], 'accent', { rotation: [-(o.tilt ?? 28), 0, 0], pivot: [0, y + w / 2, z] });
}

/** Dorsal sail along the back (Spinosaurus, Dimetrodon, Amargasaurus-ish). */
export function sail(r: Rig, o: { h: number; from: number; to: number; mat?: Material; arch?: boolean; bone?: string }) {
  const b = r.mb.get(o.bone ?? 'body');
  const y = r.a.bodyTop - 1;
  const len = o.to - o.from;
  if (o.arch) {
    const n = Math.max(3, Math.round(len / 4));
    const seg = len / n;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const hh = Math.max(2, Math.round(o.h * Math.sin(Math.PI * (0.15 + t * 0.7))));
      b.box([-0.5, y, o.from + i * seg], [1, hh, Math.ceil(seg)], o.mat ?? 'accent');
    }
  } else b.box([-0.5, y, o.from], [1, o.h, len], o.mat ?? 'accent');
}

/** Alternating plates along the back and tail (Stegosaurus). */
export function plates(r: Rig, o: { count: number; h: number; from: number; to: number; tailCount?: number; tailH?: number; w?: number }) {
  const b = body(r);
  const y = r.a.bodyTop - 2;
  for (let i = 0; i < o.count; i++) {
    const t = i / Math.max(1, o.count - 1);
    const z = o.from + (o.to - o.from) * t;
    const hh = Math.round(o.h * (0.55 + 0.45 * Math.sin(Math.PI * (0.1 + t * 0.8))));
    const len = Math.max(3, Math.round(hh * 0.8));
    const side = i % 2 ? 1 : -1;
    b.box([side * 1.2 - 0.5, y, z - len / 2], [o.w ?? 1, hh, len], 'plate', { rotation: [0, 0, side * -10], pivot: [side, y, z] });
  }
  if (o.tailCount) {
    r.tail.slice(0, 2).forEach((tn, ti) => {
      const t = r.mb.get(tn);
      const [, py, pz] = t.pivot;
      for (let i = 0; i < Math.ceil(o.tailCount! / 2); i++) {
        const hh = Math.max(2, Math.round((o.tailH ?? o.h * 0.5) * (1 - (ti * 2 + i) / (o.tailCount! + 1))));
        const side = i % 2 ? 1 : -1;
        t.box([side * 0.8 - 0.5, py + 1, pz + 2 + i * 5], [1, hh, Math.max(2, hh - 1)], 'plate', { rotation: [0, 0, side * -8], pivot: [side, py, pz] });
      }
    });
  }
}

/** Tail spikes (thagomizer) at the end of the tail. */
export function thagomizer(r: Rig, o: { len: number; pairs?: number }) {
  const last = r.mb.get(r.tail[r.tail.length - 1]);
  const [, py, pz] = last.pivot;
  const pairs = o.pairs ?? 2;
  for (let i = 0; i < pairs; i++) {
    const z = pz + 2 + i * 3;
    last.pair([0.5, py + 1, z], [1, o.len, 1], 'plate', { rotation: [20, 0, -55], pivot: [0.5, py + 1, z] });
  }
}

/** Ankylosaur tail club. */
export function tailClub(r: Rig, o: { w: number; h: number; len: number }) {
  const last = r.mb.get(r.tail[r.tail.length - 1]);
  const z = r.a.tailEnd;
  const [, py] = last.pivot;
  last.box([-o.w / 2, py - o.h / 2 - 1, z - o.len], [o.w, o.h, o.len], 'armor');
  last.box([-o.w / 2 - 1, py - o.h / 2, z - o.len + 1], [o.w + 2, o.h - 2, o.len - 2], 'armor');
}

/** Rows of armour scutes and side spikes over the back (Ankylosaurus, Nodosaurus, Kentrosaurus). */
export function armourBack(r: Rig, o: { rows?: number; spikes?: number; spikeLen?: number; from?: number; to?: number }) {
  const b = body(r);
  const { bodyW, bodyH, bodyTop, bodyY } = r.a;
  const from = o.from ?? r.a.bodyFront + 1, to = o.to ?? r.a.bodyBack - 1;
  // shell layer slightly bigger than the body
  b.box([-bodyW / 2 - 1, bodyTop - 2, from], [bodyW + 2, 3, to - from], 'armor');
  b.box([-bodyW / 2 - 1.5, bodyY, from + 1], [1, Math.round(bodyH * 0.4), to - from - 2], 'armor');
  b.box([bodyW / 2 + 0.5, bodyY, from + 1], [1, Math.round(bodyH * 0.4), to - from - 2], 'armor');
  const n = o.spikes ?? 0;
  for (let i = 0; i < n; i++) {
    const z = from + 2 + ((to - from - 4) * i) / Math.max(1, n - 1);
    b.pair([bodyW / 2 + 1, bodyY + 1, z], [o.spikeLen ?? 4, 1, 1], 'plate', { rotation: [0, 0, 20], pivot: [bodyW / 2 + 1, bodyY + 1, z] });
  }
}

/** Long feathers trailing from the arms (raptors, oviraptorids). */
export function armFeathers(r: Rig, o: { len: number; h?: number; mat?: Material }) {
  for (const a of r.arms) {
    const b = r.mb.get(a);
    const [px, py, pz] = b.pivot;
    b.box([px - 0.5, py - (o.h ?? 6), pz], [1, o.h ?? 6, o.len], o.mat ?? 'quill');
  }
}

/** Fan of feathers at the tail tip. */
export function tailFan(r: Rig, o: { w: number; len: number; mat?: Material }) {
  const last = r.mb.get(r.tail[r.tail.length - 1]);
  const [, py] = last.pivot;
  last.box([-o.w / 2, py, r.a.tailEnd - 2], [o.w, 0, o.len], o.mat ?? 'quill');
}

/** Pachycephalosaur dome with knobs. */
export function dome(r: Rig, o: { h: number; knobs?: boolean }) {
  const h = head(r);
  const w = r.a.headW;
  const z0 = r.a.craniumZ0;
  const len = r.a.headPivot[2] - z0;
  const y = r.a.headTop - 1;
  h.box([-w / 2 - 0.5, y, z0 + 1], [w + 1, o.h, len], 'horn');
  h.box([-w / 2 + 1, y + o.h - 1, z0 + 2], [w - 2, 2, len - 2], 'horn');
  if (o.knobs) for (let i = 0; i < 3; i++) h.pair([w / 2, y - 1, z0 + 2 + i * 2.5], [1, 1, 1], 'horn');
}

/** Big sickle claw on raptor feet. */
export function sickleClaws(r: Rig) {
  for (const leg of r.legs) {
    const f = r.mb.get(leg.chain[leg.chain.length - 1]);
    const [x, y] = f.pivot;
    f.box([x - 0.5, 0, -2], [1, 3, 1], 'claw', { rotation: [-30, 0, 0], pivot: [x, 2, -2] });
    void y;
  }
}

/** Generic decorative spike pair on the neck/shoulders (Sauropelta, Amargasaurus). */
export function neckSpines(r: Rig, o: { h: number; count: number; bone?: string; mat?: Material }) {
  const n = r.mb.get(o.bone ?? r.neck[0]);
  const [, py, pz] = n.pivot;
  for (let i = 0; i < o.count; i++) {
    const z = pz - 2 - i * 3;
    n.pair([0.5, py + 1, z], [1, o.h, 1], o.mat ?? 'plate', { rotation: [-15, 0, -12], pivot: [0.5, py + 1, z] });
  }
}

/**
 * Swept fin made of stacked slabs that shorten towards the tip (dorsal fins, sails of fish).
 * Grows upwards from (y) at z0..z0+len, sweeping back by `sweep` px per slab.
 */
export function fin(r: Rig, o: { bone: string; y: number; z0: number; len: number; h: number; sweep?: number; down?: boolean; x?: number; mat?: Material }) {
  const b = r.mb.get(o.bone);
  const steps = Math.max(2, Math.round(o.h / 2));
  const sh = o.h / steps;
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const len = Math.max(1, Math.round(o.len * (1 - t * 0.85)));
    const z = o.z0 + (o.sweep ?? 1) * i + (o.len - len) * 0.5;
    const y = o.down ? o.y - (i + 1) * sh : o.y + i * sh;
    b.box([(o.x ?? 0) - 0.5, y, z], [1, Math.ceil(sh), len], o.mat ?? 'fin');
  }
}

export function v(x: number, y: number, z: number): Vec3 {
  return [x, y, z];
}
