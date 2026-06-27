/**
 * AA similar triangles — STATEMENT form (LENGTH layer).
 *
 * The companion of `similar_triangles_aa` (which jumps straight to the side
 * ratios). This rule instead emits the first-class similarity FACT
 * `similar(A,B,C,D,E,F)` (△ABC ~ △DEF, correspondence A↔D, B↔E, C↔F) from two
 * cited equal-angle facts that pin down that correspondence, e.g.
 *
 *   eqangle(B,A,C, E,D,F)   — ∠BAC = ∠EDF   (the angle at A equals the angle at D)
 *   eqangle(A,B,C, D,E,F)   — ∠ABC = ∠DEF   (the angle at B equals the angle at E)
 *
 * From the stated similarity, `similar_proportional_sides` derives the three
 * corresponding side proportions; keeping the similarity itself as a stateable
 * fact lets a learner assert "△ABC ~ △DEF" as a step in its own right.
 *
 * SOUNDNESS
 * - The correspondence is RECOVERED purely from the two cited eqangle facts: the
 *   two distinct angle vertices, plus the shared third vertex implied by the
 *   angle arms — exactly as in `similar_triangles_aa`. Both triangles must be
 *   non-degenerate (non-collinear) with distinct vertices.
 * - Similarity allows MIRROR images, so orientation is never constrained.
 * - The emitted `similar` rel is GUARDED numerically (`factHoldsL` → `factHolds`):
 *   we only state a similarity that actually holds (all three angle pairs equal)
 *   in the coordinates, and we additionally require the two cited angle
 *   equalities to hold. We never emit a false fact.
 */
import { rel, type Fact, type PointId, type Rel } from "@/lib/freeplay/dsl";
import { angleDeg, isCollinear, type V } from "@/lib/freeplay/geom";
import { canonicalKeyL, factHoldsL, type LFact, type LRule } from "../dsl";

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

export const aa_similar: LRule = {
  id: "aa_similar",
  name: "AA similar triangles (statement)",
  derive(cited, { coords }) {
    const out: LFact[] = [];
    const eqs = eqanglesOf(cited);
    if (eqs.length < 2) return out;

    const emitted = new Set<string>();
    const push = (f: LFact) => {
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

        // The recovered correspondence is (v1,v2,w) ~ (v1',v2',w').
        const sim = rel("similar", [v1, v2, w, v1p, v2p, wp]);
        // Numeric soundness gate: only state a similarity that truly holds (this
        // also checks the third, uncited, angle pair).
        if (factHoldsL(sim, coords)) push(sim);
      }
    }

    return out;
  },
};
