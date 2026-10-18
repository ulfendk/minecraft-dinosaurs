// Generates Bedrock client animations for a rig. Everything is expressed as
// Molang driven by variables set in pre_animation, so a single looping
// animation per behaviour is enough (no keyframes needed).

import type { Rig } from '../model/rigs.js';

type Expr = string | number;
type BoneAnim = { rotation?: Expr[]; position?: Expr[]; scale?: Expr };
export interface AnimSet {
  pre: string[];
  animations: Record<string, { loop: boolean; bones: Record<string, BoneAnim> }>;
  /** entries for client "animate" (name or {name: condition}) */
  animate: (string | Record<string, string>)[];
}

const r = (n: number) => Math.round(n * 1000) / 1000;

export function buildAnimations(id: string, rig: Rig, scale: number): AnimSet {
  const A = (name: string) => `animation.dino.${id}.${name}`;
  const hipBlocks = Math.max(0.3, (rig.a.hipY * scale) / 16);
  const stride = rig.kind === 'theropod' ? hipBlocks * 2.6 : hipBlocks * 2.2;
  const F = r(360 / stride);
  const pre = [
    'variable.gait = math.clamp(query.modified_move_speed * 2.5, 0.0, 1.0);',
    `variable.ph = query.modified_distance_moved * ${F};`,
    'variable.c = math.cos(variable.ph);',
    'variable.s = math.sin(variable.ph);',
    'variable.lt = query.life_time;',
    'variable.atk = (variable.attack_time > 0.0) ? math.sin(variable.attack_time * 180.0) : 0.0;',
  ];
  const anims: AnimSet['animations'] = {};
  const animate: AnimSet['animate'] = [];
  const add = (name: string, bones: Record<string, BoneAnim>, cond?: string) => {
    anims[A(name)] = { loop: true, bones };
    animate.push(cond ? { [name]: cond } : name);
  };

  // --- look at target (head + neck share the turn)
  const look: Record<string, BoneAnim> = {};
  const nNeck = rig.neck.length;
  rig.neck.forEach((n) => {
    look[n] = { rotation: [`math.clamp(query.target_x_rotation, -30, 30) * ${r(0.3 / nNeck)}`, `math.clamp(query.target_y_rotation, -70, 70) * ${r(0.5 / nNeck)}`, 0] };
  });
  look[rig.head] = { rotation: ['math.clamp(query.target_x_rotation, -40, 40) * 0.6', 'math.clamp(query.target_y_rotation, -70, 70) * 0.45', 0] };
  add('look', look);

  // --- idle life: tail sway, breathing neck, occasional jaw twitch
  const idle: Record<string, BoneAnim> = {};
  rig.tail.forEach((t, i) => {
    idle[t] = { rotation: [0, `math.sin(variable.lt * 40 - ${i * 25}) * ${r(1.5 + i * 0.6)}`, 0] };
  });
  if (rig.neck[0]) idle[rig.neck[0]] = { rotation: ['math.sin(variable.lt * 55) * 1.2', 0, 0] };
  if (rig.jaw) idle[rig.jaw] = { rotation: ['math.max(0, math.sin(variable.lt * 23) - 0.92) * 90', 0, 0] };
  add('idle', idle);

  // --- attack: open jaws and lunge the head
  if (rig.jaw) {
    const atk: Record<string, BoneAnim> = { [rig.jaw]: { rotation: ['variable.atk * 38', 0, 0] }, [rig.head]: { rotation: ['variable.atk * -14', 0, 0] } };
    if (rig.neck[0]) atk[rig.neck[0]] = { rotation: ['variable.atk * 12', 0, 0] };
    add('attack', atk, 'variable.atk > 0.0');
  }

  switch (rig.kind) {
    case 'theropod': {
      const walk: Record<string, BoneAnim> = {};
      for (const leg of rig.legs) {
        const sg = leg.side > 0 ? '' : '-';
        const ph = leg.side > 0 ? 'variable.s' : '(-variable.s)';
        walk[leg.chain[0]] = { rotation: [`${sg}variable.c * -30 * variable.gait`, 0, 0] };
        walk[leg.chain[1]] = { rotation: [`math.max(0, ${ph}) * 34 * variable.gait`, 0, 0] };
        walk[leg.chain[2]] = { rotation: [`(math.max(0, ${ph}) * -22 + ${sg}variable.c * 10) * variable.gait`, 0, 0] };
      }
      walk.body = { rotation: [0, 0, 'variable.c * 2.5 * variable.gait'], position: [0, 'math.abs(variable.c) * 0.8 * variable.gait', 0] };
      rig.tail.forEach((t, i) => (walk[t] = { rotation: [0, `math.sin(variable.ph - ${i * 35}) * ${r(3 + i * 1.6)} * variable.gait`, 0] }));
      if (rig.neck[0]) walk[rig.neck[0]] = { rotation: ['math.cos(variable.ph * 2) * 2.5 * variable.gait', 0, 0] };
      rig.arms.forEach((a, i) => (walk[a] = { rotation: [`variable.c * ${i ? -10 : 10} * variable.gait`, 0, 0] }));
      add('walk', walk);
      const h = rig.a.hipY;
      const sit: Record<string, BoneAnim> = { root: { position: [0, r(-h * 0.48), 0] }, body: { rotation: [6, 0, 0] } };
      for (const leg of rig.legs) {
        sit[leg.chain[0]] = { rotation: [-48, 0, 0] };
        sit[leg.chain[1]] = { rotation: [92, 0, 0] };
        sit[leg.chain[2]] = { rotation: [-44, 0, 0] };
      }
      add('sit', sit, 'query.is_sitting');
      break;
    }
    case 'quadruped': {
      const walk: Record<string, BoneAnim> = {};
      for (const leg of rig.legs) {
        // diagonal pairs move together
        const sameAsFL = (leg.front && leg.side > 0) || (!leg.front && leg.side < 0);
        const c = sameAsFL ? 'variable.c' : '(-variable.c)';
        const s = sameAsFL ? 'variable.s' : '(-variable.s)';
        walk[leg.chain[0]] = { rotation: [`${c} * -22 * variable.gait`, 0, 0] };
        walk[leg.chain[1]] = { rotation: [`math.max(0, ${s}) * ${leg.front ? -18 : 22} * variable.gait`, 0, 0] };
      }
      walk.body = { rotation: [0, 0, 'variable.c * 1.5 * variable.gait'], position: [0, 'math.abs(variable.s) * 0.6 * variable.gait', 0] };
      rig.tail.forEach((t, i) => (walk[t] = { rotation: [0, `math.sin(variable.ph - ${i * 30}) * ${r(2.5 + i * 1.2)} * variable.gait`, 0] }));
      if (rig.neck[0]) walk[rig.neck[0]] = { rotation: ['math.cos(variable.ph * 2) * 1.5 * variable.gait', `variable.c * 2 * variable.gait`, 0] };
      add('walk', walk);
      const h = rig.a.hipY;
      // lie down: legs fold under the body
      const sit: Record<string, BoneAnim> = { root: { position: [0, r(-h * 0.55), 0] } };
      for (const leg of rig.legs) {
        sit[leg.chain[0]] = { rotation: [leg.front ? -70 : 62, 0, 0] };
        sit[leg.chain[1]] = { rotation: [leg.front ? 128 : -118, 0, 0] };
      }
      add('sit', sit, 'query.is_sitting');
      break;
    }
    case 'pterosaur': {
      const ground: Record<string, BoneAnim> = {};
      const fly: Record<string, BoneAnim> = {};
      for (const w of rig.wings) {
        const sg = w.side > 0 ? 1 : -1;
        ground[w.name] = { rotation: [0, -80 * sg, 28 * sg] };
        if (w.tip) ground[w.tip] = { rotation: [0, 165 * sg, 0] };
        fly[w.name] = { rotation: [0, 0, `${-sg} * (math.sin(variable.lt * 300) * 32 + 4)`] };
        if (w.tip) fly[w.tip] = { rotation: [0, 0, `${-sg} * math.sin(variable.lt * 300 - 50) * 18`] };
      }
      const walk: Record<string, BoneAnim> = {};
      for (const leg of rig.legs) walk[leg.name] = { rotation: [`${leg.side > 0 ? '' : '-'}variable.c * 25 * variable.gait`, 0, 0] };
      for (const leg of rig.legs) fly[leg.name] = { rotation: [65, 0, 0] };
      if (rig.neck[0]) fly[rig.neck[0]] = { rotation: [10, 0, 0] };
      fly.body = { rotation: [10, 0, 0], position: [0, 'math.sin(variable.lt * 300 + 90) * 0.6', 0] };
      add('ground', ground, 'query.is_on_ground');
      add('walk', walk, 'query.is_on_ground');
      add('fly', fly, '!query.is_on_ground');
      break;
    }
    case 'marine':
    case 'fish': {
      const swim: Record<string, BoneAnim> = {};
      const spd = rig.kind === 'fish' ? 200 : 140;
      const amp = '(0.45 + variable.gait * 0.8)';
      rig.tail.forEach((t, i) => (swim[t] = { rotation: [0, `math.sin(variable.lt * ${spd} - ${i * 45}) * ${r(4 + i * 3)} * ${amp}`, 0] }));
      swim.body = { rotation: [0, `math.sin(variable.lt * ${spd} + 60) * 2.5 * ${amp}`, 0] };
      for (const f of rig.flippers) {
        const sg = f.side > 0 ? -1 : 1;
        const ph = f.front ? 0 : 160;
        swim[f.name] = { rotation: [`math.sin(variable.lt * ${spd * 0.7} + ${ph}) * 14`, 0, `${sg} * math.sin(variable.lt * ${spd * 0.7} + ${ph}) * 22`] };
      }
      rig.neck.forEach((n, i) => (swim[n] = { rotation: [0, `math.sin(variable.lt * ${spd * 0.5} + ${i * 30}) * 3`, 0] }));
      add('swim', swim);
      break;
    }
    case 'snake': {
      const sl: Record<string, BoneAnim> = {};
      rig.tail.forEach((t, i) => (sl[t] = { rotation: [0, `math.sin(variable.ph * 1.6 + variable.lt * 60 - ${i * 40}) * ${r(12 + Math.min(i, 6))} * (0.35 + variable.gait)`, 0] }));
      sl.body = { rotation: [0, 'math.sin(variable.ph * 1.6 + variable.lt * 60 + 40) * 10 * (0.35 + variable.gait)', 0] };
      add('slither', sl);
      break;
    }
  }

  // babies get a relatively bigger head
  add('baby', { [rig.head]: { scale: 1.35 } }, 'query.is_baby');
  return { pre, animations: anims, animate };
}

/** Evaluate an animation set into a static pose for the previewer. */
export function evaluatePose(set: AnimSet, env: { q: Record<string, number>; v: Record<string, number> }, compile: (e: Expr) => (env: any) => number) {
  for (const line of set.pre) compile(line)(env);
  const pose: Record<string, { rotation: [number, number, number]; position: [number, number, number] }> = {};
  for (const entry of set.animate) {
    const [name, cond] = typeof entry === 'string' ? [entry, undefined] : Object.entries(entry)[0];
    if (cond !== undefined && !compile(cond)(env)) continue;
    const anim = Object.entries(set.animations).find(([k]) => k.endsWith('.' + name))?.[1];
    if (!anim) continue;
    for (const [bone, ba] of Object.entries(anim.bones)) {
      const p = (pose[bone] ??= { rotation: [0, 0, 0], position: [0, 0, 0] });
      ba.rotation?.forEach((e, i) => (p.rotation[i] += compile(e)(env)));
      ba.position?.forEach((e, i) => (p.position[i] += compile(e)(env)));
    }
  }
  return pose;
}
