/**
 * Replays a research problem's proof through the research verifier and reports,
 * step by step, whether each is accepted and whether the chain reaches the goal.
 * This is the "play-test" harness for a problem.
 */
import { factEqual, factLabel, type Fact } from "@/lib/freeplay/dsl";
import { factHolds } from "@/lib/freeplay/check";
import { researchVerify, type VerifyResult } from "../harness";
import type { ResearchProblem } from "./types";

export interface StepReport {
  index: number;
  label: string;
  result: VerifyResult;
  numericallyTrue: boolean;
}

export interface ReplayReport {
  id: string;
  source: string;
  steps: StepReport[];
  goalReached: boolean;
  allValid: boolean;
}

export function replayProblem(p: ResearchProblem): ReplayReport {
  const bindings = p.bindings ?? {};
  let established: Fact[] = [...p.given];
  const steps: StepReport[] = [];

  for (let i = 0; i < p.steps.length; i++) {
    const step = p.steps[i];
    const result = researchVerify({
      coords: p.coords,
      bindings,
      establishedFacts: established,
      candidateFact: step.fact,
      citedPremises: step.premises,
      givens: p.given,
      analogy: step.analogy,
    });
    steps.push({
      index: i,
      label: factLabel(step.fact),
      result,
      numericallyTrue: factHolds(step.fact, p.coords, bindings),
    });
    // Only advance the established set when the step is accepted, mirroring the
    // real proof loop.
    if (result.valid) established = [...established, step.fact];
  }

  const goalReached = established.some((f) => factEqual(f, p.goal));
  const allValid = steps.every((s) => s.result.valid);
  return { id: p.id, source: p.source, steps, goalReached, allValid };
}
