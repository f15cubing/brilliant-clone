import { describe, expect, it } from "vitest";
import { factHolds } from "@/lib/freeplay/check";
import { rel } from "@/lib/freeplay/dsl";
import { verifyWith, RULES } from "../../harness";
import { replayProblem } from "../replay";
import { equilateral_on_two_sides as P } from "../equilateral_on_two_sides";

/**
 * Play-test: "equilateral triangles on two sides" (rotation about A by 60°).
 * The proof closes end-to-end:
 *   step 1 — eqangle(D,A,C,B,A,E) by AR (algebraic angle-chase), and
 *   step 2 — cong(D,C,B,E) by sas_shared_vertex (the rotation congruence).
 */
describe(`problem: ${P.id} (${P.source})`, () => {
  const report = replayProblem(P);

  it("every given is numerically true in the coordinates", () => {
    for (const g of P.given) {
      expect(factHolds(g, P.coords, P.bindings ?? {}), JSON.stringify(g)).toBe(true);
    }
  });

  it("every step fact is numerically true in the coordinates", () => {
    for (const s of report.steps) {
      expect(s.numericallyTrue, s.label).toBe(true);
    }
    // …and the goal DC = BE is genuinely realized in the figure.
    expect(factHolds(P.goal, P.coords, P.bindings ?? {})).toBe(true);
  });

  it("the figure is a generic SCALENE triangle (no coincidences)", () => {
    expect(factHolds(rel("cong", ["A", "B", "A", "C"]), P.coords)).toBe(false);
    expect(factHolds(rel("cong", ["A", "B", "B", "C"]), P.coords)).toBe(false);
    expect(factHolds(rel("cong", ["A", "C", "B", "C"]), P.coords)).toBe(false);
  });

  it("step 1: ∠DAC = ∠BAE is derived by AR from the two 60° apex angles", () => {
    expect(report.steps[0].result).toEqual({
      valid: true,
      rule: "algebraic angle-chase",
    });
  });

  it("step 1 MINIMALITY: one apex angle alone does NOT give ∠DAC = ∠BAE", () => {
    const r = verifyWith(RULES, {
      coords: P.coords,
      bindings: P.bindings ?? {},
      establishedFacts: P.given,
      candidateFact: rel("eqangle", ["D", "A", "C", "B", "A", "E"]),
      citedPremises: [P.given[2]], // only ∠DAB = 60
    });
    expect(r.valid).toBe(false);
  });

  it("step 2: DC = BE closes via sas_shared_vertex (the rotation congruence)", () => {
    expect(report.steps[1].result).toEqual({
      valid: true,
      rule: "SAS about a common vertex",
    });
  });

  it("PROMOTED: the shipped engine (RULES) alone now proves DC = BE", () => {
    // The rotation congruence rule (sas_shared_vertex) has been promoted into the
    // shipped engine (src/lib/freeplay/rules/), so RULES now pairs the two
    // shared-apex arms and proves DC = BE directly. Regression guard that the
    // promotion stayed wired.
    const r = verifyWith(RULES, {
      coords: P.coords,
      bindings: P.bindings ?? {},
      establishedFacts: [...P.given, rel("eqangle", ["D", "A", "C", "B", "A", "E"])],
      candidateFact: P.goal,
      citedPremises: [
        P.given[0], // AD = AB
        P.given[1], // AC = AE
        rel("eqangle", ["D", "A", "C", "B", "A", "E"]),
      ],
    });
    expect(r.valid).toBe(true);
  });

  it("the goal DC = BE is reached end-to-end and every step is valid", () => {
    expect(report.goalReached).toBe(true);
    expect(report.allValid).toBe(true);
  });
});
