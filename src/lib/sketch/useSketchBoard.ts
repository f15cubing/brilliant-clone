/**
 * The single imperative bridge between the sketch sandbox's React state and
 * JSXGraph (mirrors `geometry/useJSXGraph` for the lesson boards, but built for
 * live, user-driven construction rather than a fixed declarative figure).
 *
 * Responsibilities:
 *  - create the board once and free it on unmount;
 *  - INCREMENTALLY sync board elements to `steps` (add new, remove deleted, and
 *    cascade — never rebuild, so drag state and the view are preserved);
 *  - translate a pointer `down` into a `{ at, hitId }` click target for the tool
 *    reducer (the id of any object under the pointer, points preferred);
 *  - capture free-point / glider drags (on pointer up in select mode) and report
 *    the new coordinate back so it can be persisted into the step;
 *  - toggle point draggability by mode: free points drag only in `select` mode;
 *    in any construction/delete mode they are fixed so a click selects them as
 *    an operand instead of moving them.
 */
import { useEffect, useRef } from "react";
import JXG from "jsxgraph";
import type { BoardArg, BoardRefs, JXGBoard, JXGElement } from "@/lib/geometry/board-types";
import { compileStep } from "./compile";
import { POINT_KINDS, type FreeCoord, type SketchStep, type StepKind, type ToolMode } from "./types";

const BOUNDING_BOX: [number, number, number, number] = [-8, 8, 8, -8];

/** Resolve a compiled `BoardArg` against the live element map (see useJSXGraph). */
function resolveArg(arg: BoardArg, refs: BoardRefs): unknown {
  if (typeof arg === "number" || typeof arg === "string") return arg;
  if ("ref" in arg) return refs[arg.ref];
  return () => arg.fn(refs);
}

export interface UseSketchBoardArgs {
  steps: SketchStep[];
  mode: ToolMode;
  onClickTarget: (target: { at: FreeCoord; hitId: string | null }) => void;
  onMovePoint: (id: string, at: FreeCoord) => void;
}

export interface UseSketchBoardResult {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function useSketchBoard({
  steps,
  mode,
  onClickTarget,
  onMovePoint,
}: UseSketchBoardArgs): UseSketchBoardResult {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<JXGBoard | null>(null);
  const refsRef = useRef<BoardRefs>({});
  const elsRef = useRef<Map<string, JXGElement>>(new Map());
  const kindRef = useRef<Map<string, StepKind>>(new Map());

  // The persistent board event handlers read the LATEST mode/callbacks via refs,
  // so they never need re-binding when those props change.
  const modeRef = useRef(mode);
  const clickCbRef = useRef(onClickTarget);
  const moveCbRef = useRef(onMovePoint);
  modeRef.current = mode;
  clickCbRef.current = onClickTarget;
  moveCbRef.current = onMovePoint;

  // ---- board creation (once) ------------------------------------------------
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    // Capture the (stable) maps so the cleanup closure doesn't read a ref that
    // lint flags as possibly-changed; they are created once and only mutated.
    const els = elsRef.current;
    const kinds = kindRef.current;

    const board: JXGBoard = JXG.JSXGraph.initBoard(container, {
      boundingbox: BOUNDING_BOX,
      keepaspectratio: true,
      axis: false,
      grid: true,
      showCopyright: false,
      showNavigation: true,
      showInfobox: false,
      pan: { needShift: true, needTwoFingers: true },
      zoom: { wheel: true, needShift: false, pinchHorizontal: false, pinchVertical: false },
    } as Record<string, unknown>);
    boardRef.current = board;

    const findHit = (sx: number, sy: number): string | null => {
      // Points take priority over the lines/circles they may sit on.
      const ids = [...elsRef.current.keys()].reverse(); // newest first
      for (const id of ids) {
        const el = elsRef.current.get(id);
        const kind = kindRef.current.get(id);
        if (el && kind && POINT_KINDS.has(kind) && el.hasPoint?.(sx, sy)) return id;
      }
      for (const id of ids) {
        const el = elsRef.current.get(id);
        const kind = kindRef.current.get(id);
        if (el && kind && !POINT_KINDS.has(kind) && el.hasPoint?.(sx, sy)) return id;
      }
      return null;
    };

    const handleDown = (e: Event) => {
      // In select mode the board just drags free points / pans — no construction.
      if (modeRef.current === "select") return;
      const evt = e as MouseEvent & { shiftKey?: boolean };
      if (evt.shiftKey) return; // shift-drag is reserved for panning
      const pos = board.getMousePosition(e);
      const coords = new JXG.Coords(JXG.COORDS_BY_SCREEN, pos, board);
      const at: FreeCoord = { x: coords.usrCoords[1], y: coords.usrCoords[2] };
      const hitId = findHit(coords.scrCoords[1], coords.scrCoords[2]);
      clickCbRef.current({ at, hitId });
    };

    board.on("down", handleDown);

    return () => {
      els.clear();
      kinds.clear();
      refsRef.current = {};
      JXG.JSXGraph.freeBoard(board);
      boardRef.current = null;
    };
  }, []);

  // ---- incremental element sync (add new / remove deleted) ------------------
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    board.suspendUpdate();

    const present = new Set(steps.map((s) => s.id));
    for (const [id, el] of [...elsRef.current]) {
      if (present.has(id)) continue;
      try {
        board.removeObject(el);
      } catch {
        /* element may already be gone via a cascade */
      }
      elsRef.current.delete(id);
      kindRef.current.delete(id);
      delete refsRef.current[id];
    }

    for (const step of steps) {
      if (elsRef.current.has(step.id)) continue; // already built; coords live on the element
      for (const def of compileStep(step)) {
        const parents = def.parents.map((p) => resolveArg(p, refsRef.current));
        const el = board.create(def.type, parents, def.attributes ?? {});
        elsRef.current.set(step.id, el);
        kindRef.current.set(step.id, step.kind);
        refsRef.current[step.id] = el;
        if (step.kind === "point" || step.kind === "glider") {
          el.on("up", () => {
            if (modeRef.current !== "select") return;
            moveCbRef.current(step.id, { x: el.X(), y: el.Y() });
          });
        }
      }
    }

    board.unsuspendUpdate();
    board.update();
  }, [steps]);

  // ---- mode-driven draggability --------------------------------------------
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    for (const [id, el] of elsRef.current) {
      const kind = kindRef.current.get(id);
      if (!kind || !POINT_KINDS.has(kind)) continue;
      const freelyMovable = kind === "point" || kind === "glider";
      el.setAttribute({ fixed: !(mode === "select" && freelyMovable) });
    }
    board.update();
  }, [mode, steps]);

  return { containerRef };
}
