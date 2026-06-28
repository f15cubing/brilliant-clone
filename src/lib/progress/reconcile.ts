import { COURSE, totalProblems } from "@/lib/content/course";
import { lessonSolvableIds } from "@/lib/content/lessonStages";
import type { CourseProgress, LessonProgress, ProgressSnapshot } from "@/lib/progress/types";

export interface ReconcileResult {
  snapshot: ProgressSnapshot;
  /** Lesson IDs present in stored progress but no longer in the course. */
  orphanLessonIds: string[];
  /** True when reconciliation modified the snapshot in any way. */
  changed: boolean;
}

/**
 * Sanitizes a stored progress snapshot against the live course content.
 *
 * Stored progress accumulates IDs of lessons/problems that may later be
 * removed, renamed, or added. Without reconciliation, counts can drift out of
 * sync with the current course (e.g. "15 / 10" lessons proved, or a lesson
 * showing 7/5 problems). This makes the in-memory snapshot the single source of
 * truth derived from current content:
 *
 * - Drops progress for lessons no longer in the course.
 * - Filters completed problems / stats to the lesson's current problems.
 * - Derives lesson completion from current problems (adding new problems
 *   reopens a previously-completed lesson until they are solved).
 * - Rebuilds course rollup (completedLessonIds, completionPct).
 *
 * `totalXp` and `earnedAchievementIds` are intentionally preserved: earned XP is
 * never clawed back and achievements stay sticky once unlocked.
 */
export function reconcileSnapshot(snapshot: ProgressSnapshot): ReconcileResult {
  const validProblemIds = new Map<string, Set<string>>();
  for (const lesson of COURSE.lessons) {
    validProblemIds.set(lesson.id, new Set(lessonSolvableIds(lesson)));
  }

  let changed = false;
  const orphanLessonIds: string[] = [];
  const lessons: Record<string, LessonProgress> = {};

  for (const [lessonId, stored] of Object.entries(snapshot.lessons)) {
    const problemIds = validProblemIds.get(lessonId);
    if (!problemIds) {
      orphanLessonIds.push(lessonId);
      changed = true;
      continue;
    }

    const reconciled = reconcileLesson(stored, problemIds);
    if (reconciled.changed) changed = true;
    lessons[lessonId] = reconciled.lesson;
  }

  const course = { ...snapshot.course };
  const rebuilt = rebuildCourseProgress(lessons, snapshot.course[COURSE.id]);
  if (!coursesEqual(snapshot.course[COURSE.id], rebuilt)) changed = true;
  course[COURSE.id] = rebuilt;

  const next: ProgressSnapshot = {
    totalXp: snapshot.totalXp,
    lessons,
    course,
    earnedAchievementIds: snapshot.earnedAchievementIds,
  };

  return { snapshot: next, orphanLessonIds, changed };
}

function reconcileLesson(
  stored: LessonProgress,
  problemIds: Set<string>,
): { lesson: LessonProgress; changed: boolean } {
  let changed = false;

  const completedProblemIds = stored.completedProblemIds.filter((id) =>
    problemIds.has(id),
  );
  if (completedProblemIds.length !== stored.completedProblemIds.length) {
    changed = true;
  }

  const problemStats: LessonProgress["problemStats"] = {};
  for (const [id, stat] of Object.entries(stored.problemStats)) {
    if (problemIds.has(id)) problemStats[id] = stat;
    else changed = true;
  }

  let lastProblemId = stored.lastProblemId;
  if (lastProblemId != null && !problemIds.has(lastProblemId)) {
    lastProblemId = undefined;
    changed = true;
  }

  // Completion is derived from current problems: solved iff every current
  // problem in the lesson has been completed.
  const solvedSet = new Set(completedProblemIds);
  const isComplete =
    problemIds.size > 0 && [...problemIds].every((id) => solvedSet.has(id));

  let completedAt = stored.completedAt;
  if (isComplete) {
    if (completedAt == null) {
      completedAt = Date.now();
      changed = true;
    }
  } else if (completedAt != null) {
    completedAt = undefined;
    changed = true;
  }

  const lesson: LessonProgress = {
    completedProblemIds,
    problemStats,
    xpEarned: stored.xpEarned,
    ...(completedAt != null ? { completedAt } : {}),
    ...(lastProblemId != null ? { lastProblemId } : {}),
    ...(stored.lastStageIndex != null
      ? { lastStageIndex: stored.lastStageIndex }
      : {}),
  };

  return { lesson, changed };
}

/**
 * Rebuilds course rollup from reconciled lesson progress. Shared with the
 * record-attempt flow so completion math stays consistent.
 */
export function rebuildCourseProgress(
  lessons: Record<string, LessonProgress>,
  previous: CourseProgress | undefined,
): CourseProgress {
  const solved = COURSE.lessons.reduce(
    (n, l) => n + (lessons[l.id]?.completedProblemIds.length ?? 0),
    0,
  );
  const completedLessonIds = COURSE.lessons
    .filter((l) => lessons[l.id]?.completedAt)
    .map((l) => l.id);
  const total = totalProblems();

  const lastLessonId =
    previous?.lastLessonId &&
    COURSE.lessons.some((l) => l.id === previous.lastLessonId)
      ? previous.lastLessonId
      : undefined;

  return {
    completionPct: total ? Math.round((solved / total) * 100) : 0,
    completedLessonIds,
    ...(lastLessonId != null ? { lastLessonId } : {}),
  };
}

function coursesEqual(
  a: CourseProgress | undefined,
  b: CourseProgress,
): boolean {
  if (!a) return false;
  return (
    a.completionPct === b.completionPct &&
    a.lastLessonId === b.lastLessonId &&
    a.completedLessonIds.length === b.completedLessonIds.length &&
    a.completedLessonIds.every((id, i) => id === b.completedLessonIds[i])
  );
}
