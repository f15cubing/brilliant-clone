/**
 * PROBLEM 1 — Controlled probe: "the circumcenter is equidistant from B and C."
 *
 * Source: foundational olympiad lemma (the circumcenter O of triangle ABC
 * satisfies OA = OB = OC). Encoded here as a *controlled probe* whose only
 * purpose is to drive the new length rules and expose the cong-transitivity gap.
 *
 * Configuration (generic scalene triangle):
 *   A=(0,0)  B=(6,0)  C=(1,5)
 *   M = midpoint of AB = (3,0)
 *   N = midpoint of AC = (0.5,2.5)
 *   O = intersection of the two perpendicular bisectors:
 *         line MO ⊥ AB  and  line NO ⊥ AC   ⇒ O = (3,2)
 *   (numerically OA = OB = OC = √13.)
 *
 * Intended proof:
 *   1. perp_bisector(midp(M,A,B), perp(M,O,A,B))  ⇒ cong(O,A,O,B)   [OA = OB]
 *   2. perp_bisector(midp(N,A,C), perp(N,O,A,C))  ⇒ cong(O,A,O,C)   [OA = OC]
 *   3. GOAL cong(O,B,O,C)  [OB = OC]  — must chain OA=OB and OA=OC.
 *
 * GAP EXPOSED: step 3 is the classic *cong transitivity* (XA=XB ∧ XA=XC ⇒
 * XB=XC). No shipped rule and none of the new length rules (midpoint_congruence,
 * perp_bisector, sas_congruence) derives a `cong` from two other `cong`s — the
 * angles-only AR has no length table. So the chain STALLS at step 3: the test
 * below asserts that reality (steps 1–2 valid, step 3 `unjustified`, goal NOT
 * reached). This is the high-value finding the probe was built to surface.
 */
import { rel } from "@/lib/freeplay/dsl";
import type { Coords } from "@/lib/freeplay/check";
import type { ResearchProblem } from "./types";

const coords: Coords = {
  A: [0, 0],
  B: [6, 0],
  C: [1, 5],
  M: [3, 0],
  N: [0.5, 2.5],
  O: [3, 2],
};

export const circumcenter_equidistant: ResearchProblem = {
  id: "circumcenter_equidistant",
  source: "Foundational olympiad lemma (circumcenter is equidistant) — controlled probe",
  statement:
    "In scalene triangle ABC, M and N are the midpoints of AB and AC. O is the " +
    "common point of the perpendicular bisector of AB (line MO ⊥ AB) and the " +
    "perpendicular bisector of AC (line NO ⊥ AC). Prove OB = OC.",
  coords,
  given: [
    rel("midp", ["M", "A", "B"]),
    rel("midp", ["N", "A", "C"]),
    rel("perp", ["M", "O", "A", "B"]),
    rel("perp", ["N", "O", "A", "C"]),
  ],
  goal: rel("cong", ["O", "B", "O", "C"]),
  steps: [
    {
      fact: rel("cong", ["O", "A", "O", "B"]),
      premises: [rel("midp", ["M", "A", "B"]), rel("perp", ["M", "O", "A", "B"])],
      expectRule: "perpendicular bisector ⇒ equidistant",
      humanReadable: "O is on the perpendicular bisector of AB, so OA = OB.",
    },
    {
      fact: rel("cong", ["O", "A", "O", "C"]),
      premises: [rel("midp", ["N", "A", "C"]), rel("perp", ["N", "O", "A", "C"])],
      expectRule: "perpendicular bisector ⇒ equidistant",
      humanReadable: "O is on the perpendicular bisector of AC, so OA = OC.",
    },
    {
      // GAP STEP: OA=OB ∧ OA=OC ⇒ OB=OC needs cong transitivity, which no rule
      // provides. Kept in the proof honestly; the test asserts it is rejected.
      fact: rel("cong", ["O", "B", "O", "C"]),
      premises: [rel("cong", ["O", "A", "O", "B"]), rel("cong", ["O", "A", "O", "C"])],
      humanReadable: "OA = OB and OA = OC, hence OB = OC (cong transitivity — MISSING RULE).",
    },
  ],
  exercises: ["perp_bisector"],
};
