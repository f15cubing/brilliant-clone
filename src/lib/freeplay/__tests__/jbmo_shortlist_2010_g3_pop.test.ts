import { describe, expect, it } from "vitest";
import { eqratio, factHoldsL, type LFact } from "@/lib/freeplay/lengths/dsl";
import { getPuzzle } from "@/lib/freeplay/puzzles";
import { verify } from "@/lib/freeplay/verify";
import { jbmo_shortlist_2010_g3_pop as puzzle } from "../puzzles/jbmo_shortlist_2010_g3_pop";

/**
 * DROP-POLICY check for the SHIPPED `jbmo-2010-g3-power-of-a-point` puzzle:
 * every given and the goal hold numerically, and the one-step power-of-a-point
 * solution verifies in the shipped engine (the verifier composes the ratio
 * rules at the verify layer; the ratio output is routed to the length chase).
 */
describe("puzzle: jbmo-2010-g3-power-of-a-point (power of a point)", () => {
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

  it("is registered and reachable via getPuzzle", () => {
    expect(getPuzzle(puzzle.id)).toBe(puzzle);
  });

  it("accepts a learner-built eqratio step (the StepBuilder assert path)", () => {
    // Mirror exactly what the StepBuilder's `tryBuild`/`onAssert` produces: an
    // `eqratio(...)` over eight chosen points, routed through the same verifier.
    const builtGoal = eqratio("A", "D", "A", "E", "A", "C", "A", "B");
    const result = verify({
      coords,
      bindings: {},
      establishedFacts: [...given],
      candidateFact: builtGoal,
      citedPremises: solution[solution.length - 1].premises,
    });
    expect(result.valid).toBe(true);
  });
});
