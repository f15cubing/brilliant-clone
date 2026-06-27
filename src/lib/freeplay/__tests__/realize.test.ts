import { describe, expect, it } from "vitest";
import { factHoldsL } from "@/lib/freeplay/lengths/dsl";
import { FREEPLAY_PUZZLES, getPuzzle } from "@/lib/freeplay/puzzles";
import {
  isValidRealization,
  makeRng,
  sampleRealizations,
} from "@/lib/freeplay/realize";
import type { Puzzle } from "@/lib/freeplay/types";

describe("makeRng (seeded RNG)", () => {
  it("is deterministic for a given seed", () => {
    const a = makeRng(42);
    const b = makeRng(42);
    for (let i = 0; i < 50; i++) expect(a()).toBe(b());
  });

  it("produces values in [0, 1)", () => {
    const r = makeRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("different seeds give different streams", () => {
    expect(makeRng(1)()).not.toBe(makeRng(2)());
  });
});

describe("sampleRealizations", () => {
  it("returns the canonical figure as realization 0", () => {
    const puzzle = getPuzzle("inscribed-angle")!;
    const [first] = sampleRealizations(puzzle, 4);
    expect(first.coords).toBe(puzzle.coords);
    expect(first.bindings).toBe(puzzle.variables);
  });

  it("is deterministic in the seed", () => {
    const puzzle = getPuzzle("inscribed-angle")!;
    const a = sampleRealizations(puzzle, 5, 123);
    const b = sampleRealizations(puzzle, 5, 123);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("falls back to the single canonical realization when there is no construction", () => {
    // A puzzle-shaped object with no `construct` yields exactly one realization.
    const bare = {
      ...getPuzzle("inscribed-angle")!,
      construct: undefined,
    } as Puzzle;
    expect(sampleRealizations(bare, 6)).toHaveLength(1);
  });

  it("constructed realizations differ from the canonical one", () => {
    const puzzle = getPuzzle("midsegment")!;
    const [, second] = sampleRealizations(puzzle, 3, 99);
    expect(JSON.stringify(second.coords)).not.toBe(JSON.stringify(puzzle.coords));
  });
});

describe("every shipped puzzle yields several valid realizations", () => {
  for (const puzzle of FREEPLAY_PUZZLES) {
    it(`${puzzle.id}: samples are non-degenerate and satisfy the givens`, () => {
      const reals = sampleRealizations(puzzle, 6, 0xabcdef);
      expect(reals.length).toBeGreaterThan(1);
      for (const r of reals) {
        expect(isValidRealization(puzzle, r)).toBe(true);
        for (const g of puzzle.given) {
          expect(factHoldsL(g, r.coords, r.bindings ?? {})).toBe(true);
        }
      }
    });
  }
});
