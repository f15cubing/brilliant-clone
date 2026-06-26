import { fixedPoint } from "@/lib/content/boards";
import type { BoardElementDef, JSXGraphDef } from "@/lib/geometry/board-types";
import type { Puzzle } from "./types";

/**
 * Builds a declarative JSXGraph board for a puzzle: one fixed labeled point per
 * coordinate, then the puzzle's extra figure elements (segments, circles, …)
 * which reference those points by id. v1 figures are static (deferred render).
 */
export function buildFigureDef(puzzle: Puzzle): JSXGraphDef {
  const ids = Object.keys(puzzle.coords);
  const xs = ids.map((id) => puzzle.coords[id][0]);
  const ys = ids.map((id) => puzzle.coords[id][1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const half = Math.max(maxX - minX, maxY - minY) / 2 + 1.2;

  const points: BoardElementDef[] = ids.map((id) =>
    fixedPoint(id, puzzle.coords[id][0], puzzle.coords[id][1]),
  );

  return {
    boundingBox: [cx - half, cy + half, cx + half, cy - half],
    keepAspectRatio: true,
    elements: [...points, ...puzzle.figure],
  };
}
