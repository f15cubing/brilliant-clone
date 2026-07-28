/**
 * R2-D2 (proof archive): compile a COMPLETE, serializable proof from the live
 * `FactEntry[]` of a solved freeplay puzzle, ready to persist per-user.
 *
 * `compileProof` is PURE: given the established facts (givens + derived steps)
 * and the puzzle, it returns a plain-JSON `CompiledProof` with no `undefined`
 * fields and no non-serializable bits, so it is safe to write directly to
 * Firestore (`addDoc`) or `JSON.stringify` into localStorage. The `solvedAt`
 * timestamp is deliberately NOT set here — the persistence layer stamps it
 * (`serverTimestamp()` for Firestore, `Date.now()` for guests).
 */
import { factLabel, type LFact } from "./dsl";
import type { Justification } from "./justification";
import type { FactEntry } from "./proof";
import type { Difficulty, Puzzle } from "./types";

/** One derived step of a stored proof, with the facts it was justified by. */
export interface CompiledStep {
  /** The derived fact (structured, JSON-safe). */
  fact: LFact;
  /** Engine-reported rule name ("" if, unexpectedly, none was recorded). */
  rule: string;
  /** The established facts this step cited as premises. */
  premises: LFact[];
  /**
   * Established facts the ENGINE supplied without the learner citing them
   * (collinearity handed to the angle chase). Printed alongside `premises` so
   * the step is checkable on paper: without these a reader can be left unable to
   * reach the conclusion from the citation list alone.
   */
  implicitPremises?: LFact[];
  /**
   * The auditable reason: for an algebraic step the rational combination that
   * produces the claim, for a rule step the exact facts the rule matched. Absent
   * on proofs recorded before this was captured.
   */
  justification?: Justification;
  /** A KaTeX/markdown label for the derived fact (display convenience). */
  humanReadable: string;
  /** Present only when the step was accepted "by symmetry". */
  analogy?: { subst: Record<string, string> };
}

/** A complete, serializable proof record for one solve (one history entry). */
export interface CompiledProof {
  puzzleId: string;
  title: string;
  /** The puzzle's citation/blurb. */
  blurb: string;
  difficulty: Difficulty;
  /** The ordered given facts. */
  givens: LFact[];
  /** The ordered derived steps. */
  steps: CompiledStep[];
  /** The puzzle's goal. */
  goal: LFact;
  stepCount: number;
}

/**
 * Build a serializable `CompiledProof` from the proof state's facts.
 *
 * - `givens` preserves the order the puzzle declared them.
 * - `steps` preserves derivation order and carries each step's cited premises
 *   (defaulting to `[]` when, for legacy reasons, none were captured).
 * - Optional fields (`analogy`) are omitted entirely when absent so the result
 *   has no `undefined` values (Firestore-safe + clean JSON for guests).
 */
export function compileProof(facts: FactEntry[], puzzle: Puzzle): CompiledProof {
  const givens = facts.filter((f) => f.source === "given").map((f) => f.fact);

  const steps: CompiledStep[] = facts
    .filter((f) => f.source === "derived")
    .map((f) => {
      const step: CompiledStep = {
        fact: f.fact,
        rule: f.rule ?? "",
        premises: f.premises ?? [],
        humanReadable: factLabel(f.fact),
      };
      // Only attach optional fields when they exist so we never serialize
      // `undefined` (Firestore rejects it).
      if (f.analogy) step.analogy = f.analogy;
      if (f.justification) {
        step.justification = f.justification;
        // Lift the uncited facts to the top level of the step: they belong next
        // to `premises`, since together they are what the step actually used.
        if (f.justification.implicitPremises?.length) {
          step.implicitPremises = f.justification.implicitPremises;
        }
      }
      return step;
    });

  return {
    puzzleId: puzzle.id,
    title: puzzle.title,
    blurb: puzzle.blurb,
    difficulty: puzzle.difficulty,
    givens,
    steps,
    goal: puzzle.goal,
    stepCount: steps.length,
  };
}
