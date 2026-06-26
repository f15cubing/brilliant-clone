import { describe, expect, it } from "vitest";
import { factEqual } from "@/lib/freeplay/dsl";
import { factHolds } from "@/lib/freeplay/check";
import { verify } from "@/lib/freeplay/verify";
import { jbmo_shortlist_2015_g1 as puzzle } from "../puzzles/jbmo_shortlist_2015_g1";

/**
 * DROP-POLICY verification in the SHIPPED engine for JBMO Shortlist 2015 G1.
 *
 * (a) every given and the goal hold numerically on the coords;
 * (b) each solution step replays through `verify` against the shipped rule set;
 * (c) the final step's fact equals the goal.
 */
describe("jbmo_shortlist_2015_g1 (shipped)", () => {
  const { coords, given, goal, solution } = puzzle;

  it("every given and the goal hold numerically on the coords", () => {
    for (const g of given) expect(factHolds(g, coords)).toBe(true);
    expect(factHolds(goal, coords)).toBe(true);
  });

  it("each solution step verifies in the shipped engine", () => {
    const established = [...given];
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

  it("the final step's fact equals the goal", () => {
    expect(factEqual(solution[solution.length - 1].fact, goal)).toBe(true);
  });
});
