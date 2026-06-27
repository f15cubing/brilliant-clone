/**
 * Shared core of the AA similar-triangle rules: recover triangle similarity
 * correspondences from cited equal-angle facts.
 *
 * Two cited `eqangle` facts that pin two vertex correspondences imply
 * △(a b c) ~ △(d e f) with a↔d, b↔e, c↔f. The third (uncited) vertex of each
 * triangle is the shared arm the two cited angles have in common.
 *
 * Angle equality is SYMMETRIC, so each cited eqangle is considered in BOTH
 * orientations (∠X = ∠Y and ∠Y = ∠X). A learner may list the two triangles'
 * angles in either order across their citations (e.g. `∠ADE = ∠ACB` together
 * with `∠BAC = ∠DAE`, where the second names the ACB-angle first); the
 * correspondence must still be recovered. Each eqangle is tagged by its source
 * so a fact is never paired with its own flip.
 */
import type { Coords } from "@/lib/freeplay/check";
import type { Fact, PointId, Rel } from "@/lib/freeplay/dsl";
import { angleDeg, isCollinear, type V } from "@/lib/freeplay/geom";

/** △(a b c) ~ △(d e f), correspondence a↔d, b↔e, c↔f. */
export interface AACorrespondence {
  a: PointId;
  b: PointId;
  c: PointId;
  d: PointId;
  e: PointId;
  f: PointId;
}

const eqanglesOf = (cited: Fact[]): Rel[] =>
  cited.filter((f): f is Rel => f.kind === "rel" && f.name === "eqangle");

/** Unsigned angle equality within the `eqangle` truth tolerance. */
function angEq(a: V, b: V, c: V, d: V, e: V, f: V): boolean {
  return Math.abs(angleDeg(a, b, c) - angleDeg(d, e, f)) < 1e-4;
}

/** The element of the pair {x,y} that is not `z`, or null if neither/both. */
function other(x: PointId, y: PointId, z: PointId): PointId | null {
  if (x === z && y !== z) return y;
  if (y === z && x !== z) return x;
  return null;
}

/**
 * Every similarity correspondence implied by the cited equal-angle facts, with
 * non-degenerate triangles and both cited angle equalities holding numerically.
 * Callers add their own numeric guard on the fact they emit. Duplicates may be
 * returned (callers dedupe their outputs).
 */
export function recoverAACorrespondences(cited: Fact[], coords: Coords): AACorrespondence[] {
  const eqs = eqanglesOf(cited);
  if (eqs.length < 2) return [];

  // Each eqangle in BOTH orientations, tagged by source index.
  const oriented: { p: PointId[]; src: number }[] = [];
  eqs.forEach((eq, idx) => {
    const [p, v, q, pp, vp, qp] = eq.points;
    oriented.push({ p: [p, v, q, pp, vp, qp], src: idx });
    oriented.push({ p: [pp, vp, qp, p, v, q], src: idx });
  });

  const out: AACorrespondence[] = [];
  for (let i = 0; i < oriented.length; i++) {
    for (let j = 0; j < oriented.length; j++) {
      if (oriented[i].src === oriented[j].src) continue; // same premise (or its flip)
      const [p1, v1, q1, p1p, v1p, q1p] = oriented[i].p; // ∠p1 v1 q1 = ∠p1' v1' q1'
      const [p2, v2, q2, p2p, v2p, q2p] = oriented[j].p; // ∠p2 v2 q2 = ∠p2' v2' q2'

      if (v1 === v2) continue; // need two DISTINCT vertices of the triangle

      // Third vertex w: the arm of ∠ at v1 not equal to v2 must match the arm of
      // ∠ at v2 not equal to v1 (the shared vertex).
      const w1 = other(p1, q1, v2);
      const w2 = other(p2, q2, v1);
      if (!w1 || !w2 || w1 !== w2) continue;
      const w = w1;
      if (w === v1 || w === v2) continue;

      // Same on the image triangle (primed).
      const w1p = other(p1p, q1p, v2p);
      const w2p = other(p2p, q2p, v1p);
      if (!w1p || !w2p || w1p !== w2p) continue;
      const wp = w1p;
      if (v1p === v2p || wp === v1p || wp === v2p) continue;

      const cv1 = coords[v1];
      const cv2 = coords[v2];
      const cw = coords[w];
      const cv1p = coords[v1p];
      const cv2p = coords[v2p];
      const cwp = coords[wp];
      if (!cv1 || !cv2 || !cw || !cv1p || !cv2p || !cwp) continue;

      // Both triangles must be genuine (non-degenerate).
      if (isCollinear(cv1, cv2, cw) || isCollinear(cv1p, cv2p, cwp)) continue;

      // GUARD: the two cited angle equalities must actually hold (genuine AA).
      if (!angEq(cv2, cv1, cw, cv2p, cv1p, cwp)) continue; // ∠ at v1 = ∠ at v1'
      if (!angEq(cv1, cv2, cw, cv1p, cv2p, cwp)) continue; // ∠ at v2 = ∠ at v2'

      out.push({ a: v1, b: v2, c: w, d: v1p, e: v2p, f: wp });
    }
  }
  return out;
}
