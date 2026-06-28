import { useMemo, useRef, useState } from "react";
import {
  GeometryBoard,
  type GeometryBoardHandle,
} from "@/components/geometry/GeometryBoard";
import { MathText } from "@/components/MathText";
import { FeedbackBanner } from "@/components/solvables/FeedbackBanner";
import { ConsolidationCard } from "@/components/solvables/ConsolidationCard";
import { dwellDurationFor, useDwellLock } from "@/lib/solvables/dwell";
import type {
  InstructionMCOption,
  InstructionMCProblem,
} from "@/lib/content/types";
import type { AttemptResult } from "@/lib/progress/ProgressContext";

interface Props {
  problem: InstructionMCProblem;
  alreadySolved: boolean;
  isLast: boolean;
  canGoBack: boolean;
  onBack: () => void;
  onAttempt: (
    correct: boolean,
    mistakeId: string | undefined,
    elapsedMs: number,
  ) => Promise<AttemptResult>;
  onContinue: () => void;
}

export function InstructionMC({
  problem,
  alreadySolved,
  isLast,
  canGoBack,
  onBack,
  onAttempt,
  onContinue,
}: Props) {
  const boardRef = useRef<GeometryBoardHandle>(null);
  const startRef = useRef<number>(Date.now());
  const { locked, arm } = useDwellLock();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [solved, setSolved] = useState(alreadySolved);
  const [ack, setAck] = useState(
    alreadySolved || !problem.consolidation.selfExplainPrompt,
  );

  const selected = useMemo(
    () => problem.options.find((o) => o.id === selectedId) ?? null,
    [problem.options, selectedId],
  );

  const showOverlay = (opt: InstructionMCOption | null) => {
    boardRef.current?.clearOverlays();
    if (opt?.boardOverlayConfig)
      boardRef.current?.applyOverlay(opt.boardOverlayConfig);
  };

  const pick = (opt: InstructionMCOption) => {
    if (solved || locked) return;
    setSelectedId(opt.id);
    showOverlay(opt);
    const elapsed = Date.now() - startRef.current;
    if (opt.correct) {
      setSolved(true);
      arm(dwellDurationFor("correct", problem.dwell));
      void onAttempt(true, undefined, elapsed);
    } else {
      arm(dwellDurationFor("wrong", problem.dwell));
      void onAttempt(false, opt.misconception ?? `selected_${opt.id}`, elapsed);
    }
  };

  const canContinue = solved && !locked && ack;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-3">
        <div className="overflow-hidden rounded-sm border border-ink/20 bg-white p-2 shadow-[3px_3px_0_0_rgba(27,23,20,0.08)]">
          <GeometryBoard ref={boardRef} def={problem.boardConfig} />
        </div>
        {problem.exploreHint && (
          <p className="text-center font-mono text-[0.7rem] uppercase tracking-wide text-ink-faint">
            <span className="mr-1">↔</span>
            {problem.exploreHint}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-5">
        <div className="font-serif text-xl leading-relaxed text-ink">
          <MathText>{problem.prompt}</MathText>
        </div>

        <div className="grid gap-2.5">
          {problem.options.map((opt, i) => {
            const chosen = selectedId === opt.id;
            const reveal = solved && opt.correct;
            const wrongChosen = chosen && !opt.correct && !solved;
            return (
              <button
                key={opt.id}
                disabled={solved || locked}
                onClick={() => pick(opt)}
                className={[
                  "flex items-center gap-3 rounded-sm border px-4 py-3 text-left text-base transition",
                  reveal
                    ? "border-correct bg-correct/10 text-ink"
                    : wrongChosen
                      ? "border-vermilion bg-vermilion/10 text-ink"
                      : "border-ink/20 bg-panel-soft text-ink hover:border-ultramarine hover:bg-ultramarine/5",
                  solved || locked ? "cursor-default" : "cursor-pointer",
                ].join(" ")}
              >
                <span
                  aria-hidden="true"
                  className={[
                    "grid h-6 w-6 shrink-0 place-items-center font-mono text-xs font-semibold",
                    reveal
                      ? "bg-correct text-paper"
                      : wrongChosen
                        ? "bg-vermilion text-paper"
                        : "border border-ink/25 text-ink-soft",
                  ].join(" ")}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <MathText>{opt.label}</MathText>
              </button>
            );
          })}
        </div>

        {selected && (
          <FeedbackBanner
            variant={selected.correct ? "correct" : "wrong"}
            text={selected.teaching}
          />
        )}

        {solved && (
          <ConsolidationCard
            consolidation={problem.consolidation}
            acknowledged={ack}
            onAcknowledge={() => setAck(true)}
          />
        )}

        <div className="flex items-center gap-4">
          {canGoBack && (
            <button
              onClick={onBack}
              className="rounded-sm border border-ink/25 px-5 py-2.5 font-semibold text-ink transition hover:border-ink hover:bg-panel-soft"
            >
              ← Previous
            </button>
          )}
          {solved && (
            <button
              onClick={onContinue}
              disabled={!canContinue}
              className={[
                "rounded-sm px-6 py-2.5 font-semibold transition",
                canContinue
                  ? "bg-vermilion text-paper hover:bg-vermilion-soft"
                  : "cursor-not-allowed bg-ink/15 text-ink-faint",
              ].join(" ")}
            >
              {locked
                ? "Read the explanation…"
                : isLast
                  ? "Finish lesson"
                  : "Continue"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
