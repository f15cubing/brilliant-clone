import { Link } from "react-router-dom";
import { MathText } from "@/components/MathText";
import { CompletionFigure } from "@/components/ByrneMark";
import type { HandoffStage } from "@/lib/content/types";

export function HandoffCard({
  handoff,
  nextLessonId,
}: {
  handoff: HandoffStage;
  nextLessonId?: string;
}) {
  const primary = handoff.freeplayPuzzleIds[0];
  return (
    <div className="mx-auto max-w-xl text-center">
      <div className="mb-2 flex justify-center">
        <CompletionFigure size={104} />
      </div>
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-vermilion">
        Quod erat demonstrandum
      </p>
      <h1 className="mt-2 font-display text-3xl tracking-tight text-ink">
        {handoff.title}
      </h1>
      <p className="mt-3 font-serif text-lg leading-relaxed text-ink-soft">
        <MathText>{handoff.body}</MathText>
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        {primary && (
          <Link
            to={`/freeplay/${primary}`}
            className="rounded-sm bg-vermilion px-6 py-2.5 font-semibold text-paper transition hover:bg-vermilion-soft"
          >
            {handoff.ctaLabel ?? "Enter Freeplay"} →
          </Link>
        )}
        {nextLessonId ? (
          <Link
            to={`/lesson/${nextLessonId}`}
            className="rounded-sm border border-ink/25 px-6 py-2.5 font-semibold text-ink transition hover:border-ink hover:bg-panel-soft"
          >
            Next proposition →
          </Link>
        ) : (
          <Link
            to="/course"
            className="rounded-sm border border-ink/25 px-6 py-2.5 font-semibold text-ink transition hover:border-ink hover:bg-panel-soft"
          >
            Back to course
          </Link>
        )}
      </div>
    </div>
  );
}
