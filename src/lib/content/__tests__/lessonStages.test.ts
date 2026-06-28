import { describe, expect, it } from "vitest";
import type { Lesson } from "@/lib/content/types";
import {
  lessonSolvableIds,
  lessonStages,
  stageSolvableId,
  stageXp,
} from "@/lib/content/lessonStages";

const legacy: Lesson = {
  id: "legacy",
  title: "Legacy",
  summary: "s",
  concept: "concept text",
  completionXp: 5,
  problems: [
    {
      id: "p1",
      prompt: "q1",
      boardConfig: { boundingBox: [-1, 1, 1, -1], elements: [] },
      answerConfig: { kind: "algebraic", correctExpression: "1", variables: [] },
      explanations: [],
      xp: 10,
    },
    {
      id: "p2",
      prompt: "q2",
      boardConfig: { boundingBox: [-1, 1, 1, -1], elements: [] },
      answerConfig: { kind: "algebraic", correctExpression: "2", variables: [] },
      explanations: [],
      xp: 12,
    },
  ],
};

const staged: Lesson = {
  ...legacy,
  id: "staged",
  problems: [legacy.problems[0]],
  stages: [
    { kind: "concept", body: "intro" },
    {
      kind: "instruction-mc",
      problem: {
        id: "mc1",
        prompt: "pick",
        boardConfig: { boundingBox: [-1, 1, 1, -1], elements: [] },
        options: [
          { id: "a", label: "A", correct: false, teaching: "no" },
          { id: "b", label: "B", correct: true, teaching: "yes" },
        ],
        consolidation: { principle: "remember" },
        xp: 8,
      },
    },
    { kind: "problem", problem: legacy.problems[0] },
    {
      kind: "comprehension",
      task: {
        id: "comp1",
        prompt: "justify",
        lines: [
          {
            statement: "step",
            reasons: [
              { id: "r1", label: "R1", correct: true, teaching: "t" },
              { id: "r2", label: "R2", correct: false, teaching: "t" },
            ],
          },
        ],
        validatedText: "done",
        xp: 6,
      },
    },
    {
      kind: "handoff",
      handoff: {
        title: "Go",
        body: "prove it",
        freeplayPuzzleIds: ["puzzle-x"],
      },
    },
  ],
};

describe("lessonStages", () => {
  it("derives [concept, ...problems] for legacy lessons", () => {
    const stages = lessonStages(legacy);
    expect(stages.map((s) => s.kind)).toEqual(["concept", "problem", "problem"]);
    expect(lessonSolvableIds(legacy)).toEqual(["p1", "p2"]);
  });

  it("returns explicit stages and only counts solvable ids", () => {
    const stages = lessonStages(staged);
    expect(stages.map((s) => s.kind)).toEqual([
      "concept",
      "instruction-mc",
      "problem",
      "comprehension",
      "handoff",
    ]);
    expect(lessonSolvableIds(staged)).toEqual(["mc1", "p1", "comp1"]);
    expect(stageSolvableId(stages[0])).toBeNull(); // concept
    expect(stageSolvableId(stages[4])).toBeNull(); // handoff
    expect(stageXp(stages[1])).toBe(8); // instruction-mc
    expect(stageXp(stages[3])).toBe(6); // comprehension
    expect(stageXp(stages[0])).toBe(0); // concept
  });
});
