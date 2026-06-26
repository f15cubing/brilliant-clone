/**
 * PROBLEM — Squares on two sides of a triangle (BG = CE).
 *
 * Source: classical configuration (Coxeter & Greitzer, "Geometry Revisited";
 *   a standard olympiad lemma — the equal-and-perpendicular segments of the
 *   externally erected squares). NOT a single literal contest; included for the
 *   clean spiral-congruence it exercises.
 *
 * Statement:
 *   On the sides AB and AC of triangle ABC, squares ABDE and ACFG are erected
 *   externally (so that AE = AB and AG = AC, with ∠EAB = ∠GAC = 90°). Prove that
 *   BG = CE.
 *
 * WHICH PROOF WE ENCODE — the spiral/SAS congruence about the shared apex A:
 *
 *   1.  ∠BAG = ∠EAC.
 *         ∠BAG = ∠BAC + ∠CAG = ∠BAC + 90° and ∠EAC = ∠EAB + ∠BAC = 90° + ∠BAC,
 *         using the two square right angles ∠GAC = ∠EAB = 90°.
 *   2.  BG = CE.
 *         Triangles ABG and AEC share the vertex A with AB = AE, AG = AC and the
 *         included angles ∠BAG = ∠EAC equal, so they are congruent (SAS about the
 *         common vertex A) and the corresponding sides BG and EC are equal.
 *
 * HOW IT MAPS ONTO THE ENGINE
 *   step 1  eqangle(B,A,G, E,A,C)  "algebraic angle-chase"   [perp(E,A,A,B), perp(G,A,A,C)]
 *   step 2  cong(B,G,C,E)          "SAS about a common vertex"
 *               [cong(A,B,A,E), cong(A,C,A,G), eqangle(B,A,G,E,A,C)]
 *
 * Every step is replay-verified through the research harness; in step 1 both
 * perpendiculars are load-bearing and in step 2 all three premises are. The only
 * non-AR rule is the shipped `sas_shared_vertex` (step 2); the equal-angle setup
 * is the directed-angle table (step 1).
 *
 * COORDINATES — a scalene triangle A = (0,0), B = (4,0), C = (1,3). The square on
 * AB is built on the far side from C (E = A + R₋₉₀(B−A), D = B + R₋₉₀(B−A)); the
 * square on AC on the far side from B (G = A + R₊₉₀(C−A), F = C + R₊₉₀(C−A)).
 * Every given and step fact is checked numerically in the test.
 */
import type { Coords } from "@/lib/freeplay/check";
import type { V } from "@/lib/freeplay/geom";
import { rel } from "@/lib/freeplay/dsl";
import type { ResearchProblem } from "./types";

const sub = (p: V, q: V): V => [p[0] - q[0], p[1] - q[1]];
const add = (p: V, q: V): V => [p[0] + q[0], p[1] + q[1]];
const rot = (v: V, deg: number): V => {
  const r = (deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c];
};

const A: V = [0, 0];
const B: V = [4, 0];
const C: V = [1, 3];
const E = add(A, rot(sub(B, A), -90)); // square ABDE: AE = AB, external (away from C)
const D = add(B, rot(sub(B, A), -90));
const G = add(A, rot(sub(C, A), 90)); // square ACFG: AG = AC, external (away from B)
const F = add(C, rot(sub(C, A), 90));

const coords: Coords = { A, B, C, D, E, F, G };

const given = [
  rel("cong", ["A", "B", "A", "E"]), // square ABDE side: AB = AE
  rel("cong", ["A", "C", "A", "G"]), // square ACFG side: AC = AG
  rel("perp", ["E", "A", "A", "B"]), // ∠EAB = 90°
  rel("perp", ["G", "A", "A", "C"]), // ∠GAC = 90°
];

const eqBAG_EAC = rel("eqangle", ["B", "A", "G", "E", "A", "C"]); // ∠BAG = ∠EAC
const goal = rel("cong", ["B", "G", "C", "E"]); // BG = CE

export const squares_on_two_sides: ResearchProblem = {
  id: "squares_on_two_sides",
  source: "Classical — squares erected on two sides of a triangle (Coxeter & Greitzer, Geometry Revisited)",
  statement:
    "Squares ABDE and ACFG are erected externally on sides AB and AC of triangle " +
    "ABC (so AE = AB, AG = AC, ∠EAB = ∠GAC = 90°). Prove BG = CE.",
  coords,
  given,
  goal,
  steps: [
    {
      fact: eqBAG_EAC,
      premises: [rel("perp", ["E", "A", "A", "B"]), rel("perp", ["G", "A", "A", "C"])],
      expectRule: "algebraic angle-chase",
      humanReadable:
        "∠BAG = ∠EAC: both equal ∠BAC + 90°, since the squares give the right " +
        "angles ∠GAC = ∠EAB = 90°.",
    },
    {
      fact: goal,
      premises: [
        rel("cong", ["A", "B", "A", "E"]),
        rel("cong", ["A", "C", "A", "G"]),
        eqBAG_EAC,
      ],
      expectRule: "SAS about a common vertex",
      humanReadable:
        "BG = CE: triangles ABG and AEC share vertex A with AB = AE, AG = AC and " +
        "∠BAG = ∠EAC, so they are congruent (SAS) and BG = EC.",
    },
  ],
  exercises: [],
};
