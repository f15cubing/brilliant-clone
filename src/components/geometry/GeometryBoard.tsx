import { forwardRef, useImperativeHandle } from "react";
import { useJSXGraph } from "@/lib/geometry/useJSXGraph";
import type { BoardRefs, JSXGraphDef } from "@/lib/geometry/board-types";

export interface GeometryBoardHandle {
  applyOverlay: (def: JSXGraphDef) => void;
  clearOverlays: () => void;
  getRefs: () => BoardRefs;
}

interface GeometryBoardProps {
  def: JSXGraphDef;
  className?: string;
}

/**
 * Renders an interactive JSXGraph board from a declarative spec. All imperative
 * behaviour lives in `useJSXGraph`; this component just hosts the container and
 * forwards an imperative handle for overlays / grading.
 */
export const GeometryBoard = forwardRef<GeometryBoardHandle, GeometryBoardProps>(
  function GeometryBoard({ def, className }, ref) {
    const { containerRef, applyOverlay, clearOverlays, getRefs } =
      useJSXGraph(def);

    useImperativeHandle(
      ref,
      () => ({ applyOverlay, clearOverlays, getRefs }),
      [applyOverlay, clearOverlays, getRefs],
    );

    return (
      <div
        ref={containerRef as React.RefObject<HTMLDivElement>}
        className={
          "jxgbox aspect-square w-full touch-none bg-white shadow-inner " +
          (className ?? "")
        }
      />
    );
  },
);
