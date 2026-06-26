import { describe, expect, it } from "vitest";
import { rel } from "@/lib/freeplay/dsl";
import type { Coords } from "@/lib/freeplay/check";
import { perp_bisector } from "../perp_bisector";
import { verifyWith, RULES } from "../../harness";

/**
 * Generic figure: A=(-3,0), B=(3,0), M=(0,0) the midpoint of AB, and X=(0,5)
 * on the y-axis so MX ⊥ AB. Then XA = XB = √34. P is an unrelated point added
 * to keep the configuration generic (it plays no role in the rule).
 */
const coords: Coords = {
  A: [-3, 0],
  B: [3, 0],
  M: [0, 0],
  X: [0, 5],
  P: [7, 2],
};

const midp = rel("midp", ["M", "A", "B"]);
const perp = rel("perp", ["M", "X", "A", "B"]);
const goal = rel("cong", ["X", "A", "X", "B"]);

describe("perpendicular bisector ⇒ equidistant (research rule)", () => {
  it("the rule alone derives XA = XB from midp(M,A,B) and perp(M,X,A,B)", () => {
    const out = perp_bisector.derive([midp, perp], {
      coords,
      bindings: {},
      points: Object.keys(coords),
    });
    expect(out.some((f) => f.kind === "rel" && f.name === "cong")).toBe(true);
  });

  it("recognizes perp regardless of ordering (perp is symmetric)", () => {
    for (const p of [
      rel("perp", ["M", "X", "A", "B"]),
      rel("perp", ["X", "M", "B", "A"]),
      rel("perp", ["A", "B", "M", "X"]),
      rel("perp", ["B", "A", "X", "M"]),
    ]) {
      const out = perp_bisector.derive([midp, p], {
        coords,
        bindings: {},
        points: Object.keys(coords),
      });
      expect(
        out.some(
          (f) =>
            f.kind === "rel" &&
            f.name === "cong" &&
            f.points.join("") === "XAXB",
        ),
      ).toBe(true);
    }
  });

  it("verifies in isolation citing exactly midp and perp (minimality holds)", () => {
    const r = verifyWith([perp_bisector], {
      coords,
      bindings: {},
      establishedFacts: [midp, perp],
      candidateFact: goal,
      citedPremises: [midp, perp],
    });
    expect(r).toEqual({ valid: true, rule: "perpendicular bisector ⇒ equidistant" });
  });

  it("MINIMALITY: dropping the midpoint premise ⇒ not valid", () => {
    const r = verifyWith([perp_bisector], {
      coords,
      bindings: {},
      establishedFacts: [midp, perp],
      candidateFact: goal,
      citedPremises: [perp],
    });
    expect(r.valid).toBe(false);
  });

  it("MINIMALITY: dropping the perpendicularity premise ⇒ not valid", () => {
    const r = verifyWith([perp_bisector], {
      coords,
      bindings: {},
      establishedFacts: [midp, perp],
      candidateFact: goal,
      citedPremises: [midp],
    });
    expect(r.valid).toBe(false);
  });

  it("SOUNDNESS: when X is NOT on the perpendicular bisector, the rule does not emit XA = XB", () => {
    // X=(2,5): MX is no longer ⊥ AB, and XA ≠ XB (the conclusion is false).
    const offCoords: Coords = {
      A: [-3, 0],
      B: [3, 0],
      M: [0, 0],
      X: [2, 5],
      P: [7, 2],
    };
    const out = perp_bisector.derive([midp, perp], {
      coords: offCoords,
      bindings: {},
      points: Object.keys(offCoords),
    });
    expect(
      out.some((f) => f.kind === "rel" && f.name === "cong"),
    ).toBe(false);

    // And the verifier rejects the false step outright (numeric truth gate).
    const r = verifyWith([perp_bisector], {
      coords: offCoords,
      bindings: {},
      establishedFacts: [midp, perp],
      candidateFact: goal,
      citedPremises: [midp, perp],
    });
    expect(r.valid).toBe(false);
  });

  it("GAP: the shipped engine cannot already prove XA = XB", () => {
    const r = verifyWith(RULES, {
      coords,
      bindings: {},
      establishedFacts: [midp, perp],
      candidateFact: goal,
      citedPremises: [midp, perp],
    });
    expect(r.valid).toBe(false);
  });
});
