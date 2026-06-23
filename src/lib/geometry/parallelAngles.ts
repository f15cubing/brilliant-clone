import type { BoardRefs } from "./board-types";

export type ParallelAngleKind = "corresponding" | "alternate" | "cointerior";
export type ParallelVertex = "P1" | "P2";

/** Distance (board units) of the hidden ray endpoints from the vertex. */
const RAY_SCALE = 0.6;

type Vec = [number, number];

function unit(dx: number, dy: number): Vec {
  const n = Math.hypot(dx, dy) || 1;
  return [dx / n, dy / n];
}

/** Direction along the parallel lines, pointing "right" (L?L -> L?R). */
function lineDir(r: BoardRefs): Vec {
  return unit(r.L1R.X() - r.L1L.X(), r.L1R.Y() - r.L1L.Y());
}

/**
 * Direction along the transversal, from the top intersection P1 to the bottom
 * P2. P1 always lies on the upper line and P2 on the lower line, so this vector
 * varies continuously as the transversal rotates (it never flips).
 */
function transDir(r: BoardRefs): Vec {
  return unit(r.P2.X() - r.P1.X(), r.P2.Y() - r.P1.Y());
}

interface RaySigns {
  /** +1 = along the line to the right (+e), -1 = to the left (-e). */
  line: number;
  /** +1 = along the transversal P1->P2 (+t), -1 = P2->P1 (-t). */
  trans: number;
}

/**
 * Fixed sign choices that define each angle in terms of the line direction `e`
 * and transversal direction `t`. Because the signs are constant (never chosen
 * by a runtime predicate) the marked angle is a continuous function of the
 * point positions, so dragging/rotating the transversal can never make the
 * highlighted sector jump to a different quadrant.
 *
 * Equality/supplementary relationships fall out automatically:
 * - corresponding: identical (e, t) directions at P1 and P2  => equal.
 * - alternate: line and transversal both negated at P2        => equal.
 * - cointerior: same line side, transversal negated at P2     => supplementary.
 */
function raySigns(kind: ParallelAngleKind, vertex: ParallelVertex): RaySigns {
  switch (kind) {
    case "corresponding":
      return { line: -1, trans: 1 };
    case "alternate":
      return vertex === "P1" ? { line: -1, trans: 1 } : { line: 1, trans: -1 };
    case "cointerior":
      return vertex === "P1" ? { line: 1, trans: 1 } : { line: 1, trans: -1 };
  }
}

function rayDirs(r: BoardRefs, vertex: ParallelVertex, kind: ParallelAngleKind): { line: Vec; trans: Vec } {
  const e = lineDir(r);
  const t = transDir(r);
  const s = raySigns(kind, vertex);
  return {
    line: [e[0] * s.line, e[1] * s.line],
    trans: [t[0] * s.trans, t[1] * s.trans],
  };
}

/** Absolute coordinates of the two ray endpoints that define the marked angle. */
export function parallelAngleRayPoints(
  r: BoardRefs,
  vertex: ParallelVertex,
  kind: ParallelAngleKind,
): { line: Vec; trans: Vec } {
  const v = r[vertex];
  const { line, trans } = rayDirs(r, vertex, kind);
  return {
    line: [v.X() + line[0] * RAY_SCALE, v.Y() + line[1] * RAY_SCALE],
    trans: [v.X() + trans[0] * RAY_SCALE, v.Y() + trans[1] * RAY_SCALE],
  };
}

/** Measured angle (degrees, 0..180) of the marked parallel-lines angle. */
export function parallelAngleDeg(
  r: BoardRefs,
  vertex: ParallelVertex,
  kind: ParallelAngleKind,
): number {
  const { line, trans } = rayDirs(r, vertex, kind);
  const dot = line[0] * trans[0] + line[1] * trans[1];
  const cross = line[0] * trans[1] - line[1] * trans[0];
  return (Math.atan2(Math.abs(cross), dot) * 180) / Math.PI;
}
