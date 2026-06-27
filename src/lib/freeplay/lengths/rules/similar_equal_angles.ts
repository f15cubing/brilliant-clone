/**
 * Similar triangles ⇒ equal angles (companion of `similar_proportional_sides`).
 *
 * From a cited similarity `similar(A,B,C,D,E,F)` (△ABC ~ △DEF with correspondence
 * A↔D, B↔E, C↔F) the three pairs of corresponding angles are equal. We emit all
 * three:
 *
 *   eqangle(B,A,C, E,D,F)   — ∠BAC = ∠EDF   (angle at A = angle at D)
 *   eqangle(A,B,C, D,E,F)   — ∠ABC = ∠DEF   (angle at B = angle at E)
 *   eqangle(B,C,A, E,F,D)   — ∠BCA = ∠EFD   (angle at C = angle at F)
 *
 * SOUNDNESS
 * - The similarity is read from a CITED `similar` rel (which `aa_similar` only
 *   emits for genuinely similar triangles), so the equal angles are a real
 *   consequence of the learner's citation. Each emitted equality is additionally
 *   numerically gated (`factHoldsL`): an angle equality is produced only when it
 *   actually holds in the coordinates, so a false fact is never emitted.
 */
import { rel, type Fact, type Rel } from "@/lib/freeplay/dsl";
import { canonicalKeyL, factHoldsL, type LFact, type LRule } from "../dsl";

const similarsOf = (cited: Fact[]): Rel[] =>
  cited.filter((f): f is Rel => f.kind === "rel" && f.name === "similar");

export const similar_equal_angles: LRule = {
  id: "similar_equal_angles",
  name: "similar triangles ⇒ equal angles",
  derive(cited, { coords }) {
    const out: LFact[] = [];
    const emitted = new Set<string>();
    const push = (g: LFact) => {
      const k = canonicalKeyL(g);
      if (emitted.has(k)) return;
      emitted.add(k);
      out.push(g);
    };

    for (const sim of similarsOf(cited)) {
      const [a, b, c, d, e, f] = sim.points;
      // Corresponding angles: at A↔D, B↔E, C↔F.
      const angles: Fact[] = [
        rel("eqangle", [b, a, c, e, d, f]), // ∠BAC = ∠EDF
        rel("eqangle", [a, b, c, d, e, f]), // ∠ABC = ∠DEF
        rel("eqangle", [b, c, a, e, f, d]), // ∠BCA = ∠EFD
      ];
      for (const ang of angles) {
        // Numeric soundness gate: only emit an angle equality that truly holds.
        if (factHoldsL(ang, coords)) push(ang);
      }
    }

    return out;
  },
};
