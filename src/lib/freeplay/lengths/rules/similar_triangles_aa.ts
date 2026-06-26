/**
 * AA similar triangles (LENGTH layer).
 *
 * Two triangles that agree on two pairs of angles are SIMILAR, so their three
 * pairs of corresponding sides are in equal ratio. From two cited equal-angle
 * facts that pin down the correspondence △ABC ~ △DEF (vertices A↔D, B↔E, and
 * therefore C↔F), e.g.
 *
 *   eqangle(B,A,C, E,D,F)   — ∠BAC = ∠EDF   (the angle at A equals the angle at D)
 *   eqangle(A,B,C, D,E,F)   — ∠ABC = ∠DEF   (the angle at B equals the angle at E)
 *
 * we emit the side-ratio equalities (the primary one first):
 *
 *   eqratio(A,B,D,E, B,C,E,F)   — AB/DE = BC/EF
 *   eqratio(A,B,D,E, C,A,F,D)   — AB/DE = CA/FD
 *   eqratio(B,C,E,F, C,A,F,D)   — BC/EF = CA/FD
 *
 * These are RATIO facts the rest of the engine cannot otherwise produce: the
 * angle AR has no length table and no other DD rule yields a ratio.
 *
 * SOUNDNESS
 * - We RECOVER the correspondence purely from the two cited eqangle facts: the
 *   two angle vertices in each triangle, plus the shared third vertex implied by
 *   the angle arms. Both triangles must be non-degenerate (non-collinear) with
 *   distinct vertices.
 * - Similarity allows MIRROR images, so we never constrain orientation.
 * - Every emitted `eqratio` is GUARDED numerically (`factHoldsL`): we only emit a
 *   proportion that actually holds in the coordinates, and we additionally
 *   require the two cited angle equalities to hold. We never emit a false fact.
 */
import type { Fact, PointId, Rel } from "@/lib/freeplay/dsl";
import { angleDeg, isCollinear, type V } from "@/lib/freeplay/geom";
import { canonicalKeyL, eqratio, factHoldsL, type EqRatio, type LRule } from "../dsl";

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

export const similar_triangles_aa: LRule = {
  id: "similar_triangles_aa",
  name: "AA similar triangles",
  derive(cited, { coords }) {
    const out: EqRatio[] = [];
    const eqs = eqanglesOf(cited);
    if (eqs.length < 2) return out;

    const emitted = new Set<string>();
    const push = (f: EqRatio) => {
      const k = canonicalKeyL(f);
      if (emitted.has(k)) return;
      emitted.add(k);
      out.push(f);
    };

    // Each ORDERED pair of distinct eqangle facts proposes a correspondence:
    // eq1 fixes (v1 ↔ v1') as one vertex, eq2 fixes (v2 ↔ v2') as another, and
    // the angle arms reveal the shared third vertex (w ↔ w').
    for (let i = 0; i < eqs.length; i++) {
      for (let j = 0; j < eqs.length; j++) {
        if (i === j) continue;
        const [p1, v1, q1, p1p, v1p, q1p] = eqs[i].points; // ∠p1 v1 q1 = ∠p1' v1' q1'
        const [p2, v2, q2, p2p, v2p, q2p] = eqs[j].points; // ∠p2 v2 q2 = ∠p2' v2' q2'

        if (v1 === v2) continue; // need two DISTINCT vertices of the triangle

        // Third vertex w: the arm of ∠ at v1 that is not v2, must equal the arm
        // of ∠ at v2 that is not v1.
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

        // The three corresponding side pairs:
        //   (v1 v2) ↔ (v1' v2'),  (v2 w) ↔ (v2' w'),  (w v1) ↔ (w' v1').
        const ratios: EqRatio[] = [
          eqratio(v1, v2, v1p, v2p, v2, w, v2p, wp), // (v1v2)/(v1'v2') = (v2w)/(v2'w')
          eqratio(v1, v2, v1p, v2p, w, v1, wp, v1p), // (v1v2)/(v1'v2') = (wv1)/(w'v1')
          eqratio(v2, w, v2p, wp, w, v1, wp, v1p), // (v2w)/(v2'w') = (wv1)/(w'v1')
        ];
        for (const r of ratios) {
          // Numeric soundness gate: only emit a proportion that truly holds.
          if (factHoldsL(r, coords)) push(r);
        }
      }
    }

    return out;
  },
};
