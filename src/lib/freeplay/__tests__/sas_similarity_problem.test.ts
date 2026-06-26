import { describe, expect, it } from "vitest";
import { factHoldsL, type LFact } from "@/lib/freeplay/lengths/dsl";
import { verify } from "@/lib/freeplay/verify";
import { sas_similarity_problem as puzzle } from "../puzzles/sas_similarity_problem";

/**
 * DROP-POLICY check for the SHIPPED `sas-similarity-converse` puzzle: every
 * given and the goal hold numerically, and the full solution chain verifies in
 * the shipped engine (the verifier composes the 4 ratio rules at the verify
 * layer). The key SAS step requires the two-sides proportion to be a CITED
 * `eqratio` premise (the rule no longer reads it from coordinates).
 */
describe("puzzle: sas-similarity-converse (converse power of a point via SAS)", () => {
  const { coords, given, goal, solution } = puzzle;

  it("every given holds numerically on the coordinates", () => {
    for (const g of given) expect(factHoldsL(g, coords)).toBe(true);
  });

  it("the goal holds numerically on the coordinates", () => {
    expect(factHoldsL(goal, coords)).toBe(true);
  });

  it("replays the full solution chain through the shipped verifier", () => {
    const established: LFact[] = [...given];
    for (const step of solution) {
      const r = verify({
        coords,
        bindings: {},
        establishedFacts: established,
        candidateFact: step.fact,
        citedPremises: step.premises,
      });
      expect(r).toEqual({ valid: true, rule: step.rule });
      established.push(step.fact);
    }
  });

  it("the final solution step reaches the goal", () => {
    const last = solution[solution.length - 1];
    expect(JSON.stringify(last.fact)).toBe(JSON.stringify(goal));
  });

  it("the puzzle is shipped as a complete chain (solutionReachesGoal !== false)", () => {
    expect(puzzle.solutionReachesGoal).not.toBe(false);
  });
});
