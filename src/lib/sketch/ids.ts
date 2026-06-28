/**
 * Id and point-label generation for the sketch sandbox.
 *
 * - Object ids (`o0`, `o1`, …) come from a monotonic counter that NEVER reuses a
 *   value, so a freshly-created object can never collide with a deleted one that
 *   some other (also-deleted) object still referenced.
 * - Point labels are the spreadsheet-style sequence A, B, …, Z, A1, B1, … We
 *   assign the first label not currently in use, so labels stay stable across
 *   deletes (deleting B leaves A, C; the next new point reuses B).
 */
import type { SketchStep } from "./types";

/** The object id for counter value `seq`. */
export function objectId(seq: number): string {
  return `o${seq}`;
}

/** The next free counter value given existing steps (max numeric id + 1). */
export function nextSeq(steps: SketchStep[]): number {
  let max = -1;
  for (const s of steps) {
    const m = /^o(\d+)$/.exec(s.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

/** The label at index `i`: 0→A … 25→Z, 26→A1, 27→B1, … */
export function labelForIndex(i: number): string {
  const letter = String.fromCharCode(65 + (i % 26));
  const group = Math.floor(i / 26);
  return group === 0 ? letter : `${letter}${group}`;
}

/** The first label in the A, B, C, … sequence not present in `used`. */
export function nextPointLabel(used: ReadonlySet<string>): string {
  for (let i = 0; ; i++) {
    const label = labelForIndex(i);
    if (!used.has(label)) return label;
  }
}

/** The set of point labels currently in use across `steps`. */
export function usedLabels(steps: SketchStep[]): Set<string> {
  const out = new Set<string>();
  for (const s of steps) if (s.label) out.add(s.label);
  return out;
}
