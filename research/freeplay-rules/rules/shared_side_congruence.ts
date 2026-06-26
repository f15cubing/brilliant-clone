/**
 * Shared-side congruent triangles (research candidate).
 *
 * Two triangles that share a common side AC, with third vertices B and D, are
 * congruent by SSS as soon as the two pairs of sides springing from the shared
 * endpoints are equal:
 *
 *   cong(A,B,A,D)   — AB = AD   (the two sides at the shared endpoint A)
 *   cong(C,B,C,D)   — CB = CD   (the two sides at the shared endpoint C)
 *
 * The third side AC is common to both triangles, so △ABC ≅ △ADC (correspondence
 * A↔A, C↔C, B↔D) and the corresponding angles are equal. We derive, primarily,
 *
 *   eqangle(A,B,C, A,D,C)   — ∠ABC = ∠ADC   (the angles at B and at D)
 *
 * and, as bonus outputs, the angles at the two shared endpoints
 *
 *   eqangle(B,A,C, D,A,C)   — ∠BAC = ∠DAC   (angle at A)
 *   eqangle(B,C,A, D,C,A)   — ∠BCA = ∠DCA   (angle at C)
 *
 * WHY THIS IS NOT `sss_congruence`
 * The distinct-vertex SSS rule searches for SIX distinct vertices X,Y,Z,P,Q,R —
 * it is built for two DISJOINT triangles. A kite ABCD (triangles ABC and ADC
 * sharing the base AC) has only FOUR distinct points, so the side cycle
 * XY~PQ, YZ~QR, ZX~RP can never be satisfied and `sss_congruence` never fires.
 * This rule closes exactly that gap: the shared side AC plays the role of the
 * common third side, so only the two cong facts at the shared endpoints are
 * needed.
 *
 * DETECTION
 * We look for two `cong` facts that describe an isosceles fan over the SAME pair
 * of third vertices {X,Y}: one with apex P (PX = PY) and one with apex Q
 * (QX = QY). Then P,Q are the shared-side endpoints and X,Y the two reflected
 * third vertices. (cong is symmetric, so we match by canonical key.)
 *
 * SOUNDNESS NOTES
 * - The third vertices B,D may lie on the SAME side of AC or on OPPOSITE sides
 *   (the reflective kite — and the generic case A=(0,4),B=(2,1),C=(0,-3),
 *   D=(-2,1) is opposite-sided). The shipped `eqangle` / `factHolds` use
 *   UNDIRECTED angles, so the corresponding-angle equality holds regardless of
 *   orientation; we therefore impose NO side constraint and instead GUARD every
 *   output numerically: an `eqangle` is emitted only when it actually holds in
 *   the coordinates, and only for non-degenerate (non-collinear) triangles. We
 *   never emit a false fact.
 *
 * GAP
 * The conclusion is an ANGLE equality drawn from two LENGTH equalities over a
 * 4-point figure. The angle-only AR layer has no length table (it ignores
 * `cong`), the shipped `isosceles` rule runs the other way (eqangle ⇒ cong), and
 * `sss_congruence` needs six distinct vertices — so the production engine cannot
 * make this one-step deduction.
 */
import type { Fact, PointId, Rel } from "@/lib/freeplay/dsl";
import { canonicalKey, rel } from "@/lib/freeplay/dsl";
import type { Rule } from "@/lib/freeplay/rules";
import { angleDeg, isCollinear, type V } from "@/lib/freeplay/geom";

const congsOf = (cited: Fact[]): Rel[] =>
  cited.filter((f): f is Rel => f.kind === "rel" && f.name === "cong");

/** Unsigned angles (degrees) equal within the `eqangle` truth tolerance. */
function angEq(a: V, b: V, c: V, d: V, e: V, f: V): boolean {
  return Math.abs(angleDeg(a, b, c) - angleDeg(d, e, f)) < 1e-4;
}

export const shared_side_congruence: Rule = {
  id: "shared_side_congruence",
  name: "shared-side congruent triangles",
  derive(cited, { coords }) {
    const out: Fact[] = [];
    const congs = congsOf(cited);
    if (congs.length < 2) return out;

    // A cong fact equivalent to "segment (x,y) = segment (z,w)" is cited?
    const congKeys = new Set(congs.map(canonicalKey));
    const hasCong = (x: PointId, y: PointId, z: PointId, w: PointId): boolean =>
      congKeys.has(canonicalKey(rel("cong", [x, y, z, w])));

    // Only the points appearing in the cited congruences can take part.
    const pts = [...new Set(congs.flatMap((c) => c.points))];

    const emitted = new Set<string>();
    const push = (f: Fact) => {
      const k = canonicalKey(f);
      if (emitted.has(k)) return;
      emitted.add(k);
      out.push(f);
    };

    const distinct = (...ps: PointId[]): boolean =>
      new Set(ps).size === ps.length;

    // P, Q = shared-side endpoints; X, Y = the two reflected third vertices.
    // Require PX = PY (apex P) and QX = QY (apex Q) over the SAME pair {X,Y}.
    for (const P of pts)
      for (const Q of pts) {
        if (P === Q) continue;
        for (const X of pts)
          for (const Y of pts) {
            if (!distinct(P, Q, X, Y)) continue;
            if (X >= Y) continue; // {X,Y} unordered — visit each pair once
            if (!hasCong(P, X, P, Y)) continue; // PX = PY
            if (!hasCong(Q, X, Q, Y)) continue; // QX = QY

            const cP = coords[P];
            const cQ = coords[Q];
            const cX = coords[X];
            const cY = coords[Y];
            if (!cP || !cQ || !cX || !cY) continue;

            // Both triangles PXQ and PYQ must be genuine (non-degenerate).
            if (isCollinear(cP, cX, cQ) || isCollinear(cP, cY, cQ)) continue;

            // GUARD each corresponding-angle equality numerically (covers the
            // opposite-side / reflected kite case too). Correspondence X↔Y.
            // Primary: ∠PXQ = ∠PYQ  (the angles at the two third vertices).
            if (angEq(cP, cX, cQ, cP, cY, cQ)) {
              push(rel("eqangle", [P, X, Q, P, Y, Q]));
            }
            // Angle at P: ∠XPQ = ∠YPQ.
            if (angEq(cX, cP, cQ, cY, cP, cQ)) {
              push(rel("eqangle", [X, P, Q, Y, P, Q]));
            }
            // Angle at Q: ∠XQP = ∠YQP.
            if (angEq(cX, cQ, cP, cY, cQ, cP)) {
              push(rel("eqangle", [X, Q, P, Y, Q, P]));
            }
          }
      }

    return out;
  },
};
