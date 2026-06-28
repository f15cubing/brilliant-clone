import { COLORS, polygon, segment } from "@/lib/content/boards";
import type { Coords } from "@/lib/freeplay/check";
import { rel } from "@/lib/freeplay/dsl";
import type { V } from "@/lib/freeplay/geom";
import type { Puzzle, Realization } from "@/lib/freeplay/types";

const sub = (p: V, q: V): V => [p[0] - q[0], p[1] - q[1]];
const add = (p: V, q: V): V => [p[0] + q[0], p[1] + q[1]];
const rot = (v: V, d: number): V => {
  const r = (d * Math.PI) / 180,
    c = Math.cos(r),
    s = Math.sin(r);
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c];
};

/** Build the squares ABDE, ACFG (erected outward) from a triangle ABC. */
function squaresFrom(A: V, B: V, C: V): Coords {
  const E = add(A, rot(sub(B, A), -90)); // square ABDE: AE = AB, external (away from C)
  const D = add(B, rot(sub(B, A), -90));
  const G = add(A, rot(sub(C, A), 90)); // square ACFG: AG = AC, external (away from B)
  const F = add(C, rot(sub(C, A), 90));
  return { A, B, C, D, E, F, G };
}

const A: V = [0, 0];
const B: V = [4, 0];
const C: V = [1, 3];
const coords: Coords = squaresFrom(A, B, C);

/**
 * Generic realization: a random scalene triangle ABC with the two squares
 * erected externally by ±90° rotations (so AE = AB, AG = AC and the right
 * angles hold by construction). Free: A, B, C (D, E, F, G dependent).
 */
function construct(rng: () => number): Realization {
  const rnd = (lo: number, hi: number) => lo + (hi - lo) * rng();
  const a: V = [rnd(-1, 1), rnd(-1, 1)];
  const b: V = [a[0] + rnd(3, 5), a[1] + rnd(-1, 1)];
  const c: V = [a[0] + rnd(0, 2), a[1] + rnd(2.5, 4.5)];
  return { coords: squaresFrom(a, b, c) };
}

/** Movable form: re-erect both squares from the dragged triangle vertices. */
function constructFrom(free: Coords): Realization {
  return { coords: squaresFrom(free.A, free.B, free.C) };
}

const eqBAG_EAC = rel("eqangle", ["B", "A", "G", "E", "A", "C"]); // ∠BAG = ∠EAC
const goal = rel("cong", ["B", "G", "C", "E"]); // BG = CE

/**
 * Squares on two sides of a triangle (core).
 *
 * Squares ABDE and ACFG are erected externally on the sides AB and AC of
 * triangle ABC. The spiral/SAS congruence about the shared apex A — both
 * ∠BAG and ∠EAC equal ∠BAC + 90° — makes triangles ABG and AEC congruent,
 * so the segments BG and CE are equal.
 */
export const squares_on_two_sides: Puzzle = {
  id: "squares_on_two_sides",
  title: "Squares on two sides: BG = CE",
  blurb:
    "Classical configuration (Coxeter & Greitzer, Geometry Revisited — the equal " +
    "segments of externally erected squares). On the sides AB and AC of triangle " +
    "ABC, squares ABDE and ACFG are erected externally (so AE = AB, AG = AC, and " +
    "∠EAB = ∠GAC = 90°). Prove that BG = CE.",
  difficulty: "core",
  coords,
  construct,
  constructFrom,
  freePoints: ["A", "B", "C"],
  figure: [
    polygon(["A", "B", "C"]),
    polygon(["A", "B", "D", "E"], { fillColor: COLORS.BRAND, fillOpacity: 0.06 }),
    polygon(["A", "C", "F", "G"], { fillColor: COLORS.BRAND, fillOpacity: 0.06 }),
    // The two equal segments — the goal.
    segment("B", "G", { strokeColor: COLORS.OK, strokeWidth: 2.5 }),
    segment("C", "E", { strokeColor: COLORS.ACCENT, strokeWidth: 2.5 }),
  ],
  given: [
    rel("cong", ["A", "B", "A", "E"]), // square ABDE side: AB = AE
    rel("cong", ["A", "C", "A", "G"]), // square ACFG side: AC = AG
    rel("perp", ["E", "A", "A", "B"]), // ∠EAB = 90°
    rel("perp", ["G", "A", "A", "C"]), // ∠GAC = 90°
  ],
  goal,
  solution: [
    {
      fact: eqBAG_EAC,
      rule: "algebraic angle-chase",
      premises: [rel("perp", ["E", "A", "A", "B"]), rel("perp", ["G", "A", "A", "C"])],
      humanReadable:
        "∠BAG = ∠EAC: both equal ∠BAC + 90°, since the squares give the right " +
        "angles ∠GAC = ∠EAB = 90°.",
    },
    {
      fact: goal,
      rule: "SAS about a common vertex",
      premises: [
        rel("cong", ["A", "B", "A", "E"]),
        rel("cong", ["A", "C", "A", "G"]),
        eqBAG_EAC,
      ],
      humanReadable:
        "BG = CE: triangles ABG and AEC share vertex A with AB = AE, AG = AC and " +
        "∠BAG = ∠EAC, so they are congruent (SAS) and BG = EC.",
    },
  ],
};
