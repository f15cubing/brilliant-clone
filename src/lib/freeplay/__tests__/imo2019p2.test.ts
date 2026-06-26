import { describe, expect, it } from "vitest";
import type { Fact } from "@/lib/freeplay/dsl";
import { factHolds } from "@/lib/freeplay/check";
import { verify } from "@/lib/freeplay/verify";
import { imo2019p2 as puzzle } from "../puzzles/imo2019p2";

/**
 * End-to-end check for the SHIPPED `imo-2019-p2` puzzle: every given holds, and
 * the full six-step Pappus + auxiliary-circles chain verifies in the shipped
 * engine, reaching the goal cyclic(P,P1,Q,Q1). The genuinely new move is the
 * directed converse of the inscribed-angle theorem (`concyclic from equal
 * directed angles`); the other non-AR steps are Pappus and `concyclic_merge`.
 */
describe("puzzle: imo-2019-p2 (P, P1, Q, Q1 concyclic)", () => {
  const { coords, given, goal, solution } = puzzle;

  it("every given holds numerically on the coordinates", () => {
    for (const g of given) expect(factHolds(g as Fact, coords)).toBe(true);
  });

  it("the goal holds numerically on the coordinates", () => {
    expect(factHolds(goal as Fact, coords)).toBe(true);
  });

  it("replays the full solution chain through the shipped verifier", () => {
    const established: Fact[] = [...(given as Fact[])];
    for (const step of solution) {
      const r = verify({
        coords,
        bindings: {},
        establishedFacts: established,
        candidateFact: step.fact,
        citedPremises: step.premises,
      });
      expect(r, JSON.stringify(step.fact)).toEqual({ valid: true, rule: step.rule });
      established.push(step.fact as Fact);
    }
  });

  it("every cited premise is load-bearing (minimal): dropping one breaks the step", () => {
    const established: Fact[] = [...(given as Fact[])];
    for (const step of solution) {
      if (step.premises.length > 1) {
        for (let drop = 0; drop < step.premises.length; drop++) {
          const cited = step.premises.filter((_, i) => i !== drop);
          const r = verify({
            coords,
            bindings: {},
            establishedFacts: established,
            candidateFact: step.fact,
            citedPremises: cited,
          });
          expect(r.valid, `${JSON.stringify(step.fact)} w/o premise ${drop}`).toBe(false);
        }
      }
      established.push(step.fact as Fact);
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
