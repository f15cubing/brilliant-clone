import { describe, expect, it } from "vitest";
import { rel } from "@/lib/freeplay/dsl";
import type { Coords } from "@/lib/freeplay/check";
import { LengthAR } from "../lengths/lengthAR";
import { eqratio, factHoldsL } from "../lengths/dsl";

/**
 * The log-length table is purely SYMBOLIC: it reasons about linear equalities
 * over log|PQ| and never reads ratios off the diagram. So the coordinates here
 * need only provide distinct, non-degenerate segments — the deductions hold for
 * ANY realization. We use a scatter of 12 generic points.
 */
const coords: Coords = {
  A: [0, 0],
  B: [3, 1],
  C: [7, 2],
  D: [1, 5],
  E: [9, 4],
  F: [2, 8],
  G: [6, 9],
  H: [11, 1],
  I: [4, 12],
  J: [13, 6],
  K: [8, 14],
  L: [15, 10],
};

describe("LengthAR (log-length algebraic reasoning)", () => {
  it("cong: add then implies the same congruence", () => {
    const ar = new LengthAR(coords);
    ar.add(rel("cong", ["A", "B", "C", "D"]));
    expect(ar.implies(rel("cong", ["A", "B", "C", "D"]))).toBe(true);
    // symmetric forms are entailed too (CD = AB, BA = DC, …)
    expect(ar.implies(rel("cong", ["C", "D", "A", "B"]))).toBe(true);
    expect(ar.implies(rel("cong", ["B", "A", "D", "C"]))).toBe(true);
  });

  it("cong chains transitively: AB=CD and CD=EF ⇒ AB=EF", () => {
    const ar = new LengthAR(coords);
    ar.add(rel("cong", ["A", "B", "C", "D"]));
    ar.add(rel("cong", ["C", "D", "E", "F"]));
    expect(ar.implies(rel("cong", ["A", "B", "E", "F"]))).toBe(true);
  });

  it("eqratio: add then implies the same proportion (and its symmetries)", () => {
    const ar = new LengthAR(coords);
    ar.add(eqratio("A", "B", "C", "D", "E", "F", "G", "H"));
    expect(ar.implies(eqratio("A", "B", "C", "D", "E", "F", "G", "H"))).toBe(true);
    // swap the two ratios
    expect(ar.implies(eqratio("E", "F", "G", "H", "A", "B", "C", "D"))).toBe(true);
    // invert both ratios (CD/AB = GH/EF)
    expect(ar.implies(eqratio("C", "D", "A", "B", "G", "H", "E", "F"))).toBe(true);
  });

  it("RATIO CHAIN: AB/CD=EF/GH and EF/GH=IJ/KL ⇒ AB/CD=IJ/KL", () => {
    const ar = new LengthAR(coords);
    ar.add(eqratio("A", "B", "C", "D", "E", "F", "G", "H"));
    ar.add(eqratio("E", "F", "G", "H", "I", "J", "K", "L"));
    expect(ar.implies(eqratio("A", "B", "C", "D", "I", "J", "K", "L"))).toBe(true);
  });

  it("cong ⇒ eqratio: AB=CD and EF=GH ⇒ AB/EF = CD/GH", () => {
    const ar = new LengthAR(coords);
    ar.add(rel("cong", ["A", "B", "C", "D"]));
    ar.add(rel("cong", ["E", "F", "G", "H"]));
    expect(ar.implies(eqratio("A", "B", "E", "F", "C", "D", "G", "H"))).toBe(true);
  });

  it("midp encodes EQUAL HALVES: midp(M,P,Q) ⇒ MP = MQ", () => {
    // M is the midpoint of PQ; only the equal-halves part is encoded.
    const mc: Coords = { M: [2, 2], P: [0, 0], Q: [4, 4], R: [9, 1] };
    const ar = new LengthAR(mc);
    ar.add(rel("midp", ["M", "P", "Q"]));
    expect(ar.implies(rel("cong", ["M", "P", "M", "Q"]))).toBe(true);
    // …but NOT a length relation it was never told about.
    expect(ar.implies(rel("cong", ["M", "P", "M", "R"]))).toBe(false);
  });

  it("SOUNDNESS: a single cong does NOT imply a non-consequence", () => {
    const ar = new LengthAR(coords);
    ar.add(rel("cong", ["A", "B", "C", "D"]));
    // AB=CD says nothing about EF vs GH.
    expect(ar.implies(rel("cong", ["E", "F", "G", "H"]))).toBe(false);
    // nor about an unrelated proportion.
    expect(ar.implies(eqratio("A", "B", "C", "D", "E", "F", "G", "H"))).toBe(false);
  });

  it("SOUNDNESS: a ratio chain that is one link short is NOT implied", () => {
    const ar = new LengthAR(coords);
    ar.add(eqratio("A", "B", "C", "D", "E", "F", "G", "H"));
    // Without the second link (EF/GH = IJ/KL), AB/CD = IJ/KL is unknown.
    expect(ar.implies(eqratio("A", "B", "C", "D", "I", "J", "K", "L"))).toBe(false);
  });

  it("the eqratio truth check uses a relative tolerance", () => {
    // 3-4-5 vs 6-8-10: AB/CD = 3/6 = 1/2 = EF/GH = 4/8.
    const c: Coords = {
      A: [0, 0],
      B: [3, 0],
      C: [0, 0],
      D: [6, 0],
      E: [0, 0],
      F: [0, 4],
      G: [0, 0],
      H: [0, 8],
    };
    expect(factHoldsL(eqratio("A", "B", "C", "D", "E", "F", "G", "H"), c)).toBe(true);
    // A false proportion is rejected.
    expect(factHoldsL(eqratio("A", "B", "C", "D", "E", "F", "G", "F"), c)).toBe(false);
  });
});
