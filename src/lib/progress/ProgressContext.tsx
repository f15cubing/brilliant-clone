import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  ensureUserDoc,
  loadSnapshot,
  saveAchievement,
  saveCourseProgress,
  saveLessonProgress,
  saveTotalXp,
} from "@/lib/firebase/progressService";
import { COURSE, totalProblems } from "@/lib/content/course";
import { earnedAchievements } from "@/lib/progress/achievements";
import {
  emptySnapshot,
  type LessonProgress,
  type ProgressSnapshot,
} from "@/lib/progress/types";

const GUEST_KEY = "geo-progress-guest";
const authKey = (uid: string) => `geo-progress-${uid}`;

export interface AttemptInput {
  lessonId: string;
  problemId: string;
  problemXp: number;
  correct: boolean;
  mistakeId?: string;
  elapsedMs: number;
}

export interface AttemptResult {
  addedXp: number;
  lessonCompleted: boolean;
  newAchievementIds: string[];
}

interface ProgressContextValue {
  ready: boolean;
  snapshot: ProgressSnapshot;
  recordAttempt: (input: AttemptInput) => Promise<AttemptResult>;
  updateLessonPosition: (lessonId: string, problemId: string) => void;
  flushProgress: () => Promise<void>;
  isProblemSolved: (lessonId: string, problemId: string) => boolean;
  getLessonProgress: (lessonId: string) => LessonProgress | undefined;
  courseCompletionPct: () => number;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

function emptyLesson(): LessonProgress {
  return { completedProblemIds: [], problemStats: {}, xpEarned: 0 };
}

function loadLocal(key: string): ProgressSnapshot | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as ProgressSnapshot;
  } catch {
    /* ignore */
  }
  return null;
}

function saveLocal(key: string, s: ProgressSnapshot): void {
  try {
    localStorage.setItem(key, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

function isEmptySnapshot(s: ProgressSnapshot): boolean {
  return (
    s.totalXp === 0 &&
    Object.keys(s.lessons).length === 0 &&
    s.earnedAchievementIds.length === 0
  );
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { user, configured, loading, testMode } = useAuth();
  const [snapshot, setSnapshot] = useState<ProgressSnapshot>(emptySnapshot());
  const [ready, setReady] = useState(false);
  const snapshotRef = useRef<ProgressSnapshot>(snapshot);
  snapshotRef.current = snapshot;

  // Tracks the most recent persist promise so logout can await in-flight writes.
  const pendingPersistRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setReady(false);
      if (configured && user) {
        await ensureUserDoc(user.uid, user.email, user.displayName);
        const cached = loadLocal(authKey(user.uid));
        try {
          const snap = await loadSnapshot(user.uid);
          // If Firestore is empty but a local cache exists, trust the cache
          // (e.g. a write that never reached the server) and re-sync.
          const chosen = isEmptySnapshot(snap) && cached ? cached : snap;
          if (!cancelled) {
            setSnapshot(chosen);
            setReady(true);
          }
          saveLocal(authKey(user.uid), chosen);
        } catch (err) {
          console.error("[progress] load failed, using local cache", err);
          if (!cancelled) {
            setSnapshot(cached ?? emptySnapshot());
            setReady(true);
          }
        }
      } else if (!configured) {
        if (!cancelled) {
          setSnapshot(loadLocal(GUEST_KEY) ?? emptySnapshot());
          setReady(true);
        }
      } else {
        // configured but logged out
        if (!cancelled) {
          setSnapshot(emptySnapshot());
          setReady(true);
        }
      }
    }
    if (!loading) void init();
    return () => {
      cancelled = true;
    };
  }, [user, configured, loading]);

  const persist = useCallback(
    async (
      next: ProgressSnapshot,
      changedLessonId: string,
      newAchievementIds: string[],
    ) => {
      if (configured && user) {
        // Mirror to a local cache first so a failed/slow network write still
        // leaves a recoverable copy for the next login.
        saveLocal(authKey(user.uid), next);
        await Promise.all([
          saveLessonProgress(user.uid, changedLessonId, next.lessons[changedLessonId]),
          saveCourseProgress(user.uid, COURSE.id, next.course[COURSE.id]),
          saveTotalXp(user.uid, next.totalXp),
          ...newAchievementIds.map((id) => saveAchievement(user.uid, id)),
        ]);
      } else if (!configured) {
        saveLocal(GUEST_KEY, next);
      }
    },
    [configured, user],
  );

  // Runs persist, recording the promise so flushProgress can await it.
  const doPersist = useCallback(
    (
      next: ProgressSnapshot,
      changedLessonId: string,
      newAchievementIds: string[],
    ): Promise<void> => {
      const p = persist(next, changedLessonId, newAchievementIds).catch((err) =>
        console.error("[progress] persist failed", err),
      );
      pendingPersistRef.current = p;
      return p;
    },
    [persist],
  );

  const recordAttempt = useCallback(
    async (input: AttemptInput): Promise<AttemptResult> => {
      // In admin test mode, never mutate or persist progress so questions stay
      // perpetually fresh and real progress is untouched.
      if (testMode) {
        return { addedXp: 0, lessonCompleted: false, newAchievementIds: [] };
      }

      const prev = snapshotRef.current;
      const prevEarned = new Set(prev.earnedAchievementIds);

      const lessons = { ...prev.lessons };
      const lp: LessonProgress = {
        ...(lessons[input.lessonId] ?? emptyLesson()),
        problemStats: { ...(lessons[input.lessonId]?.problemStats ?? {}) },
        completedProblemIds: [
          ...(lessons[input.lessonId]?.completedProblemIds ?? []),
        ],
      };

      const stat = {
        attempts: (lp.problemStats[input.problemId]?.attempts ?? 0) + 1,
        timeSpentMs:
          (lp.problemStats[input.problemId]?.timeSpentMs ?? 0) + input.elapsedMs,
        lastMistakeId:
          !input.correct && input.mistakeId
            ? input.mistakeId
            : lp.problemStats[input.problemId]?.lastMistakeId,
      };
      lp.problemStats[input.problemId] = stat;

      let addedXp = 0;
      if (input.correct && !lp.completedProblemIds.includes(input.problemId)) {
        lp.completedProblemIds.push(input.problemId);
        lp.xpEarned += input.problemXp;
        addedXp += input.problemXp;
      }

      const lessonDef = COURSE.lessons.find((l) => l.id === input.lessonId);
      let lessonCompleted = false;
      if (
        lessonDef &&
        !lp.completedAt &&
        lessonDef.problems.every((p) => lp.completedProblemIds.includes(p.id))
      ) {
        lp.completedAt = Date.now();
        lp.xpEarned += lessonDef.completionXp;
        addedXp += lessonDef.completionXp;
        lessonCompleted = true;
      }

      lessons[input.lessonId] = lp;

      const solved = Object.values(lessons).reduce(
        (n, l) => n + l.completedProblemIds.length,
        0,
      );
      const completedLessonIds = COURSE.lessons
        .filter((l) => lessons[l.id]?.completedAt)
        .map((l) => l.id);

      const next: ProgressSnapshot = {
        totalXp: prev.totalXp + addedXp,
        lessons,
        course: {
          ...prev.course,
          [COURSE.id]: {
            completionPct: Math.round((solved / totalProblems()) * 100),
            completedLessonIds,
            lastLessonId: input.lessonId,
          },
        },
        earnedAchievementIds: prev.earnedAchievementIds,
      };

      const earnedNow = earnedAchievements(next).map((a) => a.id);
      const newAchievementIds = earnedNow.filter((id) => !prevEarned.has(id));
      next.earnedAchievementIds = earnedNow;

      setSnapshot(next);
      snapshotRef.current = next;
      await doPersist(next, input.lessonId, newAchievementIds);

      return { addedXp, lessonCompleted, newAchievementIds };
    },
    [doPersist, testMode],
  );

  const updateLessonPosition = useCallback(
    (lessonId: string, problemId: string) => {
      if (testMode) return;
      const prev = snapshotRef.current;
      const existing = prev.lessons[lessonId];
      if (
        existing?.lastProblemId === problemId &&
        prev.course[COURSE.id]?.lastLessonId === lessonId
      ) {
        return;
      }

      const lp: LessonProgress = {
        ...(existing ?? emptyLesson()),
        lastProblemId: problemId,
      };
      const next: ProgressSnapshot = {
        ...prev,
        lessons: { ...prev.lessons, [lessonId]: lp },
        course: {
          ...prev.course,
          [COURSE.id]: {
            completionPct: prev.course[COURSE.id]?.completionPct ?? 0,
            completedLessonIds: prev.course[COURSE.id]?.completedLessonIds ?? [],
            lastLessonId: lessonId,
          },
        },
      };

      setSnapshot(next);
      snapshotRef.current = next;
      void doPersist(next, lessonId, []);
    },
    [doPersist, testMode],
  );

  const flushProgress = useCallback(async () => {
    await pendingPersistRef.current;
  }, []);

  const isProblemSolved = useCallback(
    (lessonId: string, problemId: string) =>
      Boolean(
        snapshotRef.current.lessons[lessonId]?.completedProblemIds.includes(
          problemId,
        ),
      ),
    [],
  );

  const getLessonProgress = useCallback(
    (lessonId: string) => snapshot.lessons[lessonId],
    [snapshot],
  );

  const courseCompletionPct = useCallback(
    () => snapshot.course[COURSE.id]?.completionPct ?? 0,
    [snapshot],
  );

  return (
    <ProgressContext.Provider
      value={{
        ready,
        snapshot,
        recordAttempt,
        updateLessonPosition,
        flushProgress,
        isProblemSolved,
        getLessonProgress,
        courseCompletionPct,
      }}
    >
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress must be used within <ProgressProvider>");
  return ctx;
}
