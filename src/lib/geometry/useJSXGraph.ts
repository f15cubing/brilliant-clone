import { useCallback, useEffect, useId, useRef } from "react";
import JXG from "jsxgraph";
import type {
  BoardArg,
  BoardElementDef,
  BoardRefs,
  JSXGraphDef,
  JXGBoard,
  JXGElement,
} from "./board-types";

const DEFAULT_BOUNDING_BOX: [number, number, number, number] = [-6, 6, 6, -6];

function resolveArg(arg: BoardArg, refs: BoardRefs): unknown {
  if (typeof arg === "number" || typeof arg === "string") return arg;
  if ("ref" in arg) {
    const el = refs[arg.ref];
    if (!el) {
      console.warn(`[useJSXGraph] missing ref "${arg.ref}"`);
    }
    return el;
  }
  // Dynamic value: JSXGraph re-evaluates the function on every board update.
  return () => arg.fn(refs);
}

function buildElements(
  board: JXGBoard,
  defs: BoardElementDef[],
  refs: BoardRefs,
): JXGElement[] {
  const created: JXGElement[] = [];
  for (const def of defs) {
    const parents = def.parents.map((p) => resolveArg(p, refs));
    const el = board.create(def.type, parents, def.attributes ?? {});
    created.push(el);
    if (def.id) refs[def.id] = el;
    if (def.constrain) {
      const constrain = def.constrain;
      el.on("drag", () => {
        const target = constrain(refs, el);
        if (target) {
          el.setPositionDirectly(JXG.COORDS_BY_USER, target);
          board.update();
        }
      });
    }
  }
  return created;
}

/** A pointer-down on the board: the point id under the pointer (if any) + where. */
export interface BoardDownTarget {
  hitId: string | null;
  at: { x: number; y: number };
}

export interface UseJSXGraphResult {
  /** Attach to the board container div. */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Add overlay elements (e.g. an explanation's construction lines). */
  applyOverlay: (def: JSXGraphDef) => void;
  /** Remove all overlay elements, restoring the learner's configuration. */
  clearOverlays: () => void;
  /** Read the current element map (for grading geometric actions). */
  getRefs: () => BoardRefs;
  /**
   * Register a pointer-down handler that hit-tests the point under the pointer
   * (for on-canvas construction). Returns an unsubscribe.
   */
  onBoardDown: (handler: (target: BoardDownTarget) => void) => () => void;
  /**
   * Fix (or restore) every point so construction clicks select points instead of
   * dragging them. Original per-point draggability is remembered and restored.
   */
  setPointsFixed: (fixed: boolean) => void;
}

/**
 * The single bridge between React (declarative) and JSXGraph (imperative).
 *
 * Owns board creation, element construction, overlay management and teardown.
 * The board is rebuilt whenever `def` changes (i.e. when moving to a new
 * problem) and always freed on unmount to avoid leaks.
 */
export function useJSXGraph(def: JSXGraphDef): UseJSXGraphResult {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<JXGBoard | null>(null);
  const refsRef = useRef<BoardRefs>({});
  const overlayElsRef = useRef<JXGElement[]>([]);
  const overlayIdsRef = useRef<string[]>([]);
  const reactId = useId().replace(/:/g, "_");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.id = `jxg_${reactId}`;
    const refs: BoardRefs = {};
    refsRef.current = refs;

    // Full-screen freeplay boards get free navigation (drag to pan, wheel to
    // zoom, on-board zoom/reset controls). Inline course boards keep Shift-gated
    // pan/zoom so scrolling the page over a board never hijacks the wheel.
    const nav = def.freeNavigation ?? false;
    const isStatic = def.staticFigure ?? false;
    const board: JXGBoard = JXG.JSXGraph.initBoard(container, {
      boundingbox: def.boundingBox ?? DEFAULT_BOUNDING_BOX,
      keepaspectratio: def.keepAspectRatio ?? true,
      axis: false,
      grid: false,
      showCopyright: false,
      showNavigation: nav,
      showInfobox: false,
      pan: { enabled: !isStatic, needShift: !nav, needTwoFingers: !nav },
      zoom: {
        enabled: !isStatic,
        wheel: nav,
        needShift: !nav,
        pinchHorizontal: false,
        pinchVertical: false,
      },
    } as Record<string, unknown>);
    boardRef.current = board;

    board.suspendUpdate();
    const built = buildElements(board, def.elements, refs);
    // A static figure is a drawing, not a manipulable: pin every element so it
    // can't be dragged and silence hover highlighting across the figure.
    if (isStatic) {
      for (const el of built) {
        try {
          el.setAttribute({ fixed: true, highlight: false });
        } catch {
          /* not all element types accept these attrs */
        }
      }
    }
    board.unsuspendUpdate();

    // Keep the JSXGraph viewport in sync with the container's pixel size so the
    // board can fill a responsive, near-full-screen box (the freeplay arena) and
    // still rescale correctly on window/layout changes. `resizeContainer`
    // preserves the bounding box, so the figure just refits — no rebuild.
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (w > 0 && h > 0) {
          board.resizeContainer(w, h, true);
          board.update();
        }
      });
      resizeObserver.observe(container);
    }

    return () => {
      resizeObserver?.disconnect();
      overlayElsRef.current = [];
      overlayIdsRef.current = [];
      JXG.JSXGraph.freeBoard(board);
      boardRef.current = null;
      refsRef.current = {};
    };
  }, [def, reactId]);

  const applyOverlay = useCallback((overlay: JSXGraphDef) => {
    const board = boardRef.current;
    if (!board) return;
    board.suspendUpdate();
    const els = buildElements(board, overlay.elements, refsRef.current);
    board.unsuspendUpdate();
    board.update();
    overlayElsRef.current.push(...els);
    for (const d of overlay.elements) {
      if (d.id) overlayIdsRef.current.push(d.id);
    }
  }, []);

  const clearOverlays = useCallback(() => {
    const board = boardRef.current;
    if (!board) return;
    board.suspendUpdate();
    for (const el of [...overlayElsRef.current].reverse()) {
      try {
        board.removeObject(el);
      } catch {
        /* element may already be gone */
      }
    }
    board.unsuspendUpdate();
    board.update();
    for (const id of overlayIdsRef.current) delete refsRef.current[id];
    overlayElsRef.current = [];
    overlayIdsRef.current = [];
  }, []);

  const getRefs = useCallback(() => refsRef.current, []);

  const onBoardDown = useCallback(
    (handler: (target: BoardDownTarget) => void) => {
      const board = boardRef.current;
      if (!board) return () => {};
      const findHit = (sx: number, sy: number): string | null => {
        const refs = refsRef.current;
        // Newest first, so a learner's just-added aux point wins a tie.
        for (const id of Object.keys(refs).reverse()) {
          const el = refs[id];
          if (el && el.elementClass === 1 && el.hasPoint?.(sx, sy)) return id;
        }
        return null;
      };
      const onDown = (e: Event) => {
        const pos = board.getMousePosition(e);
        const c = new JXG.Coords(JXG.COORDS_BY_SCREEN, pos, board);
        handler({
          hitId: findHit(c.scrCoords[1], c.scrCoords[2]),
          at: { x: c.usrCoords[1], y: c.usrCoords[2] },
        });
      };
      board.on("down", onDown);
      return () => {
        try {
          board.off("down", onDown);
        } catch {
          /* board may already be freed */
        }
      };
    },
    [],
  );

  const setPointsFixed = useCallback((fixed: boolean) => {
    const board = boardRef.current;
    if (!board) return;
    const refs = refsRef.current;
    for (const id of Object.keys(refs)) {
      const el = refs[id] as JXGElement & { _origFixed?: boolean };
      if (!el || el.elementClass !== 1) continue;
      if (el._origFixed === undefined) el._origFixed = !!el.getAttribute("fixed");
      el.setAttribute({ fixed: fixed ? true : el._origFixed });
    }
    board.update();
  }, []);

  return {
    containerRef,
    applyOverlay,
    clearOverlays,
    getRefs,
    onBoardDown,
    setPointsFixed,
  };
}
