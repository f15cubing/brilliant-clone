/**
 * PROBLEM — Kite ABCD with AB = AD and CB = CD: prove ∠ABC = ∠ADC.
 *
 * Source: classic Euclidean result (the apex–to–apex pair of opposite angles of
 * a kite are equal). It is the textbook companion to Euclid I.5 / I.8 and the
 * standard "prove the two slanted angles of a kite are equal" exercise (e.g.
 * Brilliant.org "Quadrilaterals — Kites"; AoPS Introduction to Geometry §kites).
 *
 * Configuration (faithful GENERIC kite; only the REQUIRED reflection across the
 * axis AC, no other coincidence):
 *   A = (0, 4)   apex of the short legs   (AB = AD = √13)
 *   B = (2, 1)
 *   C = (0, -3)  apex of the long legs    (CB = CD = √20)
 *   D = (-2, 1)
 * Checks: AB = AD, CB = CD, AB ≠ CB (NOT a rhombus), no three points collinear,
 * ∠ABC = ∠ADC = 119.74°, and neither is a right angle (no accidental symmetry).
 *
 * THE PROOF WE REPLAY (works end-to-end)
 * The diagonal BD splits the kite into two isosceles triangles, ABD (AB = AD)
 * and CBD (CB = CD). The CONVERSE-isosceles rule turns each leg equality into a
 * base-angle equality, and an algebraic angle-chase (AR) adds them:
 *
 *   1. cong(A,B,A,D)  --isosceles_converse-->  eqangle(A,B,D, A,D,B)   ∠ABD = ∠ADB
 *   2. cong(C,B,C,D)  --isosceles_converse-->  eqangle(C,B,D, C,D,B)   ∠CBD = ∠CDB
 *   3. {step1, step2} --AR angle-chase-->      eqangle(A,B,C, A,D,C)   ∠ABC = ∠ADC
 *
 * Step 3 is exactly ∠ABC = ∠ABD + ∠DBC = ∠ADB + ∠CDB = ∠ADC, which the directed
 * angle table closes once both base-angle equalities are present.
 *
 * WHY THE "OBVIOUS" SSS ROUTE STALLS (the gap this play-test surfaces)
 * The natural one-line argument is "△ABC ≅ △ADC by SSS (AB = AD, CB = CD, AC
 * common), hence ∠ABC = ∠ADC." But the `sss_congruence` rule requires SIX
 * DISTINCT vertices (X,Y,Z,P,Q,R) — it is built for two DISJOINT triangles. Here
 * the two triangles SHARE the base AC (only four distinct points A,B,C,D), so the
 * rule never fires. The companion test asserts `sss_congruence.derive([...]) === []`
 * for this configuration: a real missing capability (SSS across a shared side).
 *
 * NEW RULE EXERCISED: `isosceles_converse` (length equality ⇒ base-angle
 * equality), twice; the final length-free angle equality is then an AR chase.
 */
import { rel } from "@/lib/freeplay/dsl";
import type { Coords } from "@/lib/freeplay/check";
import type { ResearchProblem } from "./types";

const coords: Coords = {
  A: [0, 4],
  B: [2, 1],
  C: [0, -3],
  D: [-2, 1],
};

export const kite_equal_angles: ResearchProblem = {
  id: "kite_equal_angles",
  source:
    "Classic Euclidean kite theorem (Brilliant 'Kites' / AoPS Intro to Geometry) — " +
    "equal opposite angles of a kite, via the isosceles converse",
  statement:
    "ABCD is a kite with AB = AD and CB = CD. Prove that the angles at the two " +
    "non-axis vertices are equal: ∠ABC = ∠ADC.",
  coords,
  given: [
    // The two pairs of equal legs that define the kite.
    rel("cong", ["A", "B", "A", "D"]),
    rel("cong", ["C", "B", "C", "D"]),
  ],
  goal: rel("eqangle", ["A", "B", "C", "A", "D", "C"]),
  steps: [
    {
      // Isosceles △ABD (AB = AD): base angles ∠ABD = ∠ADB.
      fact: rel("eqangle", ["A", "B", "D", "A", "D", "B"]),
      premises: [rel("cong", ["A", "B", "A", "D"])],
      expectRule: "isosceles: equal sides ⇒ equal base angles",
      humanReadable: "AB = AD, so triangle ABD is isosceles: ∠ABD = ∠ADB.",
    },
    {
      // Isosceles △CBD (CB = CD): base angles ∠CBD = ∠CDB.
      fact: rel("eqangle", ["C", "B", "D", "C", "D", "B"]),
      premises: [rel("cong", ["C", "B", "C", "D"])],
      expectRule: "isosceles: equal sides ⇒ equal base angles",
      humanReadable: "CB = CD, so triangle CBD is isosceles: ∠CBD = ∠CDB.",
    },
    {
      // ∠ABC = ∠ABD + ∠DBC = ∠ADB + ∠CDB = ∠ADC (directed angle-chase / AR).
      fact: rel("eqangle", ["A", "B", "C", "A", "D", "C"]),
      premises: [
        rel("eqangle", ["A", "B", "D", "A", "D", "B"]),
        rel("eqangle", ["C", "B", "D", "C", "D", "B"]),
      ],
      expectRule: "algebraic angle-chase",
      humanReadable:
        "Adding the two base-angle equalities about the diagonal BD: " +
        "∠ABC = ∠ABD + ∠DBC = ∠ADB + ∠CDB = ∠ADC.",
    },
  ],
  exercises: ["isosceles_converse"],
};
