import { COURSE } from "@/lib/content/course";
import { earnedAchievements } from "@/lib/progress/achievements";
import { rebuildCourseProgress } from "@/lib/progress/reconcile";
import { type LessonProgress, type ProgressSnapshot } from "@/lib/progress/types";

export interface AttemptInput {
  lessonId: string;
  problemId: string;
  problemXp: number;
  correct: boolean;
  mistakeId?: string;
  elapsedMs: number;
}

export interface AttemptResult {
  addedXp: number;
  lessonCompleted: boolean;
  newAchievementIds: string[];
}

export function emptyLesson(): LessonProgress {
  return { completedProblemIds: [], problemStats: {}, xpEarned: 0 };
}

/**
 * Pure reducer for recording a single problem attempt against a progress
 * snapshot. Given the previous snapshot and an attempt, returns the next
 * snapshot plus an `AttemptResult`. This is the side-effect-free core of
 * `ProgressContext.recordAttempt`; the provider layers state/persistence on top.
 *
 * `now` is injected so completion timestamps are deterministic in tests.
 */
export function applyAttempt(
  prev: ProgressSnapshot,
  input: AttemptInput,
  now: number = Date.now(),
): { next: ProgressSnapshot; result: AttemptResult } {
  const prevEarned = new Set(prev.earnedAchievementIds);

  const lessons = { ...prev.lessons };
  const lp: LessonProgress = {
    ...(lessons[input.lessonId] ?? emptyLesson()),
    problemStats: { ...(lessons[input.lessonId]?.problemStats ?? {}) },
    completedProblemIds: [
      ...(lessons[input.lessonId]?.completedProblemIds ?? []),
    ],
  };

  const stat = {
    attempts: (lp.problemStats[input.problemId]?.attempts ?? 0) + 1,
    timeSpentMs:
      (lp.problemStats[input.problemId]?.timeSpentMs ?? 0) + input.elapsedMs,
    lastMistakeId:
      !input.correct && input.mistakeId
        ? input.mistakeId
        : lp.problemStats[input.problemId]?.lastMistakeId,
  };
  lp.problemStats[input.problemId] = stat;

  let addedXp = 0;
  if (input.correct && !lp.completedProblemIds.includes(input.problemId)) {
    lp.completedProblemIds.push(input.problemId);
    lp.xpEarned += input.problemXp;
    addedXp += input.problemXp;
  }

  const lessonDef = COURSE.lessons.find((l) => l.id === input.lessonId);
  let lessonCompleted = false;
  if (
    lessonDef &&
    !lp.completedAt &&
    lessonDef.problems.every((p) => lp.completedProblemIds.includes(p.id))
  ) {
    lp.completedAt = now;
    lp.xpEarned += lessonDef.completionXp;
    addedXp += lessonDef.completionXp;
    lessonCompleted = true;
  }

  lessons[input.lessonId] = lp;

  const course = rebuildCourseProgress(lessons, prev.course[COURSE.id]);
  course.lastLessonId = input.lessonId;

  const next: ProgressSnapshot = {
    totalXp: prev.totalXp + addedXp,
    lessons,
    course: {
      ...prev.course,
      [COURSE.id]: course,
    },
    earnedAchievementIds: prev.earnedAchievementIds,
  };

  const earnedNow = earnedAchievements(next).map((a) => a.id);
  const newAchievementIds = earnedNow.filter((id) => !prevEarned.has(id));
  next.earnedAchievementIds = earnedNow;

  return { next, result: { addedXp, lessonCompleted, newAchievementIds } };
}
