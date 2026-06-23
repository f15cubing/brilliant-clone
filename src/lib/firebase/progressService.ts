import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import {
  emptySnapshot,
  type CourseProgress,
  type LessonProgress,
  type ProgressSnapshot,
} from "@/lib/progress/types";

/**
 * Firestore layout (per PRD §7):
 *   users/{uid}                         -> profile { email, displayName, createdAt, totalXp }
 *   users/{uid}/lessonProgress/{id}     -> LessonProgress + problemStats
 *   users/{uid}/progress/{courseId}     -> CourseProgress
 *   users/{uid}/achievements/{id}       -> { earnedAt }
 */

export async function ensureUserDoc(
  uid: string,
  email: string | null,
  displayName: string | null,
): Promise<void> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      email,
      displayName,
      createdAt: serverTimestamp(),
      totalXp: 0,
    });
  }
}

export async function loadSnapshot(uid: string): Promise<ProgressSnapshot> {
  const snapshot = emptySnapshot();

  const userSnap = await getDoc(doc(db, "users", uid));
  if (userSnap.exists()) {
    snapshot.totalXp = (userSnap.data().totalXp as number) ?? 0;
  }

  const lessonSnap = await getDocs(collection(db, "users", uid, "lessonProgress"));
  lessonSnap.forEach((d) => {
    snapshot.lessons[d.id] = d.data() as LessonProgress;
  });

  const courseSnap = await getDocs(collection(db, "users", uid, "progress"));
  courseSnap.forEach((d) => {
    snapshot.course[d.id] = d.data() as CourseProgress;
  });

  const achSnap = await getDocs(collection(db, "users", uid, "achievements"));
  achSnap.forEach((d) => snapshot.earnedAchievementIds.push(d.id));

  return snapshot;
}

export async function saveLessonProgress(
  uid: string,
  lessonId: string,
  progress: LessonProgress,
): Promise<void> {
  await setDoc(doc(db, "users", uid, "lessonProgress", lessonId), progress, {
    merge: true,
  });
}

export async function saveCourseProgress(
  uid: string,
  courseId: string,
  progress: CourseProgress,
): Promise<void> {
  await setDoc(doc(db, "users", uid, "progress", courseId), progress, {
    merge: true,
  });
}

export async function saveTotalXp(uid: string, totalXp: number): Promise<void> {
  await setDoc(doc(db, "users", uid), { totalXp }, { merge: true });
}

export async function saveAchievement(
  uid: string,
  achievementId: string,
): Promise<void> {
  await setDoc(doc(db, "users", uid, "achievements", achievementId), {
    earnedAt: serverTimestamp(),
  });
}
