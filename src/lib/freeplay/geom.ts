/** Plain 2D vector helpers shared by the truth checker and the rule guards. */
export type V = [number, number];

export const sub = (p: V, q: V): V => [p[0] - q[0], p[1] - q[1]];
export const dot = (p: V, q: V): number => p[0] * q[0] + p[1] * q[1];
export const cross = (p: V, q: V): number => p[0] * q[1] - p[1] * q[0];
export const norm = (p: V): number => Math.hypot(p[0], p[1]);
export const dist = (p: V, q: V): number => norm(sub(p, q));

export function unit(p: V): V | null {
  const n = norm(p);
  if (n < 1e-9) return null;
  return [p[0] / n, p[1] / n];
}

/** Unsigned angle (degrees) at vertex `b` between rays to `a` and `c`. */
export function angleDeg(a: V, b: V, c: V): number {
  const u = sub(a, b);
  const w = sub(c, b);
  return (Math.atan2(Math.abs(cross(u, w)), dot(u, w)) * 180) / Math.PI;
}

/** Intersection of line `ab` with line `cd`, or null if (nearly) parallel. */
export function lineIntersect(a: V, b: V, c: V, d: V): V | null {
  const r = sub(b, a);
  const s = sub(d, c);
  const den = cross(r, s);
  if (Math.abs(den) < 1e-9) return null;
  const t = cross(sub(c, a), s) / den;
  return [a[0] + t * r[0], a[1] + t * r[1]];
}

/** Circumcenter of three points, or null if (nearly) collinear. */
export function circumcenter(a: V, b: V, c: V): V | null {
  const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
  if (Math.abs(d) < 1e-9) return null;
  const a2 = a[0] * a[0] + a[1] * a[1];
  const b2 = b[0] * b[0] + b[1] * b[1];
  const c2 = c[0] * c[0] + c[1] * c[1];
  const ux = (a2 * (b[1] - c[1]) + b2 * (c[1] - a[1]) + c2 * (a[1] - b[1])) / d;
  const uy = (a2 * (c[0] - b[0]) + b2 * (a[0] - c[0]) + c2 * (b[0] - a[0])) / d;
  return [ux, uy];
}

const LINEAR_EPS = 1e-6;

/** Collinear via normalized cross product. */
export function isCollinear(a: V, b: V, c: V): boolean {
  const u = unit(sub(b, a));
  const w = unit(sub(c, a));
  if (!u || !w) return true;
  return Math.abs(cross(u, w)) < LINEAR_EPS;
}

/** Is `b` strictly between `a` and `c` on their common line? */
export function isBetween(a: V, b: V, c: V): boolean {
  if (!isCollinear(a, b, c)) return false;
  return dot(sub(a, b), sub(c, b)) < 0;
}

/** Do `p` and `q` lie on the same ray emanating from vertex `v`? */
export function sameRayFrom(v: V, p: V, q: V): boolean {
  const u = unit(sub(p, v));
  const w = unit(sub(q, v));
  if (!u || !w) return false;
  return Math.abs(cross(u, w)) < LINEAR_EPS && dot(u, w) > 0;
}

/** Is ray `vq` strictly inside angle (p, v, r)? (q between the two rays) */
export function rayBetween(v: V, p: V, q: V, r: V): boolean {
  const total = angleDeg(p, v, r);
  const a1 = angleDeg(p, v, q);
  const a2 = angleDeg(q, v, r);
  return Math.abs(a1 + a2 - total) < 1e-4 && a1 > 1e-4 && a2 > 1e-4;
}

/** Same side of line `ab` for points `p`, `q` (both strictly off the line). */
export function sameSideOfLine(a: V, b: V, p: V, q: V): boolean {
  const sp = cross(sub(b, a), sub(p, a));
  const sq = cross(sub(b, a), sub(q, a));
  if (Math.abs(sp) < 1e-9 || Math.abs(sq) < 1e-9) return false;
  return sp * sq > 0;
}
