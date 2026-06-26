import { describe, expect, it } from "vitest";
import { rel } from "@/lib/freeplay/dsl";
import { factHolds, type Coords } from "@/lib/freeplay/check";
import type { V } from "@/lib/freeplay/geom";
import { sas_shared_vertex } from "../rules/sas_shared_vertex";
import { verify } from "@/lib/freeplay/verify";

/**
 * Promoted from research/freeplay-rules — shared-apex "spiral" SAS.
 *
 * Apex O with scalene arms OA (√26), OB (√29). C, D are the images of A, B
 * under a rotation about O by 50°, so cong(O,A,O,C), cong(O,B,O,D),
 * eqangle(A,O,B,C,O,D), cong(A,B,C,D) all hold.
 */
const O: V = [1, 2];
const A: V = [6, 1];
const B: V = [3, 7];

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

const armAC = rel("cong", ["O", "A", "O", "C"]); // OA = OC
const armBD = rel("cong", ["O", "B", "O", "D"]); // OB = OD
const apexAngle = rel("eqangle", ["A", "O", "B", "C", "O", "D"]); // ∠AOB = ∠COD
const opposite = rel("cong", ["A", "B", "C", "D"]); // AB = CD (goal)

const ctx = { coords, bindings: {}, points: Object.keys(coords) };
const hasOpposite = (out: ReturnType<typeof sas_shared_vertex.derive>) =>
  out.some(
    (f) =>
      f.kind === "rel" &&
      f.name === "cong" &&
      ["A", "B", "C", "D"].every((p, i) => f.points[i] === p),
  );

describe("SAS about a common vertex (promoted rule)", () => {
  it("the coordinate figure realizes every given (and the goal) faithfully", () => {
    expect(factHolds(armAC, coords)).toBe(true);
    expect(factHolds(armBD, coords)).toBe(true);
    expect(factHolds(apexAngle, coords)).toBe(true);
    expect(factHolds(opposite, coords)).toBe(true);
    expect(factHolds(rel("cong", ["O", "A", "O", "B"]), coords)).toBe(false);
  });

  it("the rule alone derives the opposite-side congruence AB = CD", () => {
    const out = sas_shared_vertex.derive([armAC, armBD, apexAngle], ctx);
    expect(hasOpposite(out)).toBe(true);
  });

  it("end-to-end: verify() accepts AB = CD citing exactly the three premises", () => {
    const r = verify({
      coords,
      bindings: {},
      establishedFacts: [armAC, armBD, apexAngle],
      candidateFact: opposite,
      citedPremises: [armAC, armBD, apexAngle],
    });
    expect(r).toEqual({ valid: true, rule: "SAS about a common vertex" });
  });

  it("MINIMALITY: dropping the shared-vertex angle ⇒ AB = CD not derived", () => {
    const out = sas_shared_vertex.derive([armAC, armBD], ctx);
    expect(hasOpposite(out)).toBe(false);
  });

  it("MINIMALITY: dropping the first arm (cong OA=OC) ⇒ AB = CD not derived", () => {
    const out = sas_shared_vertex.derive([armBD, apexAngle], ctx);
    expect(hasOpposite(out)).toBe(false);
  });

  it("MINIMALITY: dropping the second arm (cong OB=OD) ⇒ AB = CD not derived", () => {
    const out = sas_shared_vertex.derive([armAC, apexAngle], ctx);
    expect(hasOpposite(out)).toBe(false);
  });

  it("SOUNDNESS: a DISTINCT-vertex equal angle does not justify AB = CD", () => {
    const wrongVertex = rel("eqangle", ["O", "A", "B", "O", "C", "D"]);
    expect(factHolds(wrongVertex, coords)).toBe(true); // genuinely equal angles
    const out = sas_shared_vertex.derive([armAC, armBD, wrongVertex], ctx);
    expect(hasOpposite(out)).toBe(false);

    const r = verify({
      coords,
      bindings: {},
      establishedFacts: [armAC, armBD, wrongVertex],
      candidateFact: opposite,
      citedPremises: [armAC, armBD, wrongVertex],
    });
    expect(r.valid).toBe(false);
  });

  it("SOUNDNESS: when the rotation premises don't all hold ⇒ nothing emitted", () => {
    // C,D still on the arm circles, but A and B rotated by DIFFERENT angles.
    const Cbad = rotateAbout(A, O, 50);
    const Dbad = rotateAbout(B, O, 80);
    const bad: Coords = { O, A, B, C: Cbad, D: Dbad };

    expect(factHolds(armAC, bad)).toBe(true);
    expect(factHolds(armBD, bad)).toBe(true);
    expect(factHolds(apexAngle, bad)).toBe(false);
    expect(factHolds(opposite, bad)).toBe(false);

    const out = sas_shared_vertex.derive([armAC, armBD, apexAngle], {
      coords: bad,
      bindings: {},
      points: Object.keys(bad),
    });
    expect(out.some((f) => f.kind === "rel" && f.name === "cong")).toBe(false);

    const r = verify({
      coords: bad,
      bindings: {},
      establishedFacts: [armAC, armBD, apexAngle],
      candidateFact: opposite,
      citedPremises: [armAC, armBD, apexAngle],
    });
    expect(r.valid).toBe(false);
  });
});
