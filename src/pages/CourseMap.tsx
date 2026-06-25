import { Link } from "react-router-dom";
import { COURSE } from "@/lib/content/course";
import { useProgress } from "@/lib/progress/ProgressContext";
import { MathText } from "@/components/MathText";
import { Spinner } from "@/components/Spinner";
import {
  ConstructionProgress,
  IconCheck,
  IconLock,
  PropMark,
} from "@/components/ByrneMark";

export function CourseMap() {
  const { snapshot, ready, getLessonProgress } = useProgress();

  if (!ready) {
    return (
      <div className="grid place-items-center py-24">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-9">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-vermilion">
          The propositions
        </p>
        <h1 className="mt-2 font-display text-4xl tracking-tight text-ink">
          {COURSE.title}
        </h1>
        <p className="mt-3 max-w-2xl font-serif text-lg leading-relaxed text-ink-soft">
          <MathText>{COURSE.description}</MathText>
        </p>
      </header>

      <ol className="flex flex-col">
        {COURSE.lessons.map((lesson, idx) => {
          const lp = getLessonProgress(lesson.id);
          const done = lp?.completedProblemIds.length ?? 0;
          const total = lesson.problems.length;
          const pct = total ? Math.round((done / total) * 100) : 0;
          const complete = Boolean(lp?.completedAt);
          const prevComplete =
            idx === 0 ||
            Boolean(snapshot.lessons[COURSE.lessons[idx - 1].id]?.completedAt);
          const locked = !prevComplete && idx > 0;

          return (
            <li key={lesson.id} className="relative">
              {/* Construction spine connecting the propositions. */}
              {idx < COURSE.lessons.length - 1 && (
                <span className="absolute bottom-0 left-[2.05rem] top-[3.6rem] w-px bg-rule" />
              )}
              <Link
                to={locked ? "#" : `/lesson/${lesson.id}`}
                onClick={(e) => locked && e.preventDefault()}
                aria-disabled={locked}
                className={[
                  "group flex gap-4 border-b border-rule py-5 transition",
                  locked
                    ? "cursor-not-allowed opacity-50"
                    : "hover:bg-panel-soft",
                ].join(" ")}
              >
                <div className="relative z-10 pl-1">
                  <PropMark n={idx + 1} index={idx} muted={locked} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-ink-faint">
                      Proposition {idx + 1}
                    </span>
                    {complete && (
                      <span className="inline-flex items-center gap-1 font-mono text-[0.68rem] uppercase tracking-wide text-correct">
                        <IconCheck size={12} /> Proved
                      </span>
                    )}
                    {locked && (
                      <span className="inline-flex items-center gap-1 font-mono text-[0.68rem] uppercase tracking-wide text-ink-faint">
                        <IconLock size={12} /> Finish the previous
                      </span>
                    )}
                  </div>
                  <h2 className="mt-1 font-display text-xl tracking-tight text-ink">
                    {lesson.title}
                  </h2>
                  <p className="mt-1 font-serif text-ink-soft">
                    {lesson.summary}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <ConstructionProgress
                      pct={pct}
                      color={complete ? "#3b6b4a" : "#27418c"}
                      className="max-w-xs flex-1"
                    />
                    <span className="font-mono text-xs text-ink-faint">
                      {done}/{total}
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
