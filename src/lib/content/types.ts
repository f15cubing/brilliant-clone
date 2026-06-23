import type { BoardRefs, JSXGraphDef } from "@/lib/geometry/board-types";

/** Multiple-choice (multi-try, no penalty). */
export interface MultipleChoiceOption {
  id: string; // "A", "B", ...
  label: string; // KaTeX/markdown supported
}

export interface MultipleChoiceAnswer {
  kind: "multiple-choice";
  options: MultipleChoiceOption[];
  correctOptionId: string;
}

/** Algebraic answer entered with MathLive, graded by symbolic equivalence (math.js). */
export interface AlgebraicAnswer {
  kind: "algebraic";
  /** Canonical expression in math.js syntax, e.g. "90 - A/2". */
  correctExpression: string;
  /** Free variables appearing in the answer, e.g. ["A", "B", "C"]. */
  variables: string[];
  placeholder?: string;
}

/**
 * Geometric action: the learner manipulates the board to satisfy a condition,
 * then submits. The predicate runs against the live board refs.
 */
export interface GeometricActionAnswer {
  kind: "geometric";
  instruction: string;
  check: (refs: BoardRefs) => boolean;
}

export type AnswerConfig =
  | MultipleChoiceAnswer
  | AlgebraicAnswer
  | GeometricActionAnswer;

/**
 * A wrong-answer (or reveal) explanation, rendered as a state transition on the
 * learner's *current* board via `boardOverlayConfig` (not a separate image).
 */
export interface Explanation {
  /**
   * When to show this explanation:
   * - "default_wrong"     any incorrect submission
   * - `selected_${id}`    a specific wrong multiple-choice option
   * - "reveal"            shown when the learner reveals the answer
   */
  triggerCondition: string;
  text: string; // Markdown / KaTeX
  boardOverlayConfig?: JSXGraphDef; // lines/highlights added to the current board
}

export interface Problem {
  id: string;
  prompt: string; // Markdown / KaTeX supported
  /** Short instruction nudging the learner to drag/explore the figure. */
  exploreHint?: string;
  boardConfig: JSXGraphDef;
  answerConfig: AnswerConfig;
  explanations: Explanation[];
  /** Shown after a correct answer / on reveal. */
  solutionText?: string;
  xp: number;
}

export interface Lesson {
  id: string;
  title: string;
  summary: string;
  /** Short teaching intro shown before the first problem (KaTeX supported). */
  concept: string;
  problems: Problem[];
  /** Bonus XP for finishing the whole lesson. */
  completionXp: number;
}

export interface Course {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  lessons: Lesson[];
}
