/**
 * Declarative description of a JSXGraph board.
 *
 * Content files (TypeScript) describe boards with this spec; the `useJSXGraph`
 * hook is the *only* place that touches the imperative JSXGraph API. Because
 * content is authored in TS (not raw JSON) we allow function-valued args so
 * that labels/coordinates can update live as the learner drags points.
 */

/**
 * A live JSXGraph element/board. Kept loose on purpose: JSXGraph ships no usable
 * types and only `useJSXGraph` touches the imperative API behind these aliases.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export type JXGElement = any;
export type JXGBoard = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Map of element id -> created JSXGraph element, passed to dynamic functions. */
export type BoardRefs = Record<string, JXGElement>;

/** Function evaluated against the current board state (e.g. for a live label). */
export type BoardFn = (refs: BoardRefs) => number | number[] | string;

/**
 * A single parent argument passed to `board.create(type, parents, attrs)`.
 * - `number`            -> literal coordinate / value
 * - `string`            -> literal string (e.g. text content, point name)
 * - `{ ref }`           -> reference to a previously-created element by id
 * - `{ fn }`            -> dynamic value computed from current board state
 */
export type BoardArg = number | string | { ref: string } | { fn: BoardFn };

/**
 * Constraint run on every drag of an element. Receives the live board refs and
 * the dragged element; return a `[x, y]` to force the element back to that
 * position (e.g. to clamp a glider to one arc), or nothing to allow the move.
 */
export type BoardConstraint = (
  refs: BoardRefs,
  el: JXGElement,
) => [number, number] | void;

export interface BoardElementDef {
  /** Optional id so later elements / overlays can reference this one. */
  id?: string;
  /** JSXGraph element type: point, segment, line, circle, angle, polygon, text, arc, ... */
  type: string;
  parents: BoardArg[];
  attributes?: Record<string, unknown>;
  /** Optional drag constraint, e.g. to keep a glider on a particular arc. */
  constrain?: BoardConstraint;
}

export interface JSXGraphDef {
  boundingBox?: [number, number, number, number];
  keepAspectRatio?: boolean;
  elements: BoardElementDef[];
  /**
   * Enable free navigation: drag empty space to pan, scroll wheel to zoom, and
   * show the on-board zoom/reset controls. Used by the full-screen freeplay
   * board. Off by default so the inline course boards keep their Shift-gated
   * pan/zoom and never hijack page scroll.
   */
  freeNavigation?: boolean;
  /**
   * Render the figure as a static, non-interactive drawing: every point is
   * fixed (no dragging), pan/zoom are disabled, and hover highlighting is off.
   * Used by proof-comprehension steps that just need to *show* a construction.
   */
  staticFigure?: boolean;
}
