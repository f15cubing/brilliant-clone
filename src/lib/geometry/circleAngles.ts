import type { JXGElement } from "./board-types";

const TWO_PI = 2 * Math.PI;

function polarAngle(center: JXGElement, p: JXGElement): number {
  return Math.atan2(p.Y() - center.Y(), p.X() - center.X());
}

function norm2pi(a: number): number {
  const t = a % TWO_PI;
  return t < 0 ? t + TWO_PI : t;
}

/**
 * Order the two endpoints `(from, to)` so that the counter-clockwise sweep
 * from→to around `center` traces the arc AB that does NOT contain `apex`.
 *
 * That arc is the one the inscribed angle at `apex` subtends, so the central
 * angle drawn over it is `2x` the inscribed angle. It exceeds 180 deg (reflex)
 * precisely when `apex` lies on the minor arc — the one case where the marked
 * central angle must be the major/reflex sector rather than the <=180 one.
 */
export function subtendedOrder(
  center: JXGElement,
  a: JXGElement,
  b: JXGElement,
  apex: JXGElement,
): { from: JXGElement; to: JXGElement } {
  const base = polarAngle(center, a);
  const sweepToB = norm2pi(polarAngle(center, b) - base);
  const sweepToApex = norm2pi(polarAngle(center, apex) - base);
  // Apex strictly inside the CCW arc A->B? Then that arc contains the apex, so
  // the arc we want is its complement: sweep B->A instead.
  const apexInsideAB = sweepToApex > 0 && sweepToApex < sweepToB;
  return apexInsideAB ? { from: b, to: a } : { from: a, to: b };
}

/**
 * Central angle (degrees, 0..360) subtending the same arc as the inscribed
 * angle at `apex`. Equals twice the inscribed angle and may be reflex.
 */
export function subtendedCentralDeg(
  center: JXGElement,
  a: JXGElement,
  b: JXGElement,
  apex: JXGElement,
): number {
  const { from, to } = subtendedOrder(center, a, b, apex);
  const sweep = norm2pi(polarAngle(center, to) - polarAngle(center, from));
  return (sweep * 180) / Math.PI;
}
