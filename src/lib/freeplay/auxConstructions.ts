/**
 * Learner-added AUXILIARY CONSTRUCTIONS for a freeplay proof.
 *
 * A hard olympiad problem is often unlocked by adding a point the statement does
 * not mention — the midpoint of a segment, the foot of a perpendicular, the
 * second intersection of a line and a circle, a reflection, … This module is the
 * sound core that lets a learner introduce such points mid-proof:
 *
 *  - `AuxStep` is the serializable definition of one construction (its new point
 *    id + the construction kind + the existing point ids it references).
 *  - `extendCoords` recomputes the new points' coordinates ON TOP OF any base
 *    realization, so multi-case verification still works: the verifier checks a
 *    cited step against the canonical figure AND several sampled realizations, and
 *    every aux point exists, consistently constructed, in each of them.
 *  - `auxFacts` emits the DDAR fact(s) the construction GUARANTEES (e.g. a
 *    midpoint emits `midp`, a foot emits `coll`+`perp`). These hold by
 *    construction in every realization, so they are sound to grant as citable
 *    premises — that is exactly how the learner "uses" the new point.
 *  - `compileAux` renders the new point (plus a faint guide) on the board.
 *
 * Only DETERMINED constructions are supported (the new point is a function of the
 * existing ones), which keeps every emitted fact sound across all realizations.
 */
import type { BoardElementDef } from "@/lib/geometry/board-types";
import type { Coords } from "./check";
import { rel, type LFact } from "./dsl";
import type { Realization } from "./types";
import {
  add,
  dist,
  foot,
  lineCircleIntersect,
  lineIntersect,
  midpoint,
  reflectOverLine,
  reflectPoint,
  scale,
  sub,
  type V,
} from "./geom";

export type AuxKind =
  | "midpoint" // midpoint of the segment args[0]args[1]
  | "foot" // foot of perpendicular from args[0] onto line args[1]args[2]
  | "inter_ll" // intersection of line args[0]args[1] and line args[2]args[3]
  | "inter_lc" // line args[0]args[1] ∩ circle(centre args[2], through args[3]); index 0/1
  | "inter_cc" // circle(args[0],args[1]) ∩ circle(args[2],args[3]); index 0/1
  | "reflect_point" // reflection of args[0] in the point args[1]
  | "reflect_line"; // reflection of args[0] in the line args[1]args[2]

export interface AuxStep {
  /** The new point's id/label; also its board id. Must be unique across the figure. */
  id: string;
  kind: AuxKind;
  /** Ids of the existing points this construction references. */
  args: string[];
  /** Branch selector for the two-solution intersections (`inter_lc`, `inter_cc`). */
  index?: 0 | 1;
}

/** How many point operands each construction kind consumes. */
export const AUX_ARITY: Record<AuxKind, number> = {
  midpoint: 2,
  foot: 3,
  inter_ll: 4,
  inter_lc: 4,
  inter_cc: 4,
  reflect_point: 2,
  reflect_line: 3,
};

/** Human label for the toolbar / fact list. */
export const AUX_LABEL: Record<AuxKind, string> = {
  midpoint: "Midpoint of two points",
  foot: "Foot of perpendicular (point → line)",
  inter_ll: "Intersection of two lines",
  inter_lc: "Intersection of a line and a circle",
  inter_cc: "Intersection of two circles",
  reflect_point: "Reflection of a point in a point",
  reflect_line: "Reflection of a point in a line",
};

/** A short toolbar caption per construction. */
export const AUX_SHORT: Record<AuxKind, string> = {
  midpoint: "Midpoint",
  foot: "Foot ⟂",
  inter_ll: "Line ∩ Line",
  inter_lc: "Line ∩ Circle",
  inter_cc: "Circle ∩ Circle",
  reflect_point: "Reflect in point",
  reflect_line: "Reflect in line",
};

/** What each successive click means, so the UI can prompt for the next operand. */
export const AUX_OPERAND_HINTS: Record<AuxKind, string[]> = {
  midpoint: ["first point", "second point"],
  foot: ["point to drop", "line point", "line point"],
  inter_ll: ["line 1 point", "line 1 point", "line 2 point", "line 2 point"],
  inter_lc: ["line point", "line point", "circle centre", "point on circle"],
  inter_cc: ["circle 1 centre", "point on circle 1", "circle 2 centre", "point on circle 2"],
  reflect_point: ["point to reflect", "centre of reflection"],
  reflect_line: ["point to reflect", "mirror-line point", "mirror-line point"],
};

const TWO_SOLUTION = new Set<AuxKind>(["inter_lc", "inter_cc"]);

/** Whether a construction has two solution branches (a toggleable index). */
export function hasTwoSolutions(kind: AuxKind): boolean {
  return TWO_SOLUTION.has(kind);
}

/** The first A, B, … Z, A1, … label not already used (e.g. by the puzzle's points). */
export function nextAuxLabel(used: ReadonlySet<string>): string {
  for (let i = 0; ; i++) {
    const letter = String.fromCharCode(65 + (i % 26));
    const group = Math.floor(i / 26);
    const label = group === 0 ? letter : `${letter}${group}`;
    if (!used.has(label)) return label;
  }
}

/** Build a new aux step from collected operands: assign a fresh label + default branch. */
export function makeAuxStep(
  kind: AuxKind,
  args: string[],
  used: ReadonlySet<string>,
): AuxStep {
  const step: AuxStep = { id: nextAuxLabel(used), kind, args };
  if (TWO_SOLUTION.has(kind)) step.index = 0;
  return step;
}

/** Two intersection points of circle (c1,r1) and circle (c2,r2), or [] if none. */
function circleCircle(c1: V, r1: number, c2: V, r2: number): V[] {
  const d = dist(c1, c2);
  if (d < 1e-12 || d > r1 + r2 + 1e-9 || d < Math.abs(r1 - r2) - 1e-9) return [];
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h2 = r1 * r1 - a * a;
  const h = Math.sqrt(Math.max(0, h2));
  const dir = scale(sub(c2, c1), 1 / d);
  const mid = add(c1, scale(dir, a));
  const perp: V = [-dir[1], dir[0]];
  return [add(mid, scale(perp, h)), add(mid, scale(perp, -h))];
}

/**
 * Compute the coordinate of one aux point from a coordinate map, or `null` if the
 * construction is degenerate in this realization (parallel lines, a line missing
 * the circle, an out-of-range branch index, …) — the caller treats `null` as
 * "this realization can't host the construction".
 */
export function evalAuxPoint(step: AuxStep, coords: Coords): V | null {
  const p = step.args.map((id) => coords[id]);
  if (p.some((q) => !q || !Number.isFinite(q[0]) || !Number.isFinite(q[1]))) {
    return null;
  }
  const idx = step.index ?? 0;
  switch (step.kind) {
    case "midpoint":
      return midpoint(p[0], p[1]);
    case "foot":
      return foot(p[0], p[1], p[2]);
    case "reflect_point":
      return reflectPoint(p[0], p[1]);
    case "reflect_line":
      return reflectOverLine(p[0], p[1], p[2]);
    case "inter_ll":
      return lineIntersect(p[0], p[1], p[2], p[3]);
    case "inter_lc": {
      const hits = lineCircleIntersect(p[0], p[1], p[2], dist(p[2], p[3]));
      return hits[idx] ?? null;
    }
    case "inter_cc": {
      const hits = circleCircle(p[0], dist(p[0], p[1]), p[2], dist(p[2], p[3]));
      return hits[idx] ?? null;
    }
  }
}

/**
 * Fold the aux steps onto a base coordinate map, computing each new point in
 * order (later steps may reference earlier aux points). A step that is degenerate
 * in this realization is skipped — its id is simply absent, so any fact naming it
 * fails the verifier's numeric check (rather than producing a bogus coordinate).
 */
export function extendCoords(base: Coords, steps: AuxStep[]): Coords {
  const out: Coords = { ...base };
  for (const step of steps) {
    const v = evalAuxPoint(step, out);
    if (v) out[step.id] = v;
  }
  return out;
}

/**
 * Re-build every realization (the canonical figure + each sampled one) with the
 * aux points folded in, so the multi-case verifier sees the learner's
 * constructions in every figure. This is the seam that makes aux points sound to
 * verify against — `extendCoords` recomputes them generically per realization.
 */
export function extendRealizations(
  realizations: Realization[],
  steps: AuxStep[],
): Realization[] {
  if (steps.length === 0) return realizations;
  return realizations.map((r) => ({ ...r, coords: extendCoords(r.coords, steps) }));
}

/** All defining facts of the current aux constructions (the citable premises). */
export function allAuxFacts(steps: AuxStep[]): LFact[] {
  return steps.flatMap(auxFacts);
}

/**
 * The DDAR fact(s) a construction guarantees about its new point — the premises a
 * learner can cite once the point is introduced. All are true by construction in
 * every (non-degenerate) realization, so granting them is sound.
 */
export function auxFacts(step: AuxStep): LFact[] {
  const [a, b, c] = step.args;
  const M = step.id;
  switch (step.kind) {
    case "midpoint":
      return [rel("midp", [M, a, b])];
    case "foot":
      // F on line bc, and the dropped segment aF ⟂ bc.
      return [rel("coll", [b, M, c]), rel("perp", [a, M, b, c])];
    case "inter_ll":
      return [rel("coll", [a, M, b]), rel("coll", [step.args[2], M, step.args[3]])];
    case "inter_lc":
      // M on line ab, and on the circle (centre c, through args[3]) ⇒ Mc = (args[3])c.
      return [
        rel("coll", [a, M, b]),
        rel("cong", [c, M, c, step.args[3]]),
      ];
    case "inter_cc":
      // M on circle (a, through b) and on circle (c, through args[3]).
      return [
        rel("cong", [a, M, a, b]),
        rel("cong", [c, M, c, step.args[3]]),
      ];
    case "reflect_point":
      // b is the midpoint of a and its reflection M.
      return [rel("midp", [b, a, M])];
    case "reflect_line":
      // M is the mirror of a in line bc: bc ⟂ aM, and b,c are equidistant from a,M.
      return [
        rel("perp", [a, M, b, c]),
        rel("cong", [b, a, b, M]),
        rel("cong", [c, a, c, M]),
      ];
  }
}

// --- board rendering ---------------------------------------------------------

const AUX_COLOR = "#7a3ea8"; // a distinct violet so aux points read as learner-added
const POINT_ATTRS = {
  size: 4,
  strokeColor: AUX_COLOR,
  fillColor: "#fff",
  strokeWidth: 2,
  label: { fontSize: 17, offset: [8, 6], cssStyle: "font-weight:700;" },
};
const GUIDE = { strokeColor: AUX_COLOR, strokeWidth: 1, dash: 2 };

const ref = (id: string) => ({ ref: id });

/**
 * A point whose coordinates are recomputed from the LIVE element positions via
 * the same evaluator used for verification — so the aux point tracks the figure
 * as it is dragged, for every construction kind (reflections and indexed circle
 * intersections included).
 */
function computedParents(step: AuxStep): BoardElementDef["parents"] {
  const live = (i: 0 | 1) => (refs: Record<string, { X(): number; Y(): number }>) => {
    const coords: Coords = {};
    for (const id of step.args) {
      const el = refs[id];
      if (el) coords[id] = [el.X(), el.Y()];
    }
    const v = evalAuxPoint(step, coords);
    return v ? v[i] : NaN;
  };
  return [{ fn: live(0) }, { fn: live(1) }];
}

/**
 * Board elements for one aux step: the new (violet, learner-added) point plus a
 * faint guide showing how it was built (the dropped perpendicular, the reflection
 * segment). `midpoint` uses the JSXGraph primitive; every other kind is a
 * function-computed point so it follows drags via the shared evaluator.
 */
export function compileAuxStep(step: AuxStep): BoardElementDef[] {
  const M = step.id;
  const point: BoardElementDef =
    step.kind === "midpoint"
      ? {
          id: M,
          type: "midpoint",
          parents: [ref(step.args[0]), ref(step.args[1])],
          attributes: { name: M, ...POINT_ATTRS },
        }
      : {
          id: M,
          type: "point",
          parents: computedParents(step),
          attributes: { name: M, fixed: true, ...POINT_ATTRS },
        };

  const guides: BoardElementDef[] =
    step.kind === "foot" || step.kind === "reflect_line" || step.kind === "reflect_point"
      ? [{ type: "segment", parents: [ref(step.args[0]), ref(M)], attributes: GUIDE }]
      : [];

  return [point, ...guides];
}

/** Compile all aux steps to board elements, in order. */
export function compileAux(steps: AuxStep[]): BoardElementDef[] {
  return steps.flatMap(compileAuxStep);
}
