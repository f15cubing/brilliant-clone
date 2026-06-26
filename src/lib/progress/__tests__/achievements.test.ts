import { describe, expect, it } from "vitest";
import { COURSE, totalProblems } from "@/lib/content/course";
import { ACHIEVEMENTS, earnedAchievements } from "@/lib/progress/achievements";
import {
  emptySnapshot,
  type LessonProgress,
  type ProgressSnapshot,
} from "@/lib/progress/types";

function lessonWith(partial: Partial<LessonProgress>): LessonProgress {
  return {
    completedProblemIds: [],
    problemStats: {},
    xpEarned: 0,
    ...partial,
  };
}

function snapshotWith(over: Partial<ProgressSnapshot> = {}): ProgressSnapshot {
  return { ...emptySnapshot(), ...over };
}

function isEarned(id: string, snap: ProgressSnapshot): boolean {
  const a = ACHIEVEMENTS.find((x) => x.id === id);
  if (!a) throw new Error(`unknown achievement ${id}`);
  return a.isEarned(snap);
}

/** N solved problems, all stuffed into one lesson bucket. */
function withSolved(n: number): ProgressSnapshot {
  const ids = Array.from({ length: n }, (_, i) => `p${i}`);
  return snapshotWith({
    lessons: { "any-lesson": lessonWith({ completedProblemIds: ids }) },
  });
}

describe("achievement predicates", () => {
  it("first-steps fires on the first solved problem, not before", () => {
    expect(isEarned("first-steps", emptySnapshot())).toBe(false);
    expect(isEarned("first-steps", withSolved(1))).toBe(true);
  });

  it("xp-100 fires at exactly 100 XP", () => {
    expect(isEarned("xp-100", snapshotWith({ totalXp: 99 }))).toBe(false);
    expect(isEarned("xp-100", snapshotWith({ totalXp: 100 }))).toBe(true);
  });

  it("lesson-1 fires once any lesson has a completedAt", () => {
    expect(isEarned("lesson-1", emptySnapshot())).toBe(false);
    const snap = snapshotWith({
      lessons: { [COURSE.lessons[0].id]: lessonWith({ completedAt: 1 }) },
    });
    expect(isEarned("lesson-1", snap)).toBe(true);
  });

  it("inscribed-master keys off the inscribed-angle lesson specifically", () => {
    const wrongLesson = snapshotWith({
      lessons: { [COURSE.lessons[0].id]: lessonWith({ completedAt: 1 }) },
    });
    expect(isEarned("inscribed-master", wrongLesson)).toBe(false);

    const rightLesson = snapshotWith({
      lessons: { "inscribed-angle": lessonWith({ completedAt: 1 }) },
    });
    expect(isEarned("inscribed-master", rightLesson)).toBe(true);
  });

  it("incenter-master keys off the incenter-lemma lesson specifically", () => {
    const snap = snapshotWith({
      lessons: { "incenter-lemma": lessonWith({ completedAt: 1 }) },
    });
    expect(isEarned("incenter-master", snap)).toBe(true);
    expect(isEarned("incenter-master", emptySnapshot())).toBe(false);
  });

  it("halfway fires at ceil(total/2) solved problems", () => {
    const half = Math.ceil(totalProblems() / 2);
    expect(isEarned("halfway", withSolved(half - 1))).toBe(false);
    expect(isEarned("halfway", withSolved(half))).toBe(true);
  });

  it("course-complete fires only when every lesson is complete", () => {
    const lessons: Record<string, LessonProgress> = {};
    for (const l of COURSE.lessons) {
      lessons[l.id] = lessonWith({ completedAt: 1 });
    }
    expect(isEarned("course-complete", snapshotWith({ lessons }))).toBe(true);

    // One short of all lessons => not complete.
    const partial = { ...lessons };
    delete partial[COURSE.lessons[0].id];
    expect(isEarned("course-complete", snapshotWith({ lessons: partial }))).toBe(
      false,
    );
  });
});

describe("earnedAchievements", () => {
  it("returns nothing for a fresh snapshot", () => {
    expect(earnedAchievements(emptySnapshot())).toEqual([]);
  });

  it("returns every achievement when the course is fully complete", () => {
    const lessons: Record<string, LessonProgress> = {};
    for (const l of COURSE.lessons) {
      lessons[l.id] = lessonWith({
        completedProblemIds: l.problems.map((p) => p.id),
        completedAt: 1,
      });
    }
    const snap = snapshotWith({ lessons, totalXp: 1000 });
    const earnedIds = earnedAchievements(snap).map((a) => a.id);
    expect(earnedIds).toEqual(ACHIEVEMENTS.map((a) => a.id));
  });
});
