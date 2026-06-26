import { describe, expect, it } from "vitest";
import { factHolds } from "@/lib/freeplay/check";
import { rel } from "@/lib/freeplay/dsl";
import { replayProblem } from "../replay";
import { shared_side_congruence_problem as P } from "../shared_side_congruence_problem";
import { verifyWith, RULES } from "../../harness";
import { sss_congruence } from "../../rules/sss_congruence";

/**
 * Play-test for the isosceles-median lemma ∠BAM = ∠CAM (the median to the base
 * bisects the apex angle).
 *
 * The headline result: the goal IS reached end-to-end. `midpoint_congruence`
 * turns "M is the midpoint of BC" into MB = MC, and then the KEY step fires
 * `shared_side_congruence`: triangles ABM and ACM share the whole median side AM
 * (only A, B, C, M exist), so AB = AC and MB = MC give ∠BAM = ∠CAM.
 *
 * The play-test also pins down the genuine GAP: the "obvious" △ABM ≅ △ACM by SSS
 * route cannot be taken with the shipped engine, because `sss_congruence` needs
 * six distinct vertices while these two triangles share the side AM, and the
 * angle-only AR layer cannot consume the two `cong` premises at all.
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

  it("step 1: M midpoint of BC ⇒ MB = MC (midpoint_congruence)", () => {
    expect(report.steps[0].result).toEqual({
      valid: true,
      rule: "midpoint gives equal halves",
    });
  });

  it("KEY step 2: AB = AC and MB = MC ⇒ ∠BAM = ∠CAM (shared_side_congruence)", () => {
    expect(report.steps[1].result).toEqual({
      valid: true,
      rule: "shared-side congruent triangles",
    });
  });

  it("the goal is reached end-to-end and every step is valid", () => {
    expect(report.goalReached).toBe(true);
    expect(report.allValid).toBe(true);
  });

  // ---- documented GAP -------------------------------------------------------
  // The two leg congruences at the shared endpoints A and M.
  const legA = rel("cong", ["A", "B", "A", "C"]); // AB = AC
  const legM = rel("cong", ["M", "B", "M", "C"]); // MB = MC
  const givens = [legA, legM];

  it("GAP: the shipped engine (RULES) cannot derive ∠BAM = ∠CAM from the two leg congruences", () => {
    // The conclusion is an ANGLE equality drawn from two LENGTH equalities over a
    // 4-point figure. AR is angles-only (it ignores `cong`), the shipped
    // `isosceles` rule runs the other way (eqangle ⇒ cong), and `sss_congruence`
    // needs six distinct vertices — so the KEY step is genuinely unprovable today.
    const r = verifyWith(RULES, {
      coords: P.coords,
      bindings: {},
      establishedFacts: givens,
      candidateFact: P.goal,
      citedPremises: givens,
    });
    expect(r.valid).toBe(false);
  });

  it("GAP: sss_congruence does NOT fire on △ABM ≅ △ACM (shared median side AM)", () => {
    // The "obvious" route: SSS with AB = AC, MB = MC, and the common side AM.
    const congs = [
      legA,
      legM,
      rel("cong", ["A", "M", "A", "M"]), // AM = AM, the shared/common side
    ];
    const produced = sss_congruence.derive(congs, {
      coords: P.coords,
      bindings: {},
      points: Object.keys(P.coords),
    });
    // Six distinct vertices are required; the configuration only has four
    // (A, B, C, M), so the rule emits nothing — the canonical SSS argument is
    // unreachable here, which is exactly the capability shared_side_congruence adds.
    expect(produced).toEqual([]);
  });
});
