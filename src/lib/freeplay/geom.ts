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

// ---- construction helpers (used by puzzle `construct(rng)` builders) ---------

export const add = (p: V, q: V): V => [p[0] + q[0], p[1] + q[1]];
export const scale = (p: V, s: number): V => [p[0] * s, p[1] * s];

/** Linear interpolation: the point a + t·(b − a). `t = 0.5` is the midpoint. */
export const lerp = (a: V, b: V, t: number): V => [
  a[0] + t * (b[0] - a[0]),
  a[1] + t * (b[1] - a[1]),
];

/** Midpoint of segment `ab`. */
export const midpoint = (a: V, b: V): V => lerp(a, b, 0.5);

/** Reflect point `p` across the point `c` (180° rotation about `c`). */
export const reflectPoint = (p: V, c: V): V => [2 * c[0] - p[0], 2 * c[1] - p[1]];

/** Rotate point `p` about center `c` by `deg` degrees (CCW). */
export function rotate(p: V, c: V, deg: number): V {
  const t = (deg * Math.PI) / 180;
  const cos = Math.cos(t);
  const sin = Math.sin(t);
  const dx = p[0] - c[0];
  const dy = p[1] - c[1];
  return [c[0] + dx * cos - dy * sin, c[1] + dx * sin + dy * cos];
}

/** The point on the circle (center `c`, radius `r`) at angle `deg` (degrees). */
export const pointOnCircleAtAngle = (c: V, r: number, deg: number): V => [
  c[0] + r * Math.cos((deg * Math.PI) / 180),
  c[1] + r * Math.sin((deg * Math.PI) / 180),
];

/** Foot of the perpendicular from `p` onto the line through `a` and `b`. */
export function foot(p: V, a: V, b: V): V {
  const ab = sub(b, a);
  const len2 = dot(ab, ab);
  if (len2 < 1e-18) return a;
  const t = dot(sub(p, a), ab) / len2;
  return add(a, scale(ab, t));
}

/** Reflect point `p` across the line through `a` and `b`. */
export function reflectOverLine(p: V, a: V, b: V): V {
  return reflectPoint(p, foot(p, a, b));
}

/**
 * Intersections of the line through `a`,`b` with the circle (center `c`, radius
 * `r`), ordered by increasing parameter along a→b. Returns [] when the line
 * misses the circle (within tolerance).
 */
export function lineCircleIntersect(a: V, b: V, c: V, r: number): V[] {
  const d = sub(b, a);
  const len2 = dot(d, d);
  if (len2 < 1e-18) return [];
  const fx = a[0] - c[0];
  const fy = a[1] - c[1];
  const bq = 2 * (d[0] * fx + d[1] * fy);
  const cq = fx * fx + fy * fy - r * r;
  let disc = bq * bq - 4 * len2 * cq;
  if (disc < 0) {
    if (disc > -1e-9) disc = 0;
    else return [];
  }
  const sq = Math.sqrt(disc);
  const t1 = (-bq - sq) / (2 * len2);
  const t2 = (-bq + sq) / (2 * len2);
  const ts = t1 <= t2 ? [t1, t2] : [t2, t1];
  const pts = ts.map((t) => add(a, scale(d, t)));
  if (Math.abs(t1 - t2) < 1e-12) return [pts[0]];
  return pts;
}
