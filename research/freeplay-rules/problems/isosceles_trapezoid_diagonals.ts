/**
 * PROBLEM 2 — Real-contest length problem whose KEY step is an SAS congruence.
 *
 * Source: classic olympiad lemma — "the diagonals of an isosceles trapezoid are
 * equal." This is the canonical SAS-with-common-side configuration and a staple
 * building block in olympiad geometry (it is, e.g., the substance of Euclid's
 * Elements I.4-driven trapezoid argument and recurs throughout shortlist
 * length-chasing problems). We pick it because, unlike the more common
 * rotation/Fermat constructions (where the two congruent triangles share their
 * apex vertex), the two triangles here have DISTINCT apex vertices (A and B),
 * which is exactly what the `sas_congruence` rule requires (it skips eqangles
 * whose two vertices coincide).
 *
 * Statement: Let ABCD be an isosceles trapezoid with AB ∥ DC and equal legs
 * AD = BC. Prove that the diagonals are equal: BD = AC.
 *
 * KEY (and only) step — SAS:
 *   Triangles DAB (apex A) and CBA (apex B) have
 *     AD = BC          (legs, given)
 *     AB = BA          (common base side)
 *     ∠DAB = ∠CBA      (equal base angles of the isosceles trapezoid)
 *   so by SAS they are congruent, giving the third sides DB = CA, i.e. BD = AC.
 *
 * Faithful generic realization (non-degenerate isosceles trapezoid, NOT a
 * rectangle and NOT a parallelogram — the two bases differ, 4 vs 8):
 *   A=(2,3)  B=(6,3)  C=(8,0)  D=(0,0)
 *   AB ∥ DC (both horizontal), AD = BC = √13, ∠DAB = ∠CBA = 123.69°,
 *   BD = AC = √45.  Every given is checked with `factHolds` in the test.
 *
 * NEW RULE EXERCISED: `sas_congruence` (SAS ⇒ third-side `cong`). This goal IS
 * reached: the metric (length) conclusion is one AR cannot produce, and the
 * single SAS step closes it.
 */
import { rel } from "@/lib/freeplay/dsl";
import type { Coords } from "@/lib/freeplay/check";
import type { ResearchProblem } from "./types";

const coords: Coords = {
  A: [2, 3],
  B: [6, 3],
  C: [8, 0],
  D: [0, 0],
};

export const isosceles_trapezoid_diagonals: ResearchProblem = {
  id: "isosceles_trapezoid_diagonals",
  source: "Classic olympiad lemma — equal diagonals of an isosceles trapezoid (SAS)",
  statement:
    "ABCD is an isosceles trapezoid with AB ∥ DC and equal legs AD = BC. " +
    "Prove that its diagonals are equal: BD = AC.",
  coords,
  given: [
    // The legs are equal (defining the trapezoid as isosceles).
    rel("cong", ["A", "D", "B", "C"]),
    // The base AB is common to both triangles (reflexive side).
    rel("cong", ["A", "B", "B", "A"]),
    // Equal base angles ∠DAB = ∠CBA (the isosceles trapezoid's symmetry).
    rel("eqangle", ["D", "A", "B", "C", "B", "A"]),
  ],
  goal: rel("cong", ["B", "D", "A", "C"]),
  steps: [
    {
      // SAS on triangles DAB (apex A) and CBA (apex B): the included angle has
      // DISTINCT vertices A ≠ B, so sas_congruence fires and yields DB = CA.
      fact: rel("cong", ["D", "B", "C", "A"]),
      premises: [
        rel("cong", ["A", "D", "B", "C"]),
        rel("cong", ["A", "B", "B", "A"]),
        rel("eqangle", ["D", "A", "B", "C", "B", "A"]),
      ],
      expectRule: "SAS congruent triangles",
      humanReadable:
        "AD = BC, AB = BA, and ∠DAB = ∠CBA, so △DAB ≅ △CBA (SAS); hence BD = AC.",
    },
  ],
  exercises: ["sas_congruence"],
};
