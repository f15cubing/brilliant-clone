import { describe, expect, it } from "vitest";
import { factHoldsL, type LFact } from "@/lib/freeplay/lengths/dsl";
import { sampleRealizations } from "@/lib/freeplay/realize";
import { verify } from "@/lib/freeplay/verify";
import { imo_shortlist_2024_g2 as puzzle } from "../puzzles/imo_shortlist_2024_g2";

/**
 * IMO Shortlist 2024 G2 (Poland): ∠KIL + ∠YPX = 180°.
 *
 * The puzzle ships a COMPLETE machine-checkable proof: the 8-step official
 * Solution-1 angle chase replays end-to-end through the shipped verifier (the
 * only non-AR steps are `midsegment` and `concyclic_from_directed_angles`), and
 * the final step IS the goal. We additionally enforce the multi-case bar: the
 * givens and goal hold across several independent generic realizations and every
 * step is a genuine one-step deduction in ALL of them at once.
 */
describe("puzzle: imo-shortlist-2024-g2 (∠KIL + ∠YPX = 180°)", () => {
  const { coords, given, goal, solution } = puzzle;
  const bindings = puzzle.variables ?? {};
  const realizations = sampleRealizations(puzzle, 6, 0xc0ffee);

  it("every given holds numerically on the canonical coordinates", () => {
    for (const g of given) expect(factHoldsL(g, coords, bindings)).toBe(true);
  });

  it("the goal holds numerically on the canonical coordinates", () => {
    expect(factHoldsL(goal, coords, bindings)).toBe(true);
  });

  it("produces multiple valid generic realizations", () => {
    expect(realizations.length).toBeGreaterThan(1);
  });

  it("every given holds in every realization", () => {
    for (const r of realizations) {
      for (const g of given) {
        expect(factHoldsL(g, r.coords, r.bindings ?? {})).toBe(true);
      }
    }
  });

  it("the goal holds in every realization", () => {
    for (const r of realizations) {
      expect(factHoldsL(goal, r.coords, r.bindings ?? {})).toBe(true);
    }
  });

  it("replays the full 8-step solution across all realizations at once", () => {
    const established: LFact[] = [...given];
    for (const step of solution) {
      const result = verify({
        coords,
        bindings,
        establishedFacts: established,
        candidateFact: step.fact,
        citedPremises: step.premises,
        givens: given,
        realizations,
      });
      expect(result).toEqual({ valid: true, rule: step.rule });
      established.push(step.fact);
    }
  });

  it("is shipped as a complete chain whose last step is the goal", () => {
    expect(puzzle.solutionReachesGoal).not.toBe(false);
    const last = solution[solution.length - 1];
    expect(last.fact).toEqual(goal);
  });
});
