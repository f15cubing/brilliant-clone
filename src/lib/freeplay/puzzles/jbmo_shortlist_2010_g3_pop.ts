import { angleMark, circle, COLORS, fixedPoint, polygon, segment } from "@/lib/content/boards";
import { rel } from "@/lib/freeplay/dsl";
import type { V } from "@/lib/freeplay/geom";
import { eqratio } from "@/lib/freeplay/lengths/dsl";
import type { Puzzle } from "@/lib/freeplay/types";

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

const A: V = [0, 3.6];
const [D, B] = lineCircle(A, [-1, -3.6]); // secant 1: D near, B far
const [E, C] = lineCircle(A, [1.5, -2.8]); // secant 2: E near, C far

const coords = { A, B, C, D, E };

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
  figure: [
    // The circle ω₁ (B, C, D, E concyclic) drawn through B about its center O.
    fixedPoint("O", 0, 0, { name: "O", size: 2, withLabel: true }),
    circle("omega1", "O", "B", { strokeColor: COLORS.BRAND, strokeWidth: 1.5 }),
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
