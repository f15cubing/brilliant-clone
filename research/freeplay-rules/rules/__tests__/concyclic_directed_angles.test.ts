import { describe, expect, it } from "vitest";
import { rel, type Fact } from "@/lib/freeplay/dsl";
import type { Coords } from "@/lib/freeplay/check";
import { factHolds } from "@/lib/freeplay/check";
import { buildImo2019p2Config } from "@/lib/freeplay/puzzles/imo2019p2Config";
import { concyclic_from_directed_angles } from "../concyclic_directed_angles";
import { verifyWith, RULES } from "../../harness";

const emits = (out: Fact[], quad: string[]) =>
  out.some(
    (f) =>
      f.kind === "rel" &&
      f.name === "cyclic" &&
      JSON.stringify([...f.points].sort()) === JSON.stringify([...quad].sort()),
  );

describe("concyclic from equal directed angles (research rule)", () => {
  // The motivating GAP: an inscribed-angle converse whose directed equality is
  // SUPPLEMENTARY in undirected measures (apexes on opposite sides of the
  // chord), so it cannot be packaged as a true `eqangle` and the shipped
  // `converse_inscribed` cannot fire. Taken straight from IMO 2019 P2: the
  // auxiliary circle C,Q1,B2,A2, derived from ∠CQ1Q = ∠CBA, A2B2 ∥ AB and the
  // two transversal collinearities.
  const { coords } = buildImo2019p2Config();
  const auxGoal = rel("cyclic", ["C", "Q1", "B2", "A2"]);
  const auxPrem: Fact[] = [
    rel("eqangle", ["C", "Q1", "Q", "C", "B", "A"]),
    rel("para", ["A2", "B2", "A", "B"]),
    rel("coll", ["B", "A1", "B2", "C"]),
    rel("coll", ["Q", "A1", "Q1", "A2"]),
  ];
  const ctx = { coords, bindings: {}, points: Object.keys(coords) };

  it("the supplementary directed equality is REAL: shipped converse_inscribed cannot fire", () => {
    // The undirected ∠CQ1A2 ≠ ∠CB2A2 (they are supplementary), so no true
    // `eqangle` over the chord exists for converse_inscribed.
    expect(factHolds(rel("eqangle", ["C", "Q1", "A2", "C", "B2", "A2"]), coords)).toBe(false);
    expect(factHolds(auxGoal, coords)).toBe(true);
  });

  it("DERIVE: emits cyclic(C,Q1,B2,A2) from the four cited premises", () => {
    const out = concyclic_from_directed_angles.derive(auxPrem, ctx);
    expect(emits(out, auxGoal.points)).toBe(true);
  });

  it("verifies in isolation citing exactly the four premises", () => {
    const r = verifyWith([...RULES, concyclic_from_directed_angles], {
      coords,
      bindings: {},
      establishedFacts: auxPrem,
      candidateFact: auxGoal,
      citedPremises: auxPrem,
    });
    expect(r).toEqual({ valid: true, rule: "concyclic from equal directed angles" });
  });

  it("MINIMALITY / no-coordinate-peeking: dropping ANY premise ⇒ not derivable", () => {
    // Each dropped premise breaks the directed-angle ENTAILMENT, so the rule
    // stays silent even though cyclic(C,Q1,B2,A2) is true in the coordinates —
    // proof that concyclicity is never read off the figure.
    for (let drop = 0; drop < auxPrem.length; drop++) {
      const cited = auxPrem.filter((_, i) => i !== drop);
      const out = concyclic_from_directed_angles.derive(cited, ctx);
      expect(emits(out, auxGoal.points)).toBe(false);

      const r = verifyWith([...RULES, concyclic_from_directed_angles], {
        coords,
        bindings: {},
        establishedFacts: auxPrem,
        candidateFact: auxGoal,
        citedPremises: cited,
      });
      expect(r.valid).toBe(false);
    }
  });

  it("SOUNDNESS: a 4-point set that is NOT concyclic is never emitted / is rejected", () => {
    // Four generic non-concyclic points; an angle premise that does not make
    // them concyclic. The numeric guard and the (absent) entailment both keep
    // the rule silent.
    const bad: Coords = {
      A: [0, 0],
      B: [4, 0],
      C: [4, 3],
      D: [1, 6], // off the circle through A,B,C
    };
    const badGoal = rel("cyclic", ["A", "B", "C", "D"]);
    expect(factHolds(badGoal, bad)).toBe(false);
    const cited: Fact[] = [rel("eqangle", ["A", "C", "B", "A", "D", "B"])];
    const out = concyclic_from_directed_angles.derive(cited, {
      coords: bad,
      bindings: {},
      points: Object.keys(bad),
    });
    expect(emits(out, badGoal.points)).toBe(false);

    const r = verifyWith([...RULES, concyclic_from_directed_angles], {
      coords: bad,
      bindings: {},
      establishedFacts: cited,
      candidateFact: badGoal,
      citedPremises: cited,
    });
    expect(r.valid).toBe(false);
  });

  it("SOUNDNESS: a cited eqangle that is FALSE (undirected) is not consumed", () => {
    // P,Q,X,Y all on a radius-5 circle, but X,Y on OPPOSITE sides of chord PQ,
    // so the undirected ∠PXQ ≠ ∠PYQ — the cited `eqangle` is numerically FALSE.
    // `AngleAR` would read it directionally (and it IS a true directed equality
    // here), so the rule must refuse to reason from the false premise.
    const c2: Coords = { P: [-4, 3], Q: [4, 3], X: [0, 5], Y: [0, -5] };
    const eq = rel("eqangle", ["P", "X", "Q", "P", "Y", "Q"]);
    expect(factHolds(eq, c2)).toBe(false);
    expect(factHolds(rel("cyclic", ["P", "Q", "X", "Y"]), c2)).toBe(true);
    const out = concyclic_from_directed_angles.derive([eq], {
      coords: c2,
      bindings: {},
      points: Object.keys(c2),
    });
    expect(out.length).toBe(0);

    const r = verifyWith([...RULES, concyclic_from_directed_angles], {
      coords: c2,
      bindings: {},
      establishedFacts: [eq],
      candidateFact: rel("cyclic", ["P", "Q", "X", "Y"]),
      citedPremises: [eq],
    });
    expect(r.valid).toBe(false);
  });

  it("SOUNDNESS: concyclic in coords but UNRELATED premises ⇒ no emission", () => {
    // cyclic(C,Q1,B2,A2) holds numerically, but the only cited fact is an
    // unrelated collinearity that says nothing about those four points' angles.
    const unrelated: Fact[] = [rel("coll", ["A", "P", "A1"])];
    const out = concyclic_from_directed_angles.derive(unrelated, ctx);
    expect(out.length).toBe(0);
  });

  it("PROMOTED: the shipped engine alone now derives the aux circle", () => {
    const r = verifyWith(RULES, {
      coords,
      bindings: {},
      establishedFacts: auxPrem,
      candidateFact: auxGoal,
      citedPremises: auxPrem,
    });
    expect(r.valid).toBe(true);
  });
});
