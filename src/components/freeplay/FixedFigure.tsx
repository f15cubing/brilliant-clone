import { useMemo } from "react";
import { GeometryBoard } from "@/components/geometry/GeometryBoard";
import { buildFigureDef } from "@/lib/freeplay/figure";
import type { Puzzle } from "@/lib/freeplay/types";

/**
 * Renders the canonical realization of a freeplay puzzle as a static board.
 *
 * Verification is multi-case (each step is checked against several sampled
 * realizations, see `realize.ts`); making this figure draggable is the planned
 * next step on the same construction model — see `docs/design/MOVABLE_FIGURES.md`.
 */
export function FixedFigure({ puzzle }: { puzzle: Puzzle }) {
  const def = useMemo(() => buildFigureDef(puzzle), [puzzle]);
  return (
    <div className="overflow-hidden rounded-sm border border-rule">
      <GeometryBoard def={def} />
    </div>
  );
}
