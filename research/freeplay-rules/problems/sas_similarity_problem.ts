/**
 * PROBLEM — Converse of the Power of a Point, via SAS similarity.
 *
 * Source: classical circle geometry (the metric criterion for concyclicity);
 * the SAS-similarity converse of the intersecting-secants power-of-a-point lemma.
 *
 *   From an external point A two secants are drawn. The first meets a circle at
 *   C (near A) and B (far); the second at E (near A) and D (far). Suppose the
 *   metric condition AB·AC = AD·AE holds (equivalently AB/AD = AE/AC). Prove
 *   that the cross-chord ratio is fixed,  BE/CD = AB/AD, and that ∠ABE = ∠ADC
 *   (so B, C, D, E are concyclic).
 *
 * WHY THIS GENUINELY NEEDS SAS SIMILARITY (not AA).
 * The two triangles that drive the proof, △ABE and △ADC, SHARE the angle at A
 * (rays AB≡AC and rays AE≡AD, since the secants are straight lines). That single
 * shared angle is only ONE pair of equal angles — AA is unavailable. What rescues
 * the argument is the metric hypothesis: the two sides INCLUDING the shared angle
 * are in proportion,
 *
 *   AB/AD = AE/AC     (⇔ AB·AC = AD·AE, the power-of-a-point hypothesis)
 *
 * so △ABE ~ △ADC by SAS similarity (A↔A, B↔D, E↔C). The remaining ratio and the
 * remaining angles then follow. This is the genuine converse direction: unlike
 * the forward power-of-a-point (which starts from the cyclic data and uses AA —
 * see `power_of_a_point.ts`), here we are GIVEN the products/ratio and must
 * manufacture the similarity from it. AA cannot; SAS can.
 *
 * HOW THE KEY STEP IS ATTRIBUTED IN THE HARNESS
 * The research verifier filters the cited `eqratio` premise OUT of the ordinary
 * facts handed to `derive`, so `sas_similarity` fires off the cited included
 * `eqangle` alone. It recovers the correspondence numerically, guards the
 * included-side proportion AB/AD = AE/AC against the coordinates, and emits the
 * BRIDGE proportion
 *
 *   eqratio(A,E,A,C, E,B,C,D)   — AE/AC = EB/CD
 *
 * (plus the two remaining equal angles). The length table (`LengthAR`) then FUSES
 * the cited AB/AD = AE/AC with this bridge AE/AC = EB/CD to close the target
 * AB/AD = BE/CD. Because the bridge alone cannot reach the target, BOTH premises
 * are load-bearing; the verifier reports the step as an "algebraic length-chase".
 *
 * COORDINATES — a faithful, generic, NON-degenerate lattice realization. B, C, D,
 * E lie on the circle x²+y²=25; the two secant lines
 *   line1:  y = -2x + 10  through C(3,4) and B(5,0),
 *   line2:  y = -3x - 5   through E(-3,4) and D(0,-5),
 * meet at the EXTERNAL point A(-15,40). Every length is irrational but every
 * given/step fact is an exact ratio/angle equality, verified numerically in the
 * companion test. The two triangles △ABE, △ADC are scalene and have OPPOSITE
 * orientation (a mirror similarity) — orientation is deliberately not assumed.
 */
import type { Coords } from "@/lib/freeplay/check";
import { rel, type Fact } from "@/lib/freeplay/dsl";
import { eqratio, type EqRatio, type LFact } from "../lengths/dsl";

// ---- generic configuration (integer lattice) --------------------------------

const A: [number, number] = [-15, 40]; // external point: intersection of secants
const B: [number, number] = [5, 0]; //  far point of secant 1   (on x²+y²=25)
const C: [number, number] = [3, 4]; //  near point of secant 1
const D: [number, number] = [0, -5]; // far point of secant 2
const E: [number, number] = [-3, 4]; // near point of secant 2

const coords: Coords = { A, B, C, D, E };

// ---- length-aware problem shape (mirrors power_of_a_point.ts) ----------------

/** A proof step whose fact / premises may be length facts (`eqratio`). */
export interface LProofStep {
  fact: LFact;
  premises: LFact[];
  /** Expected rule name reported by `researchVerifyL` (asserted in the test). */
  expectRule: string;
  humanReadable: string;
}

/** Like `ResearchProblem`, but goal/steps range over `LFact` (so `eqratio`). */
export interface LResearchProblem {
  id: string;
  source: string;
  statement: string;
  coords: Coords;
  given: LFact[];
  goal: EqRatio;
  steps: LProofStep[];
  exercises: string[];
}

// ---- givens, goal, proof ----------------------------------------------------

// Two secants from the external point A.
const collACB = rel("coll", ["A", "C", "B"]); // A, C, B collinear (secant 1)
const collAED = rel("coll", ["A", "E", "D"]); // A, E, D collinear (secant 2)

// Power-of-a-point hypothesis, as a ratio of the sides including the shared angle:
//   AB/AD = AE/AC   (⇔ AB·AC = AD·AE).
const powerRatio: EqRatio = eqratio("A", "B", "A", "D", "A", "E", "A", "C");

// The shared INCLUDED angle ∠BAE = ∠DAC (vertex A; rays AB≡AC and AE≡AD).
const sharedAngle: Fact = rel("eqangle", ["B", "A", "E", "D", "A", "C"]);

// Remaining equal angle ∠ABE = ∠ADC (the antiparallel / concyclicity criterion).
const angABE_ADC: Fact = rel("eqangle", ["A", "B", "E", "A", "D", "C"]);

// GOAL — the cross-chord ratio: AB/AD = BE/CD.
const goal: EqRatio = eqratio("A", "B", "A", "D", "B", "E", "C", "D");

export const sas_similarity_problem: LResearchProblem = {
  id: "sas_similarity_problem",
  source:
    "Classical circle geometry — converse power of a point (intersecting " +
    "secants) via SAS similarity",
  statement:
    "From an external point A two secants meet a circle: the first at C (near) " +
    "and B (far), the second at E (near) and D (far). Given AB·AC = AD·AE " +
    "(equivalently AB/AD = AE/AC), prove BE/CD = AB/AD and ∠ABE = ∠ADC " +
    "(so B, C, D, E are concyclic). The triangles △ABE, △ADC share the angle " +
    "at A, so the proof needs SAS similarity, not AA.",
  coords,
  given: [collACB, collAED, powerRatio, sharedAngle],
  goal,
  steps: [
    {
      fact: angABE_ADC,
      premises: [sharedAngle],
      expectRule: "SAS similar triangles",
      humanReadable:
        "△ABE ~ △ADC by SAS (shared ∠A, AB/AD = AE/AC), so the remaining " +
        "angles match: ∠ABE = ∠ADC. This is the antiparallel relation that " +
        "places B, C, D, E on one circle.",
    },
    {
      fact: goal,
      premises: [powerRatio, sharedAngle],
      expectRule: "algebraic length-chase",
      humanReadable:
        "From the same SAS similarity the third pair of sides is in the same " +
        "ratio: BE/CD = AB/AD. (The rule emits the bridge AE/AC = EB/CD; the " +
        "length table fuses it with the cited AB/AD = AE/AC to reach the goal.)",
    },
  ],
  exercises: ["sas_similarity"],
};
