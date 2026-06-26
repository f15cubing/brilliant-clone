import { describe, expect, it } from "vitest";
import { rel, type Fact } from "@/lib/freeplay/dsl";
import { factHolds, type Coords } from "@/lib/freeplay/check";
import { concyclic_from_directed_angles } from "../rules/concyclic_directed_angles";
import { verify } from "@/lib/freeplay/verify";
import { buildImo2019p2Config } from "@/lib/freeplay/puzzles/imo2019p2Config";

/**
 * Promoted from research/freeplay-rules — the DIRECTED converse of the
 * inscribed-angle theorem. Unlike the shipped `converse_inscribed` (undirected,
 * same-side only), this rule emits `cyclic` whenever the directed inscribed-angle
 * equality is ENTAILED (via AngleAR) by the cited facts — covering the
 * opposite-side / supplementary configurations that make up IMO 2019 P2.
 */
const { coords } = buildImo2019p2Config();

// The motivating supplementary case: the auxiliary circle C,Q1,B2,A2.
const auxGoal = rel("cyclic", ["C", "Q1", "B2", "A2"]);
const auxPrem: Fact[] = [
  rel("eqangle", ["C", "Q1", "Q", "C", "B", "A"]),
  rel("para", ["A2", "B2", "A", "B"]),
  rel("coll", ["B", "A1", "B2", "C"]),
  rel("coll", ["Q", "A1", "Q1", "A2"]),
];
const ctx = { coords, bindings: {}, points: Object.keys(coords) };

const emits = (out: Fact[], quad: string[]) =>
  out.some(
    (f) =>
      f.kind === "rel" &&
      f.name === "cyclic" &&
      JSON.stringify([...f.points].sort()) === JSON.stringify([...quad].sort()),
  );

describe("concyclic from equal directed angles (promoted rule)", () => {
  it("the chord-CA2 equality is SUPPLEMENTARY (undirected), so converse_inscribed can't fire", () => {
    expect(
      factHolds(rel("eqangle", ["C", "Q1", "A2", "C", "B2", "A2"]), coords),
    ).toBe(false);
    expect(factHolds(auxGoal, coords)).toBe(true);
  });

  it("DERIVE: emits cyclic(C,Q1,B2,A2) from the four premises", () => {
    expect(emits(concyclic_from_directed_angles.derive(auxPrem, ctx), auxGoal.points)).toBe(true);
  });

  it("end-to-end: verify() accepts the aux circle via this rule", () => {
    const r = verify({
      coords,
      bindings: {},
      establishedFacts: auxPrem,
      candidateFact: auxGoal,
      citedPremises: auxPrem,
    });
    expect(r).toEqual({ valid: true, rule: "concyclic from equal directed angles" });
  });

  it("MINIMALITY / no coordinate-peeking: dropping ANY premise ⇒ not derivable", () => {
    for (let drop = 0; drop < auxPrem.length; drop++) {
      const cited = auxPrem.filter((_, i) => i !== drop);
      expect(emits(concyclic_from_directed_angles.derive(cited, ctx), auxGoal.points)).toBe(false);
      const r = verify({
        coords,
        bindings: {},
        establishedFacts: auxPrem,
        candidateFact: auxGoal,
        citedPremises: cited,
      });
      expect(r.valid).toBe(false);
    }
  });

  it("SOUNDNESS: four NON-concyclic points are never emitted / rejected", () => {
    const bad: Coords = { A: [0, 0], B: [4, 0], C: [4, 3], D: [1, 6] };
    const badGoal = rel("cyclic", ["A", "B", "C", "D"]);
    expect(factHolds(badGoal, bad)).toBe(false);
    const cited: Fact[] = [rel("eqangle", ["A", "C", "B", "A", "D", "B"])];
    expect(
      emits(
        concyclic_from_directed_angles.derive(cited, {
          coords: bad,
          bindings: {},
          points: Object.keys(bad),
        }),
        badGoal.points,
      ),
    ).toBe(false);
    const r = verify({
      coords: bad,
      bindings: {},
      establishedFacts: cited,
      candidateFact: badGoal,
      citedPremises: cited,
    });
    expect(r.valid).toBe(false);
  });

  it("SOUNDNESS: a cited eqangle that is FALSE (undirected) is not consumed", () => {
    // P,Q,X,Y concyclic on a radius-5 circle, X,Y on OPPOSITE sides of PQ ⇒ the
    // undirected ∠PXQ ≠ ∠PYQ, so the cited eqangle is numerically false; the rule
    // must not read it directionally and license the (true) concyclicity.
    const c2: Coords = { P: [-4, 3], Q: [4, 3], X: [0, 5], Y: [0, -5] };
    const eq = rel("eqangle", ["P", "X", "Q", "P", "Y", "Q"]);
    expect(factHolds(eq, c2)).toBe(false);
    expect(factHolds(rel("cyclic", ["P", "Q", "X", "Y"]), c2)).toBe(true);
    expect(
      concyclic_from_directed_angles.derive([eq], {
        coords: c2,
        bindings: {},
        points: Object.keys(c2),
      }).length,
    ).toBe(0);
    const r = verify({
      coords: c2,
      bindings: {},
      establishedFacts: [eq],
      candidateFact: rel("cyclic", ["P", "Q", "X", "Y"]),
      citedPremises: [eq],
    });
    expect(r.valid).toBe(false);
  });

  it("SOUNDNESS: concyclic in coords but UNRELATED premises ⇒ no emission", () => {
    expect(
      concyclic_from_directed_angles.derive([rel("coll", ["A", "P", "A1"])], ctx).length,
    ).toBe(0);
  });
});
