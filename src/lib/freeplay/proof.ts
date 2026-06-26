/**
 * Forward-only proof state for a freeplay puzzle: the learner accumulates
 * established facts until one matches the goal.
 */
import { factEqual, isAmong, type Fact, type RuleId } from "./dsl";
import type { Puzzle } from "./types";

export interface FactEntry {
  id: number;
  fact: Fact;
  source: "given" | "derived";
  /** Engine-reported rule name (derived steps only). */
  rule?: RuleId;
  // R2-D2 (proof archive): cited premises for this derived step, captured so a
  // completed proof can be compiled + stored. Additive/optional — given facts
  // and existing call sites are unaffected.
  premises?: Fact[];
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

export type ProofAction =
  // R2-D2 (proof archive): `premises`/`analogy` are optional & additive so the
  // accepted step can record exactly what it cited for the stored proof.
  | {
      type: "accept";
      fact: Fact;
      rule: RuleId;
      premises?: Fact[];
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

export function establishedFacts(state: ProofState): Fact[] {
  return state.facts.map((f) => f.fact);
}

export function isGoal(puzzle: Puzzle, fact: Fact): boolean {
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
export function alreadyKnown(state: ProofState, fact: Fact): boolean {
  return isAmong(fact, establishedFacts(state));
}
