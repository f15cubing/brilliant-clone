import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ProblemPlayer } from "@/components/solvables/ProblemPlayer";
import { InstructionMC } from "@/components/solvables/InstructionMC";
import { ComprehensionPlayer } from "@/components/solvables/ComprehensionPlayer";
import { HandoffCard } from "@/components/solvables/HandoffCard";
import { MathText } from "@/components/MathText";
import { Spinner } from "@/components/Spinner";
import { CompletionFigure, ConstructionProgress } from "@/components/ByrneMark";
import { COURSE, getLesson, nextLessonId } from "@/lib/content/course";
import { lessonStages, stageSolvableId } from "@/lib/content/lessonStages";
import { useProgress } from "@/lib/progress/ProgressContext";
import { useAuth } from "@/lib/auth/AuthContext";

export function LessonPlayer() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { testMode } = useAuth();
  const { ready, recordAttempt, updateLessonStage, getLessonProgress } =
    useProgress();

  const lesson = lessonId ? getLesson(lessonId) : undefined;
  const lessonIdx = COURSE.lessons.findIndex((l) => l.id === lessonId);
  const stages = useMemo(() => (lesson ? lessonStages(lesson) : []), [lesson]);

  // Resume: prefer the explicit stage bookmark, then map a legacy problem
  // bookmark to its stage, then the first unsolved solvable stage, else start.
  const initialStageIndex = useMemo(() => {
    if (!lesson || stages.length === 0) return 0;
    if (testMode) return 0;
    const lp = getLessonProgress(lesson.id);
    const last = stages.length - 1;
    if (!lp) return 0;
    if (lp.lastStageIndex != null)
      return Math.min(Math.max(lp.lastStageIndex, 0), last);
    if (lp.lastProblemId) {
      const idx = stages.findIndex(
        (s) => stageSolvableId(s) === lp.lastProblemId,
      );
      if (idx >= 0) return idx;
    }
    if (lp.completedProblemIds.length === 0) return 0;
    const firstOpen = stages.findIndex((s) => {
      const id = stageSolvableId(s);
      return id != null && !lp.completedProblemIds.includes(id);
    });
    return firstOpen >= 0 ? firstOpen : 0;
  }, [lesson, stages, getLessonProgress, testMode]);

  const [stageIndex, setStageIndex] = useState(initialStageIndex);
  const [lessonDone, setLessonDone] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setStageIndex(initialStageIndex);
    setLessonDone(false);
    setToast(null);
  }, [lessonId, initialStageIndex]);

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

  const stage = stages[stageIndex];
  const isLastStage = stageIndex === stages.length - 1;
  const nextId = nextLessonId(lesson.id);

  const solved = (id: string | null): boolean =>
    !testMode &&
    id != null &&
    Boolean(getLessonProgress(lesson.id)?.completedProblemIds.includes(id));

  const advance = () => {
    const next = stageIndex + 1;
    if (next >= stages.length) {
      setLessonDone(true);
      return;
    }
    updateLessonStage(lesson.id, next);
    setStageIndex(next);
  };

  const goBack = () => {
    const prev = stageIndex - 1;
    if (prev < 0) return;
    updateLessonStage(lesson.id, prev);
    setStageIndex(prev);
  };

  const recordStageAttempt = async (
    stageId: string,
    xp: number,
    correct: boolean,
    mistakeId: string | undefined,
    elapsedMs: number,
    revealed = false,
  ) => {
    const result = await recordAttempt({
      lessonId: lesson.id,
      problemId: stageId,
      problemXp: revealed ? 0 : xp,
      correct,
      mistakeId,
      elapsedMs,
    });
    if (result.addedXp > 0) {
      setToast(`+${result.addedXp} XP`);
      setTimeout(() => setToast(null), 2000);
    }
    if (result.newAchievementIds.length > 0) {
      setToast("Achievement unlocked!");
      setTimeout(() => setToast(null), 3000);
    }
    return result;
  };

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
          Proposition {lessonIdx + 1} · Step {stageIndex + 1} of {stages.length}
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-tight text-ink">
          {lesson.title}
        </h1>
        <ConstructionProgress
          pct={((stageIndex + 1) / stages.length) * 100}
          className="mt-4 max-w-md"
        />
      </header>

      {stage.kind === "concept" && (
        <div className="border-l-2 border-ultramarine bg-panel-soft p-6">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
            {stage.title ?? "The idea"}
          </h2>
          <p className="mt-3 font-serif text-lg leading-relaxed text-ink">
            <MathText>{stage.body}</MathText>
          </p>
          <button
            onClick={advance}
            className="mt-5 rounded-sm bg-vermilion px-5 py-2 font-semibold text-paper transition hover:bg-vermilion-soft"
          >
            Start
          </button>
        </div>
      )}

      {stage.kind === "problem" && (
        <ProblemPlayer
          key={`${stage.problem.id}-${testMode}`}
          problem={stage.problem}
          alreadySolved={solved(stage.problem.id)}
          isLast={isLastStage}
          canGoBack={stageIndex > 0}
          onBack={goBack}
          onAttempt={(correct, mistakeId, elapsedMs, revealed) =>
            recordStageAttempt(
              stage.problem.id,
              stage.problem.xp,
              correct,
              mistakeId,
              elapsedMs,
              revealed,
            )
          }
          onContinue={advance}
        />
      )}

      {stage.kind === "instruction-mc" && (
        <InstructionMC
          key={`${stage.problem.id}-${testMode}`}
          problem={stage.problem}
          alreadySolved={solved(stage.problem.id)}
          isLast={isLastStage}
          canGoBack={stageIndex > 0}
          onBack={goBack}
          onAttempt={(correct, mistakeId, elapsedMs) =>
            recordStageAttempt(
              stage.problem.id,
              stage.problem.xp,
              correct,
              mistakeId,
              elapsedMs,
            )
          }
          onContinue={advance}
        />
      )}

      {stage.kind === "comprehension" && (
        <ComprehensionPlayer
          key={`${stage.task.id}-${testMode}`}
          task={stage.task}
          alreadySolved={solved(stage.task.id)}
          isLast={isLastStage}
          canGoBack={stageIndex > 0}
          onBack={goBack}
          onAttempt={(correct, mistakeId, elapsedMs) =>
            recordStageAttempt(
              stage.task.id,
              stage.task.xp,
              correct,
              mistakeId,
              elapsedMs,
            )
          }
          onContinue={advance}
        />
      )}

      {stage.kind === "handoff" && (
        <HandoffCard handoff={stage.handoff} nextLessonId={nextId} />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 animate-[fadein_180ms_ease-out] rounded-sm bg-ink px-4 py-2 font-mono text-sm font-semibold text-paper shadow-[3px_3px_0_0_rgba(192,57,43,0.6)]">
          {toast}
        </div>
      )}
    </div>
  );
}
