import { describe, expect, it } from "vitest";
import { rel } from "@/lib/freeplay/dsl";
import type { Coords } from "@/lib/freeplay/check";
import { midpoint_congruence } from "../midpoint_congruence";
import { verifyWith, RULES } from "../../harness";

/**
 * Generic, non-symmetric figure:
 *   A = (0,0), B = (6,2), M = midpoint(AB) = (3,1).
 *   P is an unrelated extra point (NOT equidistant: MP ≠ MA).
 * The segment AB is not axis-aligned and M is a true midpoint, so MA = MB but
 * no accidental symmetry makes a wrong conclusion look true.
 */
const coords: Coords = {
  A: [0, 0],
  B: [6, 2],
  M: [3, 1],
  P: [5, 9],
};

const midpMAB = rel("midp", ["M", "A", "B"]);
const goal = rel("cong", ["M", "A", "M", "B"]); // MA = MB

describe("midpoint gives equal halves (research rule)", () => {
  it("the rule alone derives MA = MB from midp(M,A,B)", () => {
    const out = midpoint_congruence.derive([midpMAB], {
      coords,
      bindings: {},
      points: Object.keys(coords),
    });
    expect(
      out.some((f) => f.kind === "rel" && f.name === "cong"),
    ).toBe(true);
  });

  it("verifies in isolation citing exactly midp(M,A,B)", () => {
    const r = verifyWith([midpoint_congruence], {
      coords,
      bindings: {},
      establishedFacts: [midpMAB],
      candidateFact: goal,
      citedPremises: [midpMAB],
    });
    expect(r).toEqual({ valid: true, rule: "midpoint gives equal halves" });
  });

  it("SOUNDNESS: does NOT emit/accept cong(M,A,M,P) when MP ≠ MA", () => {
    const bad = rel("cong", ["M", "A", "M", "P"]);

    // The rule itself never produces this false length equality.
    const out = midpoint_congruence.derive([midpMAB], {
      coords,
      bindings: {},
      points: Object.keys(coords),
    });
    expect(
      out.some(
        (f) =>
          f.kind === "rel" &&
          f.name === "cong" &&
          JSON.stringify(f.points) === JSON.stringify(["M", "A", "M", "P"]),
      ),
    ).toBe(false);

    // And the verifier rejects the step (numerically false here).
    const r = verifyWith([midpoint_congruence], {
      coords,
      bindings: {},
      establishedFacts: [midpMAB],
      candidateFact: bad,
      citedPremises: [midpMAB],
    });
    expect(r.valid).toBe(false);
  });

  it("PROMOTED: the shipped engine now proves MA = MB from midp(M,A,B)", () => {
    const r = verifyWith(RULES, {
      coords,
      bindings: {},
      establishedFacts: [midpMAB],
      candidateFact: goal,
      citedPremises: [midpMAB],
    });
    // This rule has been promoted into the shipped engine
    // (src/lib/freeplay/rules/), so RULES now proves this directly. Regression
    // guard that the promotion stayed wired.
    expect(r.valid).toBe(true);
  });
});
