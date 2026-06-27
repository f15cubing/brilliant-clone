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
 * From the stated similarity, `similar_proportional_sides` / `similar_equal_angles`
 * derive the corresponding sides / angles; keeping the similarity itself as a
 * stateable fact lets a learner assert "△ABC ~ △DEF" as a step in its own right.
 *
 * SOUNDNESS
 * - The correspondence is RECOVERED from the two cited eqangle facts (see
 *   `recoverAACorrespondences`), which considers each equality in BOTH
 *   orientations and requires non-degenerate triangles plus both angle equalities
 *   to hold. Similarity allows MIRROR images, so orientation is never
 *   constrained. The emitted `similar` rel is GUARDED numerically (`factHoldsL`):
 *   we only state a similarity that actually holds (this also checks the third,
 *   uncited, angle pair). We never emit a false fact.
 */
import { rel } from "@/lib/freeplay/dsl";
import { canonicalKeyL, factHoldsL, type LFact, type LRule } from "../dsl";
import { recoverAACorrespondences } from "./aa_correspondence";

export const aa_similar: LRule = {
  id: "aa_similar",
  name: "AA similar triangles (statement)",
  derive(cited, { coords }) {
    const out: LFact[] = [];
    const emitted = new Set<string>();
    const push = (g: LFact) => {
      const k = canonicalKeyL(g);
      if (emitted.has(k)) return;
      emitted.add(k);
      out.push(g);
    };

    for (const { a, b, c, d, e, f } of recoverAACorrespondences(cited, coords)) {
      const sim = rel("similar", [a, b, c, d, e, f]);
      // Numeric soundness gate: only state a similarity that truly holds.
      if (factHoldsL(sim, coords)) push(sim);
    }

    return out;
  },
};
