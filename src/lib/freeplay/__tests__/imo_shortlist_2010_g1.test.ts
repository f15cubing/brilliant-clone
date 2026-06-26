import { describe, expect, it } from "vitest";
import type { Fact } from "@/lib/freeplay/dsl";
import { factHoldsL } from "@/lib/freeplay/lengths/dsl";
import { verify } from "@/lib/freeplay/verify";
import { imo_shortlist_2010_g1 as puzzle } from "../puzzles/imo_shortlist_2010_g1";

/**
 * DROP-POLICY check for the SHIPPED `imo-shortlist-2010-g1` puzzle: every given
 * and the goal hold numerically, and the full 7-step Solution-1 angle chase
 * verifies in the shipped engine. The only non-AR steps are the shipped
 * `converse_inscribed` (step 4) and `isosceles` (step 7).
 */
describe("puzzle: imo-shortlist-2010-g1 (AP = AQ)", () => {
  const { coords, given, goal, solution } = puzzle;

  it("every given holds numerically on the coordinates", () => {
    for (const g of given) expect(factHoldsL(g, coords)).toBe(true);
  });

  it("the goal holds numerically on the coordinates", () => {
    expect(factHoldsL(goal, coords)).toBe(true);
  });

  it("replays the full 7-step solution chain through the shipped verifier", () => {
    const established: Fact[] = [...(given as Fact[])];
    for (const step of solution) {
      const r = verify({
        coords,
        bindings: {},
        establishedFacts: established,
        candidateFact: step.fact,
        citedPremises: step.premises,
      });
      expect(r).toEqual({ valid: true, rule: step.rule });
      established.push(step.fact as Fact);
    }
  });

  it("the final solution step reaches the goal (AP = AQ)", () => {
    const last = solution[solution.length - 1];
    expect(JSON.stringify(last.fact)).toBe(JSON.stringify(goal));
  });

  it("the puzzle is shipped as a complete chain (solutionReachesGoal !== false)", () => {
    expect(puzzle.solutionReachesGoal).not.toBe(false);
  });
});
