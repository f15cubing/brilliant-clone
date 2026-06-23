import { COURSE, totalProblems } from "@/lib/content/course";
import type { Achievement, ProgressSnapshot } from "@/lib/progress/types";

function solvedCount(s: ProgressSnapshot): number {
  return Object.values(s.lessons).reduce(
    (n, lp) => n + lp.completedProblemIds.length,
    0,
  );
}

function lessonsCompleted(s: ProgressSnapshot): number {
  return Object.values(s.lessons).filter((lp) => lp.completedAt).length;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-steps",
    title: "First Steps",
    description: "Solve your first problem.",
    isEarned: (s) => solvedCount(s) >= 1,
  },
  {
    id: "xp-100",
    title: "Century",
    description: "Earn 100 XP.",
    isEarned: (s) => s.totalXp >= 100,
  },
  {
    id: "lesson-1",
    title: "Getting the Hang of It",
    description: "Complete your first lesson.",
    isEarned: (s) => lessonsCompleted(s) >= 1,
  },
  {
    id: "inscribed-master",
    title: "Circle Whisperer",
    description: "Complete The Inscribed Angle Theorem.",
    isEarned: (s) => Boolean(s.lessons["inscribed-angle"]?.completedAt),
  },
  {
    id: "incenter-master",
    title: "Incenter Insider",
    description: "Complete Incenter & Excenter Lemma.",
    isEarned: (s) => Boolean(s.lessons["incenter-lemma"]?.completedAt),
  },
  {
    id: "halfway",
    title: "Halfway There",
    description: "Solve half of all problems in the course.",
    isEarned: (s) => solvedCount(s) >= Math.ceil(totalProblems() / 2),
  },
  {
    id: "course-complete",
    title: "Angle Chasing Champion",
    description: "Complete every lesson in the course.",
    isEarned: (s) => lessonsCompleted(s) >= COURSE.lessons.length,
  },
];

export function earnedAchievements(s: ProgressSnapshot): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.isEarned(s));
}
