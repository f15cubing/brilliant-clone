/**
 * Forward-only proof state for a freeplay puzzle: the learner accumulates
 * established facts until one matches the goal.
 */
import { factEqual, isAmong, type LFact, type RuleId } from "./dsl";
import type { Puzzle } from "./types";

export interface FactEntry {
  id: number;
  fact: LFact;
  // "construction" = a fact guaranteed by a learner-added auxiliary construction
  // (citable like a given; lives outside the proof reducer's own state).
  source: "given" | "derived" | "construction";
  /** Engine-reported rule name (derived steps only). */
  rule?: RuleId;
  // R2-D2 (proof archive): cited premises for this derived step, captured so a
  // completed proof can be compiled + stored. Additive/optional — given facts
  // and existing call sites are unaffected.
  premises?: LFact[];
  // R2-D2 (proof archive): the analogy substitution, if this step was accepted
  // "by symmetry". Optional. Keyed as plain strings to avoid a symmetry import.
  analogy?: { subst: Record<string, string> };
}

export type Feedback =
  | { kind: "accepted"; rule: RuleId }
  | { kind: "solved"; rule: RuleId }
  | { kind: "already_known" }
  | { kind: "not_true" }
  | { kind: "unknown_premise" }
  | { kind: "unjustified" }
  | { kind: "not_symmetry" }
  | { kind: "extraneous_premises" };

export interface ProofState {
  puzzle: Puzzle;
  facts: FactEntry[];
  nextId: number;
  status: "playing" | "solved";
  feedback?: Feedback;
}

/** Current draft schema version (bump if the stored draft shape changes). */
export const DRAFT_VERSION = 1;

/**
 * A saved, IN-PROGRESS proof: just the DERIVED steps. Givens are always
 * rebuilt from the puzzle, so a draft stays valid even if the puzzle's content
 * changes. Defined here (in the pure module) so persistence helpers can import
 * it without dragging Firebase into the proof logic.
 */
export interface ProofDraft {
  version: number;
  derived: FactEntry[];
}

export type ProofAction =
  // R2-D2 (proof archive): `premises`/`analogy` are optional & additive so the
  // accepted step can record exactly what it cited for the stored proof.
  | {
      type: "accept";
      fact: LFact;
      rule: RuleId;
      premises?: LFact[];
      analogy?: { subst: Record<string, string> };
    }
  | {
      type: "reject";
      reason:
        | "not_true"
        | "unknown_premise"
        | "unjustified"
        | "not_symmetry"
        | "extraneous_premises";
    }
  | { type: "already_known" }
  | { type: "clearFeedback" }
  | { type: "reset" };

export function initProofState(puzzle: Puzzle): ProofState {
  const facts: FactEntry[] = puzzle.given.map((fact, i) => ({
    id: i,
    fact,
    source: "given" as const,
  }));
  return {
    puzzle,
    facts,
    nextId: facts.length,
    status: "playing",
    feedback: undefined,
  };
}

/** Extract the persistable draft (derived steps only) from live proof facts. */
export function draftFromFacts(facts: FactEntry[]): ProofDraft {
  return {
    version: DRAFT_VERSION,
    derived: facts.filter((f) => f.source === "derived"),
  };
}

function isLFactShape(f: unknown): f is LFact {
  if (!f || typeof f !== "object") return false;
  const kind = (f as { kind?: unknown }).kind;
  return kind === "rel" || kind === "aval" || kind === "eqratio";
}

/** Structural check for a stored derived step (a fact entry with a real fact). */
function isDerivedEntryShape(e: unknown): e is FactEntry {
  return Boolean(e) && typeof e === "object" && isLFactShape((e as FactEntry).fact);
}

/**
 * Build the initial proof state for a puzzle, replaying a saved draft on top of
 * the puzzle's givens. Derived steps get fresh sequential ids (premises are
 * stored as fact VALUES, so re-numbering ids is safe). A structurally invalid
 * draft is ignored wholesale — we fall back to a fresh proof rather than
 * hydrate an inconsistent one.
 */
export function hydrateProofState(
  puzzle: Puzzle,
  draft?: ProofDraft | null,
): ProofState {
  const base = initProofState(puzzle);
  if (!draft || !Array.isArray(draft.derived) || draft.derived.length === 0) {
    return base;
  }
  if (!draft.derived.every(isDerivedEntryShape)) return base;

  let nextId = base.nextId;
  const derived: FactEntry[] = draft.derived.map((entry) => ({
    id: nextId++,
    fact: entry.fact,
    source: "derived" as const,
    rule: entry.rule,
    premises: entry.premises,
    analogy: entry.analogy,
  }));
  const facts = [...base.facts, ...derived];

  return {
    ...base,
    facts,
    nextId,
    // Drafts are deleted on solve, so this is normally "playing"; recompute
    // defensively in case a goal-reaching step was ever persisted.
    status: derived.some((d) => isGoal(puzzle, d.fact)) ? "solved" : "playing",
    feedback: undefined,
  };
}

export function establishedFacts(state: ProofState): LFact[] {
  return state.facts.map((f) => f.fact);
}

export function isGoal(puzzle: Puzzle, fact: LFact): boolean {
  if (factEqual(fact, puzzle.goal)) return true;
  return (puzzle.equivalentGoals ?? []).some((g) => factEqual(g, fact));
}

export function proofReducer(state: ProofState, action: ProofAction): ProofState {
  switch (action.type) {
    case "accept": {
      const solved = isGoal(state.puzzle, action.fact);
      const entry: FactEntry = {
        id: state.nextId,
        fact: action.fact,
        source: "derived",
        rule: action.rule,
        // R2-D2 (proof archive): thread the cited premises/analogy through.
        premises: action.premises,
        analogy: action.analogy,
      };
      return {
        ...state,
        facts: [...state.facts, entry],
        nextId: state.nextId + 1,
        status: solved ? "solved" : "playing",
        feedback: solved
          ? { kind: "solved", rule: action.rule }
          : { kind: "accepted", rule: action.rule },
      };
    }
    case "reject":
      return { ...state, feedback: { kind: action.reason } };
    case "already_known":
      return { ...state, feedback: { kind: "already_known" } };
    case "clearFeedback":
      return { ...state, feedback: undefined };
    case "reset":
      return initProofState(state.puzzle);
  }
}

/** Whether `fact` is already an established fact in `state`. */
export function alreadyKnown(state: ProofState, fact: LFact): boolean {
  return isAmong(fact, establishedFacts(state));
}
