/**
 * Per-user storage of IN-PROGRESS freeplay proofs ("drafts").
 *
 * Firestore layout (owner-only; see firestore.rules):
 *   users/{uid}/freeplayDrafts/{puzzleId} -> ProofDraft + { puzzleId, stepCount, updatedAt }
 *
 * Unlike completed proofs (append-only history), there is at most ONE draft per
 * puzzle: `setDoc` overwrites it on every auto-save, and it is deleted on solve
 * or reset. Style mirrors proofService.ts.
 */
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { ProofDraft } from "@/lib/freeplay/proof";
import type { DraftSummary } from "@/lib/freeplay/proofDraft";

/** Normalize a Firestore Timestamp-ish value to milliseconds (0 if unknown). */
function toMillis(value: unknown): number {
  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (value as { toMillis: unknown }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return typeof value === "number" ? value : 0;
}

/** Upsert the signed-in user's draft for `puzzleId`. `updatedAt` is server-stamped. */
export async function saveDraftForUser(
  uid: string,
  puzzleId: string,
  draft: ProofDraft,
): Promise<void> {
  await setDoc(doc(db, "users", uid, "freeplayDrafts", puzzleId), {
    version: draft.version,
    derived: draft.derived,
    puzzleId,
    stepCount: draft.derived.length,
    updatedAt: serverTimestamp(),
  });
}

/** Read the user's draft for `puzzleId` (null if absent or malformed). */
export async function loadDraftForUser(
  uid: string,
  puzzleId: string,
): Promise<ProofDraft | null> {
  const snap = await getDoc(doc(db, "users", uid, "freeplayDrafts", puzzleId));
  if (!snap.exists()) return null;
  const data = snap.data() as DocumentData;
  if (!Array.isArray(data.derived)) return null;
  return {
    version: typeof data.version === "number" ? data.version : 1,
    derived: data.derived,
  };
}

/** Delete the user's draft for `puzzleId` (no-op if absent). */
export async function deleteDraftForUser(
  uid: string,
  puzzleId: string,
): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "freeplayDrafts", puzzleId));
}

/** Summaries of all the user's drafts (for catalog "Continue" badges). */
export async function listDraftSummariesForUser(
  uid: string,
): Promise<DraftSummary[]> {
  const snap = await getDocs(collection(db, "users", uid, "freeplayDrafts"));
  return snap.docs.map((d) => {
    const data = d.data() as DocumentData;
    return {
      puzzleId: d.id,
      stepCount:
        typeof data.stepCount === "number"
          ? data.stepCount
          : Array.isArray(data.derived)
            ? data.derived.length
            : 0,
      updatedAt: toMillis(data.updatedAt),
    };
  });
}
