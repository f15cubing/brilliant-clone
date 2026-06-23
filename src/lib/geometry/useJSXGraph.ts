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

export interface UseJSXGraphResult {
  /** Attach to the board container div. */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Add overlay elements (e.g. an explanation's construction lines). */
  applyOverlay: (def: JSXGraphDef) => void;
  /** Remove all overlay elements, restoring the learner's configuration. */
  clearOverlays: () => void;
  /** Read the current element map (for grading geometric actions). */
  getRefs: () => BoardRefs;
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

    const board: JXGBoard = JXG.JSXGraph.initBoard(container, {
      boundingbox: def.boundingBox ?? DEFAULT_BOUNDING_BOX,
      keepaspectratio: def.keepAspectRatio ?? true,
      axis: false,
      grid: false,
      showCopyright: false,
      showNavigation: false,
      showInfobox: false,
      pan: { needShift: true, needTwoFingers: true },
      zoom: { needShift: true, pinchHorizontal: false, pinchVertical: false },
    } as Record<string, unknown>);
    boardRef.current = board;

    board.suspendUpdate();
    buildElements(board, def.elements, refs);
    board.unsuspendUpdate();

    return () => {
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

  return { containerRef, applyOverlay, clearOverlays, getRefs };
}
