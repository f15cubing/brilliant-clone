import { describe, expect, it } from "vitest";
import {
  type AuxStep,
  AUX_ARITY,
  allAuxFacts,
  auxFacts,
  evalAuxPoint,
  extendCoords,
  extendRealizations,
  makeAuxStep,
} from "@/lib/freeplay/auxConstructions";
import type { Coords } from "@/lib/freeplay/check";
import { rel } from "@/lib/freeplay/dsl";
import { factHoldsL } from "@/lib/freeplay/lengths/dsl";
import { getPuzzle } from "@/lib/freeplay/puzzles";
import { sampleRealizations } from "@/lib/freeplay/realize";
import { verify } from "@/lib/freeplay/verify";

// A general-position base figure where every construction below is
// non-degenerate. O is a circle centre through P (radius 4).
const base: Coords = {
  A: [0, 0],
  B: [6, 0],
  C: [1, 4],
  D: [4, 5],
  O: [2, 1],
  P: [2, 5],
};

const steps: AuxStep[] = [
  { id: "M", kind: "midpoint", args: ["A", "B"] },
  { id: "F", kind: "foot", args: ["C", "A", "B"] },
  { id: "X", kind: "inter_ll", args: ["A", "B", "C", "D"] },
  { id: "Pr", kind: "reflect_point", args: ["A", "C"] },
  { id: "Cr", kind: "reflect_line", args: ["C", "A", "B"] },
  { id: "L", kind: "inter_lc", args: ["A", "B", "O", "P"], index: 0 },
  { id: "K", kind: "inter_cc", args: ["A", "B", "C", "D"], index: 0 },
];

describe("auxConstructions", () => {
  it("each kind's declared arity matches its sample step", () => {
    for (const s of steps) expect(s.args.length).toBe(AUX_ARITY[s.kind]);
  });

  describe("soundness: every emitted fact holds at the constructed point", () => {
    for (const step of steps) {
      it(`${step.kind} (${step.id})`, () => {
        const coords = extendCoords(base, [step]);
        // The point was realized (non-degenerate in this figure).
        expect(coords[step.id]).toBeDefined();
        // Every fact the construction guarantees is numerically true here.
        for (const fact of auxFacts(step)) {
          expect(factHoldsL(fact, coords, {})).toBe(true);
        }
      });
    }
  });

  it("a couple of expected coordinates", () => {
    const coords = extendCoords(base, steps);
    expect(coords.M).toEqual([3, 0]); // midpoint of (0,0),(6,0)
    expect(coords.F[0]).toBeCloseTo(1); // foot of C=(1,4) on the x-axis
    expect(coords.F[1]).toBeCloseTo(0);
    expect(coords.Pr).toEqual([2, 8]); // reflection of A in C
  });

  it("extendCoords folds steps in order (later steps see earlier aux points)", () => {
    const chained: AuxStep[] = [
      { id: "M", kind: "midpoint", args: ["A", "B"] }, // (3,0)
      { id: "N", kind: "midpoint", args: ["M", "C"] }, // midpoint of (3,0),(1,4) = (2,2)
    ];
    const coords = extendCoords(base, chained);
    expect(coords.N).toEqual([2, 2]);
  });

  it("aux facts hold across ALL sampled realizations of a real puzzle (multi-case soundness)", () => {
    // midsegment ships A,B,C + a parametric `construct`, so it samples several
    // generic realizations. An aux midpoint of B,C and the foot of A on BC must
    // be valid in every one of them — the guarantee the verifier relies on.
    const puzzle = getPuzzle("midsegment")!;
    const realizations = sampleRealizations(puzzle, 6, 0xc0ffee);
    expect(realizations.length).toBeGreaterThan(1);

    const aux: AuxStep[] = [
      { id: "K", kind: "midpoint", args: ["B", "C"] },
      { id: "H", kind: "foot", args: ["A", "B", "C"] },
    ];
    const extended = extendRealizations(realizations, aux);
    const facts = allAuxFacts(aux);

    for (const r of extended) {
      for (const id of ["K", "H"]) expect(r.coords[id]).toBeDefined();
      for (const fact of facts) {
        expect(factHoldsL(fact, r.coords, r.bindings ?? {})).toBe(true);
      }
    }
  });

  it("a proof step citing an aux construction's fact verifies end-to-end", () => {
    // Build the midpoint of A,B on a real puzzle, then assert MA = MB citing the
    // construction's `midp` fact — the shipped engine must accept it (the
    // midpoint-congruence rule) across the extended realizations.
    const puzzle = getPuzzle("inscribed-angle")!;
    const realizations = sampleRealizations(puzzle, 5);
    const used = new Set(Object.keys(puzzle.coords));
    const step = makeAuxStep("midpoint", ["A", "B"], used);
    const M = step.id;

    const result = verify({
      coords: extendCoords(puzzle.coords, [step]),
      bindings: puzzle.variables ?? {},
      establishedFacts: [...puzzle.given, ...allAuxFacts([step])],
      candidateFact: rel("cong", [M, "A", M, "B"]),
      citedPremises: [rel("midp", [M, "A", "B"])],
      realizations: extendRealizations(realizations, [step]),
    });

    expect(result).toEqual({ valid: true, rule: expect.any(String) });
  });

  it("returns null / skips degenerate constructions", () => {
    // Two parallel lines never meet.
    const parallel: AuxStep = { id: "Z", kind: "inter_ll", args: ["A", "B", "C", "E"] };
    const withE: Coords = { ...base, E: [5, 4] }; // CE is parallel to AB (both horizontal)
    expect(evalAuxPoint(parallel, withE)).toBeNull();
    expect(extendCoords(withE, [parallel]).Z).toBeUndefined();

    // A line that misses the circle has no intersection at that index.
    const miss: AuxStep = { id: "W", kind: "inter_lc", args: ["A", "B", "O", "P"], index: 1 };
    const far: Coords = { ...base, O: [2, 50], P: [2, 54] }; // circle far above the x-axis
    expect(evalAuxPoint(miss, far)).toBeNull();
  });
});
