import { useCallback } from "react";
import { useSketchBoard } from "@/lib/sketch/useSketchBoard";
import type { ClickTarget, SketchAction } from "@/lib/sketch/tools";
import type { FreeCoord, SketchStep, ToolMode } from "@/lib/sketch/types";

interface SketchCanvasProps {
  steps: SketchStep[];
  mode: ToolMode;
  dispatch: React.Dispatch<SketchAction>;
}

/**
 * The interactive board surface. Owns no construction state — it forwards
 * pointer intents from `useSketchBoard` into the reducer and renders the board
 * container. Cursor reflects the mode (crosshair while constructing).
 */
export function SketchCanvas({ steps, mode, dispatch }: SketchCanvasProps) {
  const onClickTarget = useCallback(
    (target: ClickTarget) => dispatch({ type: "click", target }),
    [dispatch],
  );
  const onMovePoint = useCallback(
    (id: string, at: FreeCoord) => dispatch({ type: "movePoint", id, at }),
    [dispatch],
  );

  const { containerRef } = useSketchBoard({ steps, mode, onClickTarget, onMovePoint });

  return (
    <div
      ref={containerRef as React.RefObject<HTMLDivElement>}
      className="jxgbox aspect-square w-full touch-none rounded-sm border border-rule bg-white shadow-inner"
      style={{ cursor: mode === "select" ? "default" : "crosshair" }}
    />
  );
}
