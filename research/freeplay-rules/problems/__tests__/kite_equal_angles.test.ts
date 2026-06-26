import { describe, expect, it } from "vitest";
import { factHolds } from "@/lib/freeplay/check";
import { rel } from "@/lib/freeplay/dsl";
import { replayProblem } from "../replay";
import { kite_equal_angles as P } from "../kite_equal_angles";
import { sss_congruence } from "../../rules/sss_congruence";

/**
 * Play-test for the kite ∠ABC = ∠ADC.
 *
 * The headline result: the goal IS reached end-to-end. The diagonal BD makes two
 * isosceles triangles; `isosceles_converse` fires twice to give the base-angle
 * equalities, and the directed-angle AR chase adds them into the goal.
 *
 * The play-test also pins down a genuine GAP: the "obvious" △ABC ≅ △ADC by SSS
 * route cannot be taken, because `sss_congruence` requires six distinct vertices
 * and the kite's two triangles share the whole base AC (only A, B, C, D exist).
 */
describe(`problem: ${P.id} (${P.source})`, () => {
  const report = replayProblem(P);

  it("every given is numerically true in the coordinates", () => {
    for (const g of P.given) {
      expect(factHolds(g, P.coords, P.bindings ?? {}), JSON.stringify(g)).toBe(true);
    }
  });

  it("every step fact (and the goal) is numerically true in the coordinates", () => {
    for (const s of report.steps) {
      expect(s.numericallyTrue, s.label).toBe(true);
    }
    expect(factHolds(P.goal, P.coords, P.bindings ?? {})).toBe(true);
  });

  it("step 1: AB = AD ⇒ ∠ABD = ∠ADB (isosceles_converse)", () => {
    expect(report.steps[0].result).toEqual({
      valid: true,
      rule: "isosceles: equal sides ⇒ equal base angles",
    });
  });

  it("step 2: CB = CD ⇒ ∠CBD = ∠CDB (isosceles_converse)", () => {
    expect(report.steps[1].result).toEqual({
      valid: true,
      rule: "isosceles: equal sides ⇒ equal base angles",
    });
  });

  it("step 3: the two base-angle equalities add to ∠ABC = ∠ADC (AR chase)", () => {
    expect(report.steps[2].result).toEqual({
      valid: true,
      rule: "algebraic angle-chase",
    });
  });

  it("the goal is reached end-to-end and every step is valid", () => {
    expect(report.goalReached).toBe(true);
    expect(report.allValid).toBe(true);
  });

  // ---- documented GAP: SSS cannot prove the kite directly -------------------
  it("GAP: sss_congruence does NOT fire on △ABC ≅ △ADC (shared base AC)", () => {
    // The "obvious" route: SSS with AB = AD, CB = CD, and the common side AC.
    const congs = [
      rel("cong", ["A", "B", "A", "D"]),
      rel("cong", ["C", "B", "C", "D"]),
      rel("cong", ["A", "C", "A", "C"]), // AC = AC, the shared/common side
    ];
    const produced = sss_congruence.derive(congs, {
      coords: P.coords,
      bindings: {},
      points: Object.keys(P.coords),
    });
    // Six distinct vertices are required; the kite only has four (A,B,C,D), so
    // the rule emits nothing — the canonical SSS argument is unreachable here.
    expect(produced).toEqual([]);
  });
});
