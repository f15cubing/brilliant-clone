import { describe, expect, it } from "vitest";
import { canonicalKey, rel } from "@/lib/freeplay/dsl";
import { factHolds, type Coords } from "@/lib/freeplay/check";
import { factHoldsL } from "@/lib/freeplay/lengths/dsl";
import { sampleRealizations } from "@/lib/freeplay/realize";
import { imo_shortlist_2024_g1 as puzzle } from "@/lib/freeplay/puzzles/imo_shortlist_2024_g1";
import { spiral_similarity_center } from "../spiral_similarity_center";
import { verifyWith, RULES } from "../../harness";

/**
 * ISOLATION FIGURE — a generic 3-4-5 ROTATION about T = (0,0): C = rot(B) and
 * F = rot(E) under cos = 3/5, sin = 4/5 (so the spiral similarity B→C, E→F is a
 * pure rotation, ratio 1). P = line(B,E) ∩ line(C,F). All lengths are distinct
 * (scalene) so no coincidence can fake the conclusion:
 *
 *   BE² = CF² = 34   TB² = TC² = 40   TE² = TF² = 26
 *
 * and T = (0,0) is the SECOND intersection of circles (B,C,P) and (E,F,P).
 */
const coords: Coords = {
  T: [0, 0],
  B: [6, 2],
  C: [2, 6], // C = rot(B): cos 3/5, sin 4/5
  E: [1, 5],
  F: [-3.4, 3.8], // F = rot(E)
  P: [7 / 17, 91 / 17], // BE ∩ CF
};

const colBEP = rel("coll", ["B", "E", "P"]);
const colCFP = rel("coll", ["C", "F", "P"]);
const cyc1 = rel("cyclic", ["B", "C", "P", "T"]);
const cyc2 = rel("cyclic", ["E", "F", "P", "T"]);
const congBE = rel("cong", ["B", "E", "C", "F"]); // BE = CF (rotation gate)
const goal = rel("cong", ["T", "E", "T", "F"]); // TE = TF (the G1 goal)
const bonus = rel("cong", ["T", "B", "T", "C"]); // TB = TC (also emitted)
const prem = [colBEP, colCFP, cyc1, cyc2, congBE];

const ctx = (c: Coords) => ({ coords: c, bindings: {}, points: Object.keys(c) });

describe("spiral-similarity centre (Miquel point) equidistance (research rule)", () => {
  it("FAITHFULNESS: every premise and the goal hold; decoys do not", () => {
    for (const f of prem) expect(factHolds(f, coords)).toBe(true);
    expect(factHolds(goal, coords)).toBe(true);
    expect(factHolds(bonus, coords)).toBe(true);
    // Decoy length equalities that the scalene figure makes FALSE, so an
    // accidental coincidence cannot stand in for the real conclusion.
    expect(factHolds(rel("cong", ["T", "B", "T", "E"]), coords)).toBe(false);
    expect(factHolds(rel("cong", ["B", "E", "T", "B"]), coords)).toBe(false);
  });

  it("DERIVE: emits both cong(T,E,T,F) and cong(T,B,T,C) from the five premises", () => {
    const out = spiral_similarity_center.derive(prem, ctx(coords));
    const keys = new Set(out.map(canonicalKey));
    expect(keys.has(canonicalKey(goal))).toBe(true);
    expect(keys.has(canonicalKey(bonus))).toBe(true);
  });

  it("ISOLATION: the rule alone verifies cong(T,E,T,F) citing exactly the five premises", () => {
    const r = verifyWith([spiral_similarity_center], {
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

  it("MINIMALITY: dropping ANY one of the five premises ⇒ not valid", () => {
    for (let drop = 0; drop < prem.length; drop++) {
      const cited = prem.filter((_, i) => i !== drop);
      const r = verifyWith([spiral_similarity_center], {
        coords,
        bindings: {},
        establishedFacts: prem,
        candidateFact: goal,
        citedPremises: cited,
      });
      expect(r.valid).toBe(false);
    }
  });

  it("SOUNDNESS-A (BE ≠ CF): a non-isometric spiral (ratio 1.5) is never emitted / is rejected", () => {
    // Same T, B, E; C = S(B), F = S(E) with S a spiral about T of ratio 1.5 and
    // rotation cos 4/5, sin 3/5. All four incidences (2 coll + 2 cyclic) still
    // hold and P = BE ∩ CF, but BE ≠ CF, so TE ≠ TF and TB ≠ TC.
    const bad: Coords = {
      T: [0, 0],
      B: [6, 2],
      C: [5.4, 7.8],
      E: [1, 5],
      F: [-3.3, 6.9],
      P: [-7 / 3, 7],
    };
    // Incidences hold; the equal-segment hypothesis and the conclusion fail.
    expect(factHolds(cyc1, bad)).toBe(true);
    expect(factHolds(cyc2, bad)).toBe(true);
    expect(factHolds(colBEP, bad)).toBe(true);
    expect(factHolds(colCFP, bad)).toBe(true);
    expect(factHolds(congBE, bad)).toBe(false); // BE ≠ CF
    expect(factHolds(goal, bad)).toBe(false); // TE ≠ TF

    const out = spiral_similarity_center.derive(prem, ctx(bad));
    expect(out.some((f) => f.kind === "rel" && f.name === "cong")).toBe(false);

    const r = verifyWith([...RULES, spiral_similarity_center], {
      coords: bad,
      bindings: {},
      establishedFacts: prem,
      candidateFact: goal,
      citedPremises: prem,
    });
    expect(r.valid).toBe(false);
  });

  it("SOUNDNESS-B (T not the centre): the antipodal arc-midpoint T' fails the 2nd circle", () => {
    // T' = (5,5) is the OTHER intersection of the perp-bisector of BC with circle
    // (B,C,P): T'B = T'C and T' ∈ circle (B,C,P), BE = CF, and the colls all
    // hold — but T' ∉ circle (E,F,P), so cyclic(E,F,P,T') is FALSE and
    // cong(T',E,T',F) is FALSE. This is what makes the SECOND circle load-bearing.
    const bad: Coords = { ...coords, T: [5, 5] };
    const cyc2p = rel("cyclic", ["E", "F", "P", "T"]);
    const goalp = rel("cong", ["T", "E", "T", "F"]);
    expect(factHolds(cyc1, bad)).toBe(true); // T' on circle (B,C,P)
    expect(factHolds(rel("cong", ["T", "B", "T", "C"]), bad)).toBe(true); // T'B = T'C
    expect(factHolds(cyc2p, bad)).toBe(false); // T' NOT on circle (E,F,P)
    expect(factHolds(goalp, bad)).toBe(false); // T'E ≠ T'F

    const out = spiral_similarity_center.derive(prem, ctx(bad));
    expect(out.some((f) => f.kind === "rel" && f.name === "cong")).toBe(false);

    const r = verifyWith([...RULES, spiral_similarity_center], {
      coords: bad,
      bindings: {},
      establishedFacts: prem,
      candidateFact: goalp,
      citedPremises: prem,
    });
    expect(r.valid).toBe(false);
  });

  it("PROMOTED: the shipped engine (RULES) now derives cong(T,E,T,F) from these premises", () => {
    const r = verifyWith(RULES, {
      coords,
      bindings: {},
      establishedFacts: prem,
      candidateFact: goal,
      citedPremises: prem,
    });
    // spiral_similarity_center has been promoted into the shipped engine
    // (src/lib/freeplay/rules/), so RULES proves this directly now. Regression
    // guard that the promotion stayed wired.
    expect(r.valid).toBe(true);
  });

  it("CLOSURE: on the real puzzle, the rule reaches the goal across all realizations (engine alone cannot)", () => {
    const realizations = sampleRealizations(puzzle, 6, 0xc0ffee);
    expect(realizations.length).toBeGreaterThan(1);

    // The five established facts at the G1 gap: the two segment-lines through P,
    // the two Miquel circles (the second being the added given cyclic(E,F,P,T)),
    // and the rotation hypothesis BE = CF (the puzzle's cong(C,F,B,E)).
    const collBEP = rel("coll", ["B", "E", "P"]);
    const collCFP = rel("coll", ["C", "F", "P"]);
    const cycBCPT = rel("cyclic", ["B", "C", "P", "T"]);
    const cycEFPT = rel("cyclic", ["E", "F", "P", "T"]);
    const congCFBE = rel("cong", ["C", "F", "B", "E"]);
    const established = [collBEP, collCFP, cycBCPT, cycEFPT, congCFBE];
    const target = rel("cong", ["T", "E", "T", "F"]);

    for (const r of realizations) {
      const c = r.coords;
      const b = r.bindings ?? {};
      // Every cited fact and the goal are realized (cyclic(E,F,P,T) is forced).
      for (const f of established) expect(factHoldsL(f, c, b)).toBe(true);
      expect(factHoldsL(target, c, b)).toBe(true);

      // With the rule, the final step verifies in one move.
      const withRule = verifyWith([...RULES, spiral_similarity_center], {
        coords: c,
        bindings: b,
        establishedFacts: established,
        candidateFact: target,
        citedPremises: established,
      });
      expect(withRule).toEqual({
        valid: true,
        rule: "spiral-similarity centre (Miquel point) equidistance",
      });

      // The rule is promoted, so the shipped engine (RULES) takes the step
      // directly too.
      const shipped = verifyWith(RULES, {
        coords: c,
        bindings: b,
        establishedFacts: established,
        candidateFact: target,
        citedPremises: established,
      });
      expect(shipped.valid).toBe(true);
    }
  });
});
