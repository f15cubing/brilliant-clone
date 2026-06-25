import type { Course, Lesson, Problem } from "@/lib/content/types";
import { triangleAngleSum } from "@/lib/content/lessons/triangleAngleSum";
import { inscribedAngle } from "@/lib/content/lessons/inscribedAngle";
import { cyclicQuadrilaterals } from "@/lib/content/lessons/cyclicQuadrilaterals";
import { parallelLines } from "@/lib/content/lessons/parallelLines";
import { incenterLemma } from "@/lib/content/lessons/incenterLemma";
import { orthocenter } from "@/lib/content/lessons/orthocenter";
import { orthicIncenter } from "@/lib/content/lessons/orthicIncenter";

export const olympiadGeometry: Course = {
  id: "olympiad-geometry",
  title: "Olympiad Geometry: Angle Chasing",
  subtitle: "Learn by dragging the figure",
  description:
    "An interactive first course in introductory geometry. Every problem is a construction you can drag — so you can see each theorem hold for any triangle, circle, or configuration.",
  lessons: [
    triangleAngleSum,
    parallelLines,
    inscribedAngle,
    cyclicQuadrilaterals,
    incenterLemma,
    orthocenter,
    orthicIncenter,
  ],
};

export const COURSE = olympiadGeometry;

export function getLesson(lessonId: string): Lesson | undefined {
  return COURSE.lessons.find((l) => l.id === lessonId);
}

export function getProblem(
  lessonId: string,
  problemId: string,
): Problem | undefined {
  return getLesson(lessonId)?.problems.find((p) => p.id === problemId);
}

export function totalProblems(): number {
  return COURSE.lessons.reduce((n, l) => n + l.problems.length, 0);
}

export function lessonIndex(lessonId: string): number {
  return COURSE.lessons.findIndex((l) => l.id === lessonId);
}

export function nextLessonId(lessonId: string): string | undefined {
  const i = lessonIndex(lessonId);
  if (i < 0 || i + 1 >= COURSE.lessons.length) return undefined;
  return COURSE.lessons[i + 1].id;
}
