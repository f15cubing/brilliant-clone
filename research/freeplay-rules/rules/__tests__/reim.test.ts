import { describe, expect, it } from "vitest";
import { rel } from "@/lib/freeplay/dsl";
import type { Coords } from "@/lib/freeplay/check";
import { reim } from "../reim";
import { researchVerify, verifyWith, RULES } from "../../harness";

/**
 * Two circles of radius 5: ω₁ centred at (0,0), ω₂ centred at (6,0).
 * They meet at P=(3,4) and Q=(3,-4).
 *   Line through P (y=4): A=(-3,4) on ω₁, B=(9,4) on ω₂.
 *   Line through Q (dir 2:1): C=(1.4,-4.8) on ω₁, D=(11,0) on ω₂.
 * Reim ⇒ AC ∥ BD.
 */
const coords: Coords = {
  P: [3, 4],
  Q: [3, -4],
  A: [-3, 4],
  B: [9, 4],
  C: [1.4, -4.8],
  D: [11, 0],
};

const omega1 = rel("cyclic", ["P", "Q", "A", "C"]);
const omega2 = rel("cyclic", ["P", "Q", "B", "D"]);
const lineP = rel("coll", ["A", "P", "B"]);
const lineQ = rel("coll", ["C", "Q", "D"]);
const goal = rel("para", ["A", "C", "B", "D"]);

describe("Reim's theorem (research rule)", () => {
  it("the rule alone derives AC ∥ BD from the two circles and two lines", () => {
    const out = reim.derive([omega1, omega2, lineP, lineQ], {
      coords,
      bindings: {},
      points: Object.keys(coords),
    });
    expect(out.some((f) => f.kind === "rel" && f.name === "para")).toBe(true);
  });

  it("verifies in isolation citing exactly the four premises (minimality holds)", () => {
    const r = verifyWith([reim], {
      coords,
      bindings: {},
      establishedFacts: [omega1, omega2, lineP, lineQ],
      candidateFact: goal,
      citedPremises: [omega1, omega2, lineP, lineQ],
    });
    expect(r).toEqual({ valid: true, rule: "Reim's theorem" });
  });

  it("rejects a step that drops a needed circle (unjustified)", () => {
    const r = verifyWith([reim], {
      coords,
      bindings: {},
      establishedFacts: [omega1, omega2, lineP, lineQ],
      candidateFact: goal,
      citedPremises: [omega1, lineP, lineQ], // missing ω₂
    });
    expect(r.valid).toBe(false);
  });

  it("is accepted by the full research rule set", () => {
    const r = researchVerify({
      coords,
      bindings: {},
      establishedFacts: [omega1, omega2, lineP, lineQ],
      candidateFact: goal,
      citedPremises: [omega1, omega2, lineP, lineQ],
    });
    expect(r.valid).toBe(true);
  });

  it("FINDING: the shipped engine ALREADY proves Reim via AR (it is subsumed)", () => {
    // Reim is a directed-angle theorem, so inscribed_angle feeding the AR table
    // derives AC ∥ BD with no new rule. This is why genuine new rules must
    // target what AR cannot do: lengths/ratios, congruence, similarity, and
    // non-angle projective incidence.
    const r = verifyWith(RULES, {
      coords,
      bindings: {},
      establishedFacts: [omega1, omega2, lineP, lineQ],
      candidateFact: goal,
      citedPremises: [omega1, omega2, lineP, lineQ],
    });
    expect(r).toEqual({ valid: true, rule: "algebraic angle-chase" });
  });
});
