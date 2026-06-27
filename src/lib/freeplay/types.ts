import type { BoardElementDef } from "@/lib/geometry/board-types";
import type { Coords, VarBindings } from "./check";
import type { LFact, PointId, RuleId } from "./dsl";

export type Difficulty = "intro" | "core" | "challenge";

/**
 * A concrete realization of a puzzle's figure: one set of point coordinates plus
 * the angle-variable bindings to evaluate `aval` facts against it. The fixed
 * `Puzzle.coords`/`variables` are realization 0 (the canonical sample); a
 * `Puzzle.construct` produces additional generic realizations for multi-case
 * verification (and, later, for movable drawings).
 */
export interface Realization {
  coords: Coords;
  bindings?: VarBindings;
}

/** A reference proof step (for tests + future hints; the engine no longer needs it). */
export interface SolutionStep {
  /** May be an `eqratio` (`LFact`); `Fact ⊆ LFact`, so angle-only steps still fit. */
  fact: LFact;
  rule: RuleId;
  /** The established facts this step relies on. */
  premises: LFact[];
  humanReadable?: string;
}

export interface Puzzle {
  id: string;
  title: string;
  blurb: string;
  difficulty: Difficulty;

  /** Pre-realized coordinates for the fixed figure (realization 0). */
  coords: Coords;
  /** Angle-variable bindings (e.g. A -> ∠BAC) used to evaluate angle-value facts. */
  variables?: VarBindings;
  /** Extra board elements drawn over the auto-rendered labeled points. */
  figure: BoardElementDef[];

  /**
   * Deterministic parametric construction: given a uniform RNG in [0, 1), build a
   * fresh GENERIC realization that satisfies every `given` BY CONSTRUCTION (free
   * points placed from the RNG, dependent points derived). The multi-case verifier
   * resamples this to reject steps that are only "coincidentally" true/derivable in
   * the one canonical figure; the (future) movable-drawing UI drags `freePoints`
   * through the same construction. Optional: puzzles without it fall back to
   * single-figure verification against `coords`.
   */
  construct?: (rng: () => number) => Realization;
  /**
   * The free (draggable) point ids of the construction; every other point is
   * dependent (recomputed from the free ones). For the movable-drawing UI; the
   * verifier does not require it.
   */
  freePoints?: PointId[];

  given: LFact[];
  goal: LFact;
  equivalentGoals?: LFact[];

  /** Curated reference proof (used by tests and, later, hints). */
  solution: SolutionStep[];
  /**
   * Whether `solution` is a complete chain ending at the goal. Defaults to true.
   * Set false for puzzles whose machine-checkable proof is still partial (the
   * listed steps are verified, but they don't yet reach the goal).
   */
  solutionReachesGoal?: boolean;
}
