// Renders every creature (rest pose + animation frames) to docs/gallery for visual QA.
//   npm run preview [-- <id> ...]   (ids optional)
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { evaluatePose } from '../../src/anim/anims.js';
import { compile } from '../../src/anim/molang.js';
import { assemble, type Assembled } from '../../src/creatures/assemble.js';
import { CREATURES } from '../../src/data/registry.js';
import { toGeoJson } from '../../src/model/geo.js';
import { collectTris, renderView, sheet, type Pose } from './render.js';

const OUT = path.resolve(process.env.PREVIEW_OUT ?? 'docs/gallery');

function poseFor(x: Assembled, q: Record<string, number>, v: Record<string, number> = {}): Pose {
  const env = { q: { modified_move_speed: 0, modified_distance_moved: 0, life_time: 0, is_on_ground: 1, ...q }, v: { ...v } };
  const p = evaluatePose(x.anims, env, compile);
  const out: Pose = {};
  for (const [b, t] of Object.entries(p)) out[b] = { rotation: t.rotation, position: t.position, scale: t.scale };
  return out;
}

export function renderCreature(x: Assembled, size = 300, frames = true): PNG {
  const geo = toGeoJson(x.model, 'g');
  const bones = geo['minecraft:geometry'][0].bones as any;
  const hide = ['saddle'];
  const rest = collectTris(bones, poseFor(x, {}), hide);
  const views: PNG[] = [renderView(rest, x.texture, { yaw: 35, pitch: 18 }, size), renderView(rest, x.texture, { yaw: 90, pitch: 2 }, size)];
  if (frames) {
    const air = x.rig.kind === 'pterosaur';
    const walk = poseFor(x, { modified_move_speed: 0.5, modified_distance_moved: 0.35, life_time: 0.4, is_on_ground: air ? 0 : 1 });
    views.push(renderView(collectTris(bones, walk, hide), x.texture, { yaw: 90, pitch: 2 }, size));
    const extra = x.rig.kind === 'theropod' || x.rig.kind === 'quadruped' ? poseFor(x, { is_sitting: 1, is_saddled: 1 }) : poseFor(x, { life_time: 1.1 }, { attack_time: 0.5 });
    views.push(renderView(collectTris(bones, extra, []), x.texture, { yaw: 215, pitch: 25 }, size));
  }
  return sheet(views, views.length);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const ids = process.argv.slice(2);
  fs.mkdirSync(OUT, { recursive: true });
  for (const def of CREATURES.filter((c) => !ids.length || ids.includes(c.id))) {
    const x = assemble(def);
    fs.writeFileSync(path.join(OUT, `${def.id}.png`), PNG.sync.write(renderCreature(x)));
    console.log('rendered', def.id, `${x.model.textureWidth}x${x.model.textureHeight}`, 'hitbox', x.hitbox, 'seat', x.seat);
  }
}
