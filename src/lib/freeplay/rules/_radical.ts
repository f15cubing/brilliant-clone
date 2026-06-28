/**
 * Coordinate "power of a point" / radical-axis primitive shared by the
 * radical-axis family of rules (G4 `two_circle_radical_axis`, and — per the plan
 * — G3 `three_circle_radical_center`). Depends only on `@/lib/freeplay/geom`.
 *
 * A circle is stored as a centre `O` and radius `r`. The signed `power` of a
 * point `Z` is `|ZO|² − r²`: it is `0` exactly on the circle, negative strictly
 * inside, positive outside. Two circles share the radical axis = the locus of
 * points of equal power; `equalPower` tests membership of that axis.
 *
 * These are pure numeric helpers — the rules that use them remain sound because
 * they only emit a fact when the cited premises identify the configuration AND
 * these guards confirm the figure realises it.
 */
import { circumcenter, dist, dot, sub, type V } from "@/lib/freeplay/geom";

export type Circle = { O: V; r: number };

/** Circle through three points (null if they are collinear). */
export function circleOf(a: V, b: V, c: V): Circle | null {
  const O = circumcenter(a, b, c);
  return O ? { O, r: dist(O, a) } : null;
}

/** Signed power of `Z` wrt the circle: |ZO|² − r² (=0 on the circle, <0 inside). */
export function power(Z: V, c: Circle): number {
  const d = sub(Z, c.O);
  return dot(d, d) - c.r * c.r;
}

/** Is `Z` on the circle (power ≈ 0), with a scale-relative tolerance? */
export function onCircle(Z: V, c: Circle, eps = 1e-6): boolean {
  return Math.abs(power(Z, c)) < eps * Math.max(1, c.r * c.r);
}

/** Equal power of `Z` wrt two circles (i.e. `Z` lies on their radical axis). */
export function equalPower(Z: V, c1: Circle, c2: Circle, eps = 1e-6): boolean {
  const p1 = power(Z, c1);
  return Math.abs(p1 - power(Z, c2)) < eps * Math.max(1, Math.abs(p1));
}
