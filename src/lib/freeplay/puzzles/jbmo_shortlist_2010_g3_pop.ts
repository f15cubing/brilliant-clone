import { angleMark, COLORS, polygon, segment } from "@/lib/content/boards";
import type { Coords } from "@/lib/freeplay/check";
import { rel } from "@/lib/freeplay/dsl";
import { dist, lineCircleIntersect, type V } from "@/lib/freeplay/geom";
import { eqratio } from "@/lib/freeplay/lengths/dsl";
import type { Puzzle, Realization } from "@/lib/freeplay/types";

/**
 * (Reduced from) JBMO Shortlist 2010 G3 — power of a point (difficulty
 * "challenge").
 *
 * A circle ω₁ through B and C meets the sides AB and AC of triangle ABC at D
 * and E. Then A is an external point with two secants A–D–B and A–E–C of ω₁,
 * and the power of A gives AD·AB = AE·AC, i.e. AD/AE = AC/AB — the load-bearing
 * length lemma every solution of G3 turns on (the full O₁O₂ = R conclusion
 * needs explicit center lengths, outside the engine's length subsystem).
 *
 * Faithful generic realization: ω₁ is the circle of radius 2 centered at O; A
 * sits outside it and two secants from A (different directions ⇒ scalene ABC)
 * cut ω₁ at D (near) & B (far) and at E (near) & C (far).
 */
const R = 2;
const add = (p: V, q: V): V => [p[0] + q[0], p[1] + q[1]];
const mul = (p: V, s: number): V => [p[0] * s, p[1] * s];
const dot = (p: V, q: V): number => p[0] * q[0] + p[1] * q[1];

/** The two intersections of the ray from `A` in direction `dir` with circle (O,R). */
function lineCircle(P: V, dir: V): [V, V] {
  const a = dot(dir, dir);
  const b = 2 * dot(P, dir);
  const c = dot(P, P) - R * R;
  const sq = Math.sqrt(b * b - 4 * a * c);
  return [add(P, mul(dir, (-b - sq) / (2 * a))), add(P, mul(dir, (-b + sq) / (2 * a)))];
}

const CENTER: V = [0, 0];
const A: V = [0, 3.6];
const [D, B] = lineCircle(A, [-1, -3.6]); // secant 1: D near, B far
const [E, C] = lineCircle(A, [1.5, -2.8]); // secant 2: E near, C far

const coords = { O: CENTER, A, B, C, D, E };

/** The intersection of line `from`-`through` with circle (center,r) that is NOT `through`. */
function secondHit(from: V, through: V, center: V, r: number): V {
  const hits = lineCircleIntersect(from, through, center, r);
  if (hits.length < 2) throw new Error("secant misses the circle");
  return dist(hits[0], through) > 1e-6 ? hits[0] : hits[1];
}

/**
 * Movable form: O is the draggable centre of ω₁ (radius fixed at R) and A the
 * draggable external point; the secant far-ends B, C glide on ω₁. The near
 * intersections D, E are the second meets of lines AB, AC with ω₁, so B,C,D,E
 * stay concyclic and the secants A–D–B, A–E–C hold by construction.
 */
function constructFrom(free: Coords): Realization {
  const { O: o, A: a, B: b, C: c } = free;
  return {
    coords: {
      O: o,
      A: a,
      B: b,
      C: c,
      D: secondHit(a, b, o, R),
      E: secondHit(a, c, o, R),
    },
  };
}

/**
 * The two intersections (near, then far) of the secant from the external point
 * `A` at heading `angDeg` with the circle (center `O`, radius `R`).
 */
function secantHits(A: V, O: V, r: number, angDeg: number): [V, V] {
  const t = (angDeg * Math.PI) / 180;
  const dir: V = [Math.cos(t), Math.sin(t)];
  const pts = lineCircleIntersect(A, [A[0] + dir[0], A[1] + dir[1]], O, r);
  if (pts.length < 2) throw new Error("secant misses the circle");
  return [pts[0], pts[1]];
}

/**
 * Generic realization: a circle ω₁ (center O, radius R) and an external point A
 * with two secants — secant 1 meets ω₁ at D (near) and B (far), secant 2 at E
 * (near) and C (far). The power of A gives AD·AB = AE·AC (the goal); B, C, D, E
 * are concyclic on ω₁. Free: A and the two secant directions.
 */
function construct(rng: () => number): Realization {
  const rnd = (lo: number, hi: number) => lo + (hi - lo) * rng();
  const O: V = [rnd(-1, 1), rnd(-1, 1)];
  const r = rnd(2, 3.5);
  const aoLen = r * rnd(1.7, 2.4);
  const aDir = rnd(0, 360);
  const A0: V = [
    O[0] + aoLen * Math.cos((aDir * Math.PI) / 180),
    O[1] + aoLen * Math.sin((aDir * Math.PI) / 180),
  ];
  const base = aDir + 180;
  const maxOff = (Math.asin(r / aoLen) * 180) / Math.PI;
  const [Dp, Bp] = secantHits(A0, O, r, base + rnd(0.2, 0.8) * maxOff);
  const [Ep, Cp] = secantHits(A0, O, r, base - rnd(0.2, 0.8) * maxOff);
  return { coords: { A: A0, B: Bp, C: Cp, D: Dp, E: Ep } };
}

const cyc = rel("cyclic", ["B", "C", "D", "E"]); // ω₁ through B, C, D, E
const secant1 = rel("coll", ["A", "D", "B"]); // secant A–D–B
const secant2 = rel("coll", ["A", "E", "C"]); // secant A–E–C
// GOAL — AD/AE = AC/AB (⇔ AD·AB = AE·AC, the power of A).
const goal = eqratio("A", "D", "A", "E", "A", "C", "A", "B");

export const jbmo_shortlist_2010_g3_pop: Puzzle = {
  id: "jbmo-2010-g3-power-of-a-point",
  title: "JBMO Shortlist 2010 G3: power of a point",
  blurb:
    "JBMO Shortlist 2010, Geometry G3 (reduced to its load-bearing length " +
    "lemma). A circle ω₁ through B and C meets sides AB and AC of triangle ABC " +
    "at D and E. Prove AD·AB = AE·AC (equivalently AD/AE = AC/AB).",
  difficulty: "challenge",
  coords,
  construct,
  constructFrom,
  freePoints: ["O", "A", "B", "C"],
  // O is the draggable centre of ω₁ (radius fixed); A is the draggable external
  // point and the secant far-ends B, C glide on it. D, E are the derived meets.
  movable: {
    hosts: [
      {
        id: "omega1",
        type: "circle",
        parents: [{ ref: "O" }, R],
        attributes: { strokeColor: COLORS.BRAND, strokeWidth: 1.5 },
      },
    ],
    gliders: { B: { on: "omega1" }, C: { on: "omega1" } },
  },
  figure: [
    // Triangle ABC; its sides AB, AC are the two secants from A.
    polygon(["A", "B", "C"]),
    // The shared apex angle at A.
    angleMark("B", "A", "C", { fillColor: COLORS.WRONG, strokeColor: COLORS.WRONG }),
    // GOAL elements highlighted: chord DE (base of the similar inner △ADE) and
    // the cited secant chords. AD/AE = AC/AB.
    segment("D", "E", { strokeColor: COLORS.OK, strokeWidth: 3 }),
    segment("A", "D", { strokeColor: COLORS.ACCENT, strokeWidth: 2.5 }),
    segment("A", "E", { strokeColor: COLORS.ACCENT, strokeWidth: 2.5 }),
  ],
  given: [cyc, secant1, secant2],
  goal,
  solution: [
    {
      fact: goal,
      rule: "power of a point",
      premises: [cyc, secant1, secant2],
      humanReadable:
        "A is an external point with secants A–D–B and A–E–C of the circle " +
        "(B, C, D, E); its power gives AD·AB = AE·AC, i.e. AD/AE = AC/AB.",
    },
  ],
};
