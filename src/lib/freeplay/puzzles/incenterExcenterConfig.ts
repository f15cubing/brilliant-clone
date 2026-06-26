/**
 * Real construction of the incenter–excenter configuration, computed from a
 * fixed scalene triangle. Kept free of UI imports so it can be unit-tested and
 * reused by the puzzle definition.
 *
 *   I = incenter of ABC
 *   L = second intersection of ray AI with the circumcircle (arc midpoint of BC)
 */
import { circumcenter, dist, dot, sub, type V } from "../geom";

export interface IncenterConfig {
  coords: Record<string, V>;
}

export function buildIncenterConfig(): IncenterConfig {
  const A: V = [0.6, 5.2];
  const B: V = [-4.3, -1.4];
  const C: V = [5.1, -2.1];

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
