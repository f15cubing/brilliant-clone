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
 * - The correspondence is RECOVERED from the two cited eqangle facts (see
 *   `recoverAACorrespondences`), which considers each equality in BOTH
 *   orientations and requires non-degenerate triangles plus both cited angle
 *   equalities to hold. Similarity allows MIRROR images, so we never constrain
 *   orientation. Every emitted `eqratio` is GUARDED numerically (`factHoldsL`):
 *   we only emit a proportion that actually holds in the coordinates. We never
 *   emit a false fact.
 */
import { canonicalKeyL, eqratio, factHoldsL, type EqRatio, type LRule } from "../dsl";
import { recoverAACorrespondences } from "./aa_correspondence";

export const similar_triangles_aa: LRule = {
  id: "similar_triangles_aa",
  name: "AA similar triangles",
  derive(cited, { coords }) {
    const out: EqRatio[] = [];
    const emitted = new Set<string>();
    const push = (g: EqRatio) => {
      const k = canonicalKeyL(g);
      if (emitted.has(k)) return;
      emitted.add(k);
      out.push(g);
    };

    for (const { a, b, c, d, e, f } of recoverAACorrespondences(cited, coords)) {
      // Corresponding sides: AB↔DE, BC↔EF, CA↔FD.
      const ratios: EqRatio[] = [
        eqratio(a, b, d, e, b, c, e, f), // AB/DE = BC/EF
        eqratio(a, b, d, e, c, a, f, d), // AB/DE = CA/FD
        eqratio(b, c, e, f, c, a, f, d), // BC/EF = CA/FD
      ];
      for (const r of ratios) {
        // Numeric soundness gate: only emit a proportion that truly holds.
        if (factHoldsL(r, coords)) push(r);
      }
    }

    return out;
  },
};
