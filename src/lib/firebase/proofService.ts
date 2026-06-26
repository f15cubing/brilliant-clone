/**
 * R2-D2 (proof archive): per-user storage of completed freeplay proofs.
 *
 * Firestore layout (owner-only; see firestore.rules):
 *   users/{uid}/freeplayProofs/{autoId} -> CompiledProof + { solvedAt }
 *
 * Every solve writes a NEW document (`addDoc`), so the collection is a full
 * history — one record per solve. Style mirrors progressService.ts.
 */
import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
  type DocumentData,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { CompiledProof } from "@/lib/freeplay/proofRecord";

/** A stored proof as read back from Firestore (auto id + server `solvedAt`). */
export interface StoredProof extends CompiledProof {
  id: string;
  /** Firestore Timestamp (millis once `.toMillis()` is applied), or null until the server resolves it. */
  solvedAt: unknown;
}

/**
 * Append a completed proof to the signed-in user's history. Returns the new
 * document id. `solvedAt` is stamped server-side via `serverTimestamp()`.
 */
export async function saveProofForUser(
  uid: string,
  proof: CompiledProof,
): Promise<string> {
  const ref = await addDoc(collection(db, "users", uid, "freeplayProofs"), {
    ...proof,
    solvedAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * List a user's stored proofs, newest first. Optionally filter to a single
 * puzzle. For a future browsing UI — not used by the win flow.
 */
export async function listProofsForUser(
  uid: string,
  puzzleId?: string,
): Promise<StoredProof[]> {
  const constraints: QueryConstraint[] = [];
  if (puzzleId) constraints.push(where("puzzleId", "==", puzzleId));
  constraints.push(orderBy("solvedAt", "desc"));

  const snap = await getDocs(
    query(collection(db, "users", uid, "freeplayProofs"), ...constraints),
  );
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as DocumentData),
  })) as StoredProof[];
}
