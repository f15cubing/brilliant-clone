import { useMemo } from "react";
import { GeometryBoard } from "@/components/geometry/GeometryBoard";
import { buildFigureDef } from "@/lib/freeplay/figure";
import type { Puzzle } from "@/lib/freeplay/types";

/** Static (non-draggable) figure for a freeplay puzzle. */
export function FixedFigure({ puzzle }: { puzzle: Puzzle }) {
  const def = useMemo(() => buildFigureDef(puzzle), [puzzle]);
  return (
    <div className="overflow-hidden rounded-sm border border-rule">
      <GeometryBoard def={def} />
    </div>
  );
}
