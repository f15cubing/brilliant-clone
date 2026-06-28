import { describe, expect, it } from "vitest";
import { COURSE, getLesson } from "@/lib/content/course";
import { lessonSolvableIds } from "@/lib/content/lessonStages";
import { applyAttempt, type AttemptInput } from "@/lib/progress/recordAttempt";
import { emptySnapshot, type ProgressSnapshot } from "@/lib/progress/types";

const lesson = COURSE.lessons[0];
const problems = lesson.problems;
const NOW = 1_700_000_000_000;

function attempt(over: Partial<AttemptInput> = {}): AttemptInput {
  return {
    lessonId: lesson.id,
    problemId: problems[0].id,
    problemXp: problems[0].xp,
    correct: true,
    elapsedMs: 1000,
    ...over,
  };
}

/** Solve every problem in `lesson` in sequence, threading the snapshot. */
function solveLesson(start: ProgressSnapshot): {
  snap: ProgressSnapshot;
  totalAdded: number;
  lessonCompleted: boolean;
} {
  let snap = start;
  let totalAdded = 0;
  let lessonCompleted = false;
  for (const p of problems) {
    const { next, result } = applyAttempt(
      snap,
      attempt({ problemId: p.id, problemXp: p.xp }),
      NOW,
    );
    snap = next;
    totalAdded += result.addedXp;
    lessonCompleted = lessonCompleted || result.lessonCompleted;
  }
  return { snap, totalAdded, lessonCompleted };
}

describe("applyAttempt — XP and completion", () => {
  it("awards problem XP and records the solve on a first correct attempt", () => {
    const { next, result } = applyAttempt(
      emptySnapshot(),
      attempt({ problemXp: 10 }),
      NOW,
    );
    expect(result.addedXp).toBe(10);
    expect(next.totalXp).toBe(10);
    expect(next.lessons[lesson.id].completedProblemIds).toEqual([
      problems[0].id,
    ]);
    expect(next.lessons[lesson.id].xpEarned).toBe(10);
  });

  it("does not double-award XP for re-solving the same problem", () => {
    const first = applyAttempt(emptySnapshot(), attempt({ problemXp: 10 }), NOW);
    const second = applyAttempt(first.next, attempt({ problemXp: 10 }), NOW);
    expect(second.result.addedXp).toBe(0);
    expect(second.next.totalXp).toBe(10);
    expect(second.next.lessons[lesson.id].completedProblemIds).toEqual([
      problems[0].id,
    ]);
  });

  it("records a wrong attempt without XP and stores the mistake id", () => {
    const { next, result } = applyAttempt(
      emptySnapshot(),
      attempt({ correct: false, mistakeId: "m-3" }),
      NOW,
    );
    expect(result.addedXp).toBe(0);
    expect(next.totalXp).toBe(0);
    const stat = next.lessons[lesson.id].problemStats[problems[0].id];
    expect(stat.attempts).toBe(1);
    expect(stat.lastMistakeId).toBe("m-3");
    expect(next.lessons[lesson.id].completedProblemIds).toEqual([]);
  });

  it("accumulates attempt counts and time spent across attempts", () => {
    const a = applyAttempt(
      emptySnapshot(),
      attempt({ correct: false, mistakeId: "m1", elapsedMs: 500 }),
      NOW,
    );
    const b = applyAttempt(
      a.next,
      attempt({ correct: true, elapsedMs: 700 }),
      NOW,
    );
    const stat = b.next.lessons[lesson.id].problemStats[problems[0].id];
    expect(stat.attempts).toBe(2);
    expect(stat.timeSpentMs).toBe(1200);
    // A later correct attempt keeps the previously recorded mistake id.
    expect(stat.lastMistakeId).toBe("m1");
  });

  it("awards the lesson completion bonus when the last problem is solved", () => {
    const { snap, totalAdded, lessonCompleted } = solveLesson(emptySnapshot());
    const expectedProblemXp = problems.reduce((n, p) => n + p.xp, 0);
    expect(lessonCompleted).toBe(true);
    expect(snap.lessons[lesson.id].completedAt).toBe(NOW);
    expect(totalAdded).toBe(expectedProblemXp + lesson.completionXp);
    expect(snap.totalXp).toBe(expectedProblemXp + lesson.completionXp);
  });

  it("only reports lessonCompleted once (no repeat bonus)", () => {
    const { snap } = solveLesson(emptySnapshot());
    const again = applyAttempt(
      snap,
      attempt({ problemId: problems[0].id, problemXp: problems[0].xp }),
      NOW + 1000,
    );
    expect(again.result.lessonCompleted).toBe(false);
    expect(again.result.addedXp).toBe(0);
  });

  it("sets the course lastLessonId to the attempted lesson", () => {
    const { next } = applyAttempt(emptySnapshot(), attempt(), NOW);
    expect(next.course[COURSE.id].lastLessonId).toBe(lesson.id);
  });

  it("unlocks achievements as conditions are met", () => {
    const first = applyAttempt(emptySnapshot(), attempt(), NOW);
    expect(first.result.newAchievementIds).toContain("first-steps");
    expect(first.next.earnedAchievementIds).toContain("first-steps");

    const { snap } = solveLesson(emptySnapshot());
    expect(snap.earnedAchievementIds).toContain("lesson-1");
  });

  it("does not mutate the previous snapshot (pure)", () => {
    const prev = emptySnapshot();
    const frozen = JSON.stringify(prev);
    applyAttempt(prev, attempt({ problemXp: 10 }), NOW);
    expect(JSON.stringify(prev)).toBe(frozen);
  });
});

describe("solvable-id generalization (legacy parity)", () => {
  it("solvable ids equal problem ids for a legacy lesson", () => {
    const legacy = getLesson("parallel-lines") ?? COURSE.lessons[1];
    expect(lessonSolvableIds(legacy)).toEqual(legacy.problems.map((p) => p.id));
  });
});
