import { describe, expect, it } from "vitest";
import type { ComprehensionTask } from "@/lib/content/types";
import {
  isComprehensionValidated,
  reasonIsCorrect,
} from "@/lib/solvables/comprehension";

const task: ComprehensionTask = {
  id: "t",
  prompt: "p",
  validatedText: "done",
  xp: 5,
  lines: [
    {
      statement: "L1",
      reasons: [
        { id: "a", label: "A", correct: true, teaching: "" },
        { id: "b", label: "B", correct: false, teaching: "" },
      ],
    },
    {
      statement: "L2",
      reasons: [
        { id: "c", label: "C", correct: false, teaching: "" },
        { id: "d", label: "D", correct: true, teaching: "" },
      ],
    },
  ],
};

describe("comprehension validation", () => {
  it("reasonIsCorrect checks the chosen reason for a line", () => {
    expect(reasonIsCorrect(task, 0, "a")).toBe(true);
    expect(reasonIsCorrect(task, 0, "b")).toBe(false);
    expect(reasonIsCorrect(task, 1, "d")).toBe(true);
  });

  it("is validated only when every line has its correct reason", () => {
    expect(isComprehensionValidated(task, {})).toBe(false);
    expect(isComprehensionValidated(task, { 0: "a" })).toBe(false);
    expect(isComprehensionValidated(task, { 0: "a", 1: "c" })).toBe(false);
    expect(isComprehensionValidated(task, { 0: "a", 1: "d" })).toBe(true);
  });
});
