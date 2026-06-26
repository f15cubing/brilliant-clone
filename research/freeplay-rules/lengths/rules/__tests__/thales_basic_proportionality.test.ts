import { describe, expect, it } from "vitest";
import { rel, type Fact } from "@/lib/freeplay/dsl";
import type { Coords } from "@/lib/freeplay/check";
import type { V } from "@/lib/freeplay/geom";
import { thales_basic_proportionality } from "../thales_basic_proportionality";
import { verifyL } from "../../verify";
import { eqratio, factHoldsL } from "../../dsl";
import { verifyWith, RULES } from "../../../harness";

/**
 * Triangle ABC in GENERIC (scalene) position:
 *   A=[0,0], B=[6,0], C=[1,5]   →  all three sides have different lengths.
 *
 * D divides AB with parameter t=0.4 (D = A + t·(B−A)) and E divides AC with the
 * SAME parameter (E = A + t·(C−A)). Equal parameters make DE ∥ BC exactly, so
 * the basic-proportionality configuration is realized faithfully:
 *   AD/DB = t/(1−t) = AE/EC,  and  AD/AB = t = AE/AC.
 * D and E land strictly between the vertices, and ABC is non-degenerate.
 */
const t = 0.4;
const A: V = [0, 0];
const B: V = [6, 0];
const C: V = [1, 5];
const D: V = [A[0] + t * (B[0] - A[0]), A[1] + t * (B[1] - A[1])]; // [2.4, 0]
const E: V = [A[0] + t * (C[0] - A[0]), A[1] + t * (C[1] - A[1])]; // [0.4, 2.0]

const coords: Coords = { A, B, C, D, E };
const ctx = { coords, bindings: {}, points: Object.keys(coords) };

// Premises: D on AB, E on AC, and DE ∥ BC.
const collADB = rel("coll", ["A", "D", "B"]);
const collAEC = rel("coll", ["A", "E", "C"]);
const paraDEBC = rel("para", ["D", "E", "B", "C"]);
// Primary side-division ratio AD/DB = AE/EC.
const goal = eqratio("A", "D", "D", "B", "A", "E", "E", "C");

describe("basic proportionality theorem (research length rule)", () => {
  it("the coordinate figure realizes all three givens and the ratio", () => {
    expect(factHoldsL(collADB, coords)).toBe(true);
    expect(factHoldsL(collAEC, coords)).toBe(true);
    expect(factHoldsL(paraDEBC, coords)).toBe(true);
    expect(factHoldsL(goal, coords)).toBe(true);
    // the companion proportion AD/AB = AE/AC also holds
    expect(factHoldsL(eqratio("A", "D", "A", "B", "A", "E", "A", "C"), coords)).toBe(true);
  });

  it("the rule alone emits the side-division proportions", () => {
    const out = thales_basic_proportionality.derive([collADB, collAEC, paraDEBC], ctx);
    expect(out.some((f) => f.kind === "eqratio")).toBe(true);
    expect(out.length).toBeGreaterThanOrEqual(2);
  });

  it("verifies the eqratio citing exactly the three premises", () => {
    const r = verifyL([thales_basic_proportionality], {
      coords,
      bindings: {},
      establishedFacts: [collADB, collAEC, paraDEBC],
      candidateFact: goal,
      citedPremises: [collADB, collAEC, paraDEBC],
    });
    expect(r).toEqual({ valid: true, rule: "basic proportionality theorem" });
  });

  it("MINIMALITY: dropping any one premise → not valid", () => {
    const drop = (cited: Fact[]) =>
      verifyL([thales_basic_proportionality], {
        coords,
        bindings: {},
        establishedFacts: [collADB, collAEC, paraDEBC],
        candidateFact: goal,
        citedPremises: cited,
      });
    expect(drop([collAEC, paraDEBC]).valid).toBe(false); // no coll(A,D,B)
    expect(drop([collADB, paraDEBC]).valid).toBe(false); // no coll(A,E,C)
    expect(drop([collADB, collAEC]).valid).toBe(false); // no para(D,E,B,C)
  });

  it("SOUNDNESS: when DE is NOT parallel to BC → no emit, step rejected", () => {
    // E sits further along AC (parameter 0.7) than D does along AB (0.4), so DE
    // is no longer parallel to BC and AD/DB ≠ AE/EC. The cited `para` premise is
    // now FALSE in the figure; the rule's parallel guard must keep it silent.
    const tE = 0.7;
    const Ebad: V = [A[0] + tE * (C[0] - A[0]), A[1] + tE * (C[1] - A[1])]; // [0.7, 3.5]
    const bad: Coords = { A, B, C, D, E: Ebad };

    expect(factHoldsL(paraDEBC, bad)).toBe(false); // DE ∦ BC
    expect(factHoldsL(goal, bad)).toBe(false); // proportion is false

    const out = thales_basic_proportionality.derive([collADB, collAEC, paraDEBC], {
      coords: bad,
      bindings: {},
      points: Object.keys(bad),
    });
    expect(out.some((f) => f.kind === "eqratio")).toBe(false);

    const r = verifyL([thales_basic_proportionality], {
      coords: bad,
      bindings: {},
      establishedFacts: [collADB, collAEC, paraDEBC],
      candidateFact: goal,
      citedPremises: [collADB, collAEC, paraDEBC],
    });
    expect(r.valid).toBe(false);
  });

  it("GAP: the shipped engine (RULES) cannot validate the side-division ratio", () => {
    // `eqratio` is not even in the shipped DSL and AR is angles-only, so the
    // shipped verifier cannot establish this ratio. (Candidate is cast since the
    // shipped VerifyInput only types ordinary `Fact`s.)
    const r = verifyWith(RULES, {
      coords,
      bindings: {},
      establishedFacts: [collADB, collAEC, paraDEBC],
      candidateFact: goal as unknown as Fact,
      citedPremises: [collADB, collAEC, paraDEBC],
    });
    expect(r.valid).toBe(false);
  });
});
