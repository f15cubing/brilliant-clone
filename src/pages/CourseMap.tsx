import { Link } from "react-router-dom";
import { COURSE } from "@/lib/content/course";
import { useProgress } from "@/lib/progress/ProgressContext";
import { MathText } from "@/components/MathText";
import { Spinner } from "@/components/Spinner";

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
    <div className="flex flex-col gap-8">
      <header>
        <p className="text-sm font-medium text-brand-300">Course map</p>
        <h1 className="text-3xl font-bold tracking-tight text-ink-50">
          {COURSE.title}
        </h1>
        <p className="mt-2 max-w-2xl text-ink-300">
          <MathText>{COURSE.description}</MathText>
        </p>
      </header>

      <ol className="flex flex-col gap-4">
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
            <li key={lesson.id}>
              <Link
                to={locked ? "#" : `/lesson/${lesson.id}`}
                onClick={(e) => locked && e.preventDefault()}
                className={[
                  "block rounded-2xl border p-5 transition",
                  locked
                    ? "cursor-not-allowed border-ink-800 bg-ink-900/30 opacity-50"
                    : complete
                      ? "border-correct/30 bg-correct/5 hover:border-correct/50"
                      : "border-ink-800 bg-ink-900/60 hover:border-brand-500/40",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-xs font-semibold text-ink-500">
                      Lesson {idx + 1}
                      {complete && (
                        <span className="ml-2 text-correct">✓ Complete</span>
                      )}
                      {locked && (
                        <span className="ml-2 text-ink-500">🔒 Finish previous lesson</span>
                      )}
                    </span>
                    <h2 className="mt-1 text-lg font-semibold text-ink-50">
                      {lesson.title}
                    </h2>
                    <p className="mt-1 text-sm text-ink-400">{lesson.summary}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-ink-800 px-3 py-1 text-xs font-semibold text-ink-300">
                    {done}/{total}
                  </span>
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-ink-800">
                  <div
                    className={[
                      "h-full rounded-full transition-all",
                      complete ? "bg-correct" : "bg-brand-500",
                    ].join(" ")}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
