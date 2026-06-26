import type { BoardElementDef } from "@/lib/geometry/board-types";
import type { Coords, VarBindings } from "./check";
import type { Fact, RuleId } from "./dsl";

export type Difficulty = "intro" | "core" | "challenge";

/** A reference proof step (for tests + future hints; the engine no longer needs it). */
export interface SolutionStep {
  fact: Fact;
  rule: RuleId;
  /** The established facts this step relies on. */
  premises: Fact[];
  humanReadable?: string;
}

export interface Puzzle {
  id: string;
  title: string;
  blurb: string;
  difficulty: Difficulty;

  /** Pre-realized coordinates for the fixed figure. */
  coords: Coords;
  /** Angle-variable bindings (e.g. A -> ∠BAC) used to evaluate angle-value facts. */
  variables?: VarBindings;
  /** Extra board elements drawn over the auto-rendered labeled points. */
  figure: BoardElementDef[];

  given: Fact[];
  goal: Fact;
  equivalentGoals?: Fact[];

  /** Curated reference proof (used by tests and, later, hints). */
  solution: SolutionStep[];
  /**
   * Whether `solution` is a complete chain ending at the goal. Defaults to true.
   * Set false for puzzles whose machine-checkable proof is still partial (the
   * listed steps are verified, but they don't yet reach the goal).
   */
  solutionReachesGoal?: boolean;
}
