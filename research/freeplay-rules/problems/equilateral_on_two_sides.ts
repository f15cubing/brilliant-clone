/**
 * PLAY-TEST — "Equilateral triangles on two sides" (rotation about A by 60°).
 *
 * Source: classic rotation lemma, the crux of the Fermat-point / Pompeiu family
 * and the engine behind e.g. IMO-Shortlist rotation arguments. Statement:
 *
 *   Let ABC be a triangle. Erect equilateral triangles ABD on AB and ACE on AC,
 *   both OUTWARD (D on the far side of line AB from C, E on the far side of line
 *   AC from B). Then BE = CD (equivalently CD = BE).
 *
 * Why it is true (the rotation): the 60° rotation ρ about A carries the segment
 * DC onto BE. Indeed AD = AB and AC = AE (equilateral arms at the shared apex A),
 * and the included angles are equal, ∠DAC = ∠BAE — because each equals
 * ∠BAC ± 60°: ρ sends D↦B and C↦E. Hence △DAC ≅ △BAE (SAS about the common
 * vertex A), so DC = BE.
 *
 * HOW THIS MAPS ONTO THE ENGINE
 * The two equilateral erections give the length facts and the two 60° apex
 * angles directly:
 *   cong(A,D,A,B)        — AD = AB           (equilateral ABD)
 *   cong(A,C,A,E)        — AC = AE           (equilateral ACE)
 *   aval(∠DAB) = 60      — apex angle of ABD
 *   aval(∠EAC) = 60      — apex angle of ACE
 *
 * STEP 1 (included-angle equality, by AR). The engine's algebraic angle-chase
 * derives the included-angle equality
 *   eqangle(D,A,C, B,A,E)   — ∠DAC = ∠BAE
 * from the two 60° apex angles alone. In directed angles (mod 180°) the outward
 * erections give D(AD) = D(AB) − 60° and D(AE) = D(AC) + 60°, so
 *   D(AC) − D(AD) = D(AE) − D(AB)
 * i.e. ∠DAC = ∠BAE. The shared base angle ∠BAC cancels and is NOT needed — a
 * pleasant finding: AR closes the angle equality from just the two erection
 * angles. (Coordinate signs fix the ε branch, so the cancellation is exactly the
 * outward-vs-outward configuration, not a coincidence.)
 *
 * STEP 2 (the rotation congruence, by sas_shared_vertex). With AD = AB, AC = AE
 * and ∠DAC = ∠BAE about the SHARED apex A, the shared-vertex SAS rule emits the
 * opposite-side length equality
 *   cong(D,C,B,E)        — DC = BE   (the goal).
 * This is the length conclusion the angles-only AR layer can never produce.
 *
 * COORDINATES — generic scalene triangle A=(0,0), B=(7,1), C=(2,5). D is B
 * rotated −60° about A; E is C rotated +60° about A (the outward erections). All
 * given/step facts are verified numerically by the play-test (`factHolds`).
 */
import { aval, rel } from "@/lib/freeplay/dsl";
import { parseForm } from "@/lib/freeplay/form";
import type { Coords } from "@/lib/freeplay/check";
import type { ResearchProblem } from "./types";

const coords: Coords = {
  A: [0, 0],
  B: [7, 1],
  C: [2, 5],
  // D = rotateAbout(B, A, -60°)  (equilateral ABD erected outward, away from C)
  D: [4.366025403784439, -5.56217782649107],
  // E = rotateAbout(C, A, +60°)  (equilateral ACE erected outward, away from B)
  E: [-3.330127018922193, 4.232050807568877],
};

const adab = rel("cong", ["A", "D", "A", "B"]); // AD = AB
const acae = rel("cong", ["A", "C", "A", "E"]); // AC = AE
const angDAB = aval(["D", "A", "B"], parseForm("60")); // ∠DAB = 60
const angEAC = aval(["E", "A", "C"], parseForm("60")); // ∠EAC = 60

const includedAngle = rel("eqangle", ["D", "A", "C", "B", "A", "E"]); // ∠DAC = ∠BAE
const goal = rel("cong", ["D", "C", "B", "E"]); // DC = BE

export const equilateral_on_two_sides: ResearchProblem = {
  id: "equilateral_on_two_sides",
  source:
    "Classic rotation lemma — equilateral triangles erected on two sides " +
    "(rotation about A by 60°; Fermat-point / Pompeiu family)",
  statement:
    "Triangle ABC. Erect equilateral triangles ABD on AB and ACE on AC, both " +
    "outward (D on the far side of AB from C, E on the far side of AC from B). " +
    "Prove DC = BE.",
  coords,
  given: [adab, acae, angDAB, angEAC],
  goal,
  steps: [
    {
      // The 60° rotation's included-angle equality, ∠DAC = ∠BAE, falls out of
      // the two erection angles by directed-angle algebra (the shared ∠BAC
      // cancels). AR proves it; no new rule needed for this step.
      fact: includedAngle,
      premises: [angDAB, angEAC],
      expectRule: "algebraic angle-chase",
      humanReadable:
        "∠DAC = ∠BAE: in directed angles the outward 60° erections give " +
        "D(AD)=D(AB)−60° and D(AE)=D(AC)+60°, so ∠DAC = ∠BAE (AR).",
    },
    {
      // The rotation congruence △DAC ≅ △BAE about the shared apex A ⇒ DC = BE.
      fact: goal,
      premises: [adab, acae, includedAngle],
      expectRule: "SAS about a common vertex",
      humanReadable:
        "AD = AB, AC = AE and ∠DAC = ∠BAE about the shared apex A, so " +
        "△DAC ≅ △BAE and DC = BE (shared-vertex SAS — the rotation).",
    },
  ],
  exercises: ["sas_shared_vertex"],
};
