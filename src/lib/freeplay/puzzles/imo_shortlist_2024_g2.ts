import { circle, COLORS, polygon, segment } from "@/lib/content/boards";
import type { Coords } from "@/lib/freeplay/check";
import { aval, rel } from "@/lib/freeplay/dsl";
import { parseForm } from "@/lib/freeplay/form";
import {
  add,
  circumcenter,
  dist,
  foot,
  lineCircleIntersect,
  lineIntersect,
  midpoint,
  reflectPoint,
  sub,
  type V,
} from "@/lib/freeplay/geom";
import type { BoardElementDef, BoardRefs } from "@/lib/geometry/board-types";
import type { Puzzle, Realization } from "@/lib/freeplay/types";

/**
 * IMO Shortlist 2024 G2 (proposed by Poland) — difficulty "challenge".
 *
 * Let ABC be a triangle with AB < AC < BC, incentre I and incircle ω. Let X be
 * the interior point of BC such that the line through X parallel to AC is tangent
 * to ω; similarly Y the interior point of BC such that the line through Y parallel
 * to AB is tangent to ω. Let AI meet the circumcircle of ABC again at P ≠ A, and
 * let K, L be the midpoints of AB, AC. Prove that ∠KIL + ∠YPX = 180°.
 *
 * ENCODED PROOF — official Solution 1 (an angle chase around the reflection of A
 * in I). Let A2 be the reflection of A in I, so I is the midpoint of A A2 and A2
 * lies on line AI (= line AP). Reflecting the tangents AC, AB of ω in its centre
 * I sends them to the parallel tangents through A2, which meet BC at X, Y — i.e.
 * A2X ∥ AC and A2Y ∥ AB (carried here as the by-construction `para` givens).
 *
 *   1. KI ∥ B A2          midsegment of △AB A2  (K, I midpoints of AB, A A2)
 *   2. IL ∥ A2 C          midsegment of △AC A2  (L, I midpoints of AC, A A2)
 *   3. ∠KIL = ∠B A2 C     equal angles between respectively parallel arms
 *   4. B,P,A2,X concyclic ∠(P A2,PB) = ∠(X A2,XB): inscribed ∠APB = ∠ACB and
 *                         A2X ∥ AC give equal directed angles on chord A2B
 *   5. C,Y,A2,P concyclic mirror of step 4 with A2Y ∥ AB on chord A2C
 *   6. ∠APX = ∠A2 B C     inscribed in (B,P,A2,X), with PA along P A2 and XB along BC
 *   7. ∠APY = ∠A2 C B     inscribed in (C,Y,A2,P), with PA along P A2 and YC along CB
 *   8. ∠KIL = 180 − ∠YPX  since ∠YPX = ∠APY + ∠APX = ∠A2CB + ∠A2BC and
 *                         ∠KIL = ∠B A2 C, closing on the angle sum of △A2BC.
 *
 * STATUS — SOLVED END-TO-END against the shipped engine: steps 1–2 are the
 * `midsegment` rule, steps 4–5 are `concyclic_from_directed_angles`, and steps
 * 3, 6, 7, 8 are the algebraic directed-angle chase (AngleAR). The final step is
 * the goal, so the chain is complete.
 *
 * FAITHFUL GENERIC CONSTRUCTION: ABC is a scalene acute triangle with
 * AB < AC < BC; I is the incentre, A2 = reflection of A in I, X and Y the second
 * parallel-tangent feet on BC (built directly off A2 so the parallelisms are
 * exact), P = line AI ∩ circumcircle (≠ A), and K, L the midpoints of AB, AC.
 */

/** Build the whole figure from a triangle ABC; throws on a degenerate sample. */
function build(A: V, B: V, C: V): Coords {
  const a = dist(B, C);
  const b = dist(C, A);
  const c = dist(A, B);
  const s = a + b + c;
  // Incentre I = (a·A + b·B + c·C)/(a+b+c).
  const I: V = [
    (a * A[0] + b * B[0] + c * C[0]) / s,
    (a * A[1] + b * B[1] + c * C[1]) / s,
  ];
  // A2 = reflection of A in I (so I is the midpoint of A A2, and A2 ∈ line AI).
  const A2 = reflectPoint(A, I);
  // X, Y = where the lines through A2 parallel to AC, AB meet line BC. Built off
  // A2 so A2X ∥ AC and A2Y ∥ AB hold EXACTLY; these are the second (≠ AC, ≠ AB)
  // tangents to ω, being the reflections of AC, AB in the centre I.
  const X = lineIntersect(A2, add(A2, sub(C, A)), B, C);
  const Y = lineIntersect(A2, add(A2, sub(B, A)), B, C);
  if (!X || !Y) throw new Error("BC parallel to a tangent direction");
  // P = second intersection of line AI with the circumcircle (the arc midpoint).
  const O = circumcenter(A, B, C);
  if (!O) throw new Error("degenerate triangle");
  const R = dist(A, O);
  const hits = lineCircleIntersect(A, I, O, R);
  if (hits.length < 2) throw new Error("line AI misses the circumcircle");
  const P = dist(hits[0], A) > dist(hits[1], A) ? hits[0] : hits[1];
  const K = midpoint(A, B);
  const L = midpoint(A, C);
  return { A, B, C, I, K, L, A2, X, Y, P };
}

// ---- canonical fixed figure (realization 0) ---------------------------------

const A0: V = [1.6, 3.2];
const B0: V = [0, 0];
const C0: V = [6, 0];
const coords = build(A0, B0, C0);

/** A circle through three points, drawn with its auto-centre hidden. */
function circumcircleThrough(
  id: string,
  ids: [string, string, string],
  attrs: Record<string, unknown>,
): BoardElementDef {
  return {
    id,
    type: "circumcircle",
    parents: ids.map((p) => ({ ref: p })),
    attributes: { point: { visible: false }, ...attrs },
  };
}

/** Live incircle touch point on BC (foot of the incentre I onto line BC). */
const touchOnBC = (axis: 0 | 1) => (r: BoardRefs) =>
  foot(
    [r.I.X(), r.I.Y()] as V,
    [r.B.X(), r.B.Y()] as V,
    [r.C.X(), r.C.Y()] as V,
  )[axis];

/**
 * Generic realization: a scalene ACUTE triangle with AB < AC < BC. With B at the
 * origin and C on the positive x-axis, A is placed LEFT of BC's midpoint (forces
 * AB < AC) and its height is sampled strictly inside the band that makes ∠A acute
 * and AC < BC (∠B, ∠C are acute automatically), so every constraint holds by
 * construction. The remaining points are derived exactly by `build`. Free: A,B,C.
 */
function construct(rng: () => number): Realization {
  const rnd = (lo: number, hi: number) => lo + (hi - lo) * rng();
  const cx = rnd(6, 7.5); // BC length (the largest side)
  const ax = rnd(1.2, 2.4); // A.x < cx/2  ⇒  AB < AC
  // ay² ∈ ( ax(cx−ax) , ax(2cx−ax) ): lower ⇒ ∠A acute, upper ⇒ AC < BC.
  const lo = ax * (cx - ax);
  const hi = ax * (2 * cx - ax);
  const ay = Math.sqrt(lo + (hi - lo) * rnd(0.25, 0.7));
  const A: V = [ax, ay];
  const B: V = [0, 0];
  const C: V = [cx, 0];
  const cc = build(A, B, C);
  // Faithfulness guard: X and Y must be interior to side BC.
  const tX = cc.X[0] / cx;
  const tY = cc.Y[0] / cx;
  if (tX <= 0.02 || tX >= 0.98 || tY <= 0.02 || tY >= 0.98) {
    throw new Error("X or Y not interior to BC");
  }
  return { coords: cc };
}

/** Movable form: rebuild the incentre/tangent/midpoint configuration from ABC. */
function constructFrom(free: Coords): Realization {
  return { coords: build(free.A, free.B, free.C) };
}

// ---- givens / goal ----------------------------------------------------------

// All true BY CONSTRUCTION. The incentre/tangency origin is encoded through the
// resulting incidences (the parallel tangents through A2, the bisector line AI,
// the midpoints) rather than as tangency facts the engine cannot represent.
const cycABCP = rel("cyclic", ["A", "B", "C", "P"]); // P on the circumcircle
const collAIPA2 = rel("coll", ["A", "I", "P", "A2"]); // bisector line AI carries P and A2
const midpKAB = rel("midp", ["K", "A", "B"]); // K midpoint of AB
const midpLAC = rel("midp", ["L", "A", "C"]); // L midpoint of AC
const midpIAA2 = rel("midp", ["I", "A", "A2"]); // I midpoint of A A2 (A2 = reflection of A in I)
const paraA2XAC = rel("para", ["A2", "X", "A", "C"]); // A2X ∥ AC (the second tangent ∥ AC)
const paraA2YAB = rel("para", ["A2", "Y", "A", "B"]); // A2Y ∥ AB (the second tangent ∥ AB)
const collBXC = rel("coll", ["B", "X", "C"]); // X on side BC
const collBYC = rel("coll", ["B", "Y", "C"]); // Y on side BC

// GOAL: ∠KIL = 180 − ∠YPX, i.e. ∠KIL + ∠YPX = 180°.
const goal = aval(["K", "I", "L"], parseForm("180 - angle(Y,P,X)"));

// ---- intermediate facts -----------------------------------------------------

const paraKIBA2 = rel("para", ["K", "I", "B", "A2"]); // KI ∥ B A2
const paraLICA2 = rel("para", ["L", "I", "C", "A2"]); // IL ∥ A2 C
const eqKIL_BA2C = rel("eqangle", ["K", "I", "L", "B", "A2", "C"]); // ∠KIL = ∠B A2 C
const cycBPA2X = rel("cyclic", ["B", "P", "A2", "X"]); // B,P,A2,X concyclic
const cycCYA2P = rel("cyclic", ["C", "Y", "A2", "P"]); // C,Y,A2,P concyclic
const eqAPX_A2BC = rel("eqangle", ["A", "P", "X", "A2", "B", "C"]); // ∠APX = ∠A2 B C
const eqAPY_A2CB = rel("eqangle", ["A", "P", "Y", "A2", "C", "B"]); // ∠APY = ∠A2 C B

export const imo_shortlist_2024_g2: Puzzle = {
  id: "imo-shortlist-2024-g2",
  title: "IMO Shortlist 2024 G2: ∠KIL + ∠YPX = 180°",
  blurb:
    "IMO Shortlist 2024, Geometry G2 (proposed by Poland). Triangle ABC with " +
    "AB < AC < BC, incentre I and incircle ω. X, Y are the interior points of BC " +
    "whose parallels to AC, AB are tangent to ω; P is the second meeting of AI " +
    "with the circumcircle; K, L are the midpoints of AB, AC. Prove ∠KIL + ∠YPX " +
    "= 180°. (Auxiliary: A2 = reflection of A in I, so A2X ∥ AC and A2Y ∥ AB.)",
  difficulty: "challenge",
  coords,
  construct,
  constructFrom,
  freePoints: ["A", "B", "C"],
  figure: [
    // Circumcircle of ABC (carries P) and the incircle ω.
    circumcircleThrough("circum", ["A", "B", "C"], {
      strokeColor: COLORS.BRAND,
      strokeWidth: 1.5,
    }),
    // The incircle ω, centred at I through its (recomputed) BC touch point.
    {
      id: "Tbc",
      type: "point",
      parents: [{ fn: touchOnBC(0) }, { fn: touchOnBC(1) }],
      attributes: { name: "", size: 0.1, visible: false, fixed: true },
    },
    circle("incircle", "I", "Tbc", { strokeColor: COLORS.WRONG, strokeWidth: 1.5 }),
    polygon(["A", "B", "C"]),
    // Bisector AI extended to P and A2.
    segment("A", "P", { strokeWidth: 1, dash: 2 }),
    // The two parallel tangents through A2, meeting BC at X and Y.
    segment("A2", "X", { strokeColor: COLORS.WRONG, strokeWidth: 1.5 }),
    segment("A2", "Y", { strokeColor: COLORS.WRONG, strokeWidth: 1.5 }),
    // The two angles whose measures sum to 180°.
    segment("K", "I", { strokeColor: COLORS.OK, strokeWidth: 3 }),
    segment("I", "L", { strokeColor: COLORS.OK, strokeWidth: 3 }),
    segment("P", "X", { strokeColor: COLORS.ACCENT, strokeWidth: 3 }),
    segment("P", "Y", { strokeColor: COLORS.ACCENT, strokeWidth: 3 }),
  ],
  given: [
    cycABCP,
    collAIPA2,
    midpKAB,
    midpLAC,
    midpIAA2,
    paraA2XAC,
    paraA2YAB,
    collBXC,
    collBYC,
  ],
  goal,
  solution: [
    {
      fact: paraKIBA2,
      rule: "midsegment is parallel to the base",
      premises: [midpKAB, midpIAA2],
      humanReadable:
        "KI ∥ B A2: in triangle A B A2, K and I are the midpoints of AB and " +
        "A A2, so the midsegment KI is parallel to the third side B A2.",
    },
    {
      fact: paraLICA2,
      rule: "midsegment is parallel to the base",
      premises: [midpLAC, midpIAA2],
      humanReadable:
        "IL ∥ A2 C: in triangle A C A2, L and I are the midpoints of AC and " +
        "A A2, so the midsegment IL is parallel to the third side C A2.",
    },
    {
      fact: eqKIL_BA2C,
      rule: "algebraic angle-chase",
      premises: [paraKIBA2, paraLICA2],
      humanReadable:
        "∠KIL = ∠B A2 C: the arms IK ∥ A2B and IL ∥ A2C, so the angle at I " +
        "equals the angle at A2 between the respectively parallel lines.",
    },
    {
      fact: cycBPA2X,
      rule: "concyclic from equal directed angles",
      premises: [cycABCP, paraA2XAC, collBXC, collAIPA2],
      humanReadable:
        "B, P, A2, X are concyclic: ∠(P A2, PB) = ∠(PA, PB) = ∠(CA, CB) " +
        "(inscribed in circle ABCP, since A2 is on line PA), and A2X ∥ AC with X " +
        "on BC gives ∠(X A2, XB) = ∠(CA, CB); equal directed angles on chord A2B.",
    },
    {
      fact: cycCYA2P,
      rule: "concyclic from equal directed angles",
      premises: [cycABCP, paraA2YAB, collBYC, collAIPA2],
      humanReadable:
        "C, Y, A2, P are concyclic: the mirror of the previous step, using " +
        "A2Y ∥ AB and the inscribed angle on chord A2C of circle ABCP.",
    },
    {
      fact: eqAPX_A2BC,
      rule: "algebraic angle-chase",
      premises: [cycBPA2X],
      humanReadable:
        "∠APX = ∠A2 B C: in circle (B,P,A2,X) the inscribed angles on chord A2X " +
        "give ∠(P A2, PX) = ∠(B A2, BX); PA lies along P A2 and BX along BC.",
    },
    {
      fact: eqAPY_A2CB,
      rule: "algebraic angle-chase",
      premises: [cycCYA2P],
      humanReadable:
        "∠APY = ∠A2 C B: in circle (C,Y,A2,P) the inscribed angles on chord A2Y " +
        "give ∠(P A2, PY) = ∠(C A2, CY); PA lies along P A2 and CY along CB.",
    },
    {
      fact: goal,
      rule: "algebraic angle-chase",
      premises: [eqKIL_BA2C, eqAPX_A2BC, eqAPY_A2CB],
      humanReadable:
        "∠KIL + ∠YPX = 180°: ray PA splits ∠YPX into ∠APY + ∠APX = ∠A2CB + " +
        "∠A2BC, and ∠KIL = ∠B A2 C, so the sum is the angle sum of triangle A2BC.",
    },
  ],
};
