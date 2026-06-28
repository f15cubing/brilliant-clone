import { describe, expect, it } from "vitest";
import { canonicalKey, rel } from "@/lib/freeplay/dsl";
import { factHolds, type Coords } from "@/lib/freeplay/check";
import { spiral_similarity_center } from "../rules/spiral_similarity_center";
import { verify } from "@/lib/freeplay/verify";

/**
 * Promoted from research/freeplay-rules — spiral-similarity centre (Miquel
 * point) equidistance, ROTATION case.
 *
 * Generic 3-4-5 ROTATION about T = (0,0): C = rot(B), F = rot(E) (cos 3/5,
 * sin 4/5), P = line(B,E) ∩ line(C,F). All lengths distinct (scalene):
 *   BE² = CF² = 34   TB² = TC² = 40   TE² = TF² = 26
 * and T is the SECOND intersection of circles (B,C,P) and (E,F,P). The rule
 * turns the five incidence/length premises into the two equidistances.
 *
 * The end-to-end `verify()` assertion below requires this rule to be registered
 * in `src/lib/freeplay/rules/index.ts` (PROMOTED_RULES); the orchestrator owns
 * that wiring, so until then it is the only assertion here that is not green.
 */
const coords: Coords = {
  T: [0, 0],
  B: [6, 2],
  C: [2, 6],
  E: [1, 5],
  F: [-3.4, 3.8],
  P: [7 / 17, 91 / 17],
};

const colBEP = rel("coll", ["B", "E", "P"]);
const colCFP = rel("coll", ["C", "F", "P"]);
const cyc1 = rel("cyclic", ["B", "C", "P", "T"]);
const cyc2 = rel("cyclic", ["E", "F", "P", "T"]);
const congBE = rel("cong", ["B", "E", "C", "F"]);
const goal = rel("cong", ["T", "E", "T", "F"]); // TE = TF (the G1 goal)
const bonus = rel("cong", ["T", "B", "T", "C"]); // TB = TC (also emitted)
const prem = [colBEP, colCFP, cyc1, cyc2, congBE];

const ctx = (c: Coords) => ({ coords: c, bindings: {}, points: Object.keys(c) });
const emits = (
  out: ReturnType<typeof spiral_similarity_center.derive>,
  f: { points: string[] },
) => new Set(out.map(canonicalKey)).has(canonicalKey(rel("cong", f.points)));

describe("spiral-similarity centre (Miquel point) equidistance (promoted rule)", () => {
  it("the coordinate figure realizes every premise and the goal faithfully", () => {
    for (const f of prem) expect(factHolds(f, coords)).toBe(true);
    expect(factHolds(goal, coords)).toBe(true);
    expect(factHolds(bonus, coords)).toBe(true);
    expect(factHolds(rel("cong", ["T", "B", "T", "E"]), coords)).toBe(false);
  });

  it("the rule alone derives both cong(T,E,T,F) and cong(T,B,T,C)", () => {
    const out = spiral_similarity_center.derive(prem, ctx(coords));
    expect(emits(out, goal)).toBe(true);
    expect(emits(out, bonus)).toBe(true);
  });

  it("end-to-end: verify() accepts cong(T,E,T,F) citing exactly the five premises", () => {
    const r = verify({
      coords,
      bindings: {},
      establishedFacts: prem,
      candidateFact: goal,
      citedPremises: prem,
    });
    expect(r).toEqual({
      valid: true,
      rule: "spiral-similarity centre (Miquel point) equidistance",
    });
  });

  it("MINIMALITY: dropping ANY one premise ⇒ cong(T,E,T,F) not derived", () => {
    for (let drop = 0; drop < prem.length; drop++) {
      const cited = prem.filter((_, i) => i !== drop);
      const out = spiral_similarity_center.derive(cited, ctx(coords));
      expect(emits(out, goal)).toBe(false);
    }
  });

  it("SOUNDNESS-A (BE ≠ CF): a non-isometric spiral (ratio 1.5) emits nothing / is rejected", () => {
    const bad: Coords = {
      T: [0, 0],
      B: [6, 2],
      C: [5.4, 7.8],
      E: [1, 5],
      F: [-3.3, 6.9],
      P: [-7 / 3, 7],
    };
    expect(factHolds(cyc1, bad)).toBe(true);
    expect(factHolds(cyc2, bad)).toBe(true);
    expect(factHolds(colBEP, bad)).toBe(true);
    expect(factHolds(colCFP, bad)).toBe(true);
    expect(factHolds(congBE, bad)).toBe(false); // BE ≠ CF
    expect(factHolds(goal, bad)).toBe(false); // TE ≠ TF

    const out = spiral_similarity_center.derive(prem, ctx(bad));
    expect(out.some((f) => f.kind === "rel" && f.name === "cong")).toBe(false);

    const r = verify({
      coords: bad,
      bindings: {},
      establishedFacts: prem,
      candidateFact: goal,
      citedPremises: prem,
    });
    expect(r.valid).toBe(false);
  });

  it("SOUNDNESS-B (T not the centre): the antipodal arc-midpoint T' fails the 2nd circle", () => {
    const bad: Coords = { ...coords, T: [5, 5] };
    expect(factHolds(cyc1, bad)).toBe(true); // T' on circle (B,C,P)
    expect(factHolds(rel("cong", ["T", "B", "T", "C"]), bad)).toBe(true); // T'B = T'C
    expect(factHolds(cyc2, bad)).toBe(false); // T' NOT on circle (E,F,P)
    expect(factHolds(goal, bad)).toBe(false); // T'E ≠ T'F

    const out = spiral_similarity_center.derive(prem, ctx(bad));
    expect(out.some((f) => f.kind === "rel" && f.name === "cong")).toBe(false);

    const r = verify({
      coords: bad,
      bindings: {},
      establishedFacts: prem,
      candidateFact: goal,
      citedPremises: prem,
    });
    expect(r.valid).toBe(false);
  });
});
