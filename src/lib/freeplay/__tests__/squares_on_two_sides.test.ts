import { describe, expect, it } from "vitest";
import { factEqual } from "@/lib/freeplay/dsl";
import { factHoldsL } from "@/lib/freeplay/lengths/dsl";
import { verify } from "@/lib/freeplay/verify";
import { squares_on_two_sides as puzzle } from "../puzzles/squares_on_two_sides";

/**
 * DROP-POLICY verification in the SHIPPED engine for the squares-on-two-sides
 * congruence BG = CE.
 *
 * (a) every given and the goal hold numerically on the coords;
 * (b) each solution step replays through `verify` against the shipped rule set;
 * (c) the final step's fact equals the goal.
 */
describe("squares_on_two_sides (shipped)", () => {
  const { coords, given, goal, solution } = puzzle;

  it("every given and the goal hold numerically on the coords", () => {
    for (const g of given) expect(factHoldsL(g, coords)).toBe(true);
    expect(factHoldsL(goal, coords)).toBe(true);
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
