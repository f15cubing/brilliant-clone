import type { BoardConstraint, BoardElementDef } from "@/lib/geometry/board-types";
import type { Coords, VarBindings } from "./check";
import type { LFact, PointId, RuleId } from "./dsl";

export type Difficulty = "intro" | "core" | "challenge";

/**
 * Optional constraint description for the MOVABLE figure when some free points
 * are not free in the plane but ride a locus (a circle/line) — e.g. four points
 * on a circle, or a glider on a tangent line. The locus is built as a background
 * `host` element (from plane handle points + constants) and the relevant free
 * points become JSXGraph gliders on it. Dependent points are still recomputed by
 * `constructFrom`, which receives every free point's live position (plane and
 * glider alike).
 */
export interface MovableSpec {
  /**
   * Host locus elements (e.g. `circle(O, r)`) the gliders ride on, plus any
   * helper construction points. Built after the plane free points and before the
   * gliders, so they may reference plane free points by id.
   */
  hosts?: BoardElementDef[];
  /** Maps a free-point id to the host element id it glides on (+ optional drag clamp). */
  gliders?: Record<PointId, { on: string; constrain?: BoardConstraint }>;
}

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
   * Explicit-parameter form of `construct`: given the live positions of the
   * puzzle's `freePoints`, derive a full realization (dependent points recomputed
   * so every `given` still holds BY CONSTRUCTION). This powers the MOVABLE figure
   * — dragging a free point reruns this and redraws (see
   * `docs/design/MOVABLE_FIGURES.md`). Converted puzzles refactor `construct(rng)`
   * to sample the free points then delegate to the same core as `constructFrom`;
   * puzzles without it gracefully fall back to the static fixed board. The
   * verifier never uses it (it relies on `coords` + sampled realizations), so
   * dragging is purely exploratory and can never affect proof checking.
   */
  constructFrom?: (free: Coords) => Realization;
  /**
   * The free (draggable) point ids of the construction; every other point is
   * dependent (recomputed from the free ones). For the movable-drawing UI; the
   * verifier does not require it.
   */
  freePoints?: PointId[];
  /**
   * Optional locus constraints for the movable figure (gliders on a circle/line).
   * When absent, every free point is draggable in the plane. See `MovableSpec`.
   */
  movable?: MovableSpec;

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
