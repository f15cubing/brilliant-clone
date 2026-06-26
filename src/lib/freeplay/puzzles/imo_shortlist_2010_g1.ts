import { circle, COLORS, fixedPoint, polygon, segment } from "@/lib/content/boards";
import { rel } from "@/lib/freeplay/dsl";
import type { V } from "@/lib/freeplay/geom";
import type { Puzzle } from "@/lib/freeplay/types";

/**
 * IMO Shortlist 2010 G1 (proposed by the United Kingdom) — difficulty
 * "challenge".
 *
 * Let ABC be an acute triangle with D, E, F the feet of the altitudes on BC,
 * CA, AB. P is an intersection of line EF with the circumcircle, and Q = BP ∩ DF.
 * Prove AP = AQ.
 *
 * We encode the official Solution 1 (the AQPF cyclic-quadrilateral angle
 * chase): the only non-AR steps are the shipped `converse_inscribed` (step 4)
 * and `isosceles` (step 7); the rest is the directed-angle table.
 *
 * Faithful generic construction: the circumcircle is the unit circle about O
 * with A, B, C at 110°, 205°, 340° (acute, scalene). D, E, F are the altitude
 * feet; P = line EF ∩ circumcircle (Solution 1's Case 1); Q = BP ∩ DF.
 */
const deg = (d: number): number => (d * Math.PI) / 180;
const onCircle = (d: number): V => [Math.cos(deg(d)), Math.sin(deg(d))];
const sub = (p: V, q: V): V => [p[0] - q[0], p[1] - q[1]];
const add = (p: V, q: V): V => [p[0] + q[0], p[1] + q[1]];
const mul = (p: V, s: number): V => [p[0] * s, p[1] * s];
const dot = (p: V, q: V): number => p[0] * q[0] + p[1] * q[1];
const cross = (p: V, q: V): number => p[0] * q[1] - p[1] * q[0];

/** Foot of the perpendicular from P onto line UW. */
function foot(P: V, U: V, W: V): V {
  const d = sub(W, U);
  const t = dot(sub(P, U), d) / dot(d, d);
  return add(U, mul(d, t));
}

/** Intersections of the line through `p` with direction `dir` and the unit circle. */
function lineUnitCircle(p: V, dir: V): V[] {
  const a = dot(dir, dir);
  const b = 2 * dot(p, dir);
  const c = dot(p, p) - 1;
  const sq = Math.sqrt(b * b - 4 * a * c);
  return [add(p, mul(dir, (-b + sq) / (2 * a))), add(p, mul(dir, (-b - sq) / (2 * a)))];
}

/** Intersection of line AB with line CD. */
function meet(a: V, b: V, c: V, d: V): V {
  const r = sub(b, a);
  const s = sub(d, c);
  const t = cross(sub(c, a), s) / cross(r, s);
  return add(a, mul(r, t));
}

const A = onCircle(110);
const B = onCircle(205);
const C = onCircle(340);
const D = foot(A, B, C); // foot of the altitude from A on BC
const E = foot(B, C, A); // foot of the altitude from B on CA
const F = foot(C, A, B); // foot of the altitude from C on AB
const P = lineUnitCircle(E, sub(F, E))[0]; // EF ∩ circumcircle (Solution 1 Case 1)
const Q = meet(B, P, D, F); // BP ∩ DF

const coords = { A, B, C, D, E, F, P, Q };

// ---- givens / goal ----------------------------------------------------------

const cycABCP = rel("cyclic", ["A", "B", "C", "P"]); // circumcircle carries P
const collBDC = rel("coll", ["B", "D", "C"]);
const collCEA = rel("coll", ["C", "E", "A"]);
const collAFB = rel("coll", ["A", "F", "B"]);
const perpAD = rel("perp", ["A", "D", "B", "C"]);
const perpBE = rel("perp", ["B", "E", "C", "A"]);
const perpCF = rel("perp", ["C", "F", "A", "B"]);
const cycAFDC = rel("cyclic", ["A", "F", "D", "C"]); // pedal circle (∠AFC = ∠ADC = 90°)
const cycBCEF = rel("cyclic", ["B", "C", "E", "F"]); // pedal circle (∠BEC = ∠BFC = 90°)
const collEFP = rel("coll", ["E", "F", "P"]);
const collBPQ = rel("coll", ["B", "P", "Q"]);
const collDFQ = rel("coll", ["D", "F", "Q"]);

// ---- intermediate facts -----------------------------------------------------

const eqAPQ_ACB = rel("eqangle", ["A", "P", "Q", "A", "C", "B"]); // ∠APQ = ∠ACB
const eqAFQ_ACB = rel("eqangle", ["A", "F", "Q", "A", "C", "B"]); // ∠AFQ = ∠ACB
const eqAPQ_AFQ = rel("eqangle", ["A", "P", "Q", "A", "F", "Q"]); // ∠APQ = ∠AFQ
const cycAPFQ = rel("cyclic", ["A", "P", "F", "Q"]); // A, P, F, Q concyclic
const eqAQP_ACB = rel("eqangle", ["A", "Q", "P", "A", "C", "B"]); // ∠AQP = ∠ACB
const baseAngles = rel("eqangle", ["A", "P", "Q", "A", "Q", "P"]); // ∠APQ = ∠AQP
const goal = rel("cong", ["A", "P", "A", "Q"]); // AP = AQ

export const imo_shortlist_2010_g1: Puzzle = {
  id: "imo-shortlist-2010-g1",
  title: "IMO Shortlist 2010 G1: AP = AQ",
  blurb:
    "IMO Shortlist 2010, Geometry G1 (proposed by the United Kingdom). Let ABC " +
    "be an acute triangle with D, E, F the feet of the altitudes on BC, CA, AB. " +
    "P is an intersection of line EF with the circumcircle, and Q = BP ∩ DF. " +
    "Prove AP = AQ.",
  difficulty: "challenge",
  coords,
  figure: [
    // Circumcircle of ABC (carries P).
    fixedPoint("O", 0, 0, { name: "O", size: 2, withLabel: true }),
    circle("circum", "O", "A", { strokeColor: COLORS.BRAND, strokeWidth: 1.5 }),
    polygon(["A", "B", "C"]),
    // The three altitudes onto the orthic triangle DEF.
    segment("A", "D", { strokeColor: COLORS.WRONG, strokeWidth: 1, dash: 2 }),
    segment("B", "E", { strokeColor: COLORS.WRONG, strokeWidth: 1, dash: 2 }),
    segment("C", "F", { strokeColor: COLORS.WRONG, strokeWidth: 1, dash: 2 }),
    // Line EF (extended to P), line BP, and line DF (extended to Q).
    segment("E", "P"),
    segment("B", "P"),
    segment("D", "Q"),
    // GOAL elements highlighted: the two equal legs AP and AQ of △APQ.
    segment("A", "P", { strokeColor: COLORS.OK, strokeWidth: 3 }),
    segment("A", "Q", { strokeColor: COLORS.OK, strokeWidth: 3 }),
  ],
  given: [
    cycABCP,
    collBDC,
    collCEA,
    collAFB,
    perpAD,
    perpBE,
    perpCF,
    cycAFDC,
    cycBCEF,
    collEFP,
    collBPQ,
    collDFQ,
  ],
  goal,
  solution: [
    {
      fact: eqAPQ_ACB,
      rule: "algebraic angle-chase",
      premises: [cycABCP, collBPQ],
      humanReadable:
        "∠APQ = ∠ACB: Q is on line BP, so ∠APQ = ∠APB, and on the circumcircle " +
        "(A,B,C,P) the inscribed angle ∠APB on chord AB equals ∠ACB.",
    },
    {
      fact: eqAFQ_ACB,
      rule: "algebraic angle-chase",
      premises: [cycAFDC, collDFQ, collBDC],
      humanReadable:
        "∠AFQ = ∠ACB: Q is on line DF, so ∠AFQ = ∠AFD; on the pedal circle " +
        "(A,F,D,C) the inscribed angle ∠AFD equals ∠ACD, and D on BC gives " +
        "∠ACD = ∠ACB.",
    },
    {
      fact: eqAPQ_AFQ,
      rule: "algebraic angle-chase",
      premises: [eqAPQ_ACB, eqAFQ_ACB],
      humanReadable: "∠APQ = ∠AFQ, by transitivity of the previous two equalities.",
    },
    {
      fact: cycAPFQ,
      rule: "converse of inscribed angle",
      premises: [eqAPQ_AFQ],
      humanReadable:
        "A, P, F, Q are concyclic: P and F see segment AQ under equal angles " +
        "(∠APQ = ∠AFQ), so they lie on one circle through A and Q.",
    },
    {
      fact: eqAQP_ACB,
      rule: "algebraic angle-chase",
      premises: [cycAPFQ, collAFB, collEFP, cycBCEF, collCEA],
      humanReadable:
        "∠AQP = ∠ACB: on circle (A,P,F,Q) ∠AQP = ∠AFP; F on AB and P on EF make " +
        "∠AFP = ∠BFE, and on the pedal circle (B,C,E,F) ∠BFE = ∠BCE = ∠BCA.",
    },
    {
      fact: baseAngles,
      rule: "algebraic angle-chase",
      premises: [eqAPQ_ACB, eqAQP_ACB],
      humanReadable:
        "∠APQ = ∠AQP: both equal ∠ACB, so triangle APQ has equal base angles.",
    },
    {
      fact: goal,
      rule: "isosceles: equal base angles ⇒ equal sides",
      premises: [baseAngles],
      humanReadable:
        "AP = AQ: triangle APQ has equal base angles ∠APQ = ∠AQP, hence equal " +
        "legs AP and AQ.",
    },
  ],
};
