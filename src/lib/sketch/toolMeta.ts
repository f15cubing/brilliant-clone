/**
 * Toolbar metadata (labels + usage hints) for the sketch sandbox. Kept separate
 * from the `SketchToolbar` component so the component module exports only a
 * component (and shares this data with the page's status line).
 */
import type { ToolMode } from "./types";

export const SKETCH_TOOLS: { mode: ToolMode; label: string; hint: string }[] = [
  { mode: "select", label: "Move", hint: "Drag points to explore the figure." },
  {
    mode: "point",
    label: "Point",
    hint: "Click empty space for a free point, or a line/circle for a point on it.",
  },
  { mode: "segment", label: "Segment", hint: "Click two points." },
  { mode: "line", label: "Line", hint: "Click two points." },
  { mode: "circle", label: "Circle", hint: "Click the center, then a point on the circle." },
  { mode: "midpoint", label: "Midpoint", hint: "Click two points." },
  { mode: "perpendicular", label: "Perp.", hint: "Click a line, then a point." },
  { mode: "parallel", label: "Parallel", hint: "Click a line, then a point." },
  { mode: "intersection", label: "Intersect", hint: "Click two lines/circles." },
  { mode: "polygon", label: "Polygon", hint: "Click points; click the first again to close." },
  {
    mode: "delete",
    label: "Delete",
    hint: "Click an object to remove it (and anything built on it).",
  },
];

/** Hint text for the active mode (used by the page status line). */
export function toolHint(mode: ToolMode): string {
  return SKETCH_TOOLS.find((t) => t.mode === mode)?.hint ?? "";
}
