/**
 * Play-test for (reduced from) JBMO Shortlist 2010 G3 — the power-of-a-point
 * length lemma AD·AB = AE·AC.
 *
 * One deduction in the length subsystem: from B,C,D,E concyclic and the two
 * secants A–D–B, A–E–C, the shipped `power_of_a_point` rule emits the ratio.
 * Driven through `researchVerifyL`; the premises are load-bearing and the figure
 * is a genuine external-point/two-secant realization (scalene triangle).
 */
import { describe, expect, it } from "vitest";
import type { Coords } from "@/lib/freeplay/check";
import { rel } from "@/lib/freeplay/dsl";
import { eqratio, factHoldsL } from "../../lengths/dsl";
import { researchVerifyL } from "../../lengths/verify";
import { jbmo_shortlist_2010_g3_pop as P } from "../jbmo_shortlist_2010_g3_pop";

const d = (p: number[], q: number[]) => Math.hypot(p[0] - q[0], p[1] - q[1]);

describe(`problem: ${P.id} (${P.source})`, () => {
  it("every given is numerically true in the coordinates", () => {
    for (const g of P.given) expect(factHoldsL(g, P.coords), JSON.stringify(g)).toBe(true);
  });

  it("the goal ratio (and the power equality) holds numerically", () => {
    expect(factHoldsL(P.goal, P.coords)).toBe(true);
    const { A, B, C, D, E } = P.coords as Record<string, number[]>;
    expect(Math.abs(d(A, D) * d(A, B) - d(A, E) * d(A, C))).toBeLessThan(1e-6);
  });

  it("A is external with genuine secants: D between A,B and E between A,C; ABC scalene", () => {
    const { A, B, C, D, E } = P.coords as Record<string, number[]>;
    expect(Math.abs(d(A, D) + d(D, B) - d(A, B))).toBeLessThan(1e-9); // D between A,B
    expect(Math.abs(d(A, E) + d(E, C) - d(A, C))).toBeLessThan(1e-9); // E between A,C
    const ab = d(A, B), bc = d(B, C), ca = d(C, A);
    expect(Math.abs(ab - bc)).toBeGreaterThan(1e-2);
    expect(Math.abs(bc - ca)).toBeGreaterThan(1e-2);
    expect(Math.abs(ca - ab)).toBeGreaterThan(1e-2);
  });

  it("the single step derives the ratio via 'power of a point'", () => {
    const r = researchVerifyL({
      coords: P.coords,
      bindings: {},
      establishedFacts: P.given,
      candidateFact: P.goal,
      citedPremises: P.steps[0].premises,
    });
    expect(r).toEqual({ valid: true, rule: P.steps[0].expectRule });
  });

  it("MINIMAL: dropping any of the three premises breaks the derivation", () => {
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

  it("soundness: the false orientation AD·AE = AB·AC is NOT derived", () => {
    const wrong = eqratio("A", "D", "A", "B", "A", "E", "A", "C"); // AD/AB = AE/AC (false)
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

  it("soundness: a NON-concyclic figure does not yield the power-of-a-point ratio", () => {
    const bad: Coords = { ...P.coords, E: [0.3, 1.2] }; // pull E off ω1
    expect(factHoldsL(rel("cyclic", ["B", "C", "D", "E"]), bad)).toBe(false);
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
