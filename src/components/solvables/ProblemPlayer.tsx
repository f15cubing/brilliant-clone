import { useMemo, useRef, useState } from "react";
import {
  GeometryBoard,
  type GeometryBoardHandle,
} from "@/components/geometry/GeometryBoard";
import { MathText } from "@/components/MathText";
import { MathField } from "@/components/MathField";
import { FeedbackBanner } from "@/components/solvables/FeedbackBanner";
import { isAlgebraicallyEquivalent } from "@/lib/grading/algebra";
import type { Explanation, Problem } from "@/lib/content/types";
import type { AttemptResult } from "@/lib/progress/ProgressContext";

type Status = "idle" | "wrong" | "correct" | "revealed";

interface ProblemPlayerProps {
  problem: Problem;
  alreadySolved: boolean;
  isLast: boolean;
  canGoBack: boolean;
  onBack: () => void;
  onAttempt: (correct: boolean, mistakeId: string | undefined, elapsedMs: number, revealed?: boolean) => Promise<AttemptResult>;
  onContinue: () => void;
}

export function ProblemPlayer({
  problem,
  alreadySolved,
  isLast,
  canGoBack,
  onBack,
  onAttempt,
  onContinue,
}: ProblemPlayerProps) {
  const boardRef = useRef<GeometryBoardHandle>(null);
  const startRef = useRef<number>(Date.now());
  const [status, setStatus] = useState<Status>(alreadySolved ? "correct" : "idle");
  const [selected, setSelected] = useState<string | null>(null);
  const [latex, setLatex] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const solved = status === "correct" || status === "revealed";

  const findExplanation = (trigger: string): Explanation | null =>
    problem.explanations.find((e) => e.triggerCondition === trigger) ??
    problem.explanations.find((e) => e.triggerCondition === "default_wrong") ??
    null;

  const showOverlay = (exp: Explanation | null) => {
    boardRef.current?.clearOverlays();
    if (exp?.boardOverlayConfig) boardRef.current?.applyOverlay(exp.boardOverlayConfig);
  };

  const elapsed = () => Date.now() - startRef.current;

  const handleWrong = async (trigger: string) => {
    const exp = findExplanation(trigger);
    setExplanation(exp);
    showOverlay(exp);
    setStatus("wrong");
    setAttempts((a) => a + 1);
    await onAttempt(false, trigger, elapsed());
  };

  const handleCorrect = async () => {
    boardRef.current?.clearOverlays();
    setExplanation(null);
    setStatus("correct");
    await onAttempt(true, undefined, elapsed());
  };

  const handleReveal = async () => {
    const exp = findExplanation("reveal") ?? findExplanation("default_wrong");
    setExplanation(exp);
    showOverlay(exp);
    setStatus("revealed");
    await onAttempt(true, "revealed", elapsed(), true);
  };

  const submitMC = (optionId: string) => {
    if (solved) return;
    setSelected(optionId);
    const cfg = problem.answerConfig;
    if (cfg.kind !== "multiple-choice") return;
    if (optionId === cfg.correctOptionId) void handleCorrect();
    else void handleWrong(`selected_${optionId}`);
  };

  const submitAlgebra = () => {
    if (solved) return;
    const cfg = problem.answerConfig;
    if (cfg.kind !== "algebraic") return;
    if (isAlgebraicallyEquivalent(latex, cfg.correctExpression, cfg.variables))
      void handleCorrect();
    else void handleWrong("default_wrong");
  };

  const submitGeometric = () => {
    if (solved) return;
    const cfg = problem.answerConfig;
    if (cfg.kind !== "geometric") return;
    const refs = boardRef.current?.getRefs() ?? {};
    if (cfg.check(refs)) void handleCorrect();
    else void handleWrong("default_wrong");
  };

  const banner = useMemo(() => {
    if (status === "correct")
      return (
        <FeedbackBanner
          variant="correct"
          text={problem.solutionText ?? "Nicely done."}
        />
      );
    if (status === "revealed")
      return (
        <FeedbackBanner
          variant="revealed"
          text={explanation?.text ?? problem.solutionText ?? ""}
        />
      );
    if (status === "wrong" && explanation)
      return <FeedbackBanner variant="wrong" text={explanation.text} />;
    return null;
  }, [status, explanation, problem.solutionText]);

  const cfg = problem.answerConfig;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Interactive figure */}
      <div className="flex flex-col gap-3">
        <div className="overflow-hidden rounded-2xl border border-ink-700 bg-white">
          <GeometryBoard ref={boardRef} def={problem.boardConfig} />
        </div>
        {problem.exploreHint && (
          <p className="text-center text-xs text-ink-400">
            <span className="mr-1">↔</span>
            {problem.exploreHint}
          </p>
        )}
      </div>

      {/* Prompt + answer */}
      <div className="flex flex-col gap-5">
        <div className="text-lg leading-relaxed text-ink-100">
          <MathText>{problem.prompt}</MathText>
        </div>

        {cfg.kind === "multiple-choice" && (
          <div className="grid gap-2.5">
            {cfg.options.map((opt) => {
              const isCorrect = opt.id === cfg.correctOptionId;
              const chosen = selected === opt.id;
              const reveal = solved && isCorrect;
              const wrongChosen = status === "wrong" && chosen;
              return (
                <button
                  key={opt.id}
                  disabled={solved}
                  onClick={() => submitMC(opt.id)}
                  className={[
                    "rounded-xl border px-4 py-3 text-left text-base transition",
                    reveal
                      ? "border-correct bg-correct/15 text-emerald-100"
                      : wrongChosen
                        ? "border-wrong bg-wrong/15 text-rose-100"
                        : "border-ink-600 bg-ink-800/60 text-ink-100 hover:border-brand-400 hover:bg-ink-800",
                    solved ? "cursor-default" : "cursor-pointer",
                  ].join(" ")}
                >
                  <MathText>{opt.label}</MathText>
                </button>
              );
            })}
          </div>
        )}

        {cfg.kind === "algebraic" && (
          <div className="flex flex-col gap-3">
            <MathField
              value={latex}
              onChange={setLatex}
              onEnter={submitAlgebra}
              disabled={solved}
            />
            <p className="text-xs text-ink-400">
              Type your answer, e.g. variables like {cfg.variables.join(", ")}.
              Press Enter or Check.
            </p>
            {!solved && (
              <button
                onClick={submitAlgebra}
                className="self-start rounded-lg bg-brand-600 px-5 py-2.5 font-semibold text-white transition hover:bg-brand-500"
              >
                Check
              </button>
            )}
          </div>
        )}

        {cfg.kind === "geometric" && (
          <div className="flex flex-col gap-3">
            <p className="rounded-lg border border-ink-700 bg-ink-800/60 px-4 py-3 text-sm text-ink-200">
              {cfg.instruction}
            </p>
            {!solved && (
              <button
                onClick={submitGeometric}
                className="self-start rounded-lg bg-brand-600 px-5 py-2.5 font-semibold text-white transition hover:bg-brand-500"
              >
                Check my construction
              </button>
            )}
          </div>
        )}

        {banner}

        <div className="flex items-center gap-3">
          {canGoBack && (
            <button
              onClick={onBack}
              className="rounded-lg border border-ink-700 px-5 py-2.5 font-semibold text-ink-200 transition hover:border-ink-500"
            >
              ← Previous
            </button>
          )}
          {!solved && attempts >= 1 && (
            <button
              onClick={handleReveal}
              className="text-sm font-medium text-ink-300 underline-offset-4 hover:text-ink-100 hover:underline"
            >
              Reveal answer
            </button>
          )}
          {solved && (
            <button
              onClick={onContinue}
              className="rounded-lg bg-brand-600 px-6 py-2.5 font-semibold text-white transition hover:bg-brand-500"
            >
              {isLast ? "Finish lesson" : "Continue"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
