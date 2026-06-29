import { describe, expect, it } from "vitest";
import { COURSE, totalProblems } from "@/lib/content/course";
import { lessonSolvableIds } from "@/lib/content/lessonStages";
import {
  rebuildCourseProgress,
  reconcileSnapshot,
} from "@/lib/progress/reconcile";
import {
  emptySnapshot,
  type LessonProgress,
  type ProgressSnapshot,
} from "@/lib/progress/types";

const lesson0 = COURSE.lessons[0];
const lesson1 = COURSE.lessons[1];
// Completion is keyed on every solvable STAGE id (instruction-mc / problem /
// comprehension), not just the legacy `problems` array.
const probIds0 = lessonSolvableIds(lesson0);
const probIds1 = lessonSolvableIds(lesson1);

function lessonWith(partial: Partial<LessonProgress>): LessonProgress {
  return {
    completedProblemIds: [],
    problemStats: {},
    xpEarned: 0,
    ...partial,
  };
}

function snapshotWith(
  lessons: Record<string, LessonProgress>,
  extra: Partial<ProgressSnapshot> = {},
): ProgressSnapshot {
  return { ...emptySnapshot(), lessons, ...extra };
}

describe("reconcileSnapshot", () => {
  it("drops lessons no longer present in the course", () => {
    const snap = snapshotWith({
      "ghost-lesson": lessonWith({ completedProblemIds: ["x"], xpEarned: 5 }),
    });
    const { snapshot, orphanLessonIds, changed } = reconcileSnapshot(snap);
    expect(orphanLessonIds).toContain("ghost-lesson");
    expect(snapshot.lessons["ghost-lesson"]).toBeUndefined();
    expect(changed).toBe(true);
  });

  it("filters out completed problem IDs that are no longer in the lesson", () => {
    const snap = snapshotWith({
      [lesson0.id]: lessonWith({
        completedProblemIds: [probIds0[0], "stale-problem"],
      }),
    });
    const { snapshot, changed } = reconcileSnapshot(snap);
    expect(snapshot.lessons[lesson0.id].completedProblemIds).toEqual([
      probIds0[0],
    ]);
    expect(changed).toBe(true);
  });

  it("filters problemStats down to current problems", () => {
    const snap = snapshotWith({
      [lesson0.id]: lessonWith({
        problemStats: {
          [probIds0[0]]: { attempts: 2, timeSpentMs: 100 },
          "stale-problem": { attempts: 1, timeSpentMs: 50 },
        },
      }),
    });
    const { snapshot } = reconcileSnapshot(snap);
    expect(Object.keys(snapshot.lessons[lesson0.id].problemStats)).toEqual([
      probIds0[0],
    ]);
  });

  it("derives completion: marks a fully-solved lesson complete", () => {
    const snap = snapshotWith({
      [lesson0.id]: lessonWith({ completedProblemIds: [...probIds0] }),
    });
    const { snapshot } = reconcileSnapshot(snap);
    expect(snapshot.lessons[lesson0.id].completedAt).toBeTypeOf("number");
  });

  it("reopens a lesson previously flagged complete when a problem is unsolved", () => {
    const snap = snapshotWith({
      [lesson0.id]: lessonWith({
        completedProblemIds: probIds0.slice(0, -1), // missing the last one
        completedAt: 12345,
      }),
    });
    const { snapshot, changed } = reconcileSnapshot(snap);
    expect(snapshot.lessons[lesson0.id].completedAt).toBeUndefined();
    expect(changed).toBe(true);
  });

  it("clears a lastProblemId that no longer exists", () => {
    const snap = snapshotWith({
      [lesson0.id]: lessonWith({ lastProblemId: "stale-problem" }),
    });
    const { snapshot, changed } = reconcileSnapshot(snap);
    expect(snapshot.lessons[lesson0.id].lastProblemId).toBeUndefined();
    expect(changed).toBe(true);
  });

  it("rebuilds the course rollup (completion pct + completed lessons)", () => {
    const snap = snapshotWith({
      [lesson0.id]: lessonWith({ completedProblemIds: [...probIds0] }),
    });
    const { snapshot } = reconcileSnapshot(snap);
    const course = snapshot.course[COURSE.id];
    expect(course.completedLessonIds).toEqual([lesson0.id]);
    expect(course.completionPct).toBe(
      Math.round((probIds0.length / totalProblems()) * 100),
    );
  });

  it("preserves totalXp and earnedAchievementIds (never clawed back)", () => {
    const snap = snapshotWith(
      { "ghost-lesson": lessonWith({ completedProblemIds: ["x"] }) },
      { totalXp: 999, earnedAchievementIds: ["first-steps", "xp-100"] },
    );
    const { snapshot } = reconcileSnapshot(snap);
    expect(snapshot.totalXp).toBe(999);
    expect(snapshot.earnedAchievementIds).toEqual(["first-steps", "xp-100"]);
  });

  it("builds the course rollup for a fresh snapshot, then is idempotent", () => {
    // First pass populates the (previously absent) course rollup => changed.
    const first = reconcileSnapshot(emptySnapshot());
    expect(first.orphanLessonIds).toEqual([]);
    expect(first.changed).toBe(true);
    // Re-running on the already-reconciled snapshot makes no further changes.
    const second = reconcileSnapshot(first.snapshot);
    expect(second.changed).toBe(false);
    expect(second.orphanLessonIds).toEqual([]);
  });
});

describe("rebuildCourseProgress", () => {
  it("reports 100% when every lesson is complete", () => {
    const lessons: Record<string, LessonProgress> = {};
    for (const l of COURSE.lessons) {
      lessons[l.id] = lessonWith({
        completedProblemIds: lessonSolvableIds(l),
        completedAt: 1,
      });
    }
    const course = rebuildCourseProgress(lessons, undefined);
    expect(course.completionPct).toBe(100);
    expect(course.completedLessonIds).toEqual(COURSE.lessons.map((l) => l.id));
  });

  it("keeps a valid previous lastLessonId but drops an invalid one", () => {
    const kept = rebuildCourseProgress({}, {
      completionPct: 0,
      completedLessonIds: [],
      lastLessonId: lesson1.id,
    });
    expect(kept.lastLessonId).toBe(lesson1.id);

    const dropped = rebuildCourseProgress({}, {
      completionPct: 0,
      completedLessonIds: [],
      lastLessonId: "ghost-lesson",
    });
    expect(dropped.lastLessonId).toBeUndefined();
  });

  it("counts partial progress proportionally", () => {
    const lessons = {
      [lesson1.id]: lessonWith({ completedProblemIds: [probIds1[0]] }),
    };
    const course = rebuildCourseProgress(lessons, undefined);
    expect(course.completionPct).toBe(
      Math.round((1 / totalProblems()) * 100),
    );
    expect(course.completedLessonIds).toEqual([]);
  });
});
