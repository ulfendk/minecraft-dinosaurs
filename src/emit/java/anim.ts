// Converts a Bedrock AnimSet (client-entity pre_animation + conditional animate list)
// into one GeckoLib looping animation with plain Molang expressions.
//
// GeckoLib cannot run client-entity scripts, so pre_animation variables are inlined
// and Bedrock-only queries are mapped to actor variables registered by the mod
// (see DinoAnimationVariables.java).

import type { AnimSet } from '../../anim/anims.js';

/** Bedrock query/variable → GeckoLib expression. */
const QUERY_MAP: [RegExp, string][] = [
  [/query\.property\(\s*'dino:sedated'\s*\)/g, 'variable.dino_sedated'],
  [/query\.modified_move_speed/g, 'variable.dino_speed'],
  [/query\.modified_distance_moved/g, 'variable.dino_dist'],
  [/query\.target_x_rotation/g, 'variable.dino_pitch'],
  [/query\.target_y_rotation/g, 'variable.dino_yaw'],
  [/query\.is_sitting/g, 'variable.dino_sit'],
  [/variable\.attack_time/g, 'variable.dino_attack'],
];

export const JAVA_VARIABLES = ['variable.dino_sedated', 'variable.dino_speed', 'variable.dino_dist', 'variable.dino_pitch', 'variable.dino_yaw', 'variable.dino_sit', 'variable.dino_attack'];

function mapQueries(e: string) {
  for (const [re, to] of QUERY_MAP) e = e.replace(re, to);
  return e;
}

/** Parses `variable.x = expr;` lines and returns a function that inlines them (in order). */
function inliner(pre: string[]) {
  const defs: [string, string][] = [];
  const sub = (e: string) => {
    for (const [name, value] of defs) e = e.replace(new RegExp(`\\b${name.replace('.', '\\.')}\\b`, 'g'), `(${value})`);
    return e;
  };
  for (const line of pre) {
    const m = line.trim().match(/^(variable\.[a-z_]+)\s*=\s*(.+?);?$/i);
    if (!m) continue;
    const name = m[1].toLowerCase();
    if (name === 'variable.attack_time') continue;
    defs.push([name, sub(mapQueries(m[2]))]);
  }
  return (e: string | number) => (typeof e === 'number' ? e : sub(mapQueries(e)));
}

type Vec = (string | number)[];

/** One looping GeckoLib animation that sums every (conditional) Bedrock animation. */
export function mergedAnimation(id: string, set: AnimSet) {
  const inline = inliner(set.pre);
  const bones: Record<string, { rotation: string[]; position: string[]; scale: string[] }> = {};
  const bone = (n: string) => (bones[n] ??= { rotation: [], position: [], scale: [] });
  for (const entry of set.animate) {
    const [name, cond] = typeof entry === 'string' ? [entry, undefined] : Object.entries(entry)[0];
    const anim = Object.entries(set.animations).find(([k]) => k.endsWith('.' + name))?.[1];
    if (!anim) continue;
    const c = cond === undefined ? undefined : `(${inline(cond)})`;
    for (const [b, a] of Object.entries(anim.bones)) {
      const t = bone(b);
      const add = (list: string[], v: Vec | undefined) =>
        v?.forEach((x, i) => {
          const ex = `(${inline(x)})`;
          if (ex === '(0)') return;
          list[i] = (list[i] ? `${list[i]} + ` : '') + (c ? `(${c} ? ${ex} : 0)` : ex);
        });
      add(t.rotation, a.rotation as Vec | undefined);
      add(t.position, a.position as Vec | undefined);
      if (a.scale !== undefined) {
        const s = `(${inline(a.scale as string | number)})`;
        t.scale[0] = (t.scale[0] ? `${t.scale[0]} * ` : '') + (c ? `(${c} ? ${s} : 1)` : s);
      }
    }
  }
  const vec3 = (v: string[]) => [v[0] ?? 0, v[1] ?? 0, v[2] ?? 0];
  const out: Record<string, unknown> = {};
  for (const [b, t] of Object.entries(bones)) {
    const o: Record<string, unknown> = {};
    if (t.rotation.length) o.rotation = vec3(t.rotation);
    if (t.position.length) o.position = vec3(t.position);
    if (t.scale.length) o.scale = t.scale[0];
    out[b] = o;
  }
  return {
    format_version: '1.8.0',
    animations: { [`animation.dinosaurs.${id}.main`]: { loop: true, bones: out } },
  };
}
