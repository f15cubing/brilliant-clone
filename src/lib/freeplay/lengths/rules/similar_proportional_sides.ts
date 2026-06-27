/**
 * Similar triangles ⇒ proportional sides (LENGTH layer).
 *
 * From a cited similarity fact `similar(A,B,C,D,E,F)` (△ABC ~ △DEF with
 * correspondence A↔D, B↔E, C↔F) the three pairs of corresponding sides are in
 * equal ratio. We emit all three corresponding-side proportions:
 *
 *   eqratio(A,B,D,E, B,C,E,F)   — AB/DE = BC/EF
 *   eqratio(A,B,D,E, C,A,F,D)   — AB/DE = CA/FD
 *   eqratio(B,C,E,F, C,A,F,D)   — BC/EF = CA/FD
 *
 * SOUNDNESS
 * - The similarity is read from a CITED `similar` rel (which `aa_similar` only
 *   emits for genuinely similar triangles), so the proportions are a real
 *   consequence of the learner's citation. Each emitted proportion is
 *   additionally numerically gated (`factHoldsL`): a proportion is produced only
 *   when it actually holds in the coordinates, so a false fact is never emitted.
 */
import type { Fact, Rel } from "@/lib/freeplay/dsl";
import { canonicalKeyL, eqratio, factHoldsL, type EqRatio, type LRule } from "../dsl";

const similarsOf = (cited: Fact[]): Rel[] =>
  cited.filter((f): f is Rel => f.kind === "rel" && f.name === "similar");

export const similar_proportional_sides: LRule = {
  id: "similar_proportional_sides",
  name: "similar triangles ⇒ proportional sides",
  derive(cited, { coords }) {
    const out: EqRatio[] = [];
    const emitted = new Set<string>();
    const push = (f: EqRatio) => {
      const k = canonicalKeyL(f);
      if (emitted.has(k)) return;
      emitted.add(k);
      out.push(f);
    };

    for (const sim of similarsOf(cited)) {
      const [a, b, c, d, e, f] = sim.points;
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
