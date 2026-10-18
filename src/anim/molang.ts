// Tiny Molang → JS translator, used by the previewer to evaluate the exact
// expressions we ship (catches typos and lets us render animation frames).

export type Env = { q: Record<string, number>; v: Record<string, number> };

const MATH: Record<string, (...a: number[]) => number> = {
  sin: (d) => Math.sin((d * Math.PI) / 180),
  cos: (d) => Math.cos((d * Math.PI) / 180),
  abs: Math.abs,
  min: Math.min,
  max: Math.max,
  clamp: (x, a, b) => Math.min(b, Math.max(a, x)),
  sqrt: Math.sqrt,
  floor: Math.floor,
  lerp: (a, b, t) => a + (b - a) * t,
  mod: (a, b) => a % b,
  pow: Math.pow,
  pi: () => Math.PI,
};

export function compile(expr: string | number): (env: Env) => number {
  if (typeof expr === 'number') return () => expr;
  let js = expr
    .replace(/\bmath\.([a-z_]+)/gi, (_, f) => `M.${f.toLowerCase()}`)
    .replace(/\b(query|q)\.([a-z_]+)/gi, (_, __, n) => `(E.q.${n.toLowerCase()} ?? 0)`)
    .replace(/\b(variable|v)\.([a-z_]+)/gi, (_, __, n) => `E.v.${n.toLowerCase()}`);
  const isStatement = /;|=(?!=)/.test(js.replace(/[<>!=]=/g, ''));
  if (!isStatement) js = `return (${js});`;
  // eslint-disable-next-line no-new-func
  const fn = new Function('M', 'E', js) as (m: typeof MATH, e: Env) => number;
  return (env) => {
    const r = fn(MATH, env);
    return typeof r === 'number' ? r : typeof r === 'boolean' ? (r ? 1 : 0) : 0;
  };
}
