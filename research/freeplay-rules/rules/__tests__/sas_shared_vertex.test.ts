import { describe, expect, it } from "vitest";
import { rel } from "@/lib/freeplay/dsl";
import { factHolds, type Coords } from "@/lib/freeplay/check";
import type { V } from "@/lib/freeplay/geom";
import { sas_shared_vertex } from "../sas_shared_vertex";
import { verifyWith, RULES } from "../../harness";

/**
 * Generic shared-apex figure. Pick an apex O and two generic arms OA, OB
 * (scalene: |OA| = √26 ≠ |OB| = √29). Let C, D be the images of A, B under a
 * rotation about O by θ = 50°. A rotation about O fixes O, preserves the two
 * arm lengths and the angle between any two rays, AND maps the segment AB to
 * CD, so ALL of
 *   cong(O,A,O,C), cong(O,B,O,D), eqangle(A,O,B,C,O,D), cong(A,B,C,D)
 * hold exactly. We verify each with `factHolds` below.
 */
const O: V = [1, 2];
const A: V = [6, 1]; // OA = (5,-1), |OA| = √26
const B: V = [3, 7]; // OB = (2, 5), |OB| = √29

function rotateAbout(p: V, o: V, thetaDeg: number): V {
  const r = (thetaDeg * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  const dx = p[0] - o[0];
  const dy = p[1] - o[1];
  return [o[0] + cos * dx - sin * dy, o[1] + sin * dx + cos * dy];
}

const C = rotateAbout(A, O, 50);
const D = rotateAbout(B, O, 50);

const coords: Coords = { O, A, B, C, D };

// Premises and goal.
const armAC = rel("cong", ["O", "A", "O", "C"]); // OA = OC
const armBD = rel("cong", ["O", "B", "O", "D"]); // OB = OD
const apexAngle = rel("eqangle", ["A", "O", "B", "C", "O", "D"]); // ∠AOB = ∠COD
const opposite = rel("cong", ["A", "B", "C", "D"]); // AB = CD  (the goal)

const ctx = { coords, bindings: {}, points: Object.keys(coords) };

describe("SAS about a common vertex (rotation / spiral congruence)", () => {
  it("the coordinate figure realizes every given (and the goal) faithfully", () => {
    expect(factHolds(armAC, coords)).toBe(true);
    expect(factHolds(armBD, coords)).toBe(true);
    expect(factHolds(apexAngle, coords)).toBe(true);
    expect(factHolds(opposite, coords)).toBe(true);
    // Genuinely scalene apex (so equal-length coincidences can't fake it).
    expect(factHolds(rel("cong", ["O", "A", "O", "B"]), coords)).toBe(false);
  });

  it("the rule alone derives the opposite-side congruence AB = CD", () => {
    const out = sas_shared_vertex.derive([armAC, armBD, apexAngle], ctx);
    expect(
      out.some(
        (f) =>
          f.kind === "rel" &&
          f.name === "cong" &&
          ["A", "B", "C", "D"].every((p, i) => f.points[i] === p),
      ),
    ).toBe(true);
  });

  it("verifies in isolation citing exactly the three shared-vertex SAS premises", () => {
    const r = verifyWith([sas_shared_vertex], {
      coords,
      bindings: {},
      establishedFacts: [armAC, armBD, apexAngle],
      candidateFact: opposite,
      citedPremises: [armAC, armBD, apexAngle],
    });
    expect(r).toEqual({ valid: true, rule: "SAS about a common vertex" });
  });

  it("MINIMALITY: dropping the shared-vertex angle → not valid", () => {
    const r = verifyWith([sas_shared_vertex], {
      coords,
      bindings: {},
      establishedFacts: [armAC, armBD, apexAngle],
      candidateFact: opposite,
      citedPremises: [armAC, armBD], // no angle
    });
    expect(r.valid).toBe(false);
  });

  it("MINIMALITY: dropping the first arm (cong OA=OC) → not valid", () => {
    const r = verifyWith([sas_shared_vertex], {
      coords,
      bindings: {},
      establishedFacts: [armAC, armBD, apexAngle],
      candidateFact: opposite,
      citedPremises: [armBD, apexAngle],
    });
    expect(r.valid).toBe(false);
  });

  it("MINIMALITY: dropping the second arm (cong OB=OD) → not valid", () => {
    const r = verifyWith([sas_shared_vertex], {
      coords,
      bindings: {},
      establishedFacts: [armAC, armBD, apexAngle],
      candidateFact: opposite,
      citedPremises: [armAC, apexAngle],
    });
    expect(r.valid).toBe(false);
  });

  it("SOUNDNESS: a DISTINCT-vertex equal angle does not justify AB = CD", () => {
    // ∠OAB = ∠OCD happens to be a true angle equality here (the two triangles
    // are congruent), but its vertices (A,C) are NOT the shared apex O, so the
    // shared-vertex rule must not fire on it.
    const wrongVertex = rel("eqangle", ["O", "A", "B", "O", "C", "D"]);
    expect(factHolds(wrongVertex, coords)).toBe(true); // genuinely equal angles
    const r = verifyWith([sas_shared_vertex], {
      coords,
      bindings: {},
      establishedFacts: [armAC, armBD, wrongVertex],
      candidateFact: opposite,
      citedPremises: [armAC, armBD, wrongVertex],
    });
    expect(r.valid).toBe(false);
  });

  it("SOUNDNESS: when the rotation premises don't all hold ⇒ nothing emitted", () => {
    // Keep OA=OC and OB=OD (C,D still on the arm circles) but rotate A and B by
    // DIFFERENT angles (50° vs 80°), so ∠COD = ∠AOB + 30° ≠ ∠AOB and AB ≠ CD.
    const Cbad = rotateAbout(A, O, 50);
    const Dbad = rotateAbout(B, O, 80);
    const bad: Coords = { O, A, B, C: Cbad, D: Dbad };

    expect(factHolds(armAC, bad)).toBe(true); // OA = OC still holds
    expect(factHolds(armBD, bad)).toBe(true); // OB = OD still holds
    expect(factHolds(apexAngle, bad)).toBe(false); // angle differs (by 30°)
    expect(factHolds(opposite, bad)).toBe(false); // |AB| ≠ |CD|

    // The rule's numeric guards reject the false conclusion: nothing emitted.
    const out = sas_shared_vertex.derive([armAC, armBD, apexAngle], {
      coords: bad,
      bindings: {},
      points: Object.keys(bad),
    });
    expect(out.some((f) => f.kind === "rel" && f.name === "cong")).toBe(false);

    // …and the verifier rejects the step outright.
    const r = verifyWith([sas_shared_vertex], {
      coords: bad,
      bindings: {},
      establishedFacts: [armAC, armBD, apexAngle],
      candidateFact: opposite,
      citedPremises: [armAC, armBD, apexAngle],
    });
    expect(r.valid).toBe(false);
  });

  it("GAP: the shipped engine (RULES) cannot prove AB = CD from these premises", () => {
    // AB = CD is a LENGTH fact; AR is angles-only and no shipped DD rule pairs
    // two shared-apex arms (isosceles needs distinct vertices), so the step is
    // genuinely unprovable by the production engine today.
    const r = verifyWith(RULES, {
      coords,
      bindings: {},
      establishedFacts: [armAC, armBD, apexAngle],
      candidateFact: opposite,
      citedPremises: [armAC, armBD, apexAngle],
    });
    expect(r.valid).toBe(false);
  });
});
