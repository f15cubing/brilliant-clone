/**
 * PROBLEM — Power of a Point (intersecting-chords form).
 *
 * Source: classical circle geometry / olympiad lemma.
 *   Two chords AB and CD of a circle meet at a point P inside the circle. Then
 *   PA·PB = PC·PD, equivalently PA/PC = PD/PB.
 *
 * KEY FINDING — NO NEW RULE NEEDED.
 * Power of a point is ALREADY derivable from the engine's existing rules plus
 * the new length subsystem, in a short chain. The classical proof goes through
 * the similar triangles △PAC ~ △PDB, and the engine reaches it like so:
 *
 *   Givens: cyclic(A,B,C,D), coll(A,P,B), coll(C,P,D).
 *
 *   1. eqangle(P,A,C, P,D,B)   — ∠PAC = ∠PDB
 *        via `inscribed_angle` (DD, on the cyclic) + the angle AR closing the
 *        collinearity transfers ∠BAC↦∠PAC (P on AB) and ∠BDC↦∠PDB (P on DC).
 *        Reported rule: "algebraic angle-chase".
 *   2. eqangle(P,C,A, P,B,D)   — ∠PCA = ∠PBD
 *        the symmetric inscribed-angle pair, same machinery.
 *        Reported rule: "algebraic angle-chase".
 *   3. eqratio(P,A,P,C,P,D,P,B) — PA/PC = PD/PB
 *        the two equal-angle facts pin the correspondence P↔P, A↔D, C↔B, so
 *        `similar_triangles_aa` (LRule) emits the AA side proportions; the
 *        LengthAR length-chase then re-expresses the emitted proportion into the
 *        target orientation (same linear equation over log-lengths, up to sign).
 *        Reported rule: "algebraic length-chase".
 *
 * So the only "new" machinery used is the already-shipped research length
 * subsystem (`similar_triangles_aa` + `LengthAR`); no power-of-a-point-specific
 * rule is warranted. This file therefore encodes the configuration and the
 * 3-step proof as DATA; the companion test drives it through `researchVerifyL`
 * step by step (the angle-only `replayProblem` cannot, since it does not know
 * `eqratio`).
 *
 * COORDINATES — a faithful, generic, NON-degenerate realization: four points on
 * a radius-5 circle at distinct angles (150°, 20°, 80°, -70°) so that chords AB
 * and CD genuinely cross INSIDE the circle. Computed once here from trig (rather
 * than pasted decimals) to stay exact; every given/step fact is verified
 * numerically in the test.
 */
import type { Coords } from "@/lib/freeplay/check";
import { rel, type Fact } from "@/lib/freeplay/dsl";
import { eqratio, type EqRatio, type LFact } from "../lengths/dsl";

// ---- generic configuration --------------------------------------------------

const R = 5;
const deg = (d: number) => (d * Math.PI) / 180;
const onCircle = (d: number): [number, number] => [
  R * Math.cos(deg(d)),
  R * Math.sin(deg(d)),
];

/** Intersection of line p1p2 with line p3p4 (the chords meet here, inside). */
function lineIntersect(
  p1: readonly number[],
  p2: readonly number[],
  p3: readonly number[],
  p4: readonly number[],
): [number, number] {
  const [x1, y1] = p1, [x2, y2] = p2, [x3, y3] = p3, [x4, y4] = p4;
  const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
  return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)];
}

const A = onCircle(150);
const B = onCircle(20);
const C = onCircle(80);
const D = onCircle(-70);
const P = lineIntersect(A, B, C, D);

const coords: Coords = { A, B, C, D, P };

// ---- length-aware problem shape ---------------------------------------------

/** A proof step whose fact / premises may be length facts (`eqratio`). */
export interface LProofStep {
  fact: LFact;
  premises: LFact[];
  /** Expected rule name reported by `researchVerifyL` (asserted in the test). */
  expectRule: string;
  humanReadable: string;
}

/**
 * Like `ResearchProblem`, but the goal and steps range over `LFact` so the
 * power-of-a-point `eqratio` goal can be expressed. Replayed manually in the
 * test via `researchVerifyL` (not `replayProblem`).
 */
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

const given: Fact[] = [
  rel("cyclic", ["A", "B", "C", "D"]),
  rel("coll", ["A", "P", "B"]),
  rel("coll", ["C", "P", "D"]),
];

const eqPAC_PDB = rel("eqangle", ["P", "A", "C", "P", "D", "B"]); // ∠PAC = ∠PDB
const eqPCA_PBD = rel("eqangle", ["P", "C", "A", "P", "B", "D"]); // ∠PCA = ∠PBD

const goal: EqRatio = eqratio("P", "A", "P", "C", "P", "D", "P", "B"); // PA/PC = PD/PB

export const power_of_a_point: LResearchProblem = {
  id: "power_of_a_point",
  source: "Classical circle geometry — power of a point (intersecting chords)",
  statement:
    "Chords AB and CD of a circle meet at a point P inside the circle " +
    "(A, B, C, D concyclic; P on AB and on CD). Prove PA/PC = PD/PB " +
    "(equivalently PA·PB = PC·PD).",
  coords,
  given,
  goal,
  steps: [
    {
      fact: eqPAC_PDB,
      premises: given,
      expectRule: "algebraic angle-chase",
      humanReadable:
        "∠PAC = ∠PDB: inscribed angles on chord BC (apexes A, D), transferred " +
        "to vertex P along the collinear chords AB and DC.",
    },
    {
      fact: eqPCA_PBD,
      premises: given,
      expectRule: "algebraic angle-chase",
      humanReadable:
        "∠PCA = ∠PBD: inscribed angles on chord AD (apexes C, B), transferred " +
        "to vertex P along the collinear chords DC and AB.",
    },
    {
      fact: goal,
      premises: [eqPAC_PDB, eqPCA_PBD],
      expectRule: "algebraic length-chase",
      humanReadable:
        "Two equal angle pairs give △PAC ~ △PDB (AA); the corresponding sides " +
        "yield PA/PC = PD/PB.",
    },
  ],
  exercises: ["similar_triangles_aa"],
};
