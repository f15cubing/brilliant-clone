import type { JXGElement } from "./board-types";

/** Unsigned interior angle (degrees, 0..180) at vertex `v` between points `p1` and `p2`. */
export function angleDeg(p1: JXGElement, v: JXGElement, p2: JXGElement): number {
  const ax = p1.X() - v.X();
  const ay = p1.Y() - v.Y();
  const bx = p2.X() - v.X();
  const by = p2.Y() - v.Y();
  const dot = ax * bx + ay * by;
  const cross = ax * by - ay * bx;
  return (Math.atan2(Math.abs(cross), dot) * 180) / Math.PI;
}

/** Formats an angle value as a rounded degree string, e.g. "63.4°". */
export function fmtDeg(value: number, digits = 1): string {
  return `${value.toFixed(digits)}°`;
}

/** Distance between two points. */
export function dist(p1: JXGElement, p2: JXGElement): number {
  return Math.hypot(p1.X() - p2.X(), p1.Y() - p2.Y());
}

/** Midpoint coordinates of two points. */
export function mid(p1: JXGElement, p2: JXGElement): [number, number] {
  return [(p1.X() + p2.X()) / 2, (p1.Y() + p2.Y()) / 2];
}

/**
 * A point offset distance `d` from vertex `v` toward the interior of angle
 * (p1, v, p2) — handy for placing an angle label inside a triangle.
 */
export function inward(
  v: JXGElement,
  p1: JXGElement,
  p2: JXGElement,
  d: number,
): [number, number] {
  const u1x = p1.X() - v.X();
  const u1y = p1.Y() - v.Y();
  const u2x = p2.X() - v.X();
  const u2y = p2.Y() - v.Y();
  const n1 = Math.hypot(u1x, u1y) || 1;
  const n2 = Math.hypot(u2x, u2y) || 1;
  let bx = u1x / n1 + u2x / n2;
  let by = u1y / n1 + u2y / n2;
  const nb = Math.hypot(bx, by) || 1;
  bx /= nb;
  by /= nb;
  return [v.X() + bx * d, v.Y() + by * d];
}
