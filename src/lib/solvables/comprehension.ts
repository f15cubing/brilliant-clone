import type { ComprehensionTask } from "@/lib/content/types";

/** Line index → chosen reason id. */
export type ComprehensionSelections = Record<number, string>;

export function reasonIsCorrect(
  task: ComprehensionTask,
  lineIndex: number,
  reasonId: string,
): boolean {
  const line = task.lines[lineIndex];
  if (!line) return false;
  return line.reasons.some((r) => r.id === reasonId && r.correct);
}

export function isComprehensionValidated(
  task: ComprehensionTask,
  selections: ComprehensionSelections,
): boolean {
  return task.lines.every((_, i) => {
    const sel = selections[i];
    return sel != null && reasonIsCorrect(task, i, sel);
  });
}
