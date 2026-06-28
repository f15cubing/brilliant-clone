import type { Lesson, LessonStage } from "@/lib/content/types";

/**
 * The ordered stages for a lesson. Explicit `stages` win; otherwise a legacy
 * sequence is derived — a concept card followed by each problem rendered by the
 * unchanged ProblemPlayer.
 */
export function lessonStages(lesson: Lesson): LessonStage[] {
  if (lesson.stages && lesson.stages.length > 0) return lesson.stages;
  return [
    { kind: "concept", body: lesson.concept },
    ...lesson.problems.map(
      (problem) => ({ kind: "problem", problem }) as const,
    ),
  ];
}

/** Stable id of a stage that records progress/XP, or null for concept/handoff. */
export function stageSolvableId(stage: LessonStage): string | null {
  switch (stage.kind) {
    case "instruction-mc":
    case "problem":
      return stage.problem.id;
    case "comprehension":
      return stage.task.id;
    default:
      return null;
  }
}

/** XP a stage grants on first solve (0 for non-solvable stages). */
export function stageXp(stage: LessonStage): number {
  switch (stage.kind) {
    case "instruction-mc":
    case "problem":
      return stage.problem.xp;
    case "comprehension":
      return stage.task.xp;
    default:
      return 0;
  }
}

/**
 * The solvable stage ids for a lesson — the unit of completion and course
 * progress. Generalizes the legacy "problems" notion to every stage kind that
 * grants XP. For legacy lessons this equals the problem ids.
 */
export function lessonSolvableIds(lesson: Lesson): string[] {
  return lessonStages(lesson)
    .map(stageSolvableId)
    .filter((id): id is string => id !== null);
}
