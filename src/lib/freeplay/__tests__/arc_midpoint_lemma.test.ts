import { describe, expect, it } from "vitest";
import { factHolds } from "@/lib/freeplay/check";
import { factEqual, type Fact } from "@/lib/freeplay/dsl";
import { verify } from "@/lib/freeplay/verify";
import { arcMidpointLemma as puzzle } from "../puzzles/arc_midpoint_lemma";

/**
 * Drop-policy verification for the shipped `arc_midpoint_lemma` puzzle: every
 * given and the goal must hold numerically, and the full solution chain must
 * replay in the SHIPPED verifier (DD/AR + promoted rules), ending at the goal.
 */
describe("arc_midpoint_lemma (shipped puzzle)", () => {
  const { coords, given, goal, solution } = puzzle;

  it("every given holds numerically on the puzzle coords", () => {
    for (const g of given) expect(factHolds(g, coords, {})).toBe(true);
  });

  it("the goal holds numerically on the puzzle coords", () => {
    expect(factHolds(goal, coords, {})).toBe(true);
  });

  it("the full solution chain verifies step-by-step in the shipped engine", () => {
    const established: Fact[] = [...given];
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
