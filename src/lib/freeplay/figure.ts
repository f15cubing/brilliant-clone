import { fixedPoint } from "@/lib/content/boards";
import type { BoardElementDef, JSXGraphDef } from "@/lib/geometry/board-types";
import type { Puzzle } from "./types";

/**
 * Builds a declarative JSXGraph board for a puzzle: one labeled point per
 * coordinate, then the puzzle's extra figure elements (segments, circles, …)
 * which reference those points by id.
 *
 * Today this renders the canonical realization (`puzzle.coords`) as a static
 * board. The verifier, however, no longer trusts a single figure: it checks each
 * step against several independent realizations sampled from `puzzle.construct`
 * (see `realize.ts`). That same construction is the foundation for the planned
 * MOVABLE figure (drag the puzzle's `freePoints`, recompute dependents live) —
 * see `docs/design/MOVABLE_FIGURES.md`.
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
