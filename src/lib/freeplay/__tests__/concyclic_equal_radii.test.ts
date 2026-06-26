import { describe, expect, it } from "vitest";
import { rel } from "@/lib/freeplay/dsl";
import { factHolds, type Coords } from "@/lib/freeplay/check";
import { concyclic_equal_radii } from "../rules/concyclic_equal_radii";
import { verify } from "@/lib/freeplay/verify";

/**
 * Promoted from research/freeplay-rules — circle-producing dual of perp_bisector.
 *
 * O = (0,0) is the common centre; four rim points at distance 5 but unequally
 * spaced (0°, 53.13°, 143.13°, 270°) — scalene, no three collinear.
 *   Q = (6,6) is a generic point at a DIFFERENT distance (off the circle).
 */
const coords: Coords = {
  O: [0, 0],
  P1: [5, 0],
  P2: [3, 4],
  P3: [-4, 3],
  P4: [0, -5],
  Q: [6, 6],
};

const congP1P2 = rel("cong", ["O", "P1", "O", "P2"]);
const congP2P3 = rel("cong", ["O", "P2", "O", "P3"]);
const congP3P4 = rel("cong", ["O", "P3", "O", "P4"]);
const star = [congP1P2, congP2P3, congP3P4];

const goal = rel("cyclic", ["P1", "P2", "P3", "P4"]);

const points = () => Object.keys(coords);
const hasGoal = (out: ReturnType<typeof concyclic_equal_radii.derive>) =>
  out.some(
    (f) =>
      f.kind === "rel" &&
      f.name === "cyclic" &&
      JSON.stringify([...f.points].sort()) ===
        JSON.stringify([...goal.points].sort()),
  );

describe("equal radii ⇒ concyclic (promoted rule)", () => {
  it("GIVENS: the three cong premises (and the goal) are realized in the figure", () => {
    for (const f of star) expect(factHolds(f, coords)).toBe(true);
    expect(factHolds(goal, coords)).toBe(true);
  });

  it("DERIVE: emits cyclic(P1,P2,P3,P4) from the cong-star", () => {
    const out = concyclic_equal_radii.derive(star, {
      coords,
      bindings: {},
      points: points(),
    });
    expect(hasGoal(out)).toBe(true);
  });

  it("end-to-end: verify() accepts the cyclic citing exactly the three cong facts", () => {
    const r = verify({
      coords,
      bindings: {},
      establishedFacts: star,
      candidateFact: goal,
      citedPremises: star,
    });
    expect(r).toEqual({ valid: true, rule: "equal radii ⇒ concyclic" });
  });

  it("MINIMALITY: dropping ANY one cong premise ⇒ cyclic not derived", () => {
    for (let drop = 0; drop < star.length; drop++) {
      const cited = star.filter((_, i) => i !== drop);
      const out = concyclic_equal_radii.derive(cited, {
        coords,
        bindings: {},
        points: points(),
      });
      expect(hasGoal(out)).toBe(false);
    }
  });

  it("SOUNDNESS: a 4th point OFF the circle is never emitted / is rejected", () => {
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

    const r = verify({
      coords,
      bindings: {},
      establishedFacts: badStar,
      candidateFact: badGoal,
      citedPremises: badStar,
    });
    expect(r.valid).toBe(false);
  });

  it("SOUNDNESS: a collinear / degenerate config emits nothing and is rejected", () => {
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

    const r = verify({
      coords: degen,
      bindings: {},
      establishedFacts: star,
      candidateFact: goal,
      citedPremises: star,
    });
    expect(r.valid).toBe(false);
  });

  it("SOUNDNESS: three cong facts with NO shared centre emit nothing", () => {
    const c1 = rel("cong", ["P1", "P2", "P3", "P4"]); // general cong, no pivot
    const out = concyclic_equal_radii.derive([c1], {
      coords,
      bindings: {},
      points: points(),
    });
    expect(out.length).toBe(0);
  });
});
