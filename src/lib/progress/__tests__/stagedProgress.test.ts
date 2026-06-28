import { describe, expect, it } from "vitest";
import { getLesson } from "@/lib/content/course";
import { lessonSolvableIds } from "@/lib/content/lessonStages";
import { applyAttempt } from "@/lib/progress/recordAttempt";
import { reconcileSnapshot } from "@/lib/progress/reconcile";
import { emptySnapshot, type ProgressSnapshot } from "@/lib/progress/types";

const SOLVABLE = ["ia-half", "ia-half-proof", "ia-express", "ia-same-arc", "ia-semicircle", "ia-comprehension"];

describe("inscribed-angle staged lesson progress", () => {
  it("exposes exactly the solvable stage ids", () => {
    const lesson = getLesson("inscribed-angle")!;
    expect(lessonSolvableIds(lesson)).toEqual(SOLVABLE);
  });

  it("completes only after every solvable stage is solved, awarding completion XP", () => {
    let snap: ProgressSnapshot = emptySnapshot();
    const completions: boolean[] = [];
    SOLVABLE.forEach((id) => {
      const { next, result } = applyAttempt(
        snap,
        { lessonId: "inscribed-angle", problemId: id, problemXp: 10, correct: true, elapsedMs: 1000 },
        1_000_000,
      );
      snap = next;
      completions.push(result.lessonCompleted);
    });
    // Not complete until the final solvable stage.
    expect(completions).toEqual([false, false, false, false, false, true]);
    expect(snap.lessons["inscribed-angle"].completedAt).toBe(1_000_000);
    // Completion XP (35) is included on top of the per-stage XP.
    expect(snap.totalXp).toBe(10 * SOLVABLE.length + 35);
  });

  it("reconcile keeps all solvable stage ids and derived completion", () => {
    let snap: ProgressSnapshot = emptySnapshot();
    SOLVABLE.forEach((id) => {
      snap = applyAttempt(snap, {
        lessonId: "inscribed-angle",
        problemId: id,
        problemXp: 10,
        correct: true,
        elapsedMs: 100,
      }).next;
    });
    const { snapshot } = reconcileSnapshot(snap);
    expect(snapshot.lessons["inscribed-angle"].completedProblemIds.sort()).toEqual(
      [...SOLVABLE].sort(),
    );
    expect(snapshot.lessons["inscribed-angle"].completedAt).toBeTruthy();
  });
});
