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

/** Forced dwell on feedback before the learner may advance (milliseconds). */
export interface DwellConfig {
  wrongMs: number; // dwell after a wrong/teaching selection
  correctMs: number; // dwell after the correct selection (consolidation)
}

export const DEFAULT_DWELL: DwellConfig = { wrongMs: 3000, correctMs: 1500 };

/**
 * One option of a direct-instruction multiple-choice stage. Every option
 * teaches: the correct option confirms the principle; wrong options name and
 * correct a specific misconception.
 */
export interface InstructionMCOption {
  id: string;
  label: string; // KaTeX / markdown
  correct: boolean;
  teaching: string; // shown immediately on selecting this option
  misconception?: string; // recorded as the mistake id (analytics)
  boardOverlayConfig?: JSXGraphDef; // optional overlay illustrating the teaching
}

/** Unskippable post-correct consolidation shown before the learner advances. */
export interface ConsolidationGate {
  principle: string; // the one thing to remember (KaTeX / markdown)
  selfExplainPrompt?: string; // if set, advancing requires acknowledging it
}

export interface InstructionMCProblem {
  id: string;
  prompt: string;
  exploreHint?: string;
  boardConfig: JSXGraphDef;
  options: InstructionMCOption[];
  consolidation: ConsolidationGate;
  dwell?: DwellConfig; // per-stage override of the forced dwell
  xp: number;
}

/** One line of a fill-justification proof-comprehension task. */
export interface ComprehensionLine {
  statement: string; // the claim of this proof step (KaTeX / markdown)
  reasons: InstructionMCOption[]; // candidate justifications; exactly one correct
}

export interface ComprehensionTask {
  id: string;
  prompt: string;
  boardConfig?: JSXGraphDef;
  lines: ComprehensionLine[];
  validatedText: string; // shown once every line is correctly justified
  dwell?: DwellConfig;
  xp: number;
}

/** Bridge from the lesson into the matching Freeplay puzzle(s). */
export interface HandoffStage {
  title: string;
  body: string; // KaTeX / markdown
  freeplayPuzzleIds: string[];
  ctaLabel?: string;
}

/**
 * An ordered unit of a lesson. `problem` wraps an existing {@link Problem}
 * rendered by the UNCHANGED ProblemPlayer (legacy + un-migrated content);
 * the other kinds are new direct-instruction / bridge stages.
 */
export type LessonStage =
  | { kind: "concept"; title?: string; body: string }
  | { kind: "instruction-mc"; problem: InstructionMCProblem }
  | { kind: "problem"; problem: Problem }
  | { kind: "comprehension"; task: ComprehensionTask }
  | { kind: "handoff"; handoff: HandoffStage };

export interface Lesson {
  id: string;
  title: string;
  summary: string;
  /** Short teaching intro shown before the first problem (KaTeX supported). */
  concept: string;
  problems: Problem[];
  /**
   * Optional explicit stage sequence. When present the lesson renders as these
   * stages; when absent a legacy `[concept, ...problems]` sequence is derived.
   */
  stages?: LessonStage[];
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
