import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth/AuthContext";
import { COURSE } from "@/lib/content/course";
import { ACHIEVEMENTS } from "@/lib/progress/achievements";
import { useProgress } from "@/lib/progress/ProgressContext";
import { MathText } from "@/components/MathText";
import { Spinner } from "@/components/Spinner";

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
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-ink-50">
          {user?.displayName ? `Hi, ${user.displayName}` : "Dashboard"}
        </h1>
        <p className="mt-1 text-ink-400">
          Drag the figures. Chase the angles. Build real intuition.
        </p>
        {!configured && (
          <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
            Running in <strong>guest mode</strong> — progress is saved locally.
            Add Firebase credentials to sync across devices.
          </p>
        )}
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total XP" value={String(snapshot.totalXp)} icon="⭐" />
        <StatCard
          label="Course progress"
          value={`${courseCompletionPct()}%`}
          icon="📐"
        />
        <StatCard
          label="Lessons done"
          value={`${courseProgress?.completedLessonIds.length ?? 0} / ${COURSE.lessons.length}`}
          icon="✓"
        />
      </div>

      <section className="rounded-2xl border border-brand-500/30 bg-gradient-to-br from-brand-600/20 to-ink-900 p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-300">
          {lessonStarted ? "Continue learning" : "Start learning"}
        </p>
        <h2 className="mt-1 text-xl font-bold text-ink-50">
          {continueLesson.title}
        </h2>
        <p className="mt-1 text-sm text-ink-300">{continueLesson.summary}</p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-ink-800">
          <div
            className="h-full rounded-full bg-brand-500 transition-all"
            style={{ width: `${continuePct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-ink-400">
          {nextProblem
            ? `Next up: problem ${continueLesson.problems.indexOf(nextProblem) + 1} of ${continueLesson.problems.length}`
            : "Lesson complete — pick another or review."}
        </p>
        <Link
          to={`/lesson/${continueLesson.id}`}
          className="mt-4 inline-flex rounded-lg bg-brand-600 px-5 py-2.5 font-semibold text-white transition hover:bg-brand-500"
        >
          {!lessonStarted ? "Start learning" : nextProblem ? "Continue" : "Review lesson"}
        </Link>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-100">Achievements</h2>
          <Link to="/course" className="text-sm text-brand-300 hover:text-brand-200">
            View course →
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {ACHIEVEMENTS.map((a) => {
            const unlocked = earned.has(a.id);
            return (
              <div
                key={a.id}
                className={[
                  "rounded-xl border px-4 py-3 transition",
                  unlocked
                    ? "border-brand-500/40 bg-brand-500/10"
                    : "border-ink-800 bg-ink-900/40 opacity-60",
                ].join(" ")}
              >
                <div className="font-semibold text-ink-100">{a.title}</div>
                <div className="text-sm text-ink-400">{a.description}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-ink-800 bg-ink-900/40 p-6">
        <h2 className="text-lg font-semibold text-ink-100">{COURSE.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-300">
          <MathText>{COURSE.description}</MathText>
        </p>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="rounded-xl border border-ink-800 bg-ink-900/60 px-4 py-4">
      <div className="flex items-center gap-2 text-ink-400">
        <span>{icon}</span>
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-bold text-ink-50">{value}</div>
    </div>
  );
}
