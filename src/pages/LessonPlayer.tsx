import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ProblemPlayer } from "@/components/solvables/ProblemPlayer";
import { MathText } from "@/components/MathText";
import { Spinner } from "@/components/Spinner";
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
        <p className="text-ink-400">Lesson not found.</p>
        <Link to="/course" className="mt-4 inline-block text-brand-300">
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
        <div className="mb-4 text-5xl">🎉</div>
        <h1 className="text-2xl font-bold text-ink-50">Lesson complete!</h1>
        <p className="mt-2 text-ink-300">
          You finished <strong>{lesson.title}</strong> and earned bonus XP.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {nextId ? (
            <Link
              to={`/lesson/${nextId}`}
              className="rounded-lg bg-brand-600 px-6 py-2.5 font-semibold text-white hover:bg-brand-500"
            >
              Next lesson →
            </Link>
          ) : (
            <Link
              to="/course"
              className="rounded-lg bg-brand-600 px-6 py-2.5 font-semibold text-white hover:bg-brand-500"
            >
              Back to course
            </Link>
          )}
          <Link
            to="/"
            className="rounded-lg border border-ink-700 px-6 py-2.5 font-semibold text-ink-200 hover:border-ink-500"
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
          className="text-sm text-ink-400 hover:text-ink-200"
        >
          ← Course
        </Link>
        <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-brand-300">
          Lesson {lessonIdx + 1} · Problem {problemIndex + 1} of{" "}
          {lesson.problems.length}
        </p>
        <h1 className="text-2xl font-bold text-ink-50">{lesson.title}</h1>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-800">
          <div
            className="h-full rounded-full bg-brand-500 transition-all"
            style={{
              width: `${((problemIndex + 1) / lesson.problems.length) * 100}%`,
            }}
          />
        </div>
      </header>

      {showConcept && problemIndex === 0 && (
        <div className="rounded-2xl border border-ink-700 bg-ink-900/60 p-5">
          <h2 className="mb-2 font-semibold text-ink-100">Concept</h2>
          <p className="leading-relaxed text-ink-300">
            <MathText>{lesson.concept}</MathText>
          </p>
          <button
            onClick={() => setShowConcept(false)}
            className="mt-4 rounded-lg bg-brand-600 px-5 py-2 font-semibold text-white hover:bg-brand-500"
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
        <div className="fixed bottom-6 right-6 rounded-xl bg-brand-600 px-4 py-2 font-semibold text-white shadow-lg animate-[fadein_180ms_ease-out]">
          {toast}
        </div>
      )}
    </div>
  );
}
