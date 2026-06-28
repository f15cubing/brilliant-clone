import { COLORS, polygon, segment } from "@/lib/content/boards";
import type { BoardElementDef } from "@/lib/geometry/board-types";
import type { Coords } from "@/lib/freeplay/check";
import { rel } from "@/lib/freeplay/dsl";
import { eqratio } from "@/lib/freeplay/lengths/dsl";
import {
  add,
  circumcenter,
  dist,
  lineCircleIntersect,
  pointOnCircleAtAngle,
  sameSideOfLine,
  sub,
  unit,
  type V,
} from "@/lib/freeplay/geom";
import type { Puzzle, Realization } from "@/lib/freeplay/types";

/**
 * IMO Shortlist 2024 G5 (proposed by Uzbekistan) — difficulty "challenge".
 *
 * Let ABC be a triangle with incentre I, and let Ω be the circumcircle of
 * triangle BIC. Let K be a point in the interior of segment BC such that
 * ∠BAK < ∠KAC. The angle bisector of ∠BKA meets Ω at W and X (A and W on the
 * same side of BC); the angle bisector of ∠CKA meets Ω at Y and Z (A and Y on
 * the same side of BC). Prove that ∠WAY = ∠ZAX.
 *
 * Auxiliary point used by the official Solution 1: P = the second intersection
 * of line AK with Γ = circle ABC.
 *
 * SEE the long block comment at the bottom for the verified machine-checkable
 * core (power of a point) and the precise ENGINE GAP that stops the chain short
 * of the goal (this puzzle ships with `solutionReachesGoal: false`).
 */

/**
 * Build the whole G5 configuration from a triangle ABC.
 *
 *   I  = incenter of ABC
 *   Γ  = circumcircle of ABC (centre O), Ω = circumcircle of BIC (centre M)
 *   K  = a point on BC strictly between B and the foot of the A-bisector, so
 *        ∠BAK < ∠KAC (the problem's configuration condition)
 *   W,X = bisector of ∠BKA ∩ Ω  (W on A's side of BC, X on the other)
 *   Y,Z = bisector of ∠CKA ∩ Ω  (Y on A's side of BC, Z on the other)
 *   P  = second intersection of line AK with Γ
 *
 * Throws on a degenerate sample so the multi-case sampler resamples.
 */
function build(A: V, B: V, C: V): Coords {
  // Incenter: the side-length-weighted average of the vertices.
  const a = dist(B, C);
  const b = dist(C, A);
  const c = dist(A, B);
  const s = a + b + c;
  const I: V = [
    (a * A[0] + b * B[0] + c * C[0]) / s,
    (a * A[1] + b * B[1] + c * C[1]) / s,
  ];

  const O = circumcenter(A, B, C);
  if (!O) throw new Error("degenerate triangle ABC");
  const R = dist(O, A);

  const M = circumcenter(B, I, C); // centre of Ω = circle BIC
  if (!M) throw new Error("degenerate triangle BIC");
  const rOmega = dist(M, B);

  // K on segment BC, between B and the A-bisector foot (parameter c/(b+c) from
  // B); halving keeps K strictly inside that sub-segment ⇒ ∠BAK < ∠KAC.
  const tK = 0.5 * (c / (b + c));
  const K: V = [B[0] + tK * (C[0] - B[0]), B[1] + tK * (C[1] - B[1])];

  const uKA = unit(sub(A, K));
  const uKB = unit(sub(B, K));
  const uKC = unit(sub(C, K));
  if (!uKA || !uKB || !uKC) throw new Error("K coincides with a vertex");

  // Internal bisector of ∠BKA: a line through K in direction uKB + uKA.
  const wHits = lineCircleIntersect(K, add(K, add(uKB, uKA)), M, rOmega);
  // Internal bisector of ∠CKA: a line through K in direction uKC + uKA.
  const yHits = lineCircleIntersect(K, add(K, add(uKC, uKA)), M, rOmega);
  if (wHits.length < 2 || yHits.length < 2) {
    throw new Error("a bisector misses Ω (degenerate)");
  }

  // Of each chord's two endpoints, the one on A's side of BC is W / Y.
  const onAside = (p: V) => sameSideOfLine(B, C, A, p);
  const [W, X] = onAside(wHits[0]) ? [wHits[0], wHits[1]] : [wHits[1], wHits[0]];
  const [Y, Z] = onAside(yHits[0]) ? [yHits[0], yHits[1]] : [yHits[1], yHits[0]];

  // P = the second meeting of line AK with Γ (A is the first; pick the far one).
  const apHits = lineCircleIntersect(A, K, O, R);
  if (apHits.length < 2) throw new Error("line AK misses Γ (degenerate)");
  const P = dist(apHits[0], A) > dist(apHits[1], A) ? apHits[0] : apHits[1];

  return { A, B, C, I, K, W, X, Y, Z, P };
}

// ---- canonical fixed figure (realization 0) ---------------------------------

const O0: V = [0, 0];
const R0 = 4;
const coords: Coords = build(
  pointOnCircleAtAngle(O0, R0, 95),
  pointOnCircleAtAngle(O0, R0, 202),
  pointOnCircleAtAngle(O0, R0, 340),
);

/**
 * Generic realization: a random acute, scalene triangle ABC on a circle (centre
 * Oc, radius r), then the whole G5 configuration derived from it. Every given is
 * a genuine incidence / bisector / incenter fact that holds BY CONSTRUCTION.
 * Free: A, B, C (every other point is dependent).
 */
function construct(rng: () => number): Realization {
  const rnd = (lo: number, hi: number) => lo + (hi - lo) * rng();
  const Oc: V = [rnd(-1, 1), rnd(-1, 1)];
  const r = rnd(3.5, 5);
  const A = pointOnCircleAtAngle(Oc, r, rnd(80, 105));
  const B = pointOnCircleAtAngle(Oc, r, rnd(195, 222));
  const C = pointOnCircleAtAngle(Oc, r, rnd(318, 345));
  return { coords: build(A, B, C) };
}

/** Movable form: rebuild the whole G5 configuration from the dragged triangle. */
function constructFrom(free: Coords): Realization {
  return { coords: build(free.A, free.B, free.C) };
}

// ---- givens (all true BY CONSTRUCTION) --------------------------------------

// I is the incenter: AI, BI, CI bisect the angles at A, B, C.
const biA = rel("eqangle", ["B", "A", "I", "I", "A", "C"]); // ∠BAI = ∠IAC
const biB = rel("eqangle", ["A", "B", "I", "I", "B", "C"]); // ∠ABI = ∠IBC
const biC = rel("eqangle", ["B", "C", "I", "I", "C", "A"]); // ∠BCI = ∠ICA

// W, X, Y, Z lie on Ω = circle BIC.
const cycW = rel("cyclic", ["B", "I", "C", "W"]);
const cycX = rel("cyclic", ["B", "I", "C", "X"]);
const cycY = rel("cyclic", ["B", "I", "C", "Y"]);
const cycZ = rel("cyclic", ["B", "I", "C", "Z"]);

const collBKC = rel("coll", ["B", "K", "C"]); // K interior to BC
const collWKX = rel("coll", ["W", "K", "X"]); // bisector of ∠BKA through K
const collYKZ = rel("coll", ["Y", "K", "Z"]); // bisector of ∠CKA through K
const biK_BKA = rel("eqangle", ["B", "K", "W", "W", "K", "A"]); // KW bisects ∠BKA
const biK_CKA = rel("eqangle", ["C", "K", "Y", "Y", "K", "A"]); // KY bisects ∠CKA

const collAKP = rel("coll", ["A", "K", "P"]); // P on line AK
const cycABCP = rel("cyclic", ["A", "B", "C", "P"]); // P on Γ = circle ABC

// ---- goal -------------------------------------------------------------------

const goal = rel("eqangle", ["W", "A", "Y", "Z", "A", "X"]); // ∠WAY = ∠ZAX

// ---- verified intermediate facts (power of a point) -------------------------

const cycBCYZ = rel("cyclic", ["B", "C", "Y", "Z"]); // B,C,Y,Z on Ω
const cycBCWX = rel("cyclic", ["B", "C", "W", "X"]); // B,C,W,X on Ω

// Power of K: KB·KC = KA·KP (in Γ), = KY·KZ and = KW·KX (in Ω).
const popGamma = eqratio("K", "A", "K", "B", "K", "C", "K", "P"); // KA·KP = KB·KC
const popYZ = eqratio("K", "B", "K", "Y", "K", "Z", "K", "C"); // KB·KC = KY·KZ
const popWX = eqratio("K", "B", "K", "W", "K", "X", "K", "C"); // KB·KC = KW·KX
const powerYZ = eqratio("K", "A", "K", "Y", "K", "Z", "K", "P"); // KA·KP = KY·KZ
const powerWX = eqratio("K", "A", "K", "W", "K", "X", "K", "P"); // KA·KP = KW·KX

// P lies on circle AYZ — the converse power of a point applied to step 6's
// equal power KA·KP = KY·KZ with the two chords AP, YZ crossing at K.
const cycAYPZ = rel("cyclic", ["A", "Y", "P", "Z"]);

const circumGamma: BoardElementDef = {
  type: "circumcircle",
  parents: [{ ref: "A" }, { ref: "B" }, { ref: "C" }],
  attributes: { strokeColor: COLORS.ACCENT, strokeWidth: 1.4, dash: 2, point: { visible: false } },
};
const circumOmega: BoardElementDef = {
  type: "circumcircle",
  parents: [{ ref: "B" }, { ref: "I" }, { ref: "C" }],
  attributes: { strokeColor: COLORS.BRAND, strokeWidth: 1.4, point: { visible: false } },
};

export const imo_shortlist_2024_g5: Puzzle = {
  id: "imo-shortlist-2024-g5",
  title: "IMO Shortlist 2024 G5: ∠WAY = ∠ZAX",
  blurb:
    "IMO Shortlist 2024, Geometry G5 (proposed by Uzbekistan). Let ABC be a " +
    "triangle with incentre I and let Ω be the circumcircle of BIC. K is interior " +
    "to BC with ∠BAK < ∠KAC. The bisector of ∠BKA meets Ω at W, X (A, W same side " +
    "of BC) and the bisector of ∠CKA meets Ω at Y, Z (A, Y same side). Prove " +
    "∠WAY = ∠ZAX. (Auxiliary: P = AK ∩ circle ABC.)",
  difficulty: "challenge",
  coords,
  construct,
  constructFrom,
  freePoints: ["A", "B", "C"],
  figure: [
    circumGamma,
    circumOmega,
    polygon(["A", "B", "C"]),
    segment("A", "K", { strokeColor: COLORS.WRONG, strokeWidth: 1, dash: 2 }),
    segment("A", "P", { strokeColor: COLORS.WRONG, strokeWidth: 1, dash: 2 }),
    segment("A", "I", { strokeColor: COLORS.OK, strokeWidth: 1, dash: 2 }),
    segment("W", "X", { strokeColor: COLORS.BRAND, strokeWidth: 1 }),
    segment("Y", "Z", { strokeColor: COLORS.BRAND, strokeWidth: 1 }),
    // GOAL elements: the two equal angles ∠WAY and ∠ZAX at A.
    segment("A", "W", { strokeColor: COLORS.OK, strokeWidth: 2.5 }),
    segment("A", "Y", { strokeColor: COLORS.OK, strokeWidth: 2.5 }),
    segment("A", "Z", { strokeColor: COLORS.ACCENT, strokeWidth: 2.5 }),
    segment("A", "X", { strokeColor: COLORS.ACCENT, strokeWidth: 2.5 }),
  ],
  given: [
    biA,
    biB,
    biC,
    cycW,
    cycX,
    cycY,
    cycZ,
    collBKC,
    collWKX,
    collYKZ,
    biK_BKA,
    biK_CKA,
    collAKP,
    cycABCP,
  ],
  goal,
  solution: [
    {
      fact: cycBCYZ,
      rule: "same circle (3 shared points)",
      premises: [cycY, cycZ],
      humanReadable:
        "B, C, Y, Z are concyclic: Y and Z both lie on Ω = circle BIC, which is " +
        "pinned by the non-collinear triple B, I, C, so B, C, Y, Z share that circle.",
    },
    {
      fact: cycBCWX,
      rule: "same circle (3 shared points)",
      premises: [cycW, cycX],
      humanReadable:
        "B, C, W, X are concyclic: W and X both lie on Ω = circle BIC (pinned by " +
        "B, I, C), so B, C, W, X share that circle.",
    },
    {
      fact: popGamma,
      rule: "power of a point",
      premises: [cycABCP, collBKC, collAKP],
      humanReadable:
        "Power of K in Γ: chords BC and AP cross at K, so KA·KP = KB·KC.",
    },
    {
      fact: popYZ,
      rule: "power of a point",
      premises: [cycBCYZ, collBKC, collYKZ],
      humanReadable:
        "Power of K in Ω: chords BC and YZ cross at K, so KB·KC = KY·KZ.",
    },
    {
      fact: popWX,
      rule: "power of a point",
      premises: [cycBCWX, collBKC, collWKX],
      humanReadable:
        "Power of K in Ω: chords BC and WX cross at K, so KB·KC = KW·KX.",
    },
    {
      fact: powerYZ,
      rule: "algebraic length-chase",
      premises: [popGamma, popYZ],
      humanReadable:
        "KA·KP = KY·KZ, combining the two powers of K through KB·KC. This is the " +
        "equal-power condition that places P on circle AYZ.",
    },
    {
      fact: powerWX,
      rule: "algebraic length-chase",
      premises: [popGamma, popWX],
      humanReadable:
        "KA·KP = KW·KX, the mirror equal-power condition that places P on circle AWX.",
    },
    {
      fact: cycAYPZ,
      rule: "converse power of a point",
      premises: [powerYZ, collAKP, collYKZ],
      humanReadable:
        "P lies on circle AYZ: lines AP and YZ meet at K with KA·KP = KY·KZ " +
        "(step 6) and K is interior to both chords, so by the CONVERSE of the " +
        "power of a point, A, Y, P, Z are concyclic.",
    },
  ],
  solutionReachesGoal: false,
};

/**
 * VERIFIED CORE (all eight steps replay green through the shipped verifier across
 * 6 independent realizations ONCE `converse_power_of_a_point` is registered in the
 * length `RATIO_RULES` — see the test):
 *
 *   1. cyclic(B,C,Y,Z)              same circle (3 shared points)   [from cycY, cycZ]
 *   2. cyclic(B,C,W,X)              same circle (3 shared points)   [from cycW, cycX]
 *   3. KA·KP = KB·KC               power of a point (in Γ)          [cycABCP, collBKC, collAKP]
 *   4. KB·KC = KY·KZ               power of a point (in Ω)          [cycBCYZ, collBKC, collYKZ]
 *   5. KB·KC = KW·KX               power of a point (in Ω)          [cycBCWX, collBKC, collWKX]
 *   6. KA·KP = KY·KZ               algebraic length-chase           [popGamma, popYZ]
 *   7. KA·KP = KW·KX               algebraic length-chase           [popGamma, popWX]
 *   8. cyclic(A,Y,P,Z)             converse power of a point        [powerYZ, collAKP, collYKZ]
 *
 * Steps 6–8 are exactly the official Solution 1's opening line:
 *   "By power of a point from K to Γ and Ω, KA·KP = KB·KC = KY·KZ, so P lies on ω."
 *
 * ENGINE GAP #1 — NOW CLOSED: cyclic(A,Y,P,Z) ("P lies on circle AYZ").
 *   Geometrically this is the CONVERSE of the power of a point: lines AP and YZ
 *   meet at K with KA·KP = KY·KZ (step 6), therefore A, Y, P, Z are concyclic.
 *   The shipped engine has every FORWARD power-of-a-point rule (cyclic + 2 colls
 *   ⇒ eqratio); the missing converse is supplied by the new LENGTH rule
 *   `converse_power_of_a_point` (eqratio + 2 colls ⇒ cyclic), which reads the
 *   equal-power ratio from `ctx.citedRatios` and guards the intersecting-chords /
 *   two-secants SIGN so the unsound mixed configuration is rejected. The
 *   directed-angle converse (`concyclic_from_directed_angles`) cannot help here —
 *   A, P are on opposite sides of line YZ, and Y, Z on opposite sides of line AP,
 *   so the needed inscribed-angle equality is the opposite-side (directed) form
 *   and is not entailed by any cited angle fact — which is exactly why a length
 *   rule is required. Mirror application gives cyclic(A,W,P,X). (This step is
 *   verified once the orchestrator appends the rule to `RATIO_RULES`; the shipped
 *   `verify()` already threads `ctx.citedRatios`.)
 *
 * ENGINE GAP #2 — REMAINING (DEEPER) STEP (even granting the concyclicity): ∠ZAK = ∠IAY (and
 *   the mirror ∠WAK = ∠IAX). Solution 1 proves it with the circle CENTRES O, M, S
 *   of Γ, Ω, ω and the central-angle identity ∠PAN = ½∠PSN = ½∠PSM = ½∠PAM (AN
 *   the bisector of ∠ZAY meeting ω again at N). AngleAR is directed-angles only —
 *   it has no notion of a circle's centre and no "central angle = twice inscribed"
 *   relation — so this step is unreachable. The test confirms ∠ZAK = ∠IAY is
 *   `unjustified` even with cyclic(A,Y,P,Z) granted.
 *
 *   MISSING CAPABILITY (candidate DDAR rule) — "central angle = 2× inscribed":
 *     consume  cyclic(P1,P2,P3,P4)         (four concyclic points)
 *              a centre witness for that circle (e.g. cong(O,P1,O,P2), cong(O,P2,O,P3))
 *     produce  aval([Pi,O,Pj], 2·∠(Pi Pk Pj))  — the central angle is twice the
 *              inscribed angle subtending the same chord PiPj from apex Pk.
 *
 * REDUCTION IS in-engine: granting the two key equalities, the goal
 * ∠WAY = ∠ZAX follows by a single directed-angle chase ("algebraic angle-chase"),
 *   ∠WAY = ∠WAK + ∠KAI + ∠IAY = ∠IAX + ∠KAI + ∠ZAK = ∠ZAX,
 * as the test's final case verifies. So the gap is isolated to exactly the two
 * central-angle equalities (and the converse-power-of-a-point concyclicity they
 * build on).
 */
