/**
 * PROBLEM — the Simson–Wallace line (a collinearity stress-test).
 *
 * Source: classical theorem of William Wallace (1799), universally known as the
 *   "Simson line". It is a staple olympiad collinearity and is explicitly one of
 *   the prompt's suggested candidate configurations ("a Simson-line
 *   collinearity"). Stated as a contest problem:
 *
 * Statement:
 *   Let ABC be a triangle inscribed in a circle Γ, and let P be any point on Γ.
 *   Let D, E, F be the feet of the perpendiculars from P to the lines BC, CA, AB
 *   respectively. Prove that D, E, F are collinear (the "Simson line" of P).
 *
 * WHY THIS IS A GOOD STRESS TEST
 *   Simson is a *directed-angle* collinearity: the standard proof is pure angle
 *   chasing through the two "pedal circles" PDCE and PBDF. So it probes whether
 *   the engine's angle layer (AR) — which the project found already proves every
 *   directed-angle THEOREM — can also deliver a directed-angle COLLINEARITY.
 *
 * WHICH PROOF WE ENCODE — the two-pedal-circle angle chase.
 *   Because PD ⊥ BC and PE ⊥ CA, the right angles ∠PDC = ∠PEC = 90° are
 *   supplementary (D, E lie on opposite sides of the chord PC in every
 *   non-degenerate Simson figure — verified numerically), so P, D, C, E are
 *   concyclic. Symmetrically ∠PDB = ∠PFB = 90° give P, B, D, F concyclic. Then a
 *   directed-angle chase on the two pedal circles and the circumcircle Γ yields
 *
 *       D(DE) = D(DF)      (lines DE and DF have the SAME direction),
 *
 *   and since DE and DF share the point D, the three feet are collinear.
 *
 * HOW IT MAPS ONTO THE ENGINE
 *   step 1  aval ∠(P,D,C) = 180 − ∠(P,E,C)      "algebraic angle-chase"
 *             cited: perp(P,D,B,C), coll(B,D,C), perp(P,E,C,A), coll(C,E,A)
 *             (PD⊥BC with D on BC ⇒ ∠PDC = 90°; PE⊥CA with E on CA ⇒ ∠PEC = 90°;
 *              90 = 180 − 90 — supplementary, the form `converse_inscribed`
 *              consumes for an opposite-side concyclicity.)
 *   step 2  cyclic(P,C,D,E)                       `converse of inscribed angle`
 *   step 3  aval ∠(P,D,B) = 180 − ∠(P,F,B)        "algebraic angle-chase"
 *             cited: perp(P,D,B,C), coll(B,D,C), perp(P,F,A,B), coll(A,F,B)
 *   step 4  cyclic(P,B,D,F)                        `converse of inscribed angle`
 *   step 5  para(D,E,D,F)                          "algebraic angle-chase"
 *             cited: cyclic(P,C,D,E), cyclic(P,B,D,F), cyclic(A,B,C,P),
 *                    coll(C,E,A), coll(A,F,B)
 *             The crux directed-angle identity D(DE) = D(DF). Because DE and DF
 *             share the vertex D, this `para` IS logically the collinearity of
 *             D, E, F — the engine reaches the full angle content of the theorem.
 *   step 6  coll(D,E,F)                          `coincident direction ⇒ collinear`
 *             cited: para(D,E,D,F)
 *             The bridge that closes the proof end-to-end (see below).
 *
 * THE GAP — NOW CLOSED (step 6, `coincident_direction_collinear`)
 *   We have proven `para(D,E,D,F)` — i.e. lines DE and DF coincide (same
 *   direction through the common point D) — which is logically EQUIVALENT to
 *   `coll(D,E,F)`. Previously the engine could not emit `coll(D,E,F)`:
 *     • AR (`ar.ts`) is the only thing that can chase the directed angles to this
 *       point, but its `equation()` returns `null` for a `coll` candidate — AR
 *       *consumes* collinearity (to merge line directions) and never *produces*
 *       it. So `AngleAR.implies(coll(...))` is hard-wired to be false.
 *     • The ONLY shipped/research rules that emit a `coll` fact are the
 *       projective-incidence rules `pappus` (shipped) and `pascal` (research).
 *       Neither applies here: the three feet are not six concyclic points
 *       (Pascal), and the three given lines BC, CA, AB pairwise share a vertex,
 *       so no two of them have the six distinct points Pappus needs.
 *   The single missing capability was a "coincident-direction ⇒ collinear"
 *   bridge: a rule turning `para(X,A,X,B)` (two segments from a shared point X
 *   that are parallel) into `coll(X,A,B)`. That rule now exists
 *   (`rules/coincident_direction_collinear.ts`): two parallel lines through a
 *   common point are the same line, so the three points are collinear (sound,
 *   coordinate-guarded). Step 6 cites exactly `para(D,E,D,F)` and the chain
 *   reaches `coll(D,E,F)` end-to-end. The companion test replays all six steps
 *   with the bridge rule included and asserts `goalReached === true` and
 *   `allValid === true`.
 *
 * COORDINATES — a faithful generic realization built by construction (not pasted
 *   decimals): Γ is the unit circle; A, B, C at 20°, 120°, 245° (scalene, acute:
 *   ∠A ≈ 62.5°, ∠B ≈ 67.5°, ∠C ≈ 50°); P at 160° on arc BC, comfortably away from
 *   every vertex's antipode so no foot degenerates onto a vertex; D, E, F are the
 *   feet of the perpendiculars from P to BC, CA, AB. Every given and step fact is
 *   checked numerically in the test.
 */
import type { Coords } from "@/lib/freeplay/check";
import type { V } from "@/lib/freeplay/geom";
import { aval, rel } from "@/lib/freeplay/dsl";
import { parseForm } from "@/lib/freeplay/form";
import type { ResearchProblem } from "./types";

// ---- construction helpers (plain geometry, faithful to the statement) --------

const deg = (d: number): number => (d * Math.PI) / 180;
const onCircle = (d: number): V => [Math.cos(deg(d)), Math.sin(deg(d))];
const sub = (p: V, q: V): V => [p[0] - q[0], p[1] - q[1]];
const add = (p: V, q: V): V => [p[0] + q[0], p[1] + q[1]];
const mul = (p: V, s: number): V => [p[0] * s, p[1] * s];
const dot = (p: V, q: V): number => p[0] * q[0] + p[1] * q[1];

/** Foot of the perpendicular from P onto line UV. */
function foot(P: V, U: V, W: V): V {
  const d = sub(W, U);
  const t = dot(sub(P, U), d) / dot(d, d);
  return add(U, mul(d, t));
}

const A = onCircle(20);
const B = onCircle(120);
const C = onCircle(245);
const P = onCircle(160);
const D = foot(P, B, C); // foot from P to BC
const E = foot(P, C, A); // foot from P to CA
const F = foot(P, A, B); // foot from P to AB

const coords: Coords = { A, B, C, P, D, E, F };

// ---- givens / goal / proof --------------------------------------------------

const given = [
  rel("cyclic", ["A", "B", "C", "P"]), // P on the circumcircle Γ
  rel("coll", ["B", "D", "C"]), // D on line BC
  rel("coll", ["C", "E", "A"]), // E on line CA
  rel("coll", ["A", "F", "B"]), // F on line AB
  rel("perp", ["P", "D", "B", "C"]), // PD ⊥ BC
  rel("perp", ["P", "E", "C", "A"]), // PE ⊥ CA
  rel("perp", ["P", "F", "A", "B"]), // PF ⊥ AB
];

const avalPDC = aval(["P", "D", "C"], parseForm("180 - angle(P,E,C)")); // ∠PDC = 180 − ∠PEC
const cycPCDE = rel("cyclic", ["P", "C", "D", "E"]); // pedal circle on diameter PC
const avalPDB = aval(["P", "D", "B"], parseForm("180 - angle(P,F,B)")); // ∠PDB = 180 − ∠PFB
const cycPBDF = rel("cyclic", ["P", "B", "D", "F"]); // pedal circle on diameter PB
const paraDEDF = rel("para", ["D", "E", "D", "F"]); // D(DE) = D(DF): the angle content
const goal = rel("coll", ["D", "E", "F"]); // the Simson line

export const simson_line: ResearchProblem = {
  id: "simson_line",
  source:
    "Simson–Wallace line (William Wallace, 1799) — classical olympiad collinearity.",
  statement:
    "Let ABC be a triangle inscribed in circle Γ and P a point on Γ. Let D, E, F " +
    "be the feet of the perpendiculars from P to lines BC, CA, AB. Prove that " +
    "D, E, F are collinear (the Simson line of P).",
  coords,
  given,
  goal,
  steps: [
    {
      fact: avalPDC,
      premises: [
        rel("perp", ["P", "D", "B", "C"]),
        rel("coll", ["B", "D", "C"]),
        rel("perp", ["P", "E", "C", "A"]),
        rel("coll", ["C", "E", "A"]),
      ],
      expectRule: "algebraic angle-chase",
      humanReadable:
        "PD ⊥ BC with D on BC gives ∠PDC = 90°; PE ⊥ CA with E on CA gives " +
        "∠PEC = 90°. Hence ∠PDC = 180° − ∠PEC (supplementary right angles).",
    },
    {
      fact: cycPCDE,
      premises: [avalPDC],
      expectRule: "converse of inscribed angle",
      humanReadable:
        "∠PDC and ∠PEC subtend the same segment PC and are supplementary, so " +
        "P, C, D, E are concyclic (pedal circle on diameter PC).",
    },
    {
      fact: avalPDB,
      premises: [
        rel("perp", ["P", "D", "B", "C"]),
        rel("coll", ["B", "D", "C"]),
        rel("perp", ["P", "F", "A", "B"]),
        rel("coll", ["A", "F", "B"]),
      ],
      expectRule: "algebraic angle-chase",
      humanReadable:
        "Mirror of step 1 on the B-side: ∠PDB = 90° and ∠PFB = 90°, so " +
        "∠PDB = 180° − ∠PFB.",
    },
    {
      fact: cycPBDF,
      premises: [avalPDB],
      expectRule: "converse of inscribed angle",
      humanReadable:
        "∠PDB and ∠PFB subtend PB and are supplementary, so P, B, D, F are " +
        "concyclic (pedal circle on diameter PB).",
    },
    {
      fact: paraDEDF,
      premises: [
        cycPCDE,
        cycPBDF,
        rel("cyclic", ["A", "B", "C", "P"]),
        rel("coll", ["C", "E", "A"]),
        rel("coll", ["A", "F", "B"]),
      ],
      expectRule: "algebraic angle-chase",
      humanReadable:
        "Directed-angle chase on the two pedal circles and Γ: ∠EDC = ∠EPC and " +
        "∠FDB = ∠FPB, while ∠EPC − ∠FPB = ∠BPC − (…) reduces (via ∠BPC = ∠BAC on " +
        "Γ) to D(DE) = D(DF). As DE and DF share D, this is the collinearity " +
        "in directed-angle form.",
    },
    {
      // CLOSING STEP — the bridge that was the gap. D(DE) = D(DF) is proven
      // (step 5), i.e. lines DE and DF coincide; since they share the point D,
      // the `coincident_direction_collinear` rule packages this single `para`
      // into the projective-incidence fact coll(D,E,F). Cite ONLY para(D,E,D,F):
      // the cyclic facts are no longer needed (and citing them would be
      // extraneous), because the collinearity now follows from the parallelism
      // alone.
      fact: goal,
      premises: [paraDEDF],
      expectRule: "coincident direction ⇒ collinear",
      humanReadable:
        "lines DE and DF coincide (proven via para(D,E,D,F)) and share the " +
        "point D, so D, E, F are collinear — the Simson line. The " +
        "`coincident direction ⇒ collinear` bridge turns the parallelism into " +
        "the coll fact AR could never emit.",
    },
  ],
  exercises: ["coincident_direction_collinear"],
};
