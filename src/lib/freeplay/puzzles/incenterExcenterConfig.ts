/**
 * Real construction of the incenter–excenter configuration, computed from a
 * fixed scalene triangle. Kept free of UI imports so it can be unit-tested and
 * reused by the puzzle definition.
 *
 *   I = incenter of ABC
 *   L = second intersection of ray AI with the circumcircle (arc midpoint of BC)
 */
import { circumcenter, dist, dot, pointOnCircleAtAngle, sub, type V } from "../geom";

export interface IncenterConfig {
  coords: Record<string, V>;
}

/**
 * Derive the incenter–excenter configuration from an explicit triangle ABC:
 *   I = incenter, L = second meeting of ray AI with the circumcircle.
 * Throws on a degenerate (collinear) triangle. This is the construction core
 * shared by `buildIncenterConfig` (sampling/canonical) and the puzzle's movable
 * `constructFrom` (the dragged triangle).
 */
export function incenterConfigFrom(A: V, B: V, C: V): IncenterConfig {
  // side lengths opposite each vertex
  const a = dist(B, C);
  const b = dist(C, A);
  const c = dist(A, B);
  const s = a + b + c;
  const I: V = [
    (a * A[0] + b * B[0] + c * C[0]) / s,
    (a * A[1] + b * B[1] + c * C[1]) / s,
  ];

  const O = circumcenter(A, B, C);
  if (!O) throw new Error("degenerate triangle");
  const R = dist(A, O);

  // ray A + t*dir, dir = I - A. A is on the circle (t=0); other root:
  const dir = sub(I, A);
  const e = sub(A, O);
  const t = (-2 * dot(e, dir)) / dot(dir, dir);
  const L: V = [A[0] + t * dir[0], A[1] + t * dir[1]];

  // sanity: L on circle
  if (Math.abs(dist(L, O) - R) > 1e-6) throw new Error("L not on circumcircle");

  return { coords: { A, B, C, I, L } };
}

/**
 * Build the incenter–excenter configuration from a triangle ABC. When `rng` is
 * supplied, A, B, C are sampled as an acute, scalene triangle on a random circle
 * (well-separated arcs keep all angles < 90°); otherwise the fixed canonical
 * triangle is used. Throws on a degenerate sample so the multi-case sampler can
 * resample.
 */
export function buildIncenterConfig(rng?: () => number): IncenterConfig {
  let A: V = [0.6, 5.2];
  let B: V = [-4.3, -1.4];
  let C: V = [5.1, -2.1];

  if (rng) {
    const rnd = (lo: number, hi: number) => lo + (hi - lo) * rng();
    const Oc: V = [rnd(-1, 1), rnd(-1, 1)];
    const r = rnd(3.5, 5);
    // Three well-spread angles ⇒ acute, scalene triangle (center inside).
    A = pointOnCircleAtAngle(Oc, r, rnd(75, 105));
    B = pointOnCircleAtAngle(Oc, r, rnd(195, 225));
    C = pointOnCircleAtAngle(Oc, r, rnd(315, 345));
  }

  return incenterConfigFrom(A, B, C);
}
