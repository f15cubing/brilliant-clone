import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Spinner } from "@/components/Spinner";
import { ConstructionToolbar } from "@/components/freeplay/ConstructionToolbar";
import { FactList } from "@/components/freeplay/FactList";
import { MovableFigure } from "@/components/freeplay/MovableFigure";
import type { GeometryBoardHandle } from "@/components/geometry/GeometryBoard";
import { GoalPanel } from "@/components/freeplay/GoalPanel";
import { ProofSummary } from "@/components/freeplay/ProofSummary";
import { StepBuilder } from "@/components/freeplay/StepBuilder";
import { DevPanel, type LastAttempt } from "@/components/freeplay/DevPanel";
import { verifyStep } from "@/lib/freeplay/api";
import { isAmong, type LFact } from "@/lib/freeplay/dsl";
import {
  type AuxKind,
  type AuxStep,
  AUX_ARITY,
  allAuxFacts,
  auxFacts,
  compileAux,
  extendCoords,
  extendRealizations,
  makeAuxStep,
} from "@/lib/freeplay/auxConstructions";
import { factHoldsL } from "@/lib/freeplay/lengths/dsl";
import {
  alreadyKnown,
  establishedFacts,
  hydrateProofState,
  proofReducer,
  type Feedback,
  type FactEntry,
  type ProofDraft,
} from "@/lib/freeplay/proof";
import { getPuzzle } from "@/lib/freeplay/puzzles";
import { sampleRealizations } from "@/lib/freeplay/realize";
// R2-D2 (proof archive): compile + record the proof on a win.
import { compileProof } from "@/lib/freeplay/proofRecord";
import { useProofRecorder } from "@/lib/freeplay/useProofRecorder";
// R3-D3 (resume): auto-save / restore the in-progress proof.
import { useProofDraft } from "@/lib/freeplay/useProofDraft";
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

function Arena({
  puzzle,
  initialDraft,
  persistDraft,
  clearDraft,
}: {
  puzzle: Puzzle;
  // R3-D3 (resume): the saved in-progress proof to restore (null = fresh).
  initialDraft: ProofDraft | null;
  persistDraft: (facts: FactEntry[]) => void;
  clearDraft: () => void;
}) {
  const [state, dispatch] = useReducer(
    proofReducer,
    { puzzle, draft: initialDraft },
    ({ puzzle: p, draft }) => hydrateProofState(p, draft),
  );
  const [busy, setBusy] = useState(false);
  const [lastAttempt, setLastAttempt] = useState<LastAttempt | null>(null);
  // Overlay visibility: the facts list and the step builder float over the
  // near-full-screen figure and can each be hidden to maximize the canvas.
  const [showFacts, setShowFacts] = useState(true);
  const [showBuilder, setShowBuilder] = useState(true);

  // Auxiliary constructions the learner adds on-canvas (midpoint, foot, …). Each
  // introduces a new point + its defining fact (citable as a premise). They live
  // outside the proof reducer; the arena merges them into the facts/points it
  // shows and into what the verifier checks against.
  const boardRef = useRef<GeometryBoardHandle>(null);
  const [auxSteps, setAuxSteps] = useState<AuxStep[]>([]);
  const [tool, setTool] = useState<AuxKind | null>(null);
  const [operands, setOperands] = useState<string[]>([]);

  // R2-D2 (proof archive): record the completed proof exactly once per solve.
  // `attemptRef` bumps on Reset so re-solving stores a fresh history record.
  const { save: proofSave, recordSolvedProof } = useProofRecorder();
  const attemptRef = useRef(0);

  const solved = state.status === "solved";

  // R2-D2 (proof archive): on the win transition, compile + persist the proof.
  // The recorder's own attempt-keyed guard dedupes StrictMode double-invokes.
  useEffect(() => {
    if (state.status !== "solved") return;
    const compiled = compileProof(state.facts, puzzle);
    recordSolvedProof(compiled, `${puzzle.id}#${attemptRef.current}`);
  }, [state.status, state.facts, puzzle, recordSolvedProof]);

  // R3-D3 (resume): auto-save the in-progress proof so the learner can leave
  // and come back. Skip the initial (hydrated) render so opening a puzzle never
  // re-writes or clears the draft. On solve the proof moves to the archive, so
  // the draft is cleared; resetting (facts back to givens) also clears it.
  const firstAutoSave = useRef(true);
  useEffect(() => {
    if (firstAutoSave.current) {
      firstAutoSave.current = false;
      return;
    }
    if (state.status === "solved") {
      clearDraft();
      return;
    }
    const hasDerived = state.facts.some((f) => f.source === "derived");
    if (hasDerived) persistDraft(state.facts);
    else clearDraft();
  }, [state.facts, state.status, persistDraft, clearDraft]);

  const bindings = puzzle.variables ?? {};

  // Multi-case verification: sample several independent generic realizations of
  // this puzzle's figure (all satisfying the givens) once per puzzle load. Every
  // step is then checked against all of them, so a step that is only
  // coincidentally true/derivable in the one canonical figure is rejected.
  const realizations = useMemo(() => sampleRealizations(puzzle), [puzzle]);

  // The defining facts of the current constructions (citable premises), plus the
  // merged facts/points the UI shows and the verifier sees.
  const auxFactList = useMemo(() => allAuxFacts(auxSteps), [auxSteps]);
  const auxEntries: FactEntry[] = useMemo(
    () =>
      auxSteps.flatMap((s, si) =>
        auxFacts(s).map((fact, fi) => ({
          // Negative ids keep aux facts clear of the reducer's sequential ids.
          id: -1 - (si * 8 + fi),
          fact,
          source: "construction" as const,
        })),
      ),
    [auxSteps],
  );
  const displayFacts = useMemo(
    () => [...state.facts, ...auxEntries],
    [state.facts, auxEntries],
  );
  const allPointIds = useMemo(
    () => [...Object.keys(puzzle.coords), ...auxSteps.map((s) => s.id)],
    [puzzle, auxSteps],
  );

  // The board's pointer-down handler reads the latest tool/operands via refs, so
  // it never needs re-registering.
  const toolRef = useRef(tool);
  const operandsRef = useRef(operands);
  const auxStepsRef = useRef(auxSteps);
  toolRef.current = tool;
  operandsRef.current = operands;
  auxStepsRef.current = auxSteps;

  // Register the construction click handler once the board exists. A click in
  // construction mode appends an operand; the last operand completes the step.
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    return board.onBoardDown(({ hitId }) => {
      const t = toolRef.current;
      if (!t || !hitId) return; // no active tool, or an empty-space click
      const ops = [...operandsRef.current, hitId];
      if (ops.length < AUX_ARITY[t]) {
        setOperands(ops);
        return;
      }
      const used = new Set([
        ...Object.keys(puzzle.coords),
        ...auxStepsRef.current.map((s) => s.id),
      ]);
      setAuxSteps((prev) => [...prev, makeAuxStep(t, ops, used)]);
      setOperands([]);
    });
  }, [puzzle]);

  // Lock point dragging while a tool is active so clicks select, not drag.
  useEffect(() => {
    boardRef.current?.setPointsFixed(tool !== null);
  }, [tool]);

  // Render the constructions as a board overlay; rebuilding the overlay layer on
  // change preserves the puzzle figure's live drag state.
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    board.clearOverlays();
    if (auxSteps.length > 0) board.applyOverlay({ elements: compileAux(auxSteps) });
  }, [auxSteps]);

  const handleAssert = async (
    fact: LFact,
    premises: LFact[],
    opts?: { subst?: Subst },
  ) => {
    if (alreadyKnown(state, fact) || isAmong(fact, auxFactList)) {
      dispatch({ type: "already_known" });
      return;
    }
    // Fold the learner's constructions into every realization the verifier sees,
    // and grant their defining facts as citable premises.
    const liveCoords = extendCoords(puzzle.coords, auxSteps);
    setBusy(true);
    try {
      const result = await verifyStep(
        {
          coords: liveCoords,
          bindings,
          establishedFacts: [...establishedFacts(state), ...auxFactList],
          candidateFact: fact,
          citedPremises: premises,
          givens: puzzle.given,
          analogy: opts?.subst ? { subst: opts.subst } : undefined,
          realizations: extendRealizations(realizations, auxSteps),
        },
        puzzle.id,
      );
      setLastAttempt({
        fact,
        holds: factHoldsL(fact, liveCoords, bindings),
        result,
      });
      if (result.valid) {
        // R2-D2 (proof archive): also record the cited premises + any analogy
        // substitution so a completed proof can be compiled & stored on a win.
        dispatch({
          type: "accept",
          fact,
          rule: result.rule,
          premises,
          analogy: opts?.subst ? { subst: opts.subst } : undefined,
        });
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

  // Shared translucent "card" styling for the panels floating over the figure.
  const overlayCard =
    "flex flex-col gap-3 rounded-sm border border-rule bg-paper/90 p-4 shadow-lg backdrop-blur";
  const overlayBtn =
    "rounded-sm border border-rule bg-paper/90 px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-ink-soft shadow-sm backdrop-blur transition hover:border-ink-faint hover:text-ink";

  return (
    // `absolute inset-0` fills the full-bleed <main> (a flex-1 item with a real
    // rendered height); a percentage `h-full` here collapses to 0 because the
    // flex height is not a definite containing-block height. No background, so
    // the page's paper + drafting grid show through for a cohesive feel.
    <div className="absolute inset-0 overflow-hidden">
      {/* The figure fills the whole arena. Free points are draggable when the
          puzzle ships a `constructFrom`; otherwise it is a static fixed board. */}
      <MovableFigure ref={boardRef} puzzle={puzzle} className="absolute inset-0" />

      {/* Floating overlay. The layer itself ignores pointer events so empty
          space drags/pans the figure; each card re-enables them. */}
      <div className="pointer-events-none absolute inset-0 flex flex-col">
        <div className="flex items-start justify-between gap-3 p-3 sm:p-4">
          {/* Top-left: back link, title, goal. */}
          <div className="pointer-events-auto flex w-[min(90vw,21rem)] flex-col gap-2">
            <Link
              to="/freeplay"
              className="font-mono text-xs uppercase tracking-[0.18em] text-vermilion hover:underline"
            >
              ← Freeplay
            </Link>
            <h1 className="font-display text-2xl leading-tight tracking-tight text-ink">
              {puzzle.title}
            </h1>
            <GoalPanel puzzle={puzzle} solved={solved} className={overlayCard} />
            {!solved && (
              <ConstructionToolbar
                activeTool={tool}
                onSelect={setTool}
                operands={operands}
                auxCount={auxSteps.length}
                onUndo={() => {
                  setAuxSteps((prev) => prev.slice(0, -1));
                  setOperands([]);
                }}
                className={overlayCard}
              />
            )}
          </div>

          {/* Top-right: controls and the collapsible facts list. */}
          <div className="pointer-events-auto flex w-[min(90vw,21rem)] flex-col items-end gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowFacts((s) => !s)}
                className={overlayBtn}
              >
                {showFacts ? "Hide facts" : `Facts (${displayFacts.length})`}
              </button>
              <button
                type="button"
                onClick={() => {
                  // R2-D2 (proof archive): new attempt key so a re-solve re-saves.
                  attemptRef.current += 1;
                  dispatch({ type: "reset" });
                  setAuxSteps([]);
                  setTool(null);
                  setOperands([]);
                }}
                className={overlayBtn}
              >
                Reset
              </button>
            </div>
            {showFacts && (
              <FactList
                facts={displayFacts}
                className={`${overlayCard} max-h-[42vh] w-full overflow-y-auto`}
              />
            )}
          </div>
        </div>

        {/* Bottom-centre: feedback and the collapsible step builder / summary.
            This region grows to fill the height left beneath the top row and
            bottom-anchors its content, so the builder is bounded by the space
            that is actually available (never clipped off the bottom of the
            viewport) and scrolls internally when it doesn't fit. */}
        <div className="pointer-events-none flex min-h-0 flex-1 flex-col justify-end px-3 pb-3 sm:px-4 sm:pb-4">
          <div className="pointer-events-auto mx-auto flex min-h-0 w-full max-w-3xl flex-col gap-3">
            {state.feedback && (
              <div className="shrink-0">
                <FeedbackBanner feedback={state.feedback} />
              </div>
            )}
            <div className="flex shrink-0 justify-center">
              <button
                type="button"
                onClick={() => setShowBuilder((s) => !s)}
                className={`${overlayBtn} py-1 text-[0.62rem]`}
              >
                {showBuilder ? "▾ Hide panel" : "▴ Build a step"}
              </button>
            </div>
            {showBuilder && (
              <div className="min-h-0 overflow-y-auto rounded-sm bg-paper/90 shadow-lg backdrop-blur">
                {solved ? (
                  <ProofSummary facts={state.facts} save={proofSave} />
                ) : (
                  <StepBuilder
                    pointIds={allPointIds}
                    facts={displayFacts}
                    givens={puzzle.given}
                    busy={busy}
                    disabled={solved}
                    onAssert={handleAssert}
                    puzzleId={puzzle.id}
                    variableNames={Object.keys(bindings)}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {import.meta.env.DEV && (
        <div className="pointer-events-auto absolute bottom-2 left-2 z-10 max-h-[40vh] w-72 overflow-y-auto">
          <ErrorBoundary>
            <DevPanel
              coords={puzzle.coords}
              bindings={bindings}
              facts={establishedFacts(state)}
              last={lastAttempt}
            />
          </ErrorBoundary>
        </div>
      )}
    </div>
  );
}

export function FreeplayArena() {
  const { puzzleId } = useParams<{ puzzleId: string }>();
  const puzzle = puzzleId ? getPuzzle(puzzleId) : undefined;
  // R3-D3 (resume): load any saved in-progress proof for this puzzle. Called
  // unconditionally (hooks rule); harmless for an unknown puzzle id.
  const draft = useProofDraft(puzzle?.id ?? "");

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

  // Wait for the draft to resolve before mounting the arena, so the reducer
  // hydrates from the final draft exactly once (no flash of an empty proof).
  if (draft.loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Spinner label="Loading your proof…" />
      </div>
    );
  }

  return (
    <Arena
      key={puzzle.id}
      puzzle={puzzle}
      initialDraft={draft.initialDraft}
      persistDraft={draft.persist}
      clearDraft={draft.clear}
    />
  );
}
