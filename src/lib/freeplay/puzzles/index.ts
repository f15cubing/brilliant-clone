import type { Puzzle } from "@/lib/freeplay/types";
import { inscribedAngle } from "./inscribedAngle";
import { midsegment } from "./midsegment";
import { incenterExcenter } from "./incenterExcenter";
import { imo2019p2 } from "./imo2019p2";

/** Ordered registry of curated freeplay puzzles. */
export const FREEPLAY_PUZZLES: Puzzle[] = [
  inscribedAngle,
  midsegment,
  incenterExcenter,
  imo2019p2,
];

export function getPuzzle(id: string): Puzzle | undefined {
  return FREEPLAY_PUZZLES.find((p) => p.id === id);
}
