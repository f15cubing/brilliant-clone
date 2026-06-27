import { describe, expect, it } from "vitest";
import { factHoldsL, type LFact } from "@/lib/freeplay/lengths/dsl";
import { FREEPLAY_PUZZLES } from "@/lib/freeplay/puzzles";
import { sampleRealizations } from "@/lib/freeplay/realize";
import { verify } from "@/lib/freeplay/verify";

/**
 * Multi-case soundness harness for every shipped puzzle.
 *
 * For each puzzle we sample several INDEPENDENT generic realizations (all
 * satisfying the givens by construction) and then:
 *   1. every given and the goal must hold numerically in EVERY realization;
 *   2. the curated reference solution must replay end-to-end through the verifier
 *      WHEN it is handed all the realizations at once — i.e. each step must be a
 *      genuine one-step deduction in ALL of them, not just the canonical figure.
 *
 * This is exactly the guarantee the feature adds: a step is accepted only if it
 * survives multiple cases (or is a rigorous symbolic deduction, which by
 * definition does).
 */
describe("multi-case verification across all freeplay puzzles", () => {
  for (const puzzle of FREEPLAY_PUZZLES) {
    describe(puzzle.id, () => {
      const realizations = sampleRealizations(puzzle, 6, 0xc0ffee);

      it("produces multiple valid realizations", () => {
        // Every puzzle now ships a construction, so we expect more than just the
        // canonical figure.
        expect(realizations.length).toBeGreaterThan(1);
      });

      it("every given holds in every realization", () => {
        for (const r of realizations) {
          for (const g of puzzle.given) {
            expect(factHoldsL(g, r.coords, r.bindings ?? {})).toBe(true);
          }
        }
      });

      it("the goal holds in every realization", () => {
        for (const r of realizations) {
          expect(factHoldsL(puzzle.goal, r.coords, r.bindings ?? {})).toBe(true);
        }
      });

      it("the reference solution replays across all realizations at once", () => {
        const established: LFact[] = [...puzzle.given];
        for (const step of puzzle.solution) {
          const result = verify({
            coords: puzzle.coords,
            bindings: puzzle.variables ?? {},
            establishedFacts: established,
            candidateFact: step.fact,
            citedPremises: step.premises,
            realizations,
          });
          expect(result).toEqual({ valid: true, rule: step.rule });
          established.push(step.fact);
        }
      });
    });
  }
});
