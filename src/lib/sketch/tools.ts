/**
 * The pure tool state machine for the sketch sandbox.
 *
 * State = the construction (`steps`) + the active `mode` + a transient
 * `buffer` of operand ids the current multi-click tool has collected so far.
 * Every interaction is a `SketchAction`; `reduce` returns the next state with no
 * side effects, so the whole interaction model is unit-testable without a board.
 *
 * The React layer (`useSketchBoard` + `SketchCanvas`) is responsible only for
 * translating pointer events into a `click` action (an `at` coordinate plus the
 * id of any object under the pointer) and free-point drags into a `movePoint`.
 */
import {
  CIRCLE_KINDS,
  LINE_KINDS,
  POINT_KINDS,
  type FreeCoord,
  type SketchStep,
  type StepKind,
  type ToolMode,
} from "./types";
import { nextPointLabel, nextSeq, objectId, usedLabels } from "./ids";

export interface SketchState {
  mode: ToolMode;
  steps: SketchStep[];
  /** Operand ids collected by the in-progress multi-click tool. */
  buffer: string[];
  /** Monotonic id counter (never reused). */
  seq: number;
}

export const initialSketchState: SketchState = {
  mode: "select",
  steps: [],
  buffer: [],
  seq: 0,
};

/** A canvas click: board coordinate `at`, and the id of any object hit. */
export interface ClickTarget {
  at: FreeCoord;
  hitId: string | null;
}

export type SketchAction =
  | { type: "setMode"; mode: ToolMode }
  | { type: "click"; target: ClickTarget }
  | { type: "movePoint"; id: string; at: FreeCoord }
  | { type: "clear" }
  | { type: "load"; steps: SketchStep[] };

// ---- small pure helpers -----------------------------------------------------

function findStep(state: SketchState, id: string): SketchStep | undefined {
  return state.steps.find((s) => s.id === id);
}

function kindOf(state: SketchState, id: string): StepKind | null {
  return findStep(state, id)?.kind ?? null;
}

function isPointId(state: SketchState, id: string): boolean {
  const k = kindOf(state, id);
  return k != null && POINT_KINDS.has(k);
}

function isLineId(state: SketchState, id: string): boolean {
  const k = kindOf(state, id);
  return k != null && LINE_KINDS.has(k);
}

function isObjectId(state: SketchState, id: string): boolean {
  const k = kindOf(state, id);
  return k != null && (LINE_KINDS.has(k) || CIRCLE_KINDS.has(k));
}

/** Append a step of `kind` with `args`; returns the new state and the new id. */
function addStep(
  state: SketchState,
  kind: StepKind,
  args: SketchStep["args"],
): { state: SketchState; id: string } {
  const id = objectId(state.seq);
  const step: SketchStep = { id, kind, args };
  if (POINT_KINDS.has(kind)) step.label = nextPointLabel(usedLabels(state.steps));
  return {
    state: { ...state, steps: [...state.steps, step], seq: state.seq + 1 },
    id,
  };
}

/**
 * Resolve a point operand from a click: the clicked point's id when an existing
 * point was hit, otherwise a freshly-created free point at the click.
 */
function pointOperand(
  state: SketchState,
  target: ClickTarget,
): { state: SketchState; id: string } {
  if (target.hitId && isPointId(state, target.hitId)) {
    return { state, id: target.hitId };
  }
  return addStep(state, "point", [target.at]);
}

// ---- per-mode handlers ------------------------------------------------------

/** point tool: free point on empty space, or a glider when a line/circle is hit. */
function placePointOrGlider(state: SketchState, target: ClickTarget): SketchState {
  if (target.hitId) {
    if (isObjectId(state, target.hitId)) {
      return addStep(state, "glider", [target.at, target.hitId]).state;
    }
    return state; // clicked an existing point/polygon — nothing to do
  }
  return addStep(state, "point", [target.at]).state;
}

/** segment / line / circle / midpoint: collect two point operands, then build. */
function collectTwoPoints(
  state: SketchState,
  kind: StepKind,
  target: ClickTarget,
): SketchState {
  const { state: s1, id } = pointOperand(state, target);
  if (s1.buffer.includes(id)) return s1; // ignore a repeated point
  const buffer = [...s1.buffer, id];
  if (buffer.length < 2) return { ...s1, buffer };
  return addStep({ ...s1, buffer: [] }, kind, buffer).state;
}

/** perpendicular / parallel: first a line operand, then a point operand. */
function collectLineThenPoint(
  state: SketchState,
  kind: StepKind,
  target: ClickTarget,
): SketchState {
  if (state.buffer.length === 0) {
    if (target.hitId && isLineId(state, target.hitId)) {
      return { ...state, buffer: [target.hitId] };
    }
    return state; // need a line first
  }
  const lineId = state.buffer[0];
  const { state: s1, id } = pointOperand(state, target);
  return addStep({ ...s1, buffer: [] }, kind, [lineId, id]).state;
}

/** intersection: collect two line/circle operands (branch index defaults to 0). */
function collectTwoObjects(state: SketchState, target: ClickTarget): SketchState {
  if (!target.hitId || !isObjectId(state, target.hitId)) return state;
  if (state.buffer.includes(target.hitId)) return state;
  const buffer = [...state.buffer, target.hitId];
  if (buffer.length < 2) return { ...state, buffer };
  return addStep({ ...state, buffer: [] }, "intersection", [buffer[0], buffer[1], 0]).state;
}

/** polygon: collect ≥3 point operands; re-clicking the first point closes it. */
function collectPolygon(state: SketchState, target: ClickTarget): SketchState {
  if (
    target.hitId &&
    state.buffer.length >= 3 &&
    target.hitId === state.buffer[0]
  ) {
    return addStep({ ...state, buffer: [] }, "polygon", state.buffer).state;
  }
  const { state: s1, id } = pointOperand(state, target);
  if (s1.buffer.includes(id)) return s1; // ignore a repeated vertex
  return { ...s1, buffer: [...s1.buffer, id] };
}

/** Remove `id` and every step that (transitively) references it. */
function deleteCascade(state: SketchState, id: string): SketchState {
  const remove = new Set<string>([id]);
  for (let changed = true; changed; ) {
    changed = false;
    for (const s of state.steps) {
      if (remove.has(s.id)) continue;
      if (s.args.some((a) => typeof a === "string" && remove.has(a))) {
        remove.add(s.id);
        changed = true;
      }
    }
  }
  return {
    ...state,
    steps: state.steps.filter((s) => !remove.has(s.id)),
    buffer: state.buffer.filter((b) => !remove.has(b)),
  };
}

/** Write a dragged free point's / glider's new position back into its step. */
function moveFreePoint(state: SketchState, id: string, at: FreeCoord): SketchState {
  return {
    ...state,
    steps: state.steps.map((s) => {
      if (s.id !== id) return s;
      if (s.kind === "point") return { ...s, args: [at] };
      if (s.kind === "glider") return { ...s, args: [at, s.args[1]] };
      return s; // derived points are not directly movable
    }),
  };
}

function handleClick(state: SketchState, target: ClickTarget): SketchState {
  switch (state.mode) {
    case "select":
      return state;
    case "delete":
      return target.hitId ? deleteCascade(state, target.hitId) : state;
    case "point":
    case "glider":
      return placePointOrGlider(state, target);
    case "segment":
    case "line":
    case "circle":
    case "midpoint":
      return collectTwoPoints(state, state.mode, target);
    case "perpendicular":
    case "parallel":
      return collectLineThenPoint(state, state.mode, target);
    case "intersection":
      return collectTwoObjects(state, target);
    case "polygon":
      return collectPolygon(state, target);
  }
}

/** The pure reducer: `(state, action) → next state`. */
export function reduce(state: SketchState, action: SketchAction): SketchState {
  switch (action.type) {
    case "setMode":
      // Switching tools abandons any half-collected operands.
      return { ...state, mode: action.mode, buffer: [] };
    case "click":
      return handleClick(state, action.target);
    case "movePoint":
      return moveFreePoint(state, action.id, action.at);
    case "clear":
      return { ...initialSketchState };
    case "load":
      return {
        mode: "select",
        steps: action.steps,
        buffer: [],
        seq: nextSeq(action.steps),
      };
  }
}
