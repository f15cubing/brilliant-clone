import { describe, expect, it } from "vitest";
import { buildImo2019p2Config } from "@/lib/freeplay/puzzles/imo2019p2Config";
import { imo2019p2 } from "@/lib/freeplay/puzzles/imo2019p2";
import { factHolds } from "@/lib/freeplay/check";
import { canonicalKey, rel, type Fact } from "@/lib/freeplay/dsl";
import { applySubst, isGivenSymmetry, parseSwaps } from "@/lib/freeplay/symmetry";

describe("IMO 2019 P2 configuration is geometrically valid", () => {
  const { coords } = buildImo2019p2Config();
  const holds = (f: Parameters<typeof factHolds>[0]) => factHolds(f, coords, {});

  it("incidence (given) facts hold", () => {
    expect(holds(rel("coll", ["B", "A1", "C"]))).toBe(true);
    expect(holds(rel("coll", ["A", "B1", "C"]))).toBe(true);
    expect(holds(rel("coll", ["A", "P", "A1"]))).toBe(true);
    expect(holds(rel("coll", ["B", "Q", "B1"]))).toBe(true);
    expect(holds(rel("coll", ["P", "B1", "P1"]))).toBe(true);
    expect(holds(rel("coll", ["Q", "A1", "Q1"]))).toBe(true);
    expect(holds(rel("coll", ["A", "A2", "C"]))).toBe(true);
    expect(holds(rel("coll", ["Q", "A1", "A2"]))).toBe(true);
    expect(holds(rel("coll", ["B", "B2", "C"]))).toBe(true);
    expect(holds(rel("coll", ["P", "B1", "B2"]))).toBe(true);
  });

  it("PQ ∥ AB (given)", () => {
    expect(holds(rel("para", ["P", "Q", "A", "B"]))).toBe(true);
  });

  it("angle conditions hold", () => {
    expect(holds(rel("eqangle", ["P", "P1", "C", "B", "A", "C"]))).toBe(true);
    expect(holds(rel("eqangle", ["C", "Q1", "Q", "C", "B", "A"]))).toBe(true);
  });

  it("Pappus conclusion A2B2 ∥ AB holds", () => {
    expect(holds(rel("para", ["A2", "B2", "A", "B"]))).toBe(true);
  });

  it("the goal: P, P1, Q, Q1 concyclic", () => {
    expect(holds(rel("cyclic", ["P", "P1", "Q", "Q1"]))).toBe(true);
  });

  it("both analogous quadrilaterals are concyclic", () => {
    expect(holds(rel("cyclic", ["C", "Q1", "B2", "A2"]))).toBe(true);
    expect(holds(rel("cyclic", ["C", "P1", "B2", "A2"]))).toBe(true);
  });

  it("the A↔B family swap is the symmetry mapping CQ1B2A2 → CP1B2A2", () => {
    const points = Object.keys(coords);
    // The symmetry machinery is angle/incidence-only; this puzzle's givens are
    // all ordinary `Fact`s, so narrow the `LFact[]` accordingly.
    const givens = imo2019p2.given.filter((f): f is Fact => f.kind !== "eqratio");
    const good = parseSwaps("A-B, A1-B1, P-Q, P1-Q1, A2-B2", new Set(points))!;
    expect(isGivenSymmetry(good, givens, points)).toBe(true);
    expect(canonicalKey(applySubst(rel("cyclic", ["C", "Q1", "B2", "A2"]), good))).toBe(
      canonicalKey(rel("cyclic", ["C", "P1", "B2", "A2"])),
    );

    // What the user tried — not a symmetry of the givens.
    const bad = parseSwaps("B-C, P1-Q1", new Set(points))!;
    expect(isGivenSymmetry(bad, givens, points)).toBe(false);
  });

  it("P1 is beyond B1, Q1 is beyond A1 (non-degenerate)", () => {
    // not collinear coincidences: P1 ≠ B1, Q1 ≠ A1
    const d = (a: string, b: string) =>
      Math.hypot(coords[a][0] - coords[b][0], coords[a][1] - coords[b][1]);
    expect(d("P1", "B1")).toBeGreaterThan(0.5);
    expect(d("Q1", "A1")).toBeGreaterThan(0.5);
  });
});
