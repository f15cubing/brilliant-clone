import { describe, expect, it } from "vitest";
import { rel } from "@/lib/freeplay/dsl";
import { factHoldsL } from "@/lib/freeplay/lengths/dsl";
import { getPuzzle } from "@/lib/freeplay/puzzles";
import { sampleRealizations } from "@/lib/freeplay/realize";
import type { Realization } from "@/lib/freeplay/types";
import { verify } from "@/lib/freeplay/verify";

/**
 * The headline guarantee: the verifier no longer trusts a single figure. A step
 * must be true (and derivable) across SEVERAL independent realizations, so a fact
 * that only coincidentally holds in the canonical diagram is rejected.
 */
describe("multi-case verification rejects single-figure coincidences", () => {
  // Realization 0 is a coincidence: AB = CD = 2. Realization 1 breaks it: CD = 3.
  // In both, AB ∥ CD (the cited premise) holds.
  const real0: Realization = {
    coords: { A: [0, 0], B: [2, 0], C: [0, 1], D: [2, 1] },
  };
  const real1: Realization = {
    coords: { A: [0, 0], B: [2, 0], C: [0, 1], D: [3, 1] },
  };
  const candidate = rel("cong", ["A", "B", "C", "D"]); // AB = CD
  const premise = rel("para", ["A", "B", "C", "D"]); // AB ∥ CD (true in both)

  it("the coincidence is genuinely true in the canonical figure", () => {
    expect(factHoldsL(candidate, real0.coords, {})).toBe(true);
  });

  it("a single-figure check does NOT reject it as false", () => {
    const r = verify({
      coords: real0.coords,
      bindings: {},
      establishedFacts: [premise],
      candidateFact: candidate,
      citedPremises: [premise],
      realizations: [real0],
    });
    // It's numerically true in this one figure, so the truth gate passes; the
    // rejection (if any) is only because it doesn't follow — NOT because it's
    // false.
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reason).not.toBe("not_true");
  });

  it("checking across realizations rejects it as not_true", () => {
    const r = verify({
      coords: real0.coords,
      bindings: {},
      establishedFacts: [premise],
      candidateFact: candidate,
      citedPremises: [premise],
      realizations: [real0, real1],
    });
    expect(r).toEqual({ valid: false, reason: "not_true" });
  });
});

describe("multi-case verification accepts genuine theorems", () => {
  const puzzle = getPuzzle("inscribed-angle")!;
  const realizations = sampleRealizations(puzzle, 6, 0x5eed);
  const step = puzzle.solution[0];

  it("the inscribed-angle step verifies across all realizations", () => {
    const r = verify({
      coords: puzzle.coords,
      bindings: {},
      establishedFacts: [...puzzle.given],
      candidateFact: step.fact,
      citedPremises: step.premises,
      realizations,
    });
    expect(r).toEqual({ valid: true, rule: step.rule });
  });

  it("a needed premise is NOT flagged extraneous across realizations", () => {
    // The cyclic premise is required in every realization, so the minimal cite
    // stays valid (across-cases minimality only drops premises droppable in ALL
    // realizations).
    const r = verify({
      coords: puzzle.coords,
      bindings: {},
      establishedFacts: [...puzzle.given],
      candidateFact: step.fact,
      citedPremises: step.premises,
      realizations,
    });
    expect(r.valid).toBe(true);
  });

  it("an unnecessary extra premise IS flagged extraneous across realizations", () => {
    // Cite an additional true-but-irrelevant established fact (equal radii OA = OB,
    // true in every realization since A, B are on the circle centered at O). It is
    // not needed for the inscribed-angle step, so the step is rejected.
    const extra = rel("cong", ["O", "A", "O", "B"]);
    const r = verify({
      coords: puzzle.coords,
      bindings: {},
      establishedFacts: [...puzzle.given, extra],
      candidateFact: step.fact,
      citedPremises: [...step.premises, extra],
      realizations,
    });
    expect(r).toEqual({ valid: false, reason: "extraneous_premises" });
  });
});

describe("verify stays backwards-compatible without realizations", () => {
  const puzzle = getPuzzle("inscribed-angle")!;
  const step = puzzle.solution[0];

  it("omitting realizations checks only the single canonical figure", () => {
    const r = verify({
      coords: puzzle.coords,
      bindings: {},
      establishedFacts: [...puzzle.given],
      candidateFact: step.fact,
      citedPremises: step.premises,
    });
    expect(r).toEqual({ valid: true, rule: step.rule });
  });
});
