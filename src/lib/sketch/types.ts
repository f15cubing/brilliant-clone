/**
 * The serializable construction model for the interactive sketch sandbox.
 *
 * A sketch is an ORDERED list of construction `SketchStep`s. Each step produces
 * one geometric object and references its parents (prior steps) by id, so the
 * list is a topologically-sorted DAG: parents always precede dependents. The
 * step list is the COMPLETE persisted state — dependent objects hold no
 * coordinates (JSXGraph recomputes them from their parents), and a free
 * point/glider drag writes its new position back into that step's args.
 *
 * `compile.ts` turns steps into the declarative `BoardElementDef[]` the existing
 * `useJSXGraph` renders; `tools.ts` is the pure reducer that appends/removes
 * steps in response to canvas interactions.
 */

/** The geometric object kinds a construction step can produce. */
export type StepKind =
  | "point" // a free, draggable point at literal coordinates
  | "glider" // a point bound to (and draggable along) a host line/circle
  | "segment" // segment between two points
  | "line" // infinite line through two points
  | "circle" // circle with a center point through a second point
  | "intersection" // intersection point of two line/circle objects
  | "midpoint" // midpoint of two points
  | "perpendicular" // line through a point, perpendicular to a line
  | "parallel" // line through a point, parallel to a line
  | "polygon"; // closed polygon through ≥3 points

/**
 * Toolbar modes: every constructive `StepKind` plus the two non-constructive
 * interaction modes. `select` drags free points (explore); `delete` removes a
 * clicked object (and its dependents).
 */
export type ToolMode = StepKind | "select" | "delete";

/** A literal free coordinate — a free point's (or glider's) draggable position. */
export interface FreeCoord {
  x: number;
  y: number;
}

/**
 * One argument of a step: a reference to a prior step's id (`string`), a literal
 * `FreeCoord` (only free points / gliders), or a `number` (the branch index of
 * an `intersection`, 0 or 1).
 */
export type StepArg = string | number | FreeCoord;

/** One construction step (one geometric object). */
export interface SketchStep {
  /** Stable unique id; also the rendered object's board id. Never reused. */
  id: string;
  kind: StepKind;
  /** Parent ids and/or literal coords / intersection index (see `StepArg`). */
  args: StepArg[];
  /** Display label (auto-assigned for points: A, B, C, …). */
  label?: string;
  /** Optional per-object style overrides merged onto the kind's defaults. */
  style?: Record<string, unknown>;
}

/** A saved sketch: a titled construction plus metadata. */
export interface Construction {
  id: string;
  title: string;
  steps: SketchStep[];
  boundingBox?: [number, number, number, number];
  createdAt: number;
  updatedAt: number;
  /** Owner uid when saved to an account; absent for guest/local sketches. */
  ownerUid?: string;
}

/** Step kinds that render as a point (usable as a point operand). */
export const POINT_KINDS: ReadonlySet<StepKind> = new Set<StepKind>([
  "point",
  "glider",
  "midpoint",
  "intersection",
]);

/** Step kinds that render as a straight line (usable as a line operand). */
export const LINE_KINDS: ReadonlySet<StepKind> = new Set<StepKind>([
  "segment",
  "line",
  "perpendicular",
  "parallel",
]);

/** Step kinds that render as a circle. */
export const CIRCLE_KINDS: ReadonlySet<StepKind> = new Set<StepKind>(["circle"]);

/** True when `arg` is a literal coordinate (vs. an id ref or a number index). */
export function isFreeCoord(arg: StepArg): arg is FreeCoord {
  return typeof arg === "object" && arg !== null && "x" in arg && "y" in arg;
}
