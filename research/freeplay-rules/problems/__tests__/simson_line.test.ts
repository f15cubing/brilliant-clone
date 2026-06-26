/**
 * Play-test for the Simson–Wallace line (a collinearity stress-test).
 *
 * Steps 1–5 fire and reduce the theorem to its full directed-angle content
 * `para(D,E,D,F)` (lines DE, DF coincide, since they share D). Step 6 — the
 * literal `coll(D,E,F)` — is BLOCKED and pinned `valid:false`, DOCUMENTING the
 * gap: AR never emits a `coll` (its `equation()` is null for `coll`), and the
 * only `coll` producers (`pappus`/`pascal`) do not apply to this figure. The
 * single missing capability is a "coincident-direction ⇒ collinear" bridge.
 */
import { describe, expect, it } from "vitest";
import { factHolds } from "@/lib/freeplay/check";
import { rel } from "@/lib/freeplay/dsl";
import { researchVerify } from "../../harness";
import { replayProblem } from "../replay";
import { simson_line as P } from "../simson_line";

describe(`problem: ${P.id} (${P.source})`, () => {
  const report = replayProblem(P);

  it("every given is numerically true in the coordinates", () => {
    for (const g of P.given) {
      expect(factHolds(g, P.coords), JSON.stringify(g)).toBe(true);
    }
  });

  it("every step fact (and the goal) is numerically true in the coordinates", () => {
    for (const s of report.steps) {
      expect(s.numericallyTrue, s.label).toBe(true);
    }
    expect(factHolds(P.goal, P.coords)).toBe(true);
  });

  it("step 1: ∠PDC = 180 − ∠PEC (supplementary right angles)", () => {
    expect(report.steps[0].result).toEqual({
      valid: true,
      rule: "algebraic angle-chase",
    });
  });

  it("step 2: P,C,D,E concyclic (converse inscribed, pedal circle on PC)", () => {
    expect(report.steps[1].result).toEqual({
      valid: true,
      rule: "converse of inscribed angle",
    });
  });

  it("step 3: ∠PDB = 180 − ∠PFB (supplementary right angles)", () => {
    expect(report.steps[2].result).toEqual({
      valid: true,
      rule: "algebraic angle-chase",
    });
  });

  it("step 4: P,B,D,F concyclic (converse inscribed, pedal circle on PB)", () => {
    expect(report.steps[3].result).toEqual({
      valid: true,
      rule: "converse of inscribed angle",
    });
  });

  it("step 5: D(DE) = D(DF) — para(D,E,D,F), the collinearity in angle form", () => {
    expect(report.steps[4].result).toEqual({
      valid: true,
      rule: "algebraic angle-chase",
    });
  });

  // ---- THE GAP: the literal coll(D,E,F) cannot be produced ------------------
  it("step 6: coll(D,E,F) is BLOCKED (no coincident-direction ⇒ collinear rule)", () => {
    expect(report.steps[5].result.valid).toBe(false);
    if (!report.steps[5].result.valid) {
      expect(report.steps[5].result.reason).toBe("unjustified");
    }
  });

  it("the goal IS numerically a true collinearity (it is the engine, not the figure, that is blocked)", () => {
    expect(factHolds(rel("coll", ["D", "E", "F"]), P.coords)).toBe(true);
  });

  it("the goal is therefore NOT reached end-to-end (documented gap)", () => {
    expect(report.goalReached).toBe(false);
  });

  // Sharpest demonstration of the gap: even after the proven-equivalent
  // para(D,E,D,F) is established and CITED, coll(D,E,F) is still unjustified —
  // there is no rule bridging a coincident direction to a `coll`.
  it("coll(D,E,F) stays blocked even when the proven para(D,E,D,F) is cited", () => {
    const established = [
      ...P.given,
      rel("cyclic", ["P", "C", "D", "E"]),
      rel("cyclic", ["P", "B", "D", "F"]),
      rel("para", ["D", "E", "D", "F"]),
    ];
    const r = researchVerify({
      coords: P.coords,
      bindings: {},
      establishedFacts: established,
      candidateFact: rel("coll", ["D", "E", "F"]),
      citedPremises: [
        rel("para", ["D", "E", "D", "F"]),
        rel("cyclic", ["P", "C", "D", "E"]),
        rel("cyclic", ["P", "B", "D", "F"]),
      ],
    });
    expect(r.valid).toBe(false);
  });

  // And it stays blocked when we throw EVERY given at it (no projective route:
  // not a Pascal hexagon; the three lines pairwise share a vertex so Pappus
  // never sees six distinct points).
  it("coll(D,E,F) stays blocked even citing every given", () => {
    const r = researchVerify({
      coords: P.coords,
      bindings: {},
      establishedFacts: [...P.given],
      candidateFact: rel("coll", ["D", "E", "F"]),
      citedPremises: [...P.given],
    });
    expect(r.valid).toBe(false);
  });
});
