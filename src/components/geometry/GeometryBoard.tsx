import { forwardRef, useImperativeHandle } from "react";
import { useJSXGraph, type BoardDownTarget } from "@/lib/geometry/useJSXGraph";
import type { BoardRefs, JSXGraphDef } from "@/lib/geometry/board-types";

export interface GeometryBoardHandle {
  applyOverlay: (def: JSXGraphDef) => void;
  clearOverlays: () => void;
  getRefs: () => BoardRefs;
  /** Register a pointer-down hit-test handler (on-canvas construction). */
  onBoardDown: (handler: (target: BoardDownTarget) => void) => () => void;
  /** Lock/unlock point dragging (so construction clicks select, not drag). */
  setPointsFixed: (fixed: boolean) => void;
}

interface GeometryBoardProps {
  def: JSXGraphDef;
  className?: string;
  /**
   * Fill the parent container (`h-full w-full`) instead of the default square
   * box (`aspect-square w-full`). Used by the near-full-screen freeplay arena;
   * the board still keeps the figure's aspect ratio, so it stays centred and
   * undistorted within the rectangle.
   */
  fill?: boolean;
}

/**
 * Renders an interactive JSXGraph board from a declarative spec. All imperative
 * behaviour lives in `useJSXGraph`; this component just hosts the container and
 * forwards an imperative handle for overlays / grading.
 */
export const GeometryBoard = forwardRef<GeometryBoardHandle, GeometryBoardProps>(
  function GeometryBoard({ def, className, fill }, ref) {
    const {
      containerRef,
      applyOverlay,
      clearOverlays,
      getRefs,
      onBoardDown,
      setPointsFixed,
    } = useJSXGraph(def);

    useImperativeHandle(
      ref,
      () => ({ applyOverlay, clearOverlays, getRefs, onBoardDown, setPointsFixed }),
      [applyOverlay, clearOverlays, getRefs, onBoardDown, setPointsFixed],
    );

    return (
      <div
        ref={containerRef as React.RefObject<HTMLDivElement>}
        className={
          "jxgbox touch-none " +
          // Fill mode (the freeplay arena) is transparent so the page's paper +
          // drafting grid show through; the boxed course board keeps a white card.
          (fill ? "h-full w-full " : "aspect-square w-full bg-white shadow-inner ") +
          (className ?? "")
        }
      />
    );
  },
);
