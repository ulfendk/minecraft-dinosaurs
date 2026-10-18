export type RGB = [number, number, number];

export function hex(h: string): RGB {
  const s = h.replace('#', '');
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}

export function toHex(c: RGB): string {
  return '#' + c.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
}

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function mix(a: RGB, b: RGB, t: number): RGB {
  t = clamp(t, 0, 1);
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function shade(c: RGB, f: number): RGB {
  return [c[0] * f, c[1] * f, c[2] * f];
}

export function lighten(c: RGB, t: number): RGB {
  return mix(c, [255, 255, 255], t);
}

export function darken(c: RGB, t: number): RGB {
  return mix(c, [0, 0, 0], t);
}

export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
