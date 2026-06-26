/**
 * PROBLEM — Isosceles triangle ABC with AB = AC; M is the midpoint of BC.
 * Prove that the median AM BISECTS the apex angle: ∠BAM = ∠CAM.
 *
 * Source: classic Euclidean lemma — "in an isosceles triangle the median to the
 * base is also the bisector of the apex angle (and the altitude)." It is the
 * standard companion to Euclid I.5/I.8 (e.g. AoPS Introduction to Geometry,
 * "Isosceles and Equilateral Triangles"; the median/bisector/altitude coincidence
 * is the textbook one-line corollary of △ABM ≅ △ACM). DISTINCT from the existing
 * `kite_equal_angles` play-test: that one proves the angles at the two THIRD
 * vertices are equal via `isosceles_converse` + an AR chase; here the goal is the
 * angle at a SHARED-side endpoint (the apex A) and the key step is the genuine
 * SSS-over-a-shared-side deduction `shared_side_congruence`.
 *
 * Configuration (faithful, non-degenerate; the only symmetry is the one the
 * theorem REQUIRES — the reflection across the median line AM):
 *   A = (1, 6)    apex          (AB = AC = √52)
 *   B = (-3, 0)
 *   C = (5, 0)
 *   M = (1, 0)    midpoint of BC (MB = MC = 4)
 * Checks: AB = AC, M is the midpoint of BC (so MB = MC), B–M–C collinear, neither
 * △ABM nor △ACM is degenerate, and ∠BAM = ∠CAM ≈ 33.69° (a genuine acute, non-
 * right angle — no accidental coincidence at the apex).
 *
 * THE PROOF WE REPLAY (works end-to-end)
 * Triangles ABM and ACM share the whole median side AM and have only FOUR
 * distinct points A, B, C, M. The two equal-leg facts at the shared endpoints A
 * and M make them congruent by SSS-over-a-shared-side, and the corresponding
 * angle at the apex A is the bisected angle:
 *
 *   1. midp(M,B,C)                       --midpoint gives equal halves-->  cong(M,B,M,C)   MB = MC
 *   2. {cong(A,B,A,C), cong(M,B,M,C)}    --shared-side congruent triangles--> eqangle(B,A,M, C,A,M)   ∠BAM = ∠CAM
 *
 * Step 2 is the KEY step: the shared side AM plays the role of the common third
 * side, so only the two leg congruences at A and at M are needed; △ABM ≅ △ACM
 * (correspondence A↔A, M↔M, B↔C) yields ∠BAM = ∠CAM directly.
 *
 * WHY THE 6-VERTEX SSS ROUTE STALLS (the gap this play-test surfaces)
 * The "obvious" argument is "△ABM ≅ △ACM by SSS, hence ∠BAM = ∠CAM." But the
 * shipped/`sss_congruence` rule needs SIX DISTINCT vertices (it is built for two
 * DISJOINT triangles); these two triangles share the entire side AM, so only four
 * distinct points exist and the side cycle can never be satisfied. The companion
 * test asserts `sss_congruence.derive([...]) === []` for this configuration, and
 * that the angle-only shipped engine cannot bridge from the two `cong` facts to
 * the `eqangle` at all — exactly the gap `shared_side_congruence` closes.
 *
 * NEW RULES EXERCISED: `midpoint_congruence` (midp ⇒ cong, once) and
 * `shared_side_congruence` (the key 4-point SSS-over-a-shared-side step).
 */
import { rel } from "@/lib/freeplay/dsl";
import type { Coords } from "@/lib/freeplay/check";
import type { ResearchProblem } from "./types";

const coords: Coords = {
  A: [1, 6],
  B: [-3, 0],
  C: [5, 0],
  M: [1, 0],
};

export const shared_side_congruence_problem: ResearchProblem = {
  id: "shared_side_congruence_problem",
  source:
    "Classic Euclidean lemma (AoPS Intro to Geometry, 'Isosceles & Equilateral " +
    "Triangles' / Euclid I.5–I.8 corollary) — the median to the base of an " +
    "isosceles triangle bisects the apex angle, via SSS over the shared median",
  statement:
    "In triangle ABC with AB = AC, let M be the midpoint of BC. Prove that the " +
    "median AM bisects the apex angle: ∠BAM = ∠CAM.",
  coords,
  given: [
    // The triangle is isosceles at the apex A.
    rel("cong", ["A", "B", "A", "C"]),
    // M is the midpoint of the base BC.
    rel("midp", ["M", "B", "C"]),
  ],
  goal: rel("eqangle", ["B", "A", "M", "C", "A", "M"]),
  steps: [
    {
      // A midpoint is equidistant from the endpoints: MB = MC.
      fact: rel("cong", ["M", "B", "M", "C"]),
      premises: [rel("midp", ["M", "B", "C"])],
      expectRule: "midpoint gives equal halves",
      humanReadable: "M is the midpoint of BC, so MB = MC.",
    },
    {
      // KEY STEP: △ABM ≅ △ACM share the median AM (only 4 points A,B,C,M).
      // AB = AC at apex A, MB = MC at apex M ⇒ ∠BAM = ∠CAM.
      fact: rel("eqangle", ["B", "A", "M", "C", "A", "M"]),
      premises: [
        rel("cong", ["A", "B", "A", "C"]),
        rel("cong", ["M", "B", "M", "C"]),
      ],
      expectRule: "shared-side congruent triangles",
      humanReadable:
        "Triangles ABM and ACM share the side AM; with AB = AC and MB = MC " +
        "they are congruent (SSS over the shared side), so ∠BAM = ∠CAM.",
    },
  ],
  exercises: ["midpoint_congruence", "shared_side_congruence"],
};
