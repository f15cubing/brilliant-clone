import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ProblemPlayer } from "@/components/solvables/ProblemPlayer";
import { MathText } from "@/components/MathText";
import { Spinner } from "@/components/Spinner";
import { CompletionFigure, ConstructionProgress } from "@/components/ByrneMark";
import {
  COURSE,
  getLesson,
  nextLessonId,
} from "@/lib/content/course";
import { useProgress } from "@/lib/progress/ProgressContext";
import { useAuth } from "@/lib/auth/AuthContext";

export function LessonPlayer() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { testMode } = useAuth();
  const {
    ready,
    isProblemSolved,
    recordAttempt,
    updateLessonPosition,
    getLessonProgress,
  } = useProgress();

  const lesson = lessonId ? getLesson(lessonId) : undefined;
  const lessonIdx = COURSE.lessons.findIndex((l) => l.id === lessonId);

  // Resume where the learner left off: prefer the last problem they were
  // viewing, then fall back to the first unsolved problem.
  const resumedFromBookmark = useRef(false);
  const initialIndex = useMemo(() => {
    if (!lesson) return 0;
    // In test mode, always start from the top so lessons can be reviewed fresh.
    if (testMode) return 0;
    const lp = getLessonProgress(lesson.id);
    if (lp?.lastProblemId) {
      const bookmarked = lesson.problems.findIndex(
        (p) => p.id === lp.lastProblemId,
      );
      if (bookmarked >= 0) {
        resumedFromBookmark.current = true;
        return bookmarked;
      }
    }
    const firstOpen = lesson.problems.findIndex(
      (p) => !lp?.completedProblemIds.includes(p.id),
    );
    return firstOpen >= 0 ? firstOpen : 0;
  }, [lesson, getLessonProgress, testMode]);

  const [problemIndex, setProblemIndex] = useState(initialIndex);
  const [showConcept, setShowConcept] = useState(
    initialIndex === 0 && !resumedFromBookmark.current,
  );
  const [lessonDone, setLessonDone] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setProblemIndex(initialIndex);
    setShowConcept(initialIndex === 0 && !resumedFromBookmark.current);
    setLessonDone(false);
    setToast(null);
  }, [lessonId, initialIndex]);

  if (!ready) {
    return (
      <div className="grid place-items-center py-24">
        <Spinner />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="text-center">
        <p className="font-serif text-lg italic text-ink-soft">
          That proposition could not be found.
        </p>
        <Link
          to="/course"
          className="mt-4 inline-block font-mono text-xs uppercase tracking-wide text-ultramarine hover:text-vermilion"
        >
          ← Back to course
        </Link>
      </div>
    );
  }

  const problem = lesson.problems[problemIndex];
  const isLast = problemIndex === lesson.problems.length - 1;

  const handleContinue = () => {
    if (isLast) {
      setLessonDone(true);
      return;
    }
    const nextProblem = lesson.problems[problemIndex + 1];
    if (nextProblem) updateLessonPosition(lesson.id, nextProblem.id);
    setProblemIndex((i) => i + 1);
    setShowConcept(false);
  };

  const handleBack = () => {
    if (problemIndex === 0) return;
    const prevProblem = lesson.problems[problemIndex - 1];
    if (prevProblem) updateLessonPosition(lesson.id, prevProblem.id);
    setProblemIndex((i) => Math.max(0, i - 1));
    setShowConcept(false);
  };

  const nextId = nextLessonId(lesson.id);

  if (lessonDone) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="mb-2 flex justify-center">
          <CompletionFigure size={104} />
        </div>
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-vermilion">
          Quod erat demonstrandum
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-tight text-ink">
          Proposition proved
        </h1>
        <p className="mt-2 font-serif text-lg text-ink-soft">
          You finished <strong className="text-ink">{lesson.title}</strong> and
          earned bonus XP.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {nextId ? (
            <Link
              to={`/lesson/${nextId}`}
              className="rounded-sm bg-vermilion px-6 py-2.5 font-semibold text-paper transition hover:bg-vermilion-soft"
            >
              Next proposition →
            </Link>
          ) : (
            <Link
              to="/course"
              className="rounded-sm bg-vermilion px-6 py-2.5 font-semibold text-paper transition hover:bg-vermilion-soft"
            >
              Back to course
            </Link>
          )}
          <Link
            to="/"
            className="rounded-sm border border-ink/25 px-6 py-2.5 font-semibold text-ink transition hover:border-ink hover:bg-panel-soft"
          >
            Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <Link
          to="/course"
          className="font-mono text-xs uppercase tracking-wide text-ink-soft transition hover:text-vermilion"
        >
          ← Course
        </Link>
        <p className="mt-3 font-mono text-xs uppercase tracking-[0.2em] text-vermilion">
          Proposition {lessonIdx + 1} · Problem {problemIndex + 1} of{" "}
          {lesson.problems.length}
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-tight text-ink">
          {lesson.title}
        </h1>
        <ConstructionProgress
          pct={((problemIndex + 1) / lesson.problems.length) * 100}
          className="mt-4 max-w-md"
        />
      </header>

      {showConcept && problemIndex === 0 && (
        <div className="border-l-2 border-ultramarine bg-panel-soft p-6">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
            The idea
          </h2>
          <p className="mt-3 font-serif text-lg leading-relaxed text-ink">
            <MathText>{lesson.concept}</MathText>
          </p>
          <button
            onClick={() => setShowConcept(false)}
            className="mt-5 rounded-sm bg-vermilion px-5 py-2 font-semibold text-paper transition hover:bg-vermilion-soft"
          >
            Start problems
          </button>
        </div>
      )}

      {!showConcept && (
        <ProblemPlayer
          key={`${problem.id}-${testMode}`}
          problem={problem}
          alreadySolved={!testMode && isProblemSolved(lesson.id, problem.id)}
          isLast={isLast}
          canGoBack={problemIndex > 0}
          onBack={handleBack}
          onAttempt={async (correct, mistakeId, elapsedMs, revealed) => {
            const result = await recordAttempt({
              lessonId: lesson.id,
              problemId: problem.id,
              problemXp: revealed ? 0 : problem.xp,
              correct,
              mistakeId,
              elapsedMs,
            });
            if (result.addedXp > 0) {
              setToast(`+${result.addedXp} XP`);
              setTimeout(() => setToast(null), 2000);
            }
            if (result.newAchievementIds.length > 0) {
              setToast(`Achievement unlocked!`);
              setTimeout(() => setToast(null), 3000);
            }
            return result;
          }}
          onContinue={handleContinue}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 animate-[fadein_180ms_ease-out] rounded-sm bg-ink px-4 py-2 font-mono text-sm font-semibold text-paper shadow-[3px_3px_0_0_rgba(192,57,43,0.6)]">
          {toast}
        </div>
      )}
    </div>
  );
}
