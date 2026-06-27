import { describe, expect, it } from "vitest";
import { canonicalKey, rel } from "@/lib/freeplay/dsl";
import { factHolds, type Coords } from "@/lib/freeplay/check";
import type { V } from "@/lib/freeplay/geom";
import { aa_similar } from "../lengths/rules/aa_similar";
import { similar_proportional_sides } from "../lengths/rules/similar_proportional_sides";
import { similar_equal_angles } from "../lengths/rules/similar_equal_angles";
import { verify } from "../verify";
import { canonicalKeyL, eqratio, factHoldsL } from "../lengths/dsl";

/**
 * Triangle ABC in GENERIC (scalene) position:
 *   A=[0,0], B=[5,0], C=[2,3]   →  |AB|=5, |BC|=√18, |CA|=√13  (all different).
 *
 * Triangle DEF is a SIMILAR (not congruent) image of ABC under a spiral
 * similarity: scale s=1.7, rotation 40°, translation [8,3], correspondence
 * A↔D, B↔E, C↔F. A similarity preserves angles and scales every length by s, so
 * the two cited equal angles, the similarity, and all three side proportions
 * hold exactly. s≠1 makes the triangles non-congruent (a genuine SIMILARITY).
 */
const A: V = [0, 0];
const B: V = [5, 0];
const C: V = [2, 3];

function sim(p: V, scaleK: number, thetaDeg: number, t: V): V {
  const r = (thetaDeg * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return [
    scaleK * (cos * p[0] - sin * p[1]) + t[0],
    scaleK * (sin * p[0] + cos * p[1]) + t[1],
  ];
}

const S = (p: V): V => sim(p, 1.7, 40, [8, 3]);
const D = S(A);
const E = S(B);
const F = S(C);

const coords: Coords = { A, B, C, D, E, F };
const ctx = { coords, bindings: {}, points: Object.keys(coords) };

// AA premises: ∠BAC = ∠EDF (vertices A,D) and ∠ABC = ∠DEF (vertices B,E).
const angA = rel("eqangle", ["B", "A", "C", "E", "D", "F"]);
const angB = rel("eqangle", ["A", "B", "C", "D", "E", "F"]);
// The third corresponding angle: ∠BCA = ∠EFD (vertices C,F).
const angC = rel("eqangle", ["B", "C", "A", "E", "F", "D"]);
// The first-class similarity fact △ABC ~ △DEF.
const SIM = rel("similar", ["A", "B", "C", "D", "E", "F"]);
// Its three corresponding side proportions.
const sideABBC = eqratio("A", "B", "D", "E", "B", "C", "E", "F"); // AB/DE = BC/EF
const sideABCA = eqratio("A", "B", "D", "E", "C", "A", "F", "D"); // AB/DE = CA/FD
const sideBCCA = eqratio("B", "C", "E", "F", "C", "A", "F", "D"); // BC/EF = CA/FD

describe("similar: canonical key collapses the relation's symmetries", () => {
  it("triangle-swap: ABC~DEF ≡ DEF~ABC", () => {
    expect(canonicalKey(rel("similar", ["A", "B", "C", "D", "E", "F"]))).toBe(
      canonicalKey(rel("similar", ["D", "E", "F", "A", "B", "C"])),
    );
  });

  it("simultaneous vertex permutation: ABC~DEF ≡ BCA~EFD ≡ CAB~FDE", () => {
    const base = canonicalKey(rel("similar", ["A", "B", "C", "D", "E", "F"]));
    expect(canonicalKey(rel("similar", ["B", "C", "A", "E", "F", "D"]))).toBe(base);
    expect(canonicalKey(rel("similar", ["C", "A", "B", "F", "D", "E"]))).toBe(base);
    // swap AND permute simultaneously is also the same statement
    expect(canonicalKey(rel("similar", ["E", "F", "D", "B", "C", "A"]))).toBe(base);
  });

  it("a DIFFERENT correspondence (A↔E,B↔D) is a DIFFERENT key", () => {
    expect(canonicalKey(rel("similar", ["A", "B", "C", "E", "D", "F"]))).not.toBe(
      canonicalKey(rel("similar", ["A", "B", "C", "D", "E", "F"])),
    );
  });
});

describe("similar: factHolds numeric truth", () => {
  it("true for a genuinely similar pair (spiral image)", () => {
    expect(factHolds(SIM, coords)).toBe(true);
    expect(factHoldsL(SIM, coords)).toBe(true);
    // mirror image: similarity ignores orientation (unsigned angles)
    const M = (p: V): V => sim([p[0], -p[1]], 1.3, 15, [4, -6]);
    const mcoords: Coords = { A, B, C, D: M(A), E: M(B), F: M(C) };
    expect(factHolds(SIM, mcoords)).toBe(true);
  });

  it("false for a non-similar pair, and for a degenerate triangle", () => {
    const bad: Coords = { A, B, C, D: [8, 3], E: [16, 2], F: [10, 9] };
    expect(factHolds(SIM, bad)).toBe(false);
    // A,B,C made collinear ⇒ degenerate first triangle ⇒ false
    const degen: Coords = { A, B, C: [10, 0], D, E, F };
    expect(factHolds(SIM, degen)).toBe(false);
    // missing a vertex ⇒ false
    const missing: Coords = { A, B, C, D, E };
    expect(factHolds(SIM, missing)).toBe(false);
  });
});

describe("aa_similar: two eqangle facts ⇒ similar(...) statement", () => {
  it("emits the similarity in the recovered correspondence A↔D, B↔E, C↔F", () => {
    const out = aa_similar.derive([angA, angB], ctx);
    const simOut = out.find((f) => f.kind === "rel" && f.name === "similar");
    expect(simOut).toBeDefined();
    expect(canonicalKey(simOut!)).toBe(canonicalKey(SIM));
  });

  it("stays silent when the triangles are NOT similar (soundness)", () => {
    const bad: Coords = { A, B, C, D: [8, 3], E: [16, 2], F: [10, 9] };
    const out = aa_similar.derive([angA, angB], {
      coords: bad,
      bindings: {},
      points: Object.keys(bad),
    });
    expect(out.some((f) => f.kind === "rel" && f.name === "similar")).toBe(false);
  });

  it("stays silent with fewer than two cited eqangle facts", () => {
    expect(aa_similar.derive([angA], ctx)).toHaveLength(0);
  });
});

describe("similar_proportional_sides: similar(...) ⇒ the three side proportions", () => {
  it("emits exactly the three corresponding-side eqratios", () => {
    const out = similar_proportional_sides.derive([SIM], ctx);
    const keys = out.map(canonicalKeyL);
    expect(keys).toContain(canonicalKeyL(sideABBC));
    expect(keys).toContain(canonicalKeyL(sideABCA));
    expect(keys).toContain(canonicalKeyL(sideBCCA));
    expect(out).toHaveLength(3);
    expect(out.every((f) => f.kind === "eqratio")).toBe(true);
  });

  it("stays silent without a cited similar fact", () => {
    expect(similar_proportional_sides.derive([angA, angB], ctx)).toHaveLength(0);
  });
});

describe("similar_equal_angles: similar(...) ⇒ the three corresponding equal angles", () => {
  it("emits exactly the three corresponding-angle eqangles", () => {
    const out = similar_equal_angles.derive([SIM], ctx);
    const keys = out.map(canonicalKeyL);
    expect(keys).toContain(canonicalKeyL(angA)); // ∠BAC = ∠EDF
    expect(keys).toContain(canonicalKeyL(angB)); // ∠ABC = ∠DEF
    expect(keys).toContain(canonicalKeyL(angC)); // ∠BCA = ∠EFD
    expect(out).toHaveLength(3);
    expect(out.every((f) => f.kind === "rel" && f.name === "eqangle")).toBe(true);
  });

  it("stays silent without a cited similar fact", () => {
    expect(similar_equal_angles.derive([angA, angB], ctx)).toHaveLength(0);
  });
});

describe("similar: end-to-end via verify()", () => {
  it("(a) asserting similar(...) citing the two eqangle facts is accepted", () => {
    const r = verify({
      coords,
      bindings: {},
      establishedFacts: [angA, angB],
      candidateFact: SIM,
      citedPremises: [angA, angB],
    });
    expect(r).toEqual({ valid: true, rule: "AA similar triangles (statement)" });
  });

  it("(a) accepts an equivalently-ordered similarity (BCA~EFD) — same correspondence", () => {
    const r = verify({
      coords,
      bindings: {},
      establishedFacts: [angA, angB],
      candidateFact: rel("similar", ["B", "C", "A", "E", "F", "D"]),
      citedPremises: [angA, angB],
    });
    expect(r).toEqual({ valid: true, rule: "AA similar triangles (statement)" });
  });

  it("(a) MINIMALITY: dropping either equal-angle premise ⇒ not valid", () => {
    const dropA = verify({
      coords,
      bindings: {},
      establishedFacts: [angA, angB],
      candidateFact: SIM,
      citedPremises: [angB],
    });
    expect(dropA.valid).toBe(false);
    const dropB = verify({
      coords,
      bindings: {},
      establishedFacts: [angA, angB],
      candidateFact: SIM,
      citedPremises: [angA],
    });
    expect(dropB.valid).toBe(false);
  });

  it("(a) a non-similar figure ⇒ rejected", () => {
    const bad: Coords = { A, B, C, D: [8, 3], E: [16, 2], F: [10, 9] };
    const r = verify({
      coords: bad,
      bindings: {},
      establishedFacts: [angA, angB],
      candidateFact: SIM,
      citedPremises: [angA, angB],
    });
    expect(r.valid).toBe(false);
  });

  it("(b) with similar(...) established, each side proportion citing it is accepted", () => {
    for (const side of [sideABBC, sideABCA, sideBCCA]) {
      const r = verify({
        coords,
        bindings: {},
        establishedFacts: [SIM],
        candidateFact: side,
        citedPremises: [SIM],
      });
      expect(r).toEqual({ valid: true, rule: "similar triangles ⇒ proportional sides" });
    }
  });

  it("(c) with similar(...) established, each corresponding angle citing it is accepted", () => {
    for (const ang of [angA, angB, angC]) {
      const r = verify({
        coords,
        bindings: {},
        establishedFacts: [SIM],
        candidateFact: ang,
        citedPremises: [SIM],
      });
      expect(r).toEqual({ valid: true, rule: "similar triangles ⇒ equal angles" });
    }
  });

  it("(b) MINIMALITY: a side proportion with NO citation is unjustified", () => {
    const r = verify({
      coords,
      bindings: {},
      establishedFacts: [SIM],
      candidateFact: sideABBC,
      citedPremises: [],
    });
    expect(r.valid).toBe(false);
  });

  it("(b) a FALSE proportion is rejected as not_true even citing similar", () => {
    // AB/DE = CA/EF is the wrong pairing (CA corresponds to FD, not EF).
    const wrong = eqratio("A", "B", "D", "E", "C", "A", "E", "F");
    const r = verify({
      coords,
      bindings: {},
      establishedFacts: [SIM],
      candidateFact: wrong,
      citedPremises: [SIM],
    });
    expect(r).toEqual({ valid: false, reason: "not_true" });
  });
});
