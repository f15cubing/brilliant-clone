import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth/AuthContext";
import { COURSE } from "@/lib/content/course";
import { ACHIEVEMENTS } from "@/lib/progress/achievements";
import { useProgress } from "@/lib/progress/ProgressContext";
import { MathText } from "@/components/MathText";
import { Spinner } from "@/components/Spinner";
import {
  ByrneShape,
  ConstructionProgress,
  IconCheck,
  IconXP,
} from "@/components/ByrneMark";

export function Dashboard() {
  const { user, configured } = useAuth();
  const { snapshot, ready, courseCompletionPct } = useProgress();

  if (!ready) {
    return (
      <div className="grid place-items-center py-24">
        <Spinner label="Loading your progress…" />
      </div>
    );
  }

  const courseProgress = snapshot.course[COURSE.id];
  const lastLessonId = courseProgress?.lastLessonId;
  const continueLesson =
    COURSE.lessons.find((l) => l.id === lastLessonId) ?? COURSE.lessons[0];

  const continueLp = snapshot.lessons[continueLesson.id];
  // Mirror LessonPlayer's resume logic: prefer the last problem the learner was
  // viewing, then fall back to the first unsolved problem.
  const bookmarkedProblem = continueLp?.lastProblemId
    ? continueLesson.problems.find((p) => p.id === continueLp.lastProblemId)
    : undefined;
  const firstUnsolved = continueLesson.problems.find(
    (p) => !continueLp?.completedProblemIds.includes(p.id),
  );
  // When every problem is solved, keep the "review" state rather than pointing
  // the bookmark at an already-completed problem.
  const nextProblem = firstUnsolved ? (bookmarkedProblem ?? firstUnsolved) : undefined;
  const continuePct = continueLesson.problems.length
    ? Math.round(
        ((continueLp?.completedProblemIds.length ?? 0) /
          continueLesson.problems.length) *
          100,
      )
    : 0;

  const lessonStarted = Boolean(
    continueLp &&
      (continueLp.completedProblemIds.length > 0 ||
        continueLp.lastProblemId != null ||
        Object.values(continueLp.problemStats).some((s) => s.attempts > 0)),
  );

  const earned = new Set(snapshot.earnedAchievementIds);

  return (
    <div className="flex flex-col gap-10">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-ink-faint">
          The practice of construction
        </p>
        <h1 className="mt-2 font-display text-4xl tracking-tight text-ink">
          {user?.displayName ? `Welcome, ${user.displayName}` : "Welcome"}
        </h1>
        <p className="mt-2 max-w-xl font-serif text-lg italic text-ink-soft">
          Drag the figures. Chase the angles. Build real intuition.
        </p>
        {!configured && (
          <p className="mt-4 border-l-2 border-ochre bg-ochre/10 px-4 py-2.5 text-sm text-ink-soft">
            Running in <strong className="text-ochre-deep">guest mode</strong> —
            progress is saved locally. Add Firebase credentials to sync across
            devices.
          </p>
        )}
      </header>

      <div className="grid gap-px overflow-hidden border border-rule bg-rule sm:grid-cols-3">
        <StatPlate label="Total XP" value={String(snapshot.totalXp)} index={2} />
        <StatPlate
          label="Course traced"
          value={`${courseCompletionPct()}%`}
          index={1}
        />
        <StatPlate
          label="Lessons proved"
          value={`${courseProgress?.completedLessonIds.length ?? 0} / ${COURSE.lessons.length}`}
          index={0}
        />
      </div>

      <section className="border border-ink/15 bg-panel-soft p-6 shadow-[3px_3px_0_0_rgba(27,23,20,0.08)]">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-vermilion">
          {lessonStarted ? "Resume the proof" : "Begin the first proposition"}
        </p>
        <h2 className="mt-2 font-display text-2xl tracking-tight text-ink">
          {continueLesson.title}
        </h2>
        <p className="mt-1.5 max-w-xl font-serif text-ink-soft">
          {continueLesson.summary}
        </p>
        <ConstructionProgress pct={continuePct} className="mt-5 max-w-md" />
        <p className="mt-2 font-mono text-xs text-ink-faint">
          {nextProblem
            ? `Next · problem ${continueLesson.problems.indexOf(nextProblem) + 1} of ${continueLesson.problems.length}`
            : "Proposition complete — revisit or move on."}
        </p>
        <Link
          to={`/lesson/${continueLesson.id}`}
          className="mt-5 inline-flex items-center gap-2 rounded-sm bg-vermilion px-5 py-2.5 font-semibold text-paper transition hover:bg-vermilion-soft"
        >
          {!lessonStarted
            ? "Start learning"
            : nextProblem
              ? "Continue"
              : "Review lesson"}
          <span aria-hidden="true">→</span>
        </Link>
      </section>

      <section>
        <div className="mb-4 flex items-baseline justify-between border-b border-rule pb-2">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
            Marks of distinction
          </h2>
          <Link
            to="/course"
            className="font-mono text-xs uppercase tracking-wide text-ultramarine transition hover:text-vermilion"
          >
            View course →
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {ACHIEVEMENTS.map((a, i) => {
            const unlocked = earned.has(a.id);
            return (
              <div
                key={a.id}
                className={[
                  "flex items-start gap-3 border px-4 py-3 transition",
                  unlocked
                    ? "border-ink/15 bg-panel-soft"
                    : "border-rule bg-transparent opacity-55",
                ].join(" ")}
              >
                <span className="mt-0.5">
                  <ByrneShape index={i} muted={!unlocked} />
                </span>
                <div>
                  <div className="font-semibold text-ink">{a.title}</div>
                  <div className="text-sm text-ink-soft">{a.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-l-2 border-ultramarine bg-panel-soft px-6 py-5">
        <h2 className="font-display text-xl tracking-tight text-ink">
          {COURSE.title}
        </h2>
        <p className="mt-2 font-serif text-[1.05rem] leading-relaxed text-ink-soft">
          <MathText>{COURSE.description}</MathText>
        </p>
      </section>
    </div>
  );
}

function StatPlate({
  label,
  value,
  index,
}: {
  label: string;
  value: string;
  index: number;
}) {
  return (
    <div className="bg-paper px-5 py-5">
      <div className="flex items-center gap-2 text-ink-faint">
        {label === "Total XP" ? (
          <IconXP size={15} />
        ) : label === "Lessons proved" ? (
          <IconCheck size={15} />
        ) : (
          <ByrneShape index={index} size={15} />
        )}
        <span className="font-mono text-[0.68rem] uppercase tracking-[0.16em]">
          {label}
        </span>
      </div>
      <div className="mt-2 font-display text-3xl text-ink">{value}</div>
    </div>
  );
}
