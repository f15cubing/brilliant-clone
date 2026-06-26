/**
 * PROBLEM — The Angle Bisector Theorem (length-ratio form).
 *
 * Source: Euclid, *Elements* Book VI, Proposition 3 (c. 300 BC) — the canonical
 * NAMED length-ratio result, and the crux of innumerable olympiad problems
 * (e.g. the standard reduction in IMO/Shortlist "G" problems that invoke
 * BD/DC = AB/AC). The prompt explicitly lists "the angle-bisector length ratio"
 * as a target; this is exactly that theorem, attempted as a FULL ratio proof.
 *
 *   In triangle ABC, the internal bisector of ∠A meets side BC at D. Then
 *   BD/DC = AB/AC.
 *
 * THE CLASSICAL SYNTHETIC PROOF WE ENCODE (the "parallel" proof, no constants).
 * Construct E on line AB (beyond A) with CE ∥ AD. Then:
 *
 *   1. ∠AEC = ∠ACE.
 *        CE ∥ AD with the bisector ∠BAD = ∠DAC pins the two base angles of
 *        △AEC equal (corresponding angle ∠AEC = ∠BAD along the transversal BAE,
 *        alternate angle ∠ACE = ∠DAC along the transversal AC, and the bisector
 *        identifies the two). This is a pure directed-angle consequence — the
 *        engine's AR layer closes it (the `eqangle` "pick" branch absorbs the
 *        isosceles orientation flip), so the reported rule is the
 *        "algebraic angle-chase".
 *
 *   2. AE = AC.
 *        △AEC has equal base angles, hence equal legs — the shipped `isosceles`
 *        rule (equal base angles ⇒ equal sides) emits cong(A,E,A,C).
 *
 *   3. BA/AE = BD/DC.
 *        In △BCE the line AD ∥ CE cuts the two cevians BAE and BDC, so Thales'
 *        basic proportionality theorem gives BA/AE = BD/DC (rule:
 *        `basic proportionality theorem`).
 *
 *   4. BD/DC = AB/AC   (GOAL).
 *        Substitute the congruence AE = AC into the Thales ratio. The length
 *        table (`LengthAR`) FUSES eqratio(B,A,A,E,B,D,D,C) with cong(A,E,A,C)
 *        into eqratio(B,D,D,C,A,B,A,C); reported as an "algebraic length-chase".
 *
 * WHY THIS IS A GENUINE STRESS TEST OF THE LENGTH SUBSYSTEM.
 * It chains THREE different length/angle producers — an AR angle-chase, the
 * shipped metric `isosceles` rule (eqangle ⇒ cong), and `thales_basic_
 * proportionality` (eqratio) — and then relies on `LengthAR` to fuse a `cong`
 * with an `eqratio` over log-lengths. The bisector's defining angle equality is
 * converted into a LENGTH equality (AE = AC) and carried into a ratio, which is
 * precisely the kind of metric reasoning AR-on-angles alone cannot perform.
 *
 * COORDINATES — an exact integer-lattice realization (a scalene triangle, so the
 * ratio AB/AC = 2 ≠ 1 is non-trivial):
 *   A = (0,0), B = (30,0), C = (9,12),  D = (16,8) on BC,  E = (-15,0) on line AB.
 * Here AB = 30, AC = 15 (ratio 2); BD = √260, DC = √65 (ratio 2); AE = 15 = AC;
 * AD ∥ CE (both direction (2,1)); ∠BAD = ∠DAC = arctan(1/2). Every given and
 * every step fact is verified numerically in the companion test.
 */
import type { Coords } from "@/lib/freeplay/check";
import { rel, type Fact } from "@/lib/freeplay/dsl";
import { eqratio, type EqRatio, type LFact } from "../lengths/dsl";

// ---- generic configuration (integer lattice) --------------------------------

const A: [number, number] = [0, 0]; // apex of the bisected angle
const B: [number, number] = [30, 0]; // AB = 30
const C: [number, number] = [9, 12]; // AC = 15  (scalene: AB/AC = 2)
const D: [number, number] = [16, 8]; // foot of the bisector on BC (BD/DC = 2)
const E: [number, number] = [-15, 0]; // on line AB beyond A, with CE ∥ AD; AE = 15

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

// AD bisects ∠BAC:  ∠BAD = ∠DAC  (vertex A).
const bisector: Fact = rel("eqangle", ["B", "A", "D", "D", "A", "C"]);
// D lies on side BC.
const collBDC: Fact = rel("coll", ["B", "D", "C"]);
// Construction: E lies on line AB (E, A, B collinear).
const collBAE: Fact = rel("coll", ["B", "A", "E"]);
// Construction: CE ∥ AD  (so AD and EC are parallel, direction (2,1) here).
const paraADEC: Fact = rel("para", ["A", "D", "E", "C"]);

// Step facts.
const baseAngles: Fact = rel("eqangle", ["A", "E", "C", "A", "C", "E"]); // ∠AEC = ∠ACE
const congAEAC: Fact = rel("cong", ["A", "E", "A", "C"]); // AE = AC
const thalesRatio: EqRatio = eqratio("B", "A", "A", "E", "B", "D", "D", "C"); // BA/AE = BD/DC

// GOAL — the angle-bisector ratio:  BD/DC = AB/AC.
const goal: EqRatio = eqratio("B", "D", "D", "C", "A", "B", "A", "C");

export const angle_bisector_theorem: LResearchProblem = {
  id: "angle_bisector_theorem",
  source: "Euclid, Elements VI.3 (c. 300 BC) — the Angle Bisector Theorem",
  statement:
    "In triangle ABC the internal bisector of ∠A meets BC at D (so ∠BAD = " +
    "∠DAC and B, D, C are collinear). Prove BD/DC = AB/AC. Proof by the " +
    "auxiliary point E on line AB with CE ∥ AD: △AEC is isosceles (AE = AC) " +
    "and Thales in △BCE gives BA/AE = BD/DC, whence BD/DC = AB/AC.",
  coords,
  given: [bisector, collBDC, collBAE, paraADEC],
  goal,
  steps: [
    {
      fact: baseAngles,
      premises: [bisector, collBAE, paraADEC],
      expectRule: "algebraic angle-chase",
      humanReadable:
        "∠AEC = ∠ACE: with CE ∥ AD, the corresponding angle ∠AEC equals ∠BAD " +
        "(transversal BAE) and the alternate angle ∠ACE equals ∠DAC " +
        "(transversal AC); the bisector ∠BAD = ∠DAC identifies the two. (coll " +
        "B,D,C is NOT needed for this angle step.)",
    },
    {
      fact: congAEAC,
      premises: [baseAngles],
      expectRule: "isosceles: equal base angles ⇒ equal sides",
      humanReadable:
        "AE = AC: triangle AEC has equal base angles (∠AEC = ∠ACE), so its " +
        "legs AE and AC are equal.",
    },
    {
      fact: thalesRatio,
      premises: [collBAE, collBDC, paraADEC],
      expectRule: "basic proportionality theorem",
      humanReadable:
        "BA/AE = BD/DC: in triangle BCE (apex B), the line AD ∥ CE cuts the " +
        "two sides BE (at A) and BC (at D) proportionally.",
    },
    {
      fact: goal,
      premises: [thalesRatio, congAEAC],
      expectRule: "algebraic length-chase",
      humanReadable:
        "BD/DC = AB/AC: substitute AE = AC into BA/AE = BD/DC. The length " +
        "table fuses the cong with the Thales eqratio to close the goal.",
    },
  ],
  exercises: ["thales_basic_proportionality", "isosceles"],
};
