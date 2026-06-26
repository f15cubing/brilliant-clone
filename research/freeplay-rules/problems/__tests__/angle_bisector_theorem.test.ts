/**
 * Play-test for the ANGLE BISECTOR THEOREM (Euclid VI.3), attempted as a FULL
 * length-ratio proof: BD/DC = AB/AC.
 *
 * The proof chains four producers — an AR angle-chase (the isosceles base-angle
 * equality), the shipped metric `isosceles` rule (eqangle ⇒ cong), Thales'
 * `basic proportionality theorem` (eqratio), and a `LengthAR` fusion of the cong
 * with the eqratio. `replayProblem` cannot be used (it runs the angle-only
 * `researchVerify`, which has no `eqratio`), so we drive each step through
 * `researchVerifyL` directly, advancing the established set like the real loop.
 *
 * We also assert the GAP: the shipped engine (RULES) cannot validate the ratio
 * goal at all (no `eqratio` in the shipped DSL; AR is angles-only).
 */
import { describe, expect, it } from "vitest";
import type { Coords } from "@/lib/freeplay/check";
import { rel, type Fact } from "@/lib/freeplay/dsl";
import { eqratio, factHoldsL, type LFact } from "../../lengths/dsl";
import { researchVerifyL } from "../../lengths/verify";
import { verifyWith, RULES } from "../../harness";
import { angle_bisector_theorem as P } from "../angle_bisector_theorem";

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

  it("the configuration is a faithful, scalene realization", () => {
    const d = (p: number[], q: number[]) => Math.hypot(p[0] - q[0], p[1] - q[1]);
    const { A, B, C, D, E } = P.coords as Record<string, number[]>;
    // Scalene triangle ABC (so AB/AC = 2 ≠ 1 is a non-trivial ratio).
    expect(d(A, B)).toBeCloseTo(30, 9);
    expect(d(A, C)).toBeCloseTo(15, 9);
    expect(Math.abs(d(A, B) - d(B, C))).toBeGreaterThan(1e-6);
    // D strictly on segment BC, E on line AB beyond A.
    expect(Math.abs(d(B, D) + d(D, C) - d(B, C))).toBeLessThan(1e-9);
    // AE = AC (the isosceles leg equality the proof manufactures).
    expect(d(A, E)).toBeCloseTo(d(A, C), 9);
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

  it("step 1: ∠AEC = ∠ACE via the AR angle-chase", () => {
    const { results } = replay();
    expect(results[0]).toEqual({ valid: true, rule: P.steps[0].expectRule });
  });

  it("step 2: AE = AC via the isosceles (equal base angles ⇒ equal sides) rule", () => {
    const { results } = replay();
    expect(results[1]).toEqual({ valid: true, rule: P.steps[1].expectRule });
  });

  it("step 3: BA/AE = BD/DC via the basic proportionality theorem", () => {
    const { results } = replay();
    expect(results[2]).toEqual({ valid: true, rule: P.steps[2].expectRule });
  });

  it("step 4: BD/DC = AB/AC via the length-chase fusion (cong + eqratio)", () => {
    const { results } = replay();
    expect(results[3]).toEqual({ valid: true, rule: P.steps[3].expectRule });
  });

  it("the goal (eqratio BD/DC = AB/AC) is reached end-to-end", () => {
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

  it("step 1 is MINIMAL: dropping bisector / coll(B,A,E) / para each breaks it", () => {
    for (let i = 0; i < P.steps[0].premises.length; i++) {
      const without = P.steps[0].premises.filter((_, k) => k !== i);
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

  it("step 4 is MINIMAL: it needs BOTH the Thales ratio AND the congruence", () => {
    const established = [...P.given, P.steps[0].fact, P.steps[1].fact, P.steps[2].fact];
    for (const only of [P.steps[2].fact, P.steps[1].fact]) {
      const r = researchVerifyL({
        coords: P.coords,
        bindings: {},
        establishedFacts: established,
        candidateFact: P.goal,
        citedPremises: [only],
      });
      expect(r.valid, "one premise alone must not reach the goal").toBe(false);
    }
  });

  // ---- soundness: a false ratio is rejected ---------------------------------

  it("soundness: the false orientation BD/DC = AC/AB is NOT derived", () => {
    const wrong = eqratio("B", "D", "D", "C", "A", "C", "A", "B"); // BD/DC = AC/AB
    expect(factHoldsL(wrong, P.coords)).toBe(false); // 2 ≠ 1/2
    const r = researchVerifyL({
      coords: P.coords,
      bindings: {},
      establishedFacts: [...P.given, P.steps[2].fact, P.steps[1].fact],
      candidateFact: wrong,
      citedPremises: [P.steps[2].fact, P.steps[1].fact],
    });
    expect(r.valid).toBe(false);
  });

  it("soundness: a NON-bisector figure does not yield the base-angle step", () => {
    // Slide D along BC to D'=(23,4) (still on segment BC) so A,D' is no longer
    // the bisector (∠BAD' ≠ ∠D'AC). Keep E and the (now false) para citation;
    // the AR chase must reject the base-angle equality.
    const bad: Coords = { ...P.coords, D: [23, 4] };
    expect(factHoldsL(rel("coll", ["B", "D", "C"]), bad)).toBe(true); // still on BC
    expect(factHoldsL(P.given[0], bad)).toBe(false); // bisector eqangle now false
    const r = researchVerifyL({
      coords: bad,
      bindings: {},
      establishedFacts: P.given,
      candidateFact: P.steps[0].fact,
      citedPremises: P.steps[0].premises,
    });
    expect(r.valid).toBe(false);
  });

  // ---- THE GAP: the shipped engine cannot do this on its own ----------------

  it("GAP: the shipped engine (RULES) cannot validate the ratio goal", () => {
    // `eqratio` is not in the shipped DSL and the shipped AR is angles-only, so
    // the production verifier cannot even express, let alone establish, the
    // bisector ratio. We cite the ordinary bisector fact (an `eqratio` premise
    // would itself crash the shipped `canonicalKey`, which is the same gap).
    const bisector = P.given[0] as Fact;
    const r = verifyWith(RULES, {
      coords: P.coords,
      bindings: {},
      establishedFacts: [bisector],
      candidateFact: P.goal as unknown as Fact,
      citedPremises: [bisector],
    });
    expect(r.valid).toBe(false);
  });
});
