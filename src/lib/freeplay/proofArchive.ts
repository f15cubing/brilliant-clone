/**
 * Read side of the freeplay proof archive: load a user's COMPLETED proofs for
 * the "Proofs" tab and the catalog "Solved" badges.
 *
 * Storage is append-only (one record per solve) in both backends, so this
 * module also dedupes to one entry per puzzle (the latest solve) and normalizes
 * the two timestamp shapes (Firestore Timestamp vs guest `number`).
 *
 * Routing mirrors the write side (useProofRecorder):
 *   - signed-in (`configured && uid`) -> Firestore via proofService;
 *   - everyone else (guest / Firebase off) -> localStorage.
 */
import { listProofsForUser } from "@/lib/firebase/proofService";
import type { CompiledProof } from "./proofRecord";
import { loadGuestProofs } from "./useProofRecorder";

/** A completed proof with a normalized solve time, ready to render. */
export interface ArchivedProof extends CompiledProof {
  /** Stable id (Firestore doc id, or a synthesized id for guest records). */
  id: string;
  /** Solve time in milliseconds since epoch (0 if unknown). */
  solvedAtMillis: number;
}

/** Where to read solved proofs from. */
export interface ArchiveEnv {
  configured: boolean;
  uid: string | null;
}

/**
 * Normalize a stored `solvedAt` to milliseconds. Handles a Firestore
 * `Timestamp` instance (`toMillis()`), a serialized `{ seconds }` shape, and a
 * guest `number`. Anything else (e.g. a not-yet-resolved server timestamp) -> 0.
 */
export function solvedAtMillis(value: unknown): number {
  if (value && typeof value === "object") {
    const obj = value as { toMillis?: unknown; seconds?: unknown };
    if (typeof obj.toMillis === "function") {
      return (obj.toMillis as () => number)();
    }
    if (typeof obj.seconds === "number") {
      return obj.seconds * 1000;
    }
  }
  return typeof value === "number" ? value : 0;
}

/**
 * Collapse a full solve history to one entry per puzzle (the latest solve),
 * returned newest-first.
 */
export function latestPerPuzzle(proofs: ArchivedProof[]): ArchivedProof[] {
  const byPuzzle = new Map<string, ArchivedProof>();
  for (const p of proofs) {
    const existing = byPuzzle.get(p.puzzleId);
    if (!existing || p.solvedAtMillis > existing.solvedAtMillis) {
      byPuzzle.set(p.puzzleId, p);
    }
  }
  return [...byPuzzle.values()].sort(
    (a, b) => b.solvedAtMillis - a.solvedAtMillis,
  );
}

/** Load all of a user's stored proofs (full history), normalized. */
export async function loadSolvedProofs(
  env: ArchiveEnv,
): Promise<ArchivedProof[]> {
  if (env.configured && env.uid) {
    const stored = await listProofsForUser(env.uid);
    return stored.map((p) => ({
      ...p,
      id: p.id,
      solvedAtMillis: solvedAtMillis(p.solvedAt),
    }));
  }
  return loadGuestProofs().map((p, i) => ({
    ...p,
    id: `${p.puzzleId}-${i}`,
    solvedAtMillis: solvedAtMillis(p.solvedAt),
  }));
}

/** Load a user's solved proofs, deduped to one (latest) per puzzle. */
export async function loadLatestSolvedProofs(
  env: ArchiveEnv,
): Promise<ArchivedProof[]> {
  return latestPerPuzzle(await loadSolvedProofs(env));
}
