/**
 * Play-test for the Simson–Wallace line (a collinearity stress-test) — CLOSED.
 *
 * Steps 1–5 reduce the theorem to its full directed-angle content
 * `para(D,E,D,F)` (lines DE, DF coincide, since they share D). Step 6 — the
 * literal `coll(D,E,F)` — is now produced by the `coincident_direction_collinear`
 * bridge rule, so the chain reaches the goal END-TO-END.
 *
 * The replay below runs the verifier with the production `RULES`, the existing
 * `RESEARCH_RULES`, AND the new bridge rule. (The shipped `replayProblem`
 * helper uses `researchVerify`, whose rule set is the orchestrator-maintained
 * `rules/index.ts`; this candidate rule is intentionally not registered there
 * yet, so we replay with an explicit rule list — exactly as the per-rule tests
 * do — to prove the closure without editing any shared file.)
 */
import { describe, expect, it } from "vitest";
import { factHolds } from "@/lib/freeplay/check";
import { factEqual, rel, type Fact } from "@/lib/freeplay/dsl";
import { verifyWith, RULES, RESEARCH_RULES, type VerifyResult } from "../../harness";
import { coincident_direction_collinear } from "../../rules/coincident_direction_collinear";
import { simson_line as P } from "../simson_line";

const RULESET = [...RULES, ...RESEARCH_RULES, coincident_direction_collinear];

interface StepReport {
  index: number;
  result: VerifyResult;
  numericallyTrue: boolean;
}

/** Local replay mirroring `replayProblem`, but with an explicit rule list. */
function replayWithBridge() {
  const bindings = P.bindings ?? {};
  let established: Fact[] = [...P.given];
  const steps: StepReport[] = [];
  for (let i = 0; i < P.steps.length; i++) {
    const step = P.steps[i];
    const result = verifyWith(RULESET, {
      coords: P.coords,
      bindings,
      establishedFacts: established,
      candidateFact: step.fact,
      citedPremises: step.premises,
      givens: P.given,
      analogy: step.analogy,
    });
    steps.push({
      index: i,
      result,
      numericallyTrue: factHolds(step.fact, P.coords, bindings),
    });
    if (result.valid) established = [...established, step.fact];
  }
  const goalReached = established.some((f) => factEqual(f, P.goal));
  const allValid = steps.every((s) => s.result.valid);
  return { steps, goalReached, allValid };
}

describe(`problem: ${P.id} (${P.source})`, () => {
  const report = replayWithBridge();

  it("every given is numerically true in the coordinates", () => {
    for (const g of P.given) {
      expect(factHolds(g, P.coords), JSON.stringify(g)).toBe(true);
    }
  });

  it("every step fact (and the goal) is numerically true in the coordinates", () => {
    for (const s of report.steps) {
      expect(s.numericallyTrue, JSON.stringify(P.steps[s.index].fact)).toBe(true);
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

  // ---- THE CLOSURE: coll(D,E,F) via the coincident-direction bridge ---------
  it("step 6: coll(D,E,F) via `coincident direction ⇒ collinear` (the bridge)", () => {
    expect(report.steps[5].result).toEqual({
      valid: true,
      rule: "coincident direction ⇒ collinear",
    });
  });

  it("the proof reaches the goal END-TO-END (gap closed)", () => {
    expect(report.goalReached).toBe(true);
    expect(report.allValid).toBe(true);
  });

  it("the goal coll(D,E,F) is numerically a true collinearity in the figure", () => {
    expect(factHolds(rel("coll", ["D", "E", "F"]), P.coords)).toBe(true);
  });

  // Regression guard that the bridge rule's promotion stayed wired: the rule was
  // promoted into the shipped engine (src/lib/freeplay/rules/), so the
  // shipped + research engine now packages coll(D,E,F) when the proven
  // para(D,E,D,F) is cited.
  it("PROMOTED: coll(D,E,F) is now provable citing the proven para", () => {
    const r = verifyWith([...RULES, ...RESEARCH_RULES], {
      coords: P.coords,
      bindings: {},
      establishedFacts: [
        ...P.given,
        rel("cyclic", ["P", "C", "D", "E"]),
        rel("cyclic", ["P", "B", "D", "F"]),
        rel("para", ["D", "E", "D", "F"]),
      ],
      candidateFact: rel("coll", ["D", "E", "F"]),
      citedPremises: [rel("para", ["D", "E", "D", "F"])],
    });
    expect(r.valid).toBe(true);
  });

  // The bridge step is MINIMAL: it needs exactly para(D,E,D,F). Citing the extra
  // cyclic facts alongside it would be flagged extraneous.
  it("MINIMALITY: citing the cyclics alongside the para makes step 6 extraneous", () => {
    const r = verifyWith(RULESET, {
      coords: P.coords,
      bindings: {},
      establishedFacts: [
        ...P.given,
        rel("cyclic", ["P", "C", "D", "E"]),
        rel("cyclic", ["P", "B", "D", "F"]),
        rel("para", ["D", "E", "D", "F"]),
      ],
      candidateFact: rel("coll", ["D", "E", "F"]),
      citedPremises: [
        rel("para", ["D", "E", "D", "F"]),
        rel("cyclic", ["P", "C", "D", "E"]),
        rel("cyclic", ["P", "B", "D", "F"]),
      ],
    });
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reason).toBe("extraneous_premises");
  });
});
