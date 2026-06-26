/**
 * Real construction for IMO 2019 Problem 2.
 *
 *   Triangle ABC; A1 on BC, B1 on CA. P on AA1, Q on BB1 with PQ ∥ AB.
 *   P1 on ray PB1 beyond B1 with ∠PP1C = ∠BAC.
 *   Q1 on ray QA1 beyond A1 with ∠CQ1Q = ∠CBA.
 *   (Goal: P, P1, Q, Q1 concyclic.)
 *
 * Auxiliary points used by the reference solution are pre-drawn so they can be
 * referenced in the fixed figure:
 *   A2 = QA1 ∩ AC,  B2 = PB1 ∩ BC   (Pappus ⇒ A2B2 ∥ AB)
 *
 * P1/Q1 satisfy angle conditions with no closed form, so we solve for them
 * numerically along their rays. Kept UI-free for unit testing.
 */
import { angleDeg, type V } from "../geom";

const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1]];
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1]];
const mul = (a: V, s: number): V => [a[0] * s, a[1] * s];
const cross = (a: V, b: V): number => a[0] * b[1] - a[1] * b[0];

/** Intersection of line `ab` with line `cd` (assumes they are not parallel). */
function intersect(a: V, b: V, c: V, d: V): V {
  const r = sub(b, a);
  const s = sub(d, c);
  const den = cross(r, s);
  if (Math.abs(den) < 1e-12) throw new Error("parallel lines have no intersection");
  const t = cross(sub(c, a), s) / den;
  return add(a, mul(r, t));
}

/**
 * Find k > 1 so that the point X = base + k·(through − base) makes
 * ∠(base, X, anchor) equal `targetDeg`. Scans then bisects the first root.
 */
function solveRayAngle(
  base: V,
  through: V,
  anchor: V,
  targetDeg: number,
): number {
  const dir = sub(through, base);
  const at = (k: number) => add(base, mul(dir, k));
  const f = (k: number) => angleDeg(base, at(k), anchor) - targetDeg;

  const kMin = 1.0001;
  const kMax = 200;
  const steps = 4000;
  let prevK = kMin;
  let prevF = f(kMin);
  for (let i = 1; i <= steps; i++) {
    const k = kMin + ((kMax - kMin) * i) / steps;
    const fk = f(k);
    if (prevF === 0) return prevK;
    if (prevF < 0 !== fk < 0) {
      let lo = prevK;
      let hi = k;
      for (let j = 0; j < 100; j++) {
        const m = (lo + hi) / 2;
        if (f(lo) < 0 !== f(m) < 0) hi = m;
        else lo = m;
      }
      return (lo + hi) / 2;
    }
    prevK = k;
    prevF = fk;
  }
  throw new Error("no point on the ray satisfies the angle condition");
}

export interface Imo2019Config {
  coords: Record<string, V>;
}

export function buildImo2019p2Config(): Imo2019Config {
  const A: V = [0, 0];
  const B: V = [12, 0]; // AB along the x-axis ⇒ PQ ∥ AB means equal y
  const C: V = [4, 8];

  const angBAC = angleDeg(B, A, C); // ∠BAC, vertex A
  const angCBA = angleDeg(C, B, A); // ∠CBA, vertex B

  const A1: V = add(B, mul(sub(C, B), 0.45)); // on BC
  const B1: V = add(A, mul(sub(C, A), 0.55)); // on CA

  const P: V = add(A, mul(sub(A1, A), 0.5)); // on AA1
  // Q on BB1 with Q.y = P.y (so PQ ∥ AB):
  const u = P[1] / B1[1];
  const Q: V = add(B, mul(sub(B1, B), u));

  // P1 on ray PB1 beyond B1, ∠PP1C = ∠BAC
  const kP = solveRayAngle(P, B1, C, angBAC);
  const P1: V = add(P, mul(sub(B1, P), kP));

  // Q1 on ray QA1 beyond A1, ∠CQ1Q = ∠CBA
  const kQ = solveRayAngle(Q, A1, C, angCBA);
  const Q1: V = add(Q, mul(sub(A1, Q), kQ));

  // auxiliary: A2 = QA1 ∩ AC, B2 = PB1 ∩ BC
  const A2 = intersect(Q, A1, A, C);
  const B2 = intersect(P, B1, B, C);

  return { coords: { A, B, C, A1, B1, P, Q, P1, Q1, A2, B2 } };
}
