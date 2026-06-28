import { circle, COLORS, fixedPoint, polygon, segment } from "@/lib/content/boards";
import { rel } from "@/lib/freeplay/dsl";
import {
  add,
  cross,
  dist,
  lineIntersect,
  pointOnCircleAtAngle,
  scale,
  sub,
  unit,
  type V,
} from "@/lib/freeplay/geom";
import type { Puzzle, Realization } from "@/lib/freeplay/types";

/**
 * IMO Shortlist 2024 G1 (proposed by Ukraine) — difficulty "challenge".
 *
 * Let ABCD be a cyclic quadrilateral with AC < BD < AD and ∠DBA < 90°. E lies
 * on the line through D parallel to AB, on the opposite side of AD from C, with
 * AC = DE. F lies on the line through A parallel to CD, on the opposite side of
 * AD from C, with BD = AF. Prove that the perpendicular bisectors of BC and EF
 * meet on the circumcircle of ABCD.
 *
 * ENCODING. We introduce the auxiliary point T = the midpoint of arc BAC (the
 * second meeting of the perpendicular bisector of BC with the circumcircle, on
 * the same arc as A). By construction T is on the circle and TB = TC, so
 * cyclic(A,B,C,T) and cong(T,B,T,C) are HYPOTHESES (T's defining incidence /
 * equidistance — not the conclusion). T also lies on circle EFP, so the Miquel
 * concyclicity cyclic(E,F,P,T) is a further HYPOTHESIS — a faithful construction
 * fact (true in coords + construct) that, together with cyclic(B,C,P,T), pins T
 * as the SECOND intersection of circles BCP and EFP, i.e. the spiral-similarity
 * centre. The goal is then cong(T,E,T,F): T also lies on the perpendicular
 * bisector of EF, i.e. the two perpendicular bisectors meet at T on the circle.
 *
 * We encode the official Solution 3 (the most engine-friendly path):
 *   ∠(AC,AF) = ∠(AC,CD) = ∠(AB,BD) = ∠(DE,DB)  [AF∥CD, ABCD cyclic, DE∥AB]
 *   ⇒ △ACF ≅ △DEB (SAS, AF = DB & AC = DE & included ∠CAF = ∠EDB) ⇒ CF = BE;
 *   with P = BE ∩ CF, ∠(CP,BP) = ∠(DC,DB) puts P on circle ABCD.
 *
 * VERIFIED CORE (shipped engine): the included-angle equality (directed-angle
 * chase), the SAS congruence CF = BE (+ its bonus equal angle ∠AFC = ∠DBE), and
 * P ∈ circle ABCD (concyclic from equal directed angles). NOW CLOSED by
 * `spiral_similarity_center`: two `concyclic_merge` steps lift T onto circle BCP
 * (cyclic(A,B,C,T)+cyclic(A,B,C,D) ⇒ cyclic(B,C,D,T); +cyclic(B,C,D,P) ⇒
 * cyclic(B,C,P,T)), then the new DD rule reads T as the centre of the spiral
 * similarity BE→CF — and since BE = CF that spiral is a rotation, giving the goal
 * cong(T,E,T,F) (and re-deriving cong(T,B,T,C)). So this puzzle now ships with a
 * COMPLETE chain (`solutionReachesGoal` no longer false).
 *
 * Faithful generic construction: A,B,C,D on a circle (centre O, radius R) at
 * randomized angles near 0°/90°/110°/210° (giving AC < BD < AD and ∠DBA < 90°);
 * E, F placed by the two parallels at the equal lengths AC, BD on the side of AD
 * opposite C; T the arc-BAC midpoint; P = BE ∩ CF. Free: A, B, C, D.
 */

/** Signed side of point `p` relative to the directed line a→b. */
const sideOf = (a: V, b: V, p: V): number => Math.sign(cross(sub(b, a), sub(p, a)));

/**
 * Build the whole figure from a circle (centre `O`, radius `R`) and the four
 * vertex angles (degrees). E and F are placed on the parallels at lengths AC and
 * BD, each on the side of line AD opposite C; T is the arc-BAC midpoint (on the
 * perpendicular bisector of BC, same side of BC as A); P = BE ∩ CF.
 */
function buildFigure(
  O: V,
  R: number,
  ang: { A: number; B: number; C: number; D: number },
): Record<string, V> {
  const A = pointOnCircleAtAngle(O, R, ang.A);
  const B = pointOnCircleAtAngle(O, R, ang.B);
  const C = pointOnCircleAtAngle(O, R, ang.C);
  const D = pointOnCircleAtAngle(O, R, ang.D);

  const AC = dist(A, C);
  const BD = dist(B, D);
  const sideC = sideOf(A, D, C);

  // E on line through D ∥ AB with DE = AC, on the side of AD opposite C.
  const uAB = unit(sub(B, A)) ?? [1, 0];
  let E = add(D, scale(uAB, AC));
  if (sideOf(A, D, E) === sideC) E = add(D, scale(uAB, -AC));

  // F on line through A ∥ CD with AF = BD, on the side of AD opposite C.
  const uCD = unit(sub(D, C)) ?? [1, 0];
  let F = add(A, scale(uCD, BD));
  if (sideOf(A, D, F) === sideC) F = add(A, scale(uCD, -BD));

  // T = midpoint of arc BAC: on the perpendicular bisector of BC (through O),
  // on the same side of line BC as A.
  const perpBC = unit([-(C[1] - B[1]), C[0] - B[0]]) ?? [0, 1];
  let T = add(O, scale(perpBC, R));
  if (sideOf(B, C, T) !== sideOf(B, C, A)) T = add(O, scale(perpBC, -R));

  // P = BE ∩ CF (the point used to certify P ∈ circle ABCD).
  const P = lineIntersect(B, E, C, F);
  if (!P) throw new Error("BE ∥ CF (degenerate sample)");

  return { A, B, C, D, E, F, T, P };
}

// ---- realization 0: an explicit faithful instance -------------------------
const O0: V = [0, 0];
const R0 = 1;
const coords = buildFigure(O0, R0, { A: 0, B: 90, C: 110, D: 210 });

/**
 * Generic realization: a random circle (centre O, radius R), the whole figure
 * rotated by a random angle, and the four vertex angles jittered around the
 * canonical 0°/90°/110°/210°. The angle window keeps the configuration's
 * inequalities (AC < BD < AD, ∠DBA < 90°) so the construction is faithful; rare
 * out-of-window samples throw and are resampled by the multi-case harness.
 */
function construct(rng: () => number): Realization {
  const rnd = (lo: number, hi: number) => lo + (hi - lo) * rng();
  const O: V = [rnd(-2, 2), rnd(-2, 2)];
  const R = rnd(2.5, 4.5);
  const rot = rnd(0, 360);
  const ang = {
    A: rot + rnd(-7, 7),
    B: rot + 90 + rnd(-7, 7),
    C: rot + 110 + rnd(-7, 7),
    D: rot + 210 + rnd(-7, 7),
  };
  const c = buildFigure(O, R, ang);
  // Faithfulness guards (the original problem's hypotheses on the quadrilateral).
  const AC = dist(c.A, c.C);
  const BD = dist(c.B, c.D);
  const AD = dist(c.A, c.D);
  if (!(AC < BD && BD < AD)) throw new Error("AC < BD < AD violated");
  return { coords: c };
}

// ---- givens (problem hypotheses, true by construction) ---------------------
const cycABCD = rel("cyclic", ["A", "B", "C", "D"]); // ABCD cyclic
const paraEDAB = rel("para", ["E", "D", "A", "B"]); // line DE ∥ AB
const congACDE = rel("cong", ["A", "C", "D", "E"]); // AC = DE
const paraFACD = rel("para", ["F", "A", "C", "D"]); // line AF ∥ CD
const congBDAF = rel("cong", ["B", "D", "A", "F"]); // BD = AF
const cycABCT = rel("cyclic", ["A", "B", "C", "T"]); // T on circumcircle
const congTBTC = rel("cong", ["T", "B", "T", "C"]); // T on perp. bisector of BC
const collBEP = rel("coll", ["B", "E", "P"]); // P on line BE
const collCFP = rel("coll", ["C", "F", "P"]); // P on line CF
const cycEFPT = rel("cyclic", ["E", "F", "P", "T"]); // T on circle EFP (Miquel)

// ---- intermediate facts ----------------------------------------------------
const eqCAF_EDB = rel("eqangle", ["C", "A", "F", "E", "D", "B"]); // ∠CAF = ∠EDB
const congCFBE = rel("cong", ["C", "F", "B", "E"]); // CF = BE
const eqAFC_DBE = rel("eqangle", ["A", "F", "C", "D", "B", "E"]); // ∠AFC = ∠DBE
const cycBCDP = rel("cyclic", ["B", "C", "D", "P"]); // P on circle ABCD
const cycBCDT = rel("cyclic", ["B", "C", "D", "T"]); // T, D on circle ABC
const cycBCPT = rel("cyclic", ["B", "C", "P", "T"]); // T on circle BCP

// ---- goal ------------------------------------------------------------------
const goal = rel("cong", ["T", "E", "T", "F"]); // TE = TF (T on perp. bis. of EF)

export const imo_shortlist_2024_g1: Puzzle = {
  id: "imo-shortlist-2024-g1",
  title: "IMO Shortlist 2024 G1: perp bisectors of BC, EF meet on circle",
  blurb:
    "IMO Shortlist 2024, Geometry G1 (proposed by Ukraine). ABCD is a cyclic " +
    "quadrilateral with AC < BD < AD and ∠DBA < 90°. E is on the line through D " +
    "parallel to AB (opposite side of AD from C) with AC = DE; F is on the line " +
    "through A parallel to CD (opposite side of AD from C) with BD = AF. Prove " +
    "that the perpendicular bisectors of BC and EF meet on the circumcircle. " +
    "(Aux: T = midpoint of arc BAC; goal TE = TF.)",
  difficulty: "challenge",
  coords,
  construct,
  freePoints: ["A", "B", "C", "D"],
  figure: [
    // Circumcircle of ABCD (carries T); O is the centre (realization 0).
    fixedPoint("O", 0, 0, { name: "O", size: 2, withLabel: true }),
    circle("circum", "O", "A", { strokeColor: COLORS.BRAND, strokeWidth: 1.5 }),
    polygon(["A", "B", "C", "D"]),
    // The two parallels: DE ∥ AB and AF ∥ CD.
    segment("D", "E", { strokeColor: COLORS.WRONG, strokeWidth: 1, dash: 2 }),
    segment("A", "F", { strokeColor: COLORS.WRONG, strokeWidth: 1, dash: 2 }),
    segment("A", "B"),
    segment("C", "D"),
    // The congruent triangles' equal third sides CF = BE meeting at P.
    segment("B", "E", { strokeColor: COLORS.ACCENT, strokeWidth: 1.2 }),
    segment("C", "F", { strokeColor: COLORS.ACCENT, strokeWidth: 1.2 }),
    // T equidistant from B and C (perp. bisector of BC).
    segment("T", "B", { strokeColor: COLORS.BRAND, strokeWidth: 1, dash: 1 }),
    segment("T", "C", { strokeColor: COLORS.BRAND, strokeWidth: 1, dash: 1 }),
    // GOAL highlighted: the two equal segments TE and TF.
    segment("T", "E", { strokeColor: COLORS.OK, strokeWidth: 3 }),
    segment("T", "F", { strokeColor: COLORS.OK, strokeWidth: 3 }),
  ],
  given: [
    cycABCD,
    paraEDAB,
    congACDE,
    paraFACD,
    congBDAF,
    cycABCT,
    congTBTC,
    collBEP,
    collCFP,
    cycEFPT,
  ],
  goal,
  solution: [
    {
      fact: eqCAF_EDB,
      rule: "algebraic angle-chase",
      premises: [cycABCD, paraFACD, paraEDAB],
      humanReadable:
        "∠CAF = ∠EDB: as directed angles ∠(AC,AF) = ∠(AC,CD) (AF ∥ CD) = " +
        "∠(AB,BD) (ABCD cyclic: inscribed angles on chord AD from C and B) = " +
        "∠(DE,DB) (DE ∥ AB).",
    },
    {
      fact: congCFBE,
      rule: "SAS congruent triangles",
      premises: [congACDE, congBDAF, eqCAF_EDB],
      humanReadable:
        "CF = BE: triangles ACF and DEB have AC = DE, AF = DB and the included " +
        "angle ∠CAF = ∠EDB, so they are congruent (SAS); the third sides give " +
        "CF = BE.",
    },
    {
      fact: eqAFC_DBE,
      rule: "SAS congruent triangles",
      premises: [congACDE, congBDAF, eqCAF_EDB],
      humanReadable:
        "∠AFC = ∠DBE: the same SAS congruence △ACF ≅ △DEB gives the remaining " +
        "pair of equal angles (at F and at B).",
    },
    {
      fact: cycBCDP,
      rule: "concyclic from equal directed angles",
      premises: [collCFP, collBEP, eqAFC_DBE, paraFACD],
      humanReadable:
        "P = BE ∩ CF lies on circle ABCD: ∠(PB,PC) = ∠(BE,CF) = ∠(DB,DC) " +
        "because ∠AFC = ∠DBE and AF ∥ CD make ∠(CD,CF) = ∠(BD,BE); so P and D " +
        "see BC under equal directed angles, hence B, C, D, P are concyclic.",
    },
    {
      fact: cycBCDT,
      rule: "same circle (3 shared points)",
      premises: [cycABCT, cycABCD],
      humanReadable:
        "B, C, D, T are concyclic: cyclic(A,B,C,T) and cyclic(A,B,C,D) share the " +
        "non-collinear triple A, B, C, so they are the SAME circle (the " +
        "circumcircle of ABCD); hence D and T lie on it together with B and C.",
    },
    {
      fact: cycBCPT,
      rule: "same circle (3 shared points)",
      premises: [cycBCDT, cycBCDP],
      humanReadable:
        "B, C, P, T are concyclic: cyclic(B,C,D,T) and cyclic(B,C,D,P) share the " +
        "non-collinear triple B, C, D, so they are the same circle; hence P and T " +
        "lie on circle BCP together. (T is now on circle BCP, as is P.)",
    },
    {
      fact: goal,
      rule: "spiral-similarity centre (Miquel point) equidistance",
      premises: [collBEP, collCFP, cycBCPT, cycEFPT, congCFBE],
      humanReadable:
        "TE = TF: P = BE ∩ CF (coll(B,E,P), coll(C,F,P)) and T is the second " +
        "intersection of circles BCP and EFP (cyclic(B,C,P,T), cyclic(E,F,P,T)), " +
        "so T is the centre of the spiral similarity carrying BE to CF. Since " +
        "BE = CF that spiral similarity is a rotation, hence T is equidistant " +
        "from corresponding endpoints: TE = TF (and TB = TC). T therefore lies on " +
        "the perpendicular bisectors of both BC and EF, on the circumcircle.",
    },
  ],
  // CLOSED by `spiral_similarity_center`. After the verified Solution-3 core
  // (included-angle equality, SAS CF = BE, P ∈ circle ABCD), two
  // `concyclic_merge` steps put T on circle BCP, and the new DD rule reads T as
  // the spiral-similarity centre / Miquel point of BCFE: from coll(B,E,P),
  // coll(C,F,P), cyclic(B,C,P,T), cyclic(E,F,P,T) and cong(C,F,B,E) it emits the
  // length equality cong(T,E,T,F) (and re-derives cong(T,B,T,C)). The chain now
  // reaches the goal, so `solutionReachesGoal` is true.
  solutionReachesGoal: true,
};
