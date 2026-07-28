import { describe, expect, it } from "vitest";

import {
  checkCombination,
  solveCombination,
  solveSparse,
  type LinExpr,
} from "../certificate";
import { rat, rnum, rzero, type Rat } from "../rational";

const nums = (cs: Rat[]): number[] => cs.map(rnum);

describe("solveCombination", () => {
  it("recovers a single-term combination", () => {
    const b: LinExpr[] = [{ x: rat(1), y: rat(-1) }];
    const sol = solveCombination(b, { x: rat(1), y: rat(-1) });
    expect(sol).not.toBeNull();
    expect(nums(sol!.coeffs)).toEqual([1]);
  });

  it("recovers a two-term combination with a fractional coefficient", () => {
    // target = 2·b0 − (1/2)·b1
    const b: LinExpr[] = [
      { x: rat(1), y: rat(1) },
      { y: rat(2), z: rat(4) },
    ];
    const target: LinExpr = { x: rat(2), y: rat(1), z: rat(-2) };
    const sol = solveCombination(b, target);
    expect(sol).not.toBeNull();
    expect(nums(sol!.coeffs)).toEqual([2, -0.5]);
    expect(checkCombination(b, target, sol!.coeffs, sol!.turns)).toBe(true);
  });

  it("returns null when the target is not in the span", () => {
    const b: LinExpr[] = [{ x: rat(1) }];
    expect(solveCombination(b, { y: rat(1) })).toBeNull();
  });

  it("returns null for an empty basis and a non-trivial target", () => {
    expect(solveCombination([], { x: rat(1) })).toBeNull();
  });

  it("absorbs a whole turn into the modular constant", () => {
    // Angle-style: the combination may leave behind k·180°.
    const b: LinExpr[] = [{ L1: rat(1), L2: rat(-1) }];
    const target: LinExpr = { L1: rat(1), L2: rat(-1), pi: rat(2) };
    const sol = solveCombination(b, target, "pi");
    expect(sol).not.toBeNull();
    expect(nums(sol!.coeffs)).toEqual([1]);
    expect(rnum(sol!.turns)).toBe(2);
  });

  it("refuses a leftover that is not a whole turn", () => {
    const b: LinExpr[] = [{ L1: rat(1), L2: rat(-1) }];
    // half a turn cannot be absorbed: 90° is not ≡ 0 (mod 180°)
    const target: LinExpr = { L1: rat(1), L2: rat(-1), pi: rat(1, 2) };
    expect(solveCombination(b, target, "pi")).toBeNull();
  });

  it("does not absorb a leftover when there is no modular constant", () => {
    const b: LinExpr[] = [{ s1: rat(1), s2: rat(-1) }];
    const target: LinExpr = { s1: rat(1), s2: rat(-1), k: rat(1) };
    expect(solveCombination(b, target)).toBeNull();
  });

  it("solves an angle chase over several facts", () => {
    // Three cited directions, target is a chained difference.
    const b: LinExpr[] = [
      { a: rat(1), b: rat(-1) }, // a = b
      { b: rat(1), c: rat(-1) }, // b = c
      { c: rat(1), d: rat(-1) }, // c = d
    ];
    const target: LinExpr = { a: rat(1), d: rat(-1) }; // a = d
    const sol = solveCombination(b, target, "pi");
    expect(sol).not.toBeNull();
    expect(nums(sol!.coeffs)).toEqual([1, 1, 1]);
  });
});

describe("checkCombination", () => {
  it("rejects a wrong coefficient vector", () => {
    const b: LinExpr[] = [{ x: rat(1) }, { y: rat(1) }];
    const target: LinExpr = { x: rat(1), y: rat(1) };
    expect(checkCombination(b, target, [rat(1), rat(1)], rzero)).toBe(true);
    expect(checkCombination(b, target, [rat(1), rat(2)], rzero)).toBe(false);
  });
});

describe("solveSparse", () => {
  it("drops a redundant term the plain solve might keep", () => {
    // b2 = b0 + b1, so the target b0+b1 has many representations. The sparse
    // solver should land on one that uses as few facts as it can.
    const b: LinExpr[] = [
      { x: rat(1) },
      { y: rat(1) },
      { x: rat(1), y: rat(1) },
    ];
    const target: LinExpr = { x: rat(1), y: rat(1) };
    const sol = solveSparse(b, target);
    expect(sol).not.toBeNull();
    const used = sol!.coeffs.filter((c) => c.n !== 0).length;
    expect(used).toBeLessThanOrEqual(2);
    expect(checkCombination(b, target, sol!.coeffs, sol!.turns)).toBe(true);
  });

  it("keeps a combination that is already minimal", () => {
    const b: LinExpr[] = [{ x: rat(1) }, { y: rat(1) }];
    const target: LinExpr = { x: rat(1), y: rat(-3) };
    const sol = solveSparse(b, target);
    expect(sol).not.toBeNull();
    expect(nums(sol!.coeffs)).toEqual([1, -3]);
  });

  it("returns null when nothing spans the target", () => {
    expect(solveSparse([{ x: rat(1) }], { z: rat(1) })).toBeNull();
  });
});
