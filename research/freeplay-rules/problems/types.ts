/**
 * A contest problem encoded for the research harness. Mirrors the shape of a
 * shipped `Puzzle` but stays out of `src/` so it is never bundled into the site.
 */
import type { Coords, VarBindings } from "@/lib/freeplay/check";
import type { Fact } from "@/lib/freeplay/dsl";
import type { Subst } from "@/lib/freeplay/symmetry";

export interface ProofStep {
  fact: Fact;
  premises: Fact[];
  /** Optional expected rule name (asserted when present). */
  expectRule?: string;
  /** When set, the step is justified "by symmetry" under this relabeling. */
  analogy?: { subst: Subst };
  humanReadable?: string;
}

export interface ResearchProblem {
  id: string;
  /** e.g. "IMO 2009 P2", "USAMO 1995 P3". */
  source: string;
  statement: string;
  coords: Coords;
  bindings?: VarBindings;
  given: Fact[];
  goal: Fact;
  steps: ProofStep[];
  /** New research rules this problem exercises (for the index). */
  exercises: string[];
}
