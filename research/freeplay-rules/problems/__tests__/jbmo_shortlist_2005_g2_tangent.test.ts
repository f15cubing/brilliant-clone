/**
 * Play-test for (reduced from) JBMO Shortlist 2005 G2 — the tangent-segment power
 * lemma MA² = MB·MR. One deduction in the length subsystem via the new
 * `tangent_secant_power` rule, driven through `researchVerifyL`. This is a
 * previously-REJECTED contest problem (see findings/contest-problems.md), now
 * closed end-to-end by the new rule.
 */
import { describe, expect, it } from "vitest";
import type { Coords } from "@/lib/freeplay/check";
import { rel } from "@/lib/freeplay/dsl";
import { dist } from "@/lib/freeplay/geom";
import { eqratio, factHoldsL } from "../../lengths/dsl";
import { researchVerifyL } from "../../lengths/verify";
import { jbmo_shortlist_2005_g2_tangent as P } from "../jbmo_shortlist_2005_g2_tangent";

const c = P.coords as Record<string, [number, number]>;

describe(`problem: ${P.id} (${P.source})`, () => {
  it("every given is numerically true in the coordinates", () => {
    for (const g of P.given) expect(factHoldsL(g, P.coords), JSON.stringify(g)).toBe(true);
  });

  it("the goal ratio and the power equality MA² = MB·MR hold numerically", () => {
    expect(factHoldsL(P.goal, P.coords)).toBe(true);
    const ma = dist(c.M, c.A);
    expect(Math.abs(ma * ma - dist(c.M, c.B) * dist(c.M, c.R))).toBeLessThan(1e-6);
  });

  it("genuine tangent-secant config: M external, MA⟂OA, B,R on k and on one ray from M", () => {
    // M is external (on the tangent line, which meets k only at A).
    expect(dist(c.O, c.M)).toBeGreaterThan(5);
    // MA ⟂ OA
    const u = [c.O[0] - c.A[0], c.O[1] - c.A[1]];
    const w = [c.M[0] - c.A[0], c.M[1] - c.A[1]];
    expect(Math.abs(u[0] * w[0] + u[1] * w[1])).toBeLessThan(1e-6);
    // B and R on k, on the same ray from M (secant), and the three lengths distinct
    expect(Math.abs(dist(c.O, c.B) - 5)).toBeLessThan(1e-6);
    expect(Math.abs(dist(c.O, c.R) - 5)).toBeLessThan(1e-6);
    const ls = [dist(c.M, c.A), dist(c.M, c.B), dist(c.M, c.R)];
    for (let i = 0; i < ls.length; i++)
      for (let j = i + 1; j < ls.length; j++)
        expect(Math.abs(ls[i] - ls[j])).toBeGreaterThan(1e-2);
  });

  it("the single step derives the ratio via 'tangent-secant power'", () => {
    const r = researchVerifyL({
      coords: P.coords,
      bindings: {},
      establishedFacts: P.given,
      candidateFact: P.goal,
      citedPremises: P.steps[0].premises,
    });
    expect(r).toEqual({ valid: true, rule: P.steps[0].expectRule });
  });

  it("MINIMAL: dropping any of the four premises breaks the derivation", () => {
    for (let i = 0; i < P.given.length; i++) {
      const without = P.given.filter((_, k) => k !== i);
      const r = researchVerifyL({
        coords: P.coords,
        bindings: {},
        establishedFacts: P.given,
        candidateFact: P.goal,
        citedPremises: without,
      });
      expect(r.valid, `dropping premise ${i} should break the step`).toBe(false);
    }
  });

  it("soundness: the false orientation MA·MB = MR·MA (i.e. MB = MR) is NOT derived", () => {
    const wrong = eqratio("M", "A", "M", "R", "M", "A", "M", "B"); // MA/MR = MA/MB ⇒ MB=MR (false)
    expect(factHoldsL(wrong, P.coords)).toBe(false);
    const r = researchVerifyL({
      coords: P.coords,
      bindings: {},
      establishedFacts: P.given,
      candidateFact: wrong,
      citedPremises: P.given,
    });
    expect(r.valid).toBe(false);
  });

  it("soundness: if MA is not tangent (perp dropped to a non-tangent M), no derivation", () => {
    const bad: Coords = { ...P.coords, M: [c.M[0] + 1.3, c.M[1] - 0.6] };
    expect(factHoldsL(rel("perp", ["O", "A", "A", "M"]), bad)).toBe(false);
    const r = researchVerifyL({
      coords: bad,
      bindings: {},
      establishedFacts: P.given,
      candidateFact: P.goal,
      citedPremises: P.given,
    });
    expect(r.valid).toBe(false);
  });
});
