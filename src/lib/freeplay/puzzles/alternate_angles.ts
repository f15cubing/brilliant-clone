import { COLORS, angleMark, segment } from "@/lib/content/boards";
import type { Coords } from "@/lib/freeplay/check";
import { rel } from "@/lib/freeplay/dsl";
import { sub, type V } from "@/lib/freeplay/geom";
import type { Puzzle, Realization } from "@/lib/freeplay/types";

/**
 * Core construction. The transversal meets the parallel lines at P and Q; A is a
 * second point on line 1 and B = Q - (A - P) a second point on line 2. That makes
 * QB = -(A - P), i.e. line QB is ALWAYS parallel to line PA, and places A, B on
 * opposite sides of the transversal — so the alternate interior angles ∠APQ and
 * ∠BQP are equal in EVERY realization (negating both arms preserves the angle).
 * Free: P, A, Q (B is dependent).
 */
function core(P: V, A: V, Q: V): Realization {
  const d = sub(A, P);
  const B: V = [Q[0] - d[0], Q[1] - d[1]];
  return { coords: { P, A, Q, B } };
}

function construct(rng: () => number): Realization {
  const rnd = (lo: number, hi: number) => lo + (hi - lo) * rng();
  const P: V = [rnd(-1.6, -0.4), rnd(1.4, 2.6)];
  const A: V = [rnd(2.4, 3.6), rnd(1.4, 2.6)];
  const Q: V = [rnd(0.4, 1.6), rnd(-2.6, -1.4)];
  return core(P, A, Q);
}

function constructFrom(free: Coords): Realization {
  return core(free.P, free.A, free.Q);
}

/**
 * Alternate angles on a transversal (intro, 1 step).
 *
 * Two parallel lines PA ∥ QB are cut by the transversal PQ. Prove the alternate
 * interior angles are equal: ∠APQ = ∠BQP.
 */
export const alternateAngles: Puzzle = {
  id: "alternate-angles",
  title: "Alternate angles on a transversal",
  blurb:
    "Lines PA and QB are parallel and the transversal PQ crosses both. Show the " +
    "alternate interior angles are equal: ∠APQ = ∠BQP.",
  difficulty: "intro",
  coords: {
    P: [-1, 2],
    A: [3, 2],
    Q: [1, -2],
    B: [-3, -2],
  },
  figure: [
    segment("P", "A", { strokeColor: "#475569", strokeWidth: 2.5 }),
    segment("Q", "B", { strokeColor: "#475569", strokeWidth: 2.5 }),
    segment("P", "Q", { strokeColor: COLORS.BRAND, strokeWidth: 2.5 }),
    angleMark("A", "P", "Q", { fillColor: COLORS.ACCENT, strokeColor: COLORS.ACCENT, radius: 0.8 }),
    angleMark("B", "Q", "P", { fillColor: COLORS.BRAND, strokeColor: COLORS.BRAND, radius: 0.8 }),
  ],
  construct,
  constructFrom,
  freePoints: ["P", "A", "Q"],
  given: [rel("para", ["P", "A", "Q", "B"])],
  goal: rel("eqangle", ["A", "P", "Q", "B", "Q", "P"]),
  solution: [
    {
      fact: rel("eqangle", ["A", "P", "Q", "B", "Q", "P"]),
      rule: "parallel lines: equal angles",
      premises: [rel("para", ["P", "A", "Q", "B"])],
      humanReadable:
        "PA ∥ QB, so the transversal PQ makes equal alternate interior angles with them: ∠APQ = ∠BQP.",
    },
  ],
};
