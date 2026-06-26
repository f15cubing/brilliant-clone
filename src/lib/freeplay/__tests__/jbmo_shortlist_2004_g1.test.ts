import { describe, expect, it } from "vitest";
import { factEqual, type LFact } from "@/lib/freeplay/dsl";
import { factHoldsL } from "@/lib/freeplay/lengths/dsl";
import { verify } from "@/lib/freeplay/verify";
import { jbmoShortlist2004G1 as puzzle } from "../puzzles/jbmo_shortlist_2004_g1";

/**
 * Drop-policy verification for the shipped `jbmo_shortlist_2004_g1` puzzle: every
 * given and the goal must hold numerically, and the full solution chain must
 * replay in the SHIPPED verifier (isosceles converse ×2 + AR), ending at the goal.
 */
describe("jbmo_shortlist_2004_g1 (shipped puzzle)", () => {
  const { coords, given, goal, solution } = puzzle;

  it("every given holds numerically on the puzzle coords", () => {
    for (const g of given) expect(factHoldsL(g, coords, {})).toBe(true);
  });

  it("the goal holds numerically on the puzzle coords", () => {
    expect(factHoldsL(goal, coords, {})).toBe(true);
  });

  it("the full solution chain verifies step-by-step in the shipped engine", () => {
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

  it("the final solution step establishes the goal", () => {
    const last = solution[solution.length - 1];
    expect(factEqual(last.fact, goal)).toBe(true);
    expect(puzzle.solutionReachesGoal ?? true).toBe(true);
  });
});
