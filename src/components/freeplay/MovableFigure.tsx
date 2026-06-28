import { forwardRef, useMemo } from "react";
import {
  GeometryBoard,
  type GeometryBoardHandle,
} from "@/components/geometry/GeometryBoard";
import { buildFigureDef } from "@/lib/freeplay/figure";
import { buildMovableFigureDef } from "@/lib/freeplay/movableFigure";
import type { Puzzle } from "@/lib/freeplay/types";

/**
 * Renders a freeplay puzzle's figure. When the puzzle ships a `constructFrom`,
 * its free points are draggable and the dependent points recompute live; every
 * other puzzle gracefully falls back to the static fixed board (`buildFigureDef`).
 *
 * `def` is memoized on the puzzle, so it stays referentially stable across the
 * arena's proof-state re-renders and the board is never rebuilt (drag state and
 * the view are preserved).
 */
export const MovableFigure = forwardRef<
  GeometryBoardHandle,
  { puzzle: Puzzle; className?: string }
>(function MovableFigure({ puzzle, className }, ref) {
  const def = useMemo(
    () =>
      puzzle.constructFrom
        ? buildMovableFigureDef(puzzle)
        : buildFigureDef(puzzle),
    [puzzle],
  );
  return <GeometryBoard ref={ref} def={def} fill className={className} />;
});
