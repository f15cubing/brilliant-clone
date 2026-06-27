import { angleMark, circle, COLORS, fixedPoint, segment } from "@/lib/content/boards";
import { rel } from "@/lib/freeplay/dsl";
import { lineCircleIntersect, type V } from "@/lib/freeplay/geom";
import { eqratio } from "@/lib/freeplay/lengths/dsl";
import type { Puzzle, Realization } from "@/lib/freeplay/types";

/**
 * The two intersections (near, then far) of the secant from the external point
 * `A` at heading `angDeg` with the circle (center `O`, radius `R`). Throws when
 * the line misses the circle, so the sampler resamples.
 */
function secantHits(A: V, O: V, R: number, angDeg: number): [V, V] {
  const t = (angDeg * Math.PI) / 180;
  const d: V = [Math.cos(t), Math.sin(t)];
  const pts = lineCircleIntersect(A, [A[0] + d[0], A[1] + d[1]], O, R);
  if (pts.length < 2) throw new Error("secant misses the circle");
  return [pts[0], pts[1]]; // ascending parameter ⇒ near, then far
}

/**
 * Generic realization: an external point A with two secants of a circle (center
 * O, radius R). Secant 1 meets it at C (near) and B (far); secant 2 at E (near)
 * and D (far). The power of A gives AB·AC = AD·AE, and the two secants share the
 * angle at A — so both givens hold and the cross-chord ratio (the goal) follows.
 * Free: A and the two secant directions (B, C, D, E dependent).
 */
function construct(rng: () => number): Realization {
  const rnd = (lo: number, hi: number) => lo + (hi - lo) * rng();
  const O: V = [rnd(-1, 1), rnd(-1, 1)];
  const R = rnd(3, 5);
  const aoLen = R * rnd(1.8, 2.6);
  const aDir = rnd(0, 360);
  const A: V = [
    O[0] + aoLen * Math.cos((aDir * Math.PI) / 180),
    O[1] + aoLen * Math.sin((aDir * Math.PI) / 180),
  ];
  const base = aDir + 180; // heading from A toward O
  const maxOff = (Math.asin(R / aoLen) * 180) / Math.PI; // half-angle of the cone to the circle
  const [C, B] = secantHits(A, O, R, base + rnd(0.2, 0.8) * maxOff);
  const [E, D] = secantHits(A, O, R, base - rnd(0.2, 0.8) * maxOff);
  return { coords: { A, B, C, D, E } };
}

/**
 * Converse power of a point, via SAS similarity (difficulty "core").
 *
 * From an external point A two secants meet a circle: the first at C (near) and
 * B (far), the second at E (near) and D (far). GIVEN the metric hypothesis
 * AB·AC = AD·AE (i.e. AB/AD = AE/AC), prove the cross-chord ratio BE/CD = AB/AD.
 * △ABE and △ADC share the angle at A, so the proof needs SAS similarity (the
 * single shared angle rules out AA).
 *
 * Faithful generic realization: B, C, D, E lie on x²+y²=25 (center O); the two
 * secant lines y=-2x+10 (through C, B) and y=-3x-5 (through E, D) meet at the
 * external point A(-15, 40).
 */
const A: [number, number] = [-15, 40];
const B: [number, number] = [5, 0];
const C: [number, number] = [3, 4];
const D: [number, number] = [0, -5];
const E: [number, number] = [-3, 4];

const coords = { A, B, C, D, E };

// Power-of-a-point hypothesis as the SAS two-sides proportion AB/AD = AE/AC.
const powerRatio = eqratio("A", "B", "A", "D", "A", "E", "A", "C");
// Shared INCLUDED angle ∠BAE = ∠DAC (rays AB≡AC, AE≡AD: the secants are lines).
const sharedAngle = rel("eqangle", ["B", "A", "E", "D", "A", "C"]);
// Remaining equal angle ∠ABE = ∠ADC (the concyclicity / antiparallel relation).
const angABE_ADC = rel("eqangle", ["A", "B", "E", "A", "D", "C"]);
// GOAL — the cross-chord ratio AB/AD = BE/CD.
const goal = eqratio("A", "B", "A", "D", "B", "E", "C", "D");

export const sas_similarity_problem: Puzzle = {
  id: "sas-similarity-converse",
  title: "SAS similarity: the converse power of a point",
  blurb:
    "Classical circle geometry — the converse of the power of a point, by SAS " +
    "similarity. From an external point A two secants meet a circle: the first " +
    "at C (near) and B (far), the second at E (near) and D (far). Given " +
    "AB·AC = AD·AE (equivalently AB/AD = AE/AC), prove BE/CD = AB/AD. Triangles " +
    "△ABE and △ADC share the angle at A, so the proof needs SAS similarity, " +
    "not AA.",
  difficulty: "core",
  coords,
  construct,
  freePoints: ["A", "B", "D"],
  figure: [
    // The circle (B, C, D, E lie on x²+y²=25) drawn through B about its center.
    fixedPoint("O", 0, 0, { name: "O", size: 2, withLabel: true }),
    circle("circ", "O", "B", { strokeColor: COLORS.BRAND, strokeWidth: 1.5 }),
    // The two secants from the external point A.
    segment("A", "B"), // secant 1: A–C–B
    segment("A", "D"), // secant 2: A–E–D
    // The included angle the two triangles share, at A.
    angleMark("B", "A", "D", { fillColor: COLORS.WRONG, strokeColor: COLORS.WRONG }),
    // GOAL elements highlighted: the proportional cross-chords BE and CD.
    segment("B", "E", { strokeColor: COLORS.OK, strokeWidth: 3 }),
    segment("C", "D", { strokeColor: COLORS.ACCENT, strokeWidth: 3 }),
  ],
  given: [powerRatio, sharedAngle],
  goal,
  solution: [
    {
      fact: angABE_ADC,
      rule: "SAS similar triangles",
      premises: [powerRatio, sharedAngle],
      humanReadable:
        "△ABE ~ △ADC by SAS (shared ∠A, AB/AD = AE/AC), so the remaining " +
        "angles match: ∠ABE = ∠ADC. This antiparallel relation places " +
        "B, C, D, E on one circle.",
    },
    {
      fact: goal,
      rule: "algebraic length-chase",
      premises: [powerRatio, sharedAngle],
      humanReadable:
        "From the same SAS similarity the third pair of sides is in the same " +
        "ratio: BE/CD = AB/AD. (The rule emits the bridge AE/AC = EB/CD; the " +
        "length table fuses it with the cited AB/AD = AE/AC to reach the goal.)",
    },
  ],
};
