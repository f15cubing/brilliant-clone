import { describe, expect, it } from "vitest";
import { rel } from "@/lib/freeplay/dsl";
import type { Coords } from "@/lib/freeplay/check";
import { factHolds } from "@/lib/freeplay/check";
import { concyclic_equal_radii } from "../concyclic_equal_radii";
import { verifyWith, RULES } from "../../harness";

/**
 * Generic figure: O = (0,0) is the common centre, and four rim points all lie at
 * distance 5 from O but at UNEQUALLY-spaced angles (0°, 53.13°, 143.13°, 270°),
 * so the configuration is scalene — no accidental symmetry, no three collinear.
 *
 *   O = (0,0)
 *   P1 = (5,0), P2 = (3,4), P3 = (-4,3), P4 = (0,-5)   — all |OPi| = 5
 *   Q  = (6,6) is a generic point at a DIFFERENT distance from O (off the circle)
 */
const coords: Coords = {
  O: [0, 0],
  P1: [5, 0],
  P2: [3, 4],
  P3: [-4, 3],
  P4: [0, -5],
  Q: [6, 6],
};

// The cong-star: OP1 = OP2 = OP3 = OP4, chaining O to all four rim points.
const congP1P2 = rel("cong", ["O", "P1", "O", "P2"]);
const congP2P3 = rel("cong", ["O", "P2", "O", "P3"]);
const congP3P4 = rel("cong", ["O", "P3", "O", "P4"]);
const star = [congP1P2, congP2P3, congP3P4];

const goal = rel("cyclic", ["P1", "P2", "P3", "P4"]);

const points = () => Object.keys(coords);

describe("equal radii ⇒ concyclic (research rule)", () => {
  it("GIVENS: the three cong premises are realized in the figure", () => {
    for (const f of star) expect(factHolds(f, coords)).toBe(true);
    // ...and the target concyclicity is numerically true.
    expect(factHolds(goal, coords)).toBe(true);
  });

  it("DERIVE: emits cyclic(P1,P2,P3,P4) from the cong-star", () => {
    const out = concyclic_equal_radii.derive(star, {
      coords,
      bindings: {},
      points: points(),
    });
    expect(
      out.some(
        (f) =>
          f.kind === "rel" &&
          f.name === "cyclic" &&
          JSON.stringify([...f.points].sort()) ===
            JSON.stringify([...goal.points].sort()),
      ),
    ).toBe(true);
  });

  it("verifies in isolation citing exactly the three cong facts", () => {
    const r = verifyWith([...RULES, concyclic_equal_radii], {
      coords,
      bindings: {},
      establishedFacts: star,
      candidateFact: goal,
      citedPremises: star,
    });
    expect(r).toEqual({ valid: true, rule: "equal radii ⇒ concyclic" });
  });

  it("MINIMALITY: dropping ANY one cong premise ⇒ not valid", () => {
    for (let drop = 0; drop < star.length; drop++) {
      const cited = star.filter((_, i) => i !== drop);
      const r = verifyWith([...RULES, concyclic_equal_radii], {
        coords,
        bindings: {},
        establishedFacts: star,
        candidateFact: goal,
        citedPremises: cited,
      });
      expect(r.valid).toBe(false);
    }
  });

  it("SOUNDNESS: a 4th point OFF the circle is never emitted / is rejected", () => {
    // Replace the last spoke with Q (|OQ| ≠ 5): the chain now reaches Q, but Q
    // is not equidistant, so the equidistance guard must keep the rule silent.
    const congP3Q = rel("cong", ["O", "P3", "O", "Q"]); // false in coords
    const badStar = [congP1P2, congP2P3, congP3Q];
    const badGoal = rel("cyclic", ["P1", "P2", "P3", "Q"]);

    const out = concyclic_equal_radii.derive(badStar, {
      coords,
      bindings: {},
      points: points(),
    });
    expect(
      out.some(
        (f) =>
          f.kind === "rel" &&
          f.name === "cyclic" &&
          JSON.stringify([...f.points].sort()) ===
            JSON.stringify([...badGoal.points].sort()),
      ),
    ).toBe(false);

    // The verifier also rejects the step outright (candidate numerically false).
    const r = verifyWith([...RULES, concyclic_equal_radii], {
      coords,
      bindings: {},
      establishedFacts: badStar,
      candidateFact: badGoal,
      citedPremises: badStar,
    });
    expect(r.valid).toBe(false);
  });

  it("SOUNDNESS: a collinear / degenerate config emits nothing and is rejected", () => {
    // P1,P2,P3 collinear on the x-axis (no genuine circle), O not equidistant.
    const degen: Coords = {
      O: [0, 0],
      P1: [1, 0],
      P2: [2, 0],
      P3: [3, 0],
      P4: [0, 1],
    };
    const out = concyclic_equal_radii.derive(star, {
      coords: degen,
      bindings: {},
      points: Object.keys(degen),
    });
    expect(out.some((f) => f.kind === "rel" && f.name === "cyclic")).toBe(false);

    const r = verifyWith([...RULES, concyclic_equal_radii], {
      coords: degen,
      bindings: {},
      establishedFacts: star,
      candidateFact: goal,
      citedPremises: star,
    });
    expect(r.valid).toBe(false);
  });

  it("SOUNDNESS: three cong facts with NO shared centre emit nothing", () => {
    // A non-star triple: segments don't pivot on a single common centre.
    const c1 = rel("cong", ["P1", "P2", "P3", "P4"]); // general cong, no pivot
    const out = concyclic_equal_radii.derive([c1], {
      coords,
      bindings: {},
      points: points(),
    });
    expect(out.length).toBe(0);
  });

  it("GAP: the shipped engine alone canNOT derive cyclic from the congs", () => {
    const r = verifyWith(RULES, {
      coords,
      bindings: {},
      establishedFacts: star,
      candidateFact: goal,
      citedPremises: star,
    });
    // No length table in AR and no cong→cyclic DD rule ships: genuine gap.
    expect(r.valid).toBe(false);
  });
});
