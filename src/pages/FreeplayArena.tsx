import { useReducer, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FactList } from "@/components/freeplay/FactList";
import { FixedFigure } from "@/components/freeplay/FixedFigure";
import { GoalPanel } from "@/components/freeplay/GoalPanel";
import { ProofSummary } from "@/components/freeplay/ProofSummary";
import { StepBuilder } from "@/components/freeplay/StepBuilder";
import { DevPanel, type LastAttempt } from "@/components/freeplay/DevPanel";
import { verifyStep } from "@/lib/freeplay/api";
import type { LFact } from "@/lib/freeplay/dsl";
import { factHoldsL } from "@/lib/freeplay/lengths/dsl";
import {
  alreadyKnown,
  establishedFacts,
  initProofState,
  proofReducer,
  type Feedback,
} from "@/lib/freeplay/proof";
import { getPuzzle } from "@/lib/freeplay/puzzles";
import type { Subst } from "@/lib/freeplay/symmetry";
import type { Puzzle } from "@/lib/freeplay/types";

const FEEDBACK: Record<
  Feedback["kind"],
  { tone: "ok" | "warn" | "bad"; text: (rule?: string) => string }
> = {
  accepted: { tone: "ok", text: (r) => `Step accepted — ${r}.` },
  solved: { tone: "ok", text: (r) => `Goal reached by ${r}. Proof complete!` },
  already_known: { tone: "warn", text: () => "That fact is already established." },
  not_true: { tone: "bad", text: () => "That statement isn't true in this figure." },
  unknown_premise: {
    tone: "warn",
    text: () => "One of the cited facts isn't an established fact yet.",
  },
  unjustified: {
    tone: "warn",
    text: () =>
      "That's true, but it doesn't follow from the facts you cited in a single step.",
  },
  not_symmetry: {
    tone: "warn",
    text: () =>
      "Those swaps don't map the puzzle's givens onto themselves, so the analogy isn't valid.",
  },
  extraneous_premises: {
    tone: "warn",
    text: () =>
      "Some cited facts aren't needed for this step. Cite only the facts it actually uses.",
  },
};

const TONE_CLASS = {
  ok: "border-correct/40 bg-correct/10 text-correct",
  warn: "border-ochre/40 bg-ochre/10 text-ochre-deep",
  bad: "border-vermilion/40 bg-vermilion/10 text-vermilion",
} as const;

function FeedbackBanner({ feedback }: { feedback: Feedback }) {
  const spec = FEEDBACK[feedback.kind];
  const rule = "rule" in feedback ? feedback.rule : undefined;
  return (
    <div
      className={`rounded-sm border px-3 py-2 font-serif text-sm ${TONE_CLASS[spec.tone]}`}
    >
      {spec.text(rule)}
    </div>
  );
}

function Arena({ puzzle }: { puzzle: Puzzle }) {
  const [state, dispatch] = useReducer(proofReducer, puzzle, initProofState);
  const [busy, setBusy] = useState(false);
  const [lastAttempt, setLastAttempt] = useState<LastAttempt | null>(null);

  const solved = state.status === "solved";
  const pointIds = Object.keys(puzzle.coords);
  const bindings = puzzle.variables ?? {};

  const handleAssert = async (
    fact: LFact,
    premises: LFact[],
    opts?: { subst?: Subst },
  ) => {
    if (alreadyKnown(state, fact)) {
      dispatch({ type: "already_known" });
      return;
    }
    setBusy(true);
    try {
      const result = await verifyStep(
        {
          coords: puzzle.coords,
          bindings,
          establishedFacts: establishedFacts(state),
          candidateFact: fact,
          citedPremises: premises,
          givens: puzzle.given,
          analogy: opts?.subst ? { subst: opts.subst } : undefined,
        },
        puzzle.id,
      );
      setLastAttempt({
        fact,
        holds: factHoldsL(fact, puzzle.coords, bindings),
        result,
      });
      if (result.valid) {
        dispatch({ type: "accept", fact, rule: result.rule });
      } else {
        dispatch({ type: "reject", reason: result.reason });
      }
    } catch (err) {
      console.error("[freeplay] verify threw:", err);
      dispatch({ type: "reject", reason: "unjustified" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            to="/freeplay"
            className="font-mono text-xs uppercase tracking-[0.18em] text-vermilion hover:underline"
          >
            ← Freeplay
          </Link>
          <h1 className="mt-2 font-display text-3xl tracking-tight text-ink">
            {puzzle.title}
          </h1>
          <p className="mt-1 max-w-2xl font-serif text-ink-soft">{puzzle.blurb}</p>
        </div>
        <button
          type="button"
          onClick={() => dispatch({ type: "reset" })}
          className="rounded-sm border border-rule px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-ink-soft transition hover:border-ink-faint hover:text-ink"
        >
          Reset
        </button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <FactList facts={state.facts} />
        </div>

        <div className="flex flex-col gap-4">
          <FixedFigure puzzle={puzzle} />
          {state.feedback && <FeedbackBanner feedback={state.feedback} />}
          {solved ? (
            <ProofSummary facts={state.facts} />
          ) : (
            <StepBuilder
              pointIds={pointIds}
              facts={state.facts}
              givens={puzzle.given}
              busy={busy}
              disabled={solved}
              onAssert={handleAssert}
              puzzleId={puzzle.id}
              variableNames={Object.keys(bindings)}
            />
          )}
        </div>

        <div className="flex flex-col gap-4">
          <GoalPanel puzzle={puzzle} solved={solved} />
          {import.meta.env.DEV && (
            <ErrorBoundary>
              <DevPanel
                coords={puzzle.coords}
                bindings={bindings}
                facts={establishedFacts(state)}
                last={lastAttempt}
              />
            </ErrorBoundary>
          )}
        </div>
      </div>
    </div>
  );
}

export function FreeplayArena() {
  const { puzzleId } = useParams<{ puzzleId: string }>();
  const puzzle = puzzleId ? getPuzzle(puzzleId) : undefined;

  if (!puzzle) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="font-serif text-lg text-ink">Puzzle not found.</p>
        <Link
          to="/freeplay"
          className="font-mono text-xs uppercase tracking-wide text-vermilion hover:underline"
        >
          ← Back to freeplay
        </Link>
      </div>
    );
  }

  return <Arena key={puzzle.id} puzzle={puzzle} />;
}
