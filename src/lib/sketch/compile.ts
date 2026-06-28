/**
 * Compile a construction (a list of `SketchStep`s) into the declarative
 * `BoardElementDef[]` consumed by the existing `useJSXGraph` renderer.
 *
 * Pure and dependency-light (no JSXGraph, no DOM), so it is fully unit-testable:
 * `compile(steps)` is a deterministic function of the steps. Each step maps to
 * exactly one board element; parents are referenced with the `{ ref: id }` arg
 * form, and the board ids equal the step ids so `tools.ts` / the hook can map
 * between them.
 */
import type { BoardArg, BoardElementDef } from "@/lib/geometry/board-types";
import { isFreeCoord, type SketchStep, type StepArg } from "./types";

// A self-contained palette (same hues as `content/boards.ts`) so the compiler
// stays decoupled from the lesson board helpers.
const INK = "#1b1714"; // neutral construction lines
const BRAND = "#27418c"; // free points
const AUX = "#9c8c70"; // circles / subordinate guides
const OK = "#3b6b4a"; // derived points (midpoint / intersection)

const LABEL_ATTR = {
  fontSize: 16,
  offset: [8, 6],
  cssStyle: "font-weight:600;",
};

const FREE_POINT_ATTRS = {
  size: 4,
  strokeColor: BRAND,
  fillColor: "#ffffff",
  strokeWidth: 2,
  label: LABEL_ATTR,
};

const DERIVED_POINT_ATTRS = {
  size: 3,
  strokeColor: OK,
  fillColor: OK,
  strokeWidth: 2,
  label: LABEL_ATTR,
};

const LINE_ATTRS = { strokeColor: INK, strokeWidth: 2 };
const CIRCLE_ATTRS = { strokeColor: AUX, strokeWidth: 2 };
const POLYGON_ATTRS = {
  borders: { strokeColor: INK, strokeWidth: 2 },
  fillColor: BRAND,
  fillOpacity: 0.08,
  vertices: { visible: false },
};

/** A reference parent `{ ref: id }`. */
const ref = (id: string): BoardArg => ({ ref: id });

/** Narrow a step arg to a point/object id, throwing on a malformed step. */
function refArg(arg: StepArg, kind: string): BoardArg {
  if (typeof arg !== "string") {
    throw new Error(`sketch ${kind}: expected an id reference, got ${JSON.stringify(arg)}`);
  }
  return ref(arg);
}

/**
 * Compile one step to its board element(s). Throws on a structurally invalid
 * step (wrong arg count/shape) — callers (import) validate first; interactive
 * construction only ever produces well-formed steps.
 */
export function compileStep(step: SketchStep): BoardElementDef[] {
  const { id, kind, args, label, style } = step;
  const name = label ?? id;

  switch (kind) {
    case "point": {
      const c = args[0];
      if (!isFreeCoord(c)) throw new Error("sketch point: expected a coordinate arg");
      return [
        {
          id,
          type: "point",
          parents: [c.x, c.y],
          attributes: { name, ...FREE_POINT_ATTRS, ...style },
        },
      ];
    }

    case "glider": {
      const c = args[0];
      const host = args[1];
      if (!isFreeCoord(c) || typeof host !== "string") {
        throw new Error("sketch glider: expected [coord, hostId]");
      }
      return [
        {
          id,
          type: "glider",
          parents: [c.x, c.y, ref(host)],
          attributes: { name, ...FREE_POINT_ATTRS, ...style },
        },
      ];
    }

    case "segment":
      return [
        {
          id,
          type: "segment",
          parents: [refArg(args[0], kind), refArg(args[1], kind)],
          attributes: { ...LINE_ATTRS, ...style },
        },
      ];

    case "line":
      return [
        {
          id,
          type: "line",
          parents: [refArg(args[0], kind), refArg(args[1], kind)],
          attributes: { ...LINE_ATTRS, ...style },
        },
      ];

    case "circle":
      return [
        {
          id,
          type: "circle",
          parents: [refArg(args[0], kind), refArg(args[1], kind)],
          attributes: { ...CIRCLE_ATTRS, ...style },
        },
      ];

    case "midpoint":
      return [
        {
          id,
          type: "midpoint",
          parents: [refArg(args[0], kind), refArg(args[1], kind)],
          attributes: { name, ...DERIVED_POINT_ATTRS, ...style },
        },
      ];

    case "intersection": {
      const index = typeof args[2] === "number" ? args[2] : 0;
      return [
        {
          id,
          type: "intersection",
          parents: [refArg(args[0], kind), refArg(args[1], kind), index],
          attributes: { name, ...DERIVED_POINT_ATTRS, ...style },
        },
      ];
    }

    case "perpendicular":
      // JSXGraph `perpendicular` takes [line, point] → the line through the
      // point perpendicular to the given line.
      return [
        {
          id,
          type: "perpendicular",
          parents: [refArg(args[0], kind), refArg(args[1], kind)],
          attributes: { ...LINE_ATTRS, ...style },
        },
      ];

    case "parallel":
      // JSXGraph `parallel` takes [line, point] → the line through the point
      // parallel to the given line.
      return [
        {
          id,
          type: "parallel",
          parents: [refArg(args[0], kind), refArg(args[1], kind)],
          attributes: { ...LINE_ATTRS, ...style },
        },
      ];

    case "polygon":
      return [
        {
          id,
          type: "polygon",
          parents: args.map((a) => refArg(a, kind)),
          attributes: { ...POLYGON_ATTRS, ...style },
        },
      ];
  }
}

/** Compile a whole construction into board elements, in order. */
export function compile(steps: SketchStep[]): BoardElementDef[] {
  return steps.flatMap(compileStep);
}
