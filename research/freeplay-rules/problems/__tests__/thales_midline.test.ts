/**
 * Play-test for the THALES INTERCEPT / basic-proportionality problem.
 *
 * The proof needs the new length subsystem: two `thales_basic_proportionality`
 * steps emit the side-division proportions, then one `LengthAR` length-chase
 * fuses them into the goal ratio AD/AF = AE/AG.
 *
 * `replayProblem` (angle-only `researchVerify`) cannot run this — it has no
 * `eqratio` — so each step is driven through `researchVerifyL`
 * (RULES + RESEARCH_RULES + LENGTH_RULES), advancing the established set exactly
 * like the real proof loop. We also confirm the GAP: the shipped engine alone
 * cannot validate the goal, and dropping the Thales rule breaks the key steps —
 * so the rule is genuinely load-bearing.
 */
import { describe, expect, it } from "vitest";
import { rel, type Fact } from "@/lib/freeplay/dsl";
import { RULES } from "@/lib/freeplay/rules";
import { RESEARCH_RULES } from "../../rules";
import { eqratio, factHoldsL, type LFact } from "../../lengths/dsl";
import { researchVerifyL, verifyL } from "../../lengths/verify";
import { similar_triangles_aa } from "../../lengths/rules/similar_triangles_aa";
import { sas_similarity } from "../../lengths/rules/sas_similarity";
import { verifyWith } from "../../harness";
import { thales_midline as P } from "../thales_midline";

describe(`problem: ${P.id} (${P.source})`, () => {
  it("every given is numerically true in the coordinates", () => {
    for (const g of P.given) {
      expect(factHoldsL(g, P.coords), JSON.stringify(g)).toBe(true);
    }
  });

  it("every step fact (incl. the eqratio goal) is numerically true", () => {
    for (const s of P.steps) {
      expect(factHoldsL(s.fact, P.coords), JSON.stringify(s.fact)).toBe(true);
    }
    expect(factHoldsL(P.goal, P.coords)).toBe(true);
  });

  it("D,F lie strictly between A,B and E,G between A,C (genuine cuts)", () => {
    const d = (p: number[], q: number[]) => Math.hypot(p[0] - q[0], p[1] - q[1]);
    const { A, B, C, D, E, F, G } = P.coords as Record<string, number[]>;
    expect(Math.abs(d(A, D) + d(D, B) - d(A, B))).toBeLessThan(1e-9);
    expect(Math.abs(d(A, F) + d(F, B) - d(A, B))).toBeLessThan(1e-9);
    expect(Math.abs(d(A, E) + d(E, C) - d(A, C))).toBeLessThan(1e-9);
    expect(Math.abs(d(A, G) + d(G, C) - d(A, C))).toBeLessThan(1e-9);
  });

  // Manual replay through the length-aware verifier.
  const replay = () => {
    let established: LFact[] = [...P.given];
    const results = P.steps.map((s) => {
      const r = researchVerifyL({
        coords: P.coords,
        bindings: {},
        establishedFacts: established,
        candidateFact: s.fact,
        citedPremises: s.premises,
      });
      if (r.valid) established = [...established, s.fact];
      return r;
    });
    return { results, established };
  };

  it("step 1: AD/AB = AE/AC via basic proportionality theorem", () => {
    const { results } = replay();
    expect(results[0]).toEqual({ valid: true, rule: P.steps[0].expectRule });
  });

  it("step 2: AF/AB = AG/AC via basic proportionality theorem", () => {
    const { results } = replay();
    expect(results[1]).toEqual({ valid: true, rule: P.steps[1].expectRule });
  });

  it("step 3: AD/AF = AE/AG via LengthAR fusion (length-chase)", () => {
    const { results } = replay();
    expect(results[2]).toEqual({ valid: true, rule: P.steps[2].expectRule });
  });

  it("the goal (eqratio) is reached end-to-end", () => {
    const { results, established } = replay();
    expect(results.every((r) => r.valid)).toBe(true);
    expect(
      established.some(
        (f) =>
          factHoldsL(P.goal, P.coords) &&
          JSON.stringify(f) === JSON.stringify(P.goal),
      ),
    ).toBe(true);
  });

  // ---- minimality: every cited premise is load-bearing ----------------------

  it("step 1 is MINIMAL: dropping any cited premise breaks the derivation", () => {
    const cited = P.steps[0].premises;
    for (let i = 0; i < cited.length; i++) {
      const without = cited.filter((_, k) => k !== i);
      const r = researchVerifyL({
        coords: P.coords,
        bindings: {},
        establishedFacts: P.given,
        candidateFact: P.steps[0].fact,
        citedPremises: without,
      });
      expect(r.valid, `dropping premise ${i} should break step 1`).toBe(false);
    }
  });

  it("step 3 is MINIMAL: it needs BOTH proportions to fuse", () => {
    const established = [...P.given, P.steps[0].fact, P.steps[1].fact];
    for (const only of [P.steps[0].fact, P.steps[1].fact]) {
      const r = researchVerifyL({
        coords: P.coords,
        bindings: {},
        establishedFacts: established,
        candidateFact: P.goal,
        citedPremises: [only],
      });
      expect(r.valid, "a single proportion must not suffice").toBe(false);
    }
  });

  // ---- soundness: a wrong fused ratio is rejected ----------------------------

  it("soundness: the cross-side orientation AD/AE = AG/AF is NOT derived", () => {
    // AD/AF = AE/AG is the TRUE proportion. The cross-side mixture AD/AE = AG/AF
    // is genuinely FALSE here (AD/AE = 3/√5 ≈ 1.342, AG/AF = 3√5/9 ≈ 0.745), so
    // the engine must refuse it even from the same two cited proportions.
    const wrong = eqratio("A", "D", "A", "E", "A", "G", "A", "F"); // AD/AE = AG/AF
    expect(factHoldsL(wrong, P.coords)).toBe(false);
    const r = researchVerifyL({
      coords: P.coords,
      bindings: {},
      establishedFacts: [...P.given, P.steps[0].fact, P.steps[1].fact],
      candidateFact: wrong,
      citedPremises: [P.steps[0].fact, P.steps[1].fact],
    });
    expect(r.valid).toBe(false);
  });

  it("soundness: when a cut is NOT parallel to BC the Thales step is rejected", () => {
    // Slide E off the t=1/4 line so DE ∦ BC; the cited para(D,E,B,C) is then
    // false and the basic-proportionality step must not validate.
    const bad = { ...P.coords, E: [2, 3] as [number, number] };
    expect(factHoldsL(rel("para", ["D", "E", "B", "C"]), bad)).toBe(false);
    const r = researchVerifyL({
      coords: bad,
      bindings: {},
      establishedFacts: P.given,
      candidateFact: P.steps[0].fact,
      citedPremises: P.steps[0].premises,
    });
    expect(r.valid).toBe(false);
  });

  // ---- GAP: the rule is load-bearing ----------------------------------------

  it("GAP: the shipped engine (RULES) cannot validate the eqratio goal", () => {
    // `eqratio` is not in the shipped DSL and the angle AR has no length table,
    // so the shipped verifier cannot establish the goal (candidate cast since
    // the shipped VerifyInput only types ordinary `Fact`s).
    const r = verifyWith(RULES, {
      coords: P.coords,
      bindings: {},
      establishedFacts: P.given,
      candidateFact: P.goal as unknown as Fact,
      citedPremises: P.given,
    });
    expect(r.valid).toBe(false);
  });

  it("GAP: WITHOUT thales_basic_proportionality the key step cannot be derived", () => {
    // Length layer with every length rule EXCEPT the one under test: the two
    // similarity rules cannot produce the side-division proportion from the
    // incidence + parallel premises, so step 1 is unjustified.
    const r = verifyL(
      [...RULES, ...RESEARCH_RULES, similar_triangles_aa, sas_similarity],
      {
        coords: P.coords,
        bindings: {},
        establishedFacts: P.given,
        candidateFact: P.steps[0].fact,
        citedPremises: P.steps[0].premises,
      },
    );
    expect(r.valid).toBe(false);
  });
});
