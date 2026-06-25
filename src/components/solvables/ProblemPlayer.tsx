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

      {/* Prompt + answer */}
      <div className="flex flex-col gap-5">
        <div className="font-serif text-xl leading-relaxed text-ink">
          <MathText>{problem.prompt}</MathText>
        </div>

        {cfg.kind === "multiple-choice" && (
          <div className="grid gap-2.5">
            {cfg.options.map((opt, i) => {
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
                    "flex items-center gap-3 rounded-sm border px-4 py-3 text-left text-base transition",
                    reveal
                      ? "border-correct bg-correct/10 text-ink"
                      : wrongChosen
                        ? "border-vermilion bg-vermilion/10 text-ink"
                        : "border-ink/20 bg-panel-soft text-ink hover:border-ultramarine hover:bg-ultramarine/5",
                    solved ? "cursor-default" : "cursor-pointer",
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
        )}

        {cfg.kind === "algebraic" && (
          <div className="flex flex-col gap-3">
            <MathField
              value={latex}
              onChange={setLatex}
              onEnter={submitAlgebra}
              disabled={solved}
            />
            <p className="font-mono text-[0.7rem] uppercase tracking-wide text-ink-faint">
              Type your answer · variables {cfg.variables.join(", ")} · Enter or
              Check
            </p>
            {!solved && (
              <button
                onClick={submitAlgebra}
                className="self-start rounded-sm bg-vermilion px-5 py-2.5 font-semibold text-paper transition hover:bg-vermilion-soft"
              >
                Check
              </button>
            )}
          </div>
        )}

        {cfg.kind === "geometric" && (
          <div className="flex flex-col gap-3">
            <p className="border-l-2 border-ultramarine bg-panel-soft px-4 py-3 text-sm text-ink-soft">
              {cfg.instruction}
            </p>
            {!solved && (
              <button
                onClick={submitGeometric}
                className="self-start rounded-sm bg-vermilion px-5 py-2.5 font-semibold text-paper transition hover:bg-vermilion-soft"
              >
                Check my construction
              </button>
            )}
          </div>
        )}

        {banner}

        <div className="flex items-center gap-4">
          {canGoBack && (
            <button
              onClick={onBack}
              className="rounded-sm border border-ink/25 px-5 py-2.5 font-semibold text-ink transition hover:border-ink hover:bg-panel-soft"
            >
              ← Previous
            </button>
          )}
          {!solved && attempts >= 1 && (
            <button
              onClick={handleReveal}
              className="font-mono text-xs uppercase tracking-wide text-ink-soft underline-offset-4 transition hover:text-vermilion hover:underline"
            >
              Reveal answer
            </button>
          )}
          {solved && (
            <button
              onClick={onContinue}
              className="rounded-sm bg-vermilion px-6 py-2.5 font-semibold text-paper transition hover:bg-vermilion-soft"
            >
              {isLast ? "Finish lesson" : "Continue"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
