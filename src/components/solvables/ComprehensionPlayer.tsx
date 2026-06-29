import { useMemo, useRef, useState } from "react";
import { MathText } from "@/components/MathText";
import { GeometryBoard } from "@/components/geometry/GeometryBoard";
import { FeedbackBanner } from "@/components/solvables/FeedbackBanner";
import { dwellDurationFor, useDwellLock } from "@/lib/solvables/dwell";
import {
  isComprehensionValidated,
  type ComprehensionSelections,
} from "@/lib/solvables/comprehension";
import type { ComprehensionTask, InstructionMCOption } from "@/lib/content/types";
import type { AttemptResult } from "@/lib/progress/ProgressContext";

interface Props {
  task: ComprehensionTask;
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

export function ComprehensionPlayer({
  task,
  alreadySolved,
  isLast,
  canGoBack,
  onBack,
  onAttempt,
  onContinue,
}: Props) {
  const startRef = useRef<number>(Date.now());
  const recordedRef = useRef(false);
  const { locked, arm } = useDwellLock();

  const solvedSelections = useMemo<ComprehensionSelections>(() => {
    const out: ComprehensionSelections = {};
    task.lines.forEach((line, i) => {
      const correct = line.reasons.find((r) => r.correct);
      if (correct) out[i] = correct.id;
    });
    return out;
  }, [task]);

  const [selections, setSelections] = useState<ComprehensionSelections>(
    alreadySolved ? solvedSelections : {},
  );

  // Non-interactive construction drawing for the proof, when the task ships one.
  const figureDef = useMemo(
    () =>
      task.boardConfig
        ? { ...task.boardConfig, staticFigure: true as const }
        : null,
    [task.boardConfig],
  );

  const validated = isComprehensionValidated(task, selections);

  const pick = (lineIndex: number, reason: InstructionMCOption) => {
    if (locked) return;
    // A line already justified correctly is locked.
    const current = selections[lineIndex];
    const currentCorrect =
      current != null &&
      task.lines[lineIndex].reasons.some((r) => r.id === current && r.correct);
    if (currentCorrect) return;

    const nextSelections = { ...selections, [lineIndex]: reason.id };
    setSelections(nextSelections);
    const elapsed = Date.now() - startRef.current;

    if (!reason.correct) {
      arm(dwellDurationFor("wrong", task.dwell));
      void onAttempt(
        false,
        reason.misconception ?? `line${lineIndex}_${reason.id}`,
        elapsed,
      );
      return;
    }
    if (isComprehensionValidated(task, nextSelections)) {
      arm(dwellDurationFor("correct", task.dwell));
      if (!recordedRef.current) {
        recordedRef.current = true;
        void onAttempt(true, undefined, elapsed);
      }
    }
  };

  const canContinue = validated && !locked;

  return (
    <div className="flex flex-col gap-5">
      <div className="font-serif text-xl leading-relaxed text-ink">
        <MathText>{task.prompt}</MathText>
      </div>

      {figureDef && (
        <figure className="mx-auto w-full max-w-sm">
          <GeometryBoard def={figureDef} />
          <figcaption className="mt-2 text-center font-mono text-xs uppercase tracking-[0.16em] text-ink-faint">
            The construction — read the proof against it
          </figcaption>
        </figure>
      )}

      <ol className="flex flex-col gap-4">
        {task.lines.map((line, i) => {
          const sel = selections[i];
          const selReason = line.reasons.find((r) => r.id === sel) ?? null;
          const lineCorrect = selReason?.correct ?? false;
          return (
            <li
              key={i}
              className="border-l-2 border-ink/15 bg-panel-soft px-4 py-3"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 font-mono text-xs text-ink-faint">
                  {i + 1}.
                </span>
                <div className="flex-1">
                  <div className="font-serif text-lg text-ink">
                    <MathText>{line.statement}</MathText>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {line.reasons.map((r) => {
                      const chosen = sel === r.id;
                      const showCorrect = chosen && r.correct;
                      const showWrong = chosen && !r.correct;
                      return (
                        <button
                          key={r.id}
                          disabled={locked || lineCorrect}
                          onClick={() => pick(i, r)}
                          className={[
                            "rounded-sm border px-3 py-1.5 text-sm transition",
                            showCorrect
                              ? "border-correct bg-correct/10 text-ink"
                              : showWrong
                                ? "border-vermilion bg-vermilion/10 text-ink"
                                : "border-ink/20 bg-white text-ink hover:border-ultramarine hover:bg-ultramarine/5",
                            locked || lineCorrect
                              ? "cursor-default"
                              : "cursor-pointer",
                          ].join(" ")}
                        >
                          <MathText>{r.label}</MathText>
                        </button>
                      );
                    })}
                  </div>
                  {lineCorrect ? (
                    <ul className="mt-3 flex flex-col gap-1.5">
                      {line.reasons.map((r) => (
                        <li
                          key={r.id}
                          className="flex gap-2 text-sm leading-relaxed"
                        >
                          <span
                            aria-hidden="true"
                            className={
                              r.correct
                                ? "font-semibold text-correct"
                                : "text-ink-faint"
                            }
                          >
                            {r.correct ? "✓" : "✕"}
                          </span>
                          <span
                            className={r.correct ? "text-ink" : "text-ink-soft"}
                          >
                            <span className="font-semibold">
                              <MathText>{r.label}</MathText>
                            </span>{" "}
                            — <MathText>{r.teaching}</MathText>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    selReason && (
                      <p className="mt-2 text-sm leading-relaxed text-vermilion">
                        <MathText>{selReason.teaching}</MathText>
                      </p>
                    )
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {validated && <FeedbackBanner variant="correct" text={task.validatedText} />}

      <div className="flex items-center gap-4">
        {canGoBack && (
          <button
            onClick={onBack}
            className="rounded-sm border border-ink/25 px-5 py-2.5 font-semibold text-ink transition hover:border-ink hover:bg-panel-soft"
          >
            ← Previous
          </button>
        )}
        {validated && (
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
            {locked ? "Read the proof…" : isLast ? "Finish lesson" : "Continue"}
          </button>
        )}
      </div>
    </div>
  );
}
