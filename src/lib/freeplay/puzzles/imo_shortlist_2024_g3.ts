import { COLORS, circle, fixedPoint, polygon, segment } from "@/lib/content/boards";
import type { Coords } from "@/lib/freeplay/check";
import { rel } from "@/lib/freeplay/dsl";
import {
  add,
  angleDeg,
  circumcenter,
  dot,
  lineIntersect,
  reflectOverLine,
  sub,
  unit,
  type V,
} from "@/lib/freeplay/geom";
import type { Puzzle, Realization } from "@/lib/freeplay/types";

/**
 * IMO Shortlist 2024 G3 (proposed by Belarus) — difficulty "challenge".
 *
 * Let ABCDE be a convex pentagon and let M be the midpoint of AB. Suppose that
 * segment AB is tangent to the circumcircle of triangle CME at M and that D lies
 * on the circumcircles of triangles AME and BMC. Lines AD and ME intersect at K,
 * and lines BD and MC intersect at L. Points P and Q lie on line EC so that
 * ∠PDC = ∠EDQ = ∠ADB. Prove that lines KP, LQ, and MD are concurrent.
 *
 * ENCODING. We name Z = MD ∩ KP and ask for the GOAL coll(L, Q, Z): the third
 * line LQ also passes through Z, i.e. KP, LQ, MD concur.
 *
 * Construction (faithful, generic):
 *  - M = origin, A = (−d, 0), B = (d, 0), so M is the midpoint of AB and AB is
 *    the x-axis.
 *  - ω = circle through C, M, E tangent to AB at M: its centre sits at (0, k) on
 *    the perpendicular to AB at M (radius k), so AB touches ω only at M. C and E
 *    are placed on ω.
 *  - D = the second intersection of circle(A, M, E) with circle(B, M, C) (both
 *    pass through M); it is the reflection of M across the line of the two
 *    circles' centres.
 *  - K = AD ∩ ME, L = BD ∩ MC.
 *  - P, Q on line EC with ∠PDC = ∠EDQ = ∠ADB (built by rotating rays DC, DE by
 *    ∠ADB and meeting line EC; the candidate lying on segment EC is taken).
 *  - Z = MD ∩ KP (the auxiliary concurrency point).
 */

/** A point on ω = circle centred (0, k), radius k (through the origin M). */
const onOmega = (k: number, phiDeg: number): V => {
  const t = (phiDeg * Math.PI) / 180;
  return [k * Math.sin(t), k * (1 - Math.cos(t))];
};

/** Rotate a vector by `deg` degrees (CCW about the origin). */
function rotateVec(v: V, deg: number): V {
  const t = (deg * Math.PI) / 180;
  const c = Math.cos(t);
  const s = Math.sin(t);
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c];
}

/** Parameter t with X = A + t·(B − A) (X assumed on line AB). */
function paramOnSeg(X: V, A: V, B: V): number {
  const ab = sub(B, A);
  return dot(sub(X, A), ab) / dot(ab, ab);
}

/**
 * The point on line (lineA, lineB) such that the (unsigned) angle at D between
 * ray D→refTo and ray D→point equals `theta`. There are two such points (the
 * ray D→refTo rotated by +theta and −theta); we keep the forward-ray
 * intersections and prefer the one lying on segment (lineA, lineB), matching the
 * official figure where P and Q sit on segment EC.
 */
function anglePointOnLine(
  D: V,
  refTo: V,
  theta: number,
  lineA: V,
  lineB: V,
): V {
  const base = unit(sub(refTo, D));
  if (!base) throw new Error("degenerate angle reference");
  const cands: { pt: V; onSeg: boolean }[] = [];
  for (const sign of [1, -1] as const) {
    const w = rotateVec(base, sign * theta);
    const X = lineIntersect(D, add(D, w), lineA, lineB);
    if (!X) continue;
    if (dot(sub(X, D), w) <= 1e-9) continue; // forward ray ⇒ ∠ = theta (not its supplement)
    const t = paramOnSeg(X, lineA, lineB);
    cands.push({ pt: X, onSeg: t > 1e-6 && t < 1 - 1e-6 });
  }
  if (cands.length === 0) throw new Error("no angle point on line");
  return (cands.find((c) => c.onSeg) ?? cands[0]).pt;
}

interface Params {
  d: number; // half of AB (A = (−d,0), B = (d,0))
  k: number; // radius of ω (centre (0,k))
  phiC: number; // angular position of C on ω (degrees, > 0 ⇒ right side)
  phiE: number; // angular position of E on ω (degrees, < 0 ⇒ left side)
}

/** Build every point of the figure from the free parameters. */
function build(p: Params): Coords {
  const M: V = [0, 0];
  const A: V = [-p.d, 0];
  const B: V = [p.d, 0];
  const C = onOmega(p.k, p.phiC);
  const E = onOmega(p.k, p.phiE);

  const O1 = circumcenter(A, M, E);
  const O2 = circumcenter(B, M, C);
  if (!O1 || !O2) throw new Error("degenerate auxiliary circle");
  const D = reflectOverLine(M, O1, O2); // second meet of circle(AME) & circle(BMC)

  const K = lineIntersect(A, D, M, E);
  const L = lineIntersect(B, D, M, C);
  if (!K || !L) throw new Error("degenerate K or L");

  const theta = angleDeg(A, D, B); // ∠ADB
  const P = anglePointOnLine(D, C, theta, E, C); // ∠PDC = ∠ADB, P on line EC
  const Q = anglePointOnLine(D, E, theta, E, C); // ∠EDQ = ∠ADB, Q on line EC

  const Z = lineIntersect(M, D, K, P); // MD ∩ KP (auxiliary concurrency point)
  if (!Z) throw new Error("MD ∥ KP (degenerate)");

  return { A, B, C, D, E, M, K, L, P, Q, Z };
}

const CANON: Params = { d: 0.9, k: 1.9, phiC: 70, phiE: -82 };
const coords: Coords = build(CANON);

/**
 * Generic realization: random A, B about M, a random tangent circle ω and random
 * positions of C, E on it; every dependent point derived exactly. The tangency,
 * the two circles through D, the midpoint, the EC incidences and both angle
 * conditions all hold by construction. Free: A, B, C, E.
 */
function construct(rng: () => number): Realization {
  const rnd = (lo: number, hi: number) => lo + (hi - lo) * rng();
  const params: Params = {
    d: rnd(0.82, 1.0),
    k: rnd(1.65, 2.0),
    phiC: rnd(60, 74),
    phiE: rnd(-84, -72),
  };
  return { coords: build(params) };
}

// ---- givens / goal ----------------------------------------------------------

const midM = rel("midp", ["M", "A", "B"]); // M is the midpoint of AB
const cycAMED = rel("cyclic", ["A", "M", "E", "D"]); // circle AME carries D
const cycBMCD = rel("cyclic", ["B", "M", "C", "D"]); // circle BMC carries D
// Tangent–chord angles of ω = circle(C,M,E) with tangent line AB at M:
const tanA = rel("eqangle", ["A", "M", "E", "M", "C", "E"]); // ∠AME = ∠MCE
const tanB = rel("eqangle", ["B", "M", "C", "M", "E", "C"]); // ∠BMC = ∠MEC
const collECP = rel("coll", ["E", "C", "P"]); // P on line EC
const collECQ = rel("coll", ["E", "C", "Q"]); // Q on line EC
const angP = rel("eqangle", ["P", "D", "C", "A", "D", "B"]); // ∠PDC = ∠ADB
const angQ = rel("eqangle", ["E", "D", "Q", "A", "D", "B"]); // ∠EDQ = ∠ADB
const collAKD = rel("coll", ["A", "K", "D"]); // K on AD
const collMKE = rel("coll", ["M", "K", "E"]); // K on ME
const collBLD = rel("coll", ["B", "L", "D"]); // L on BD
const collMLC = rel("coll", ["M", "L", "C"]); // L on MC
const collMDZ = rel("coll", ["M", "D", "Z"]); // Z on MD
const collKPZ = rel("coll", ["K", "P", "Z"]); // Z on KP

const goal = rel("coll", ["L", "Q", "Z"]); // KP, LQ, MD concurrent (LQ through Z = MD∩KP)

// ---- intermediate facts of the verified angle chase --------------------------

const edaMce = rel("eqangle", ["E", "D", "A", "M", "C", "E"]); // ∠EDA = ∠MCE
const bdcMec = rel("eqangle", ["B", "D", "C", "M", "E", "C"]); // ∠BDC = ∠MEC
const adpMec = rel("eqangle", ["A", "D", "P", "M", "E", "C"]); // ∠ADP = ∠MEC
const qdbMce = rel("eqangle", ["Q", "D", "B", "M", "C", "E"]); // ∠QDB = ∠MCE
const cycDEKP = rel("cyclic", ["D", "E", "K", "P"]); // D, E, K, P concyclic
const cycCDQL = rel("cyclic", ["C", "D", "Q", "L"]); // C, D, Q, L concyclic
const paraKPMC = rel("para", ["K", "P", "M", "C"]); // KP ∥ MC
const paraLQME = rel("para", ["L", "Q", "M", "E"]); // LQ ∥ ME

export const imo_shortlist_2024_g3: Puzzle = {
  id: "imo-shortlist-2024-g3",
  title: "IMO Shortlist 2024 G3: KP, LQ, MD concurrent",
  blurb:
    "IMO Shortlist 2024, Geometry G3 (proposed by Belarus). Let ABCDE be a " +
    "convex pentagon and M the midpoint of AB. Segment AB is tangent to the " +
    "circumcircle of triangle CME at M, and D lies on the circumcircles of " +
    "triangles AME and BMC. Lines AD and ME meet at K, lines BD and MC meet at " +
    "L, and P, Q lie on line EC with ∠PDC = ∠EDQ = ∠ADB. Prove that lines KP, " +
    "LQ, and MD are concurrent (here Z = MD ∩ KP, so the goal is that L, Q, Z " +
    "are collinear).",
  difficulty: "challenge",
  coords,
  construct,
  freePoints: ["A", "B", "C", "E"],
  figure: [
    polygon(["A", "B", "C", "D", "E"], {
      fillColor: COLORS.BRAND,
      fillOpacity: 0.05,
    }),
    // ω = circumcircle of CME, tangent to AB at M (centre at (0, k) on canonical
    // figure; board-only point, not part of the verifier coords).
    fixedPoint("O", 0, CANON.k, { name: "O", size: 2, withLabel: true }),
    circle("omega", "O", "M", { strokeColor: COLORS.ACCENT, strokeWidth: 1.2 }),
    segment("E", "C", { strokeColor: COLORS.BRAND, strokeWidth: 1, dash: 2 }),
    segment("M", "E"),
    segment("M", "C"),
    segment("A", "D"),
    segment("B", "D"),
    segment("M", "D", { strokeColor: COLORS.OK, strokeWidth: 2 }),
    segment("K", "P", { strokeColor: COLORS.OK, strokeWidth: 2 }),
    segment("L", "Q", { strokeColor: COLORS.OK, strokeWidth: 2 }),
  ],
  given: [
    midM,
    cycAMED,
    cycBMCD,
    tanA,
    tanB,
    collECP,
    collECQ,
    angP,
    angQ,
    collAKD,
    collMKE,
    collBLD,
    collMLC,
    collMDZ,
    collKPZ,
  ],
  goal,
  // The verified chain reaches part (a) of the official solution — KP ∥ MC and
  // LQ ∥ ME, with the two auxiliary circles (D,E,K,P) and (C,D,Q,L).
  //
  // ENGINE GAP (refined). The final concurrency coll(L,Q,Z) is the radical-centre
  // step (official Solution 2c): KP, LQ, MD are the three pairwise radical axes
  // of circles (D,E,K,P), (C,D,Q,L) and (K,L,P,Q), so they concur at the radical
  // centre Z. This step IS now mechanized by the rule `three_circle_radical_center`
  //   premises: cyclic(D,E,K,P), cyclic(C,D,Q,L), cyclic(K,L,P,Q),
  //             coll(K,P,Z), coll(M,D,Z)   ⇒   coll(L,Q,Z)
  // (once the orchestrator registers it in rules/index.ts).
  //
  // The SOLE remaining (SECONDARY) gap is its prerequisite cyclic(K,L,P,Q): the
  // third circle (K,L,P,Q). It is TRUE in every realization but the shipped
  // engine cannot derive it. It reduces to the power-of-M length fact
  //   ME·MK = MC·ML   (equivalently KL ∥ AB, or C,E,K,L concyclic),
  // which the angle layer cannot reach (line KL is unconstrained by the cited
  // facts) and the length layer cannot establish (the power of M is the official
  // Solution 2b argument: the auxiliary tangent-intersection point X of circle
  // CME, with X on the radical axis DM of circles DEAM and BCDM — an auxiliary
  // construction beyond the shipped rule set). It is therefore NOT injected as a
  // hypothesis. Closing it cleanly is the documented next step (a "power of M via
  // two circles' radical axis" capability, the sibling of the radical-centre
  // rule). See the test for both documented gaps.
  solutionReachesGoal: false,
  solution: [
    {
      fact: edaMce,
      rule: "algebraic angle-chase",
      premises: [cycAMED, tanA],
      humanReadable:
        "∠EDA = ∠MCE: on circle AMED the inscribed angles on chord EA give " +
        "∠EDA = ∠EMA, and the tangent-chord angle of ω at M gives ∠EMA = ∠MCE.",
    },
    {
      fact: bdcMec,
      rule: "algebraic angle-chase",
      premises: [cycBMCD, tanB],
      humanReadable:
        "∠BDC = ∠MEC: on circle BMCD the inscribed angles on chord BC give " +
        "∠BDC = ∠BMC, and the tangent-chord angle of ω at M gives ∠BMC = ∠MEC.",
    },
    {
      fact: adpMec,
      rule: "algebraic angle-chase",
      premises: [angP, bdcMec],
      humanReadable:
        "∠ADP = ∠MEC: the condition ∠PDC = ∠ADB is equivalent to ∠ADP = ∠BDC, " +
        "and ∠BDC = ∠MEC was just shown.",
    },
    {
      fact: cycDEKP,
      rule: "concyclic from equal directed angles",
      premises: [adpMec, collAKD, collMKE, collECP],
      humanReadable:
        "D, E, K, P concyclic: with K on AD and on ME and P on EC, ∠ADP = ∠MEC " +
        "becomes ∠KDP = ∠KEP, so D and E see KP under equal angles.",
    },
    {
      fact: paraKPMC,
      rule: "algebraic angle-chase",
      premises: [cycDEKP, edaMce, collAKD, collMKE, collECP],
      humanReadable:
        "KP ∥ MC: on circle DEKP, ∠EPK = ∠EDK = ∠EDA = ∠ECM (with K on AD), and " +
        "since P lies on line EC the equal corresponding angles force KP ∥ MC.",
    },
    {
      fact: qdbMce,
      rule: "algebraic angle-chase",
      premises: [angQ, edaMce],
      humanReadable:
        "∠QDB = ∠MCE: the condition ∠EDQ = ∠ADB is equivalent to ∠QDB = ∠EDA, " +
        "and ∠EDA = ∠MCE was shown in step 1.",
    },
    {
      fact: cycCDQL,
      rule: "concyclic from equal directed angles",
      premises: [qdbMce, collBLD, collMLC, collECQ],
      humanReadable:
        "C, D, Q, L concyclic: with L on BD and on MC and Q on EC, ∠QDB = ∠MCE " +
        "becomes ∠QDL = ∠QCL, so D and C see QL under equal angles.",
    },
    {
      fact: paraLQME,
      rule: "algebraic angle-chase",
      premises: [cycCDQL, bdcMec, collBLD, collMLC, collECQ],
      humanReadable:
        "LQ ∥ ME: on circle CDQL, ∠LQC = ∠LDC = ∠BDC = ∠MEC (with L on BD), and " +
        "since Q lies on line EC the equal corresponding angles force LQ ∥ ME.",
    },
  ],
};
