import { describe, expect, it } from "vitest";
import { eqratio, factHoldsL, type LFact } from "@/lib/freeplay/lengths/dsl";
import { dist } from "@/lib/freeplay/geom";
import { getPuzzle } from "@/lib/freeplay/puzzles";
import { verify } from "@/lib/freeplay/verify";
import { jbmo_shortlist_2005_g2 as puzzle } from "../puzzles/jbmo_shortlist_2005_g2";

/**
 * End-to-end check for the SHIPPED `jbmo-shortlist-2005-g2` puzzle: every given
 * and the goal hold numerically (MA² = MB·MR with M external), and the one-step
 * tangent-secant power solution verifies in the shipped engine — which composes
 * the RATIO_RULES at the verify layer and routes the eqratio to the length chase.
 */
describe("puzzle: jbmo-shortlist-2005-g2 (tangent-segment power)", () => {
  const { coords, given, goal, solution } = puzzle;
  const { O, A, M, B, R } = coords;

  it("config is numerically valid: M external, secant M-B-R, MA² = MB·MR", () => {
    // A, B, R all on circle k (centre O): equal radii.
    const ra = dist(O, A);
    expect(dist(O, B)).toBeCloseTo(ra, 6);
    expect(dist(O, R)).toBeCloseTo(ra, 6);
    // The power identity that the goal encodes.
    const ma = dist(M, A);
    expect(ma * ma).toBeCloseTo(dist(M, B) * dist(M, R), 6);
    // Generic: the three segments from M are pairwise distinct.
    const ls = [dist(M, A), dist(M, B), dist(M, R)];
    for (let i = 0; i < ls.length; i++)
      for (let j = i + 1; j < ls.length; j++)
        expect(Math.abs(ls[i] - ls[j])).toBeGreaterThan(1e-3);
  });

  it("every given holds numerically on the coordinates", () => {
    for (const g of given) expect(factHoldsL(g, coords)).toBe(true);
  });

  it("the goal holds numerically on the coordinates", () => {
    expect(factHoldsL(goal, coords)).toBe(true);
  });

  it("replays the full solution chain through the shipped verifier (minimal premises)", () => {
    const established: LFact[] = [...given];
    for (const step of solution) {
      const r = verify({
        coords,
        bindings: {},
        establishedFacts: established,
        candidateFact: step.fact,
        citedPremises: step.premises,
      });
      // verify() enforces minimality: an accepted step has no extraneous premise.
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
    const builtGoal = eqratio("M", "A", "M", "B", "M", "R", "M", "A");
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
