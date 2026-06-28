import { COLORS, angleMark, polygon, segment } from "@/lib/content/boards";
import type { Coords } from "@/lib/freeplay/check";
import { rel } from "@/lib/freeplay/dsl";
import { add, midpoint, scale, sub, unit, type V } from "@/lib/freeplay/geom";
import type { BoardRefs } from "@/lib/geometry/board-types";
import type { Puzzle, Realization } from "@/lib/freeplay/types";

const coords: Coords = {
  A: [1, 6],
  B: [-3, 0],
  C: [5, 0],
  M: [1, 0],
};

const goal = rel("eqangle", ["B", "A", "M", "C", "A", "M"]); // ∠BAM = ∠CAM

/**
 * Generic realization: pick the base B, C freely and place the apex A on the
 * perpendicular bisector of BC (so AB = AC exactly), with M the midpoint of BC.
 * The isosceles + midpoint givens then hold by construction. Free: B, C, A.
 */
function construct(rng: () => number): Realization {
  const rnd = (lo: number, hi: number) => lo + (hi - lo) * rng();
  const B: V = [rnd(-4, -2), rnd(-1, 1)];
  const C: V = [rnd(2, 4), rnd(-1, 1)];
  const M = midpoint(B, C);
  const dir = unit(sub(C, B)) ?? [1, 0];
  const perp: V = [-dir[1], dir[0]]; // unit normal to BC
  const A = add(M, scale(perp, rnd(4, 7))); // apex on the perpendicular bisector
  return { coords: { A, B, C, M } };
}

/**
 * Movable form: B, C are free in the plane; the apex A glides on the
 * perpendicular bisector of BC (the hidden `movable` host line), so AB = AC stays
 * exact. M is the midpoint of BC.
 */
function constructFrom(free: Coords): Realization {
  const { A, B, C } = free;
  return { coords: { A, B, C, M: midpoint(B, C) } };
}

const Bv = (r: BoardRefs): V => [r.B.X(), r.B.Y()];
const Cv = (r: BoardRefs): V => [r.C.X(), r.C.Y()];
/** The midpoint of BC, then a point one normal-step away — together they span the perpendicular bisector. */
const pbMid = (axis: 0 | 1) => (r: BoardRefs) => midpoint(Bv(r), Cv(r))[axis];
const pbDir = (axis: 0 | 1) => (r: BoardRefs) => {
  const m = midpoint(Bv(r), Cv(r));
  const d = unit(sub(Cv(r), Bv(r))) ?? [1, 0];
  const perp: V = [-d[1], d[0]];
  return m[axis] + perp[axis] * 5;
};

/**
 * Isosceles median bisects the apex angle (core).
 *
 * In triangle ABC with AB = AC, M is the midpoint of BC. Triangles ABM and ACM
 * share the whole median side AM, so with AB = AC and (from the midpoint) MB = MC
 * they are congruent by SSS over the shared side — and the corresponding apex
 * angles ∠BAM and ∠CAM are equal.
 */
export const shared_side_congruence_problem: Puzzle = {
  id: "shared_side_congruence_problem",
  title: "Isosceles median bisects the apex angle",
  blurb:
    "Classic Euclidean lemma (AoPS Intro to Geometry, 'Isosceles & Equilateral " +
    "Triangles' / Euclid I.5–I.8 corollary): the median to the base of an " +
    "isosceles triangle bisects the apex angle. In triangle ABC with AB = AC, let " +
    "M be the midpoint of BC. Prove that the median AM bisects the apex angle: " +
    "∠BAM = ∠CAM.",
  difficulty: "core",
  coords,
  construct,
  constructFrom,
  freePoints: ["A", "B", "C"],
  // B, C are draggable; A glides on the (hidden) perpendicular bisector of BC, so
  // the isosceles hypothesis AB = AC is preserved automatically.
  movable: {
    hosts: [
      {
        id: "pbMid",
        type: "point",
        parents: [{ fn: pbMid(0) }, { fn: pbMid(1) }],
        attributes: { visible: false, fixed: true, size: 0.1, name: "" },
      },
      {
        id: "pbDir",
        type: "point",
        parents: [{ fn: pbDir(0) }, { fn: pbDir(1) }],
        attributes: { visible: false, fixed: true, size: 0.1, name: "" },
      },
      {
        id: "pbis",
        type: "line",
        parents: [{ ref: "pbMid" }, { ref: "pbDir" }],
        attributes: { visible: false },
      },
    ],
    gliders: { A: { on: "pbis" } },
  },
  figure: [
    polygon(["A", "B", "C"]),
    segment("A", "M", { strokeColor: COLORS.BRAND, strokeWidth: 2 }), // the median AM
    // The goal: the two equal halves of the apex angle.
    angleMark("B", "A", "M", { fillColor: COLORS.OK, strokeColor: COLORS.OK, radius: 1.1 }),
    angleMark("M", "A", "C", { fillColor: COLORS.OK, strokeColor: COLORS.OK, radius: 1.1 }),
  ],
  given: [
    // The triangle is isosceles at the apex A.
    rel("cong", ["A", "B", "A", "C"]),
    // M is the midpoint of the base BC.
    rel("midp", ["M", "B", "C"]),
  ],
  goal,
  solution: [
    {
      fact: rel("cong", ["M", "B", "M", "C"]),
      rule: "midpoint gives equal halves",
      premises: [rel("midp", ["M", "B", "C"])],
      humanReadable: "M is the midpoint of BC, so MB = MC.",
    },
    {
      fact: goal,
      rule: "shared-side congruent triangles",
      premises: [
        rel("cong", ["A", "B", "A", "C"]),
        rel("cong", ["M", "B", "M", "C"]),
      ],
      humanReadable:
        "Triangles ABM and ACM share the side AM; with AB = AC and MB = MC " +
        "they are congruent (SSS over the shared side), so ∠BAM = ∠CAM.",
    },
  ],
};
