export interface ProblemStat {
  attempts: number;
  timeSpentMs: number;
  lastMistakeId?: string;
}

export interface LessonProgress {
  completedProblemIds: string[];
  problemStats: Record<string, ProblemStat>;
  xpEarned: number;
  completedAt?: number; // epoch ms
  lastProblemId?: string; // last problem the user was viewing in this lesson
}

export interface CourseProgress {
  completionPct: number;
  completedLessonIds: string[];
  lastLessonId?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  /** Predicate over the current progress snapshot. */
  isEarned: (snapshot: ProgressSnapshot) => boolean;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  totalXp: number;
  createdAt: number;
}

/** Everything the client keeps in memory + persists to Firestore. */
export interface ProgressSnapshot {
  totalXp: number;
  lessons: Record<string, LessonProgress>; // lessonId -> progress
  course: Record<string, CourseProgress>; // courseId -> progress
  earnedAchievementIds: string[];
}

export function emptySnapshot(): ProgressSnapshot {
  return { totalXp: 0, lessons: {}, course: {}, earnedAchievementIds: [] };
}
