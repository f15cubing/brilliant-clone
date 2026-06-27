/**
 * Freeplay draft persistence: saves an IN-PROGRESS proof so a learner can leave
 * a puzzle and come back to their steps.
 *
 * A draft is just the DERIVED steps (givens are always reconstructed from the
 * puzzle, so a stale draft stays valid even if puzzle content changes). One
 * draft per puzzle — re-saving overwrites it; solving or resetting deletes it.
 *
 * Persistence routing (mirrors useProofRecorder / ProgressContext):
 *   - admin/test mode (`useAuth().testMode`) -> DO NOT persist, DO NOT resume;
 *   - signed-in (`configured && uid`)         -> Firestore via draftService;
 *   - everyone else (guest / Firebase off)    -> a localStorage map.
 *
 * The pure `recordDraft`/`fetchDraft`/`removeDraft`/`listDraftIds` do the
 * routing (easy to unit-test); `useProofDraft` wires them to `useAuth()`.
 */
import {
  deleteDraftForUser,
  listDraftSummariesForUser,
  loadDraftForUser,
  saveDraftForUser,
} from "@/lib/firebase/draftService";
import { DRAFT_VERSION, type ProofDraft } from "./proof";

export { DRAFT_VERSION } from "./proof";
export type { ProofDraft } from "./proof";

/** localStorage key holding the guest draft map ({ [puzzleId]: record }). */
export const GUEST_DRAFTS_KEY = "geo-freeplay-drafts-guest";

/** A lightweight per-puzzle draft descriptor used for catalog "Continue" badges. */
export interface DraftSummary {
  puzzleId: string;
  stepCount: number;
  /** Milliseconds since epoch (0 if unknown). */
  updatedAt: number;
}

/** Routing environment (mirrors RecordEnv in useProofRecorder). */
export interface DraftEnv {
  configured: boolean;
  uid: string | null;
  testMode: boolean;
}

/** A guest draft record: the draft plus derived metadata for summaries. */
type GuestDraftRecord = ProofDraft & { stepCount: number; updatedAt: number };
type GuestDraftMap = Record<string, GuestDraftRecord>;

function loadGuestMap(): GuestDraftMap {
  try {
    const raw = localStorage.getItem(GUEST_DRAFTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as GuestDraftMap) : {};
  } catch {
    return {};
  }
}

function writeGuestMap(map: GuestDraftMap): void {
  localStorage.setItem(GUEST_DRAFTS_KEY, JSON.stringify(map));
}

/** Read one guest draft (null if absent or malformed). */
export function loadGuestDraft(puzzleId: string): ProofDraft | null {
  const rec = loadGuestMap()[puzzleId];
  if (!rec || !Array.isArray(rec.derived)) return null;
  return { version: rec.version ?? DRAFT_VERSION, derived: rec.derived };
}

/** Upsert one guest draft (stamped with `Date.now()`). */
export function saveGuestDraft(puzzleId: string, draft: ProofDraft): void {
  const map = loadGuestMap();
  map[puzzleId] = {
    version: draft.version,
    derived: draft.derived,
    stepCount: draft.derived.length,
    updatedAt: Date.now(),
  };
  writeGuestMap(map);
}

/** Remove one guest draft (no-op if absent). */
export function deleteGuestDraft(puzzleId: string): void {
  const map = loadGuestMap();
  if (puzzleId in map) {
    delete map[puzzleId];
    writeGuestMap(map);
  }
}

/** Summaries for every guest draft. */
export function loadGuestDraftSummaries(): DraftSummary[] {
  return Object.entries(loadGuestMap()).map(([puzzleId, rec]) => ({
    puzzleId,
    stepCount:
      rec.stepCount ?? (Array.isArray(rec.derived) ? rec.derived.length : 0),
    updatedAt: rec.updatedAt ?? 0,
  }));
}

/**
 * Persist (upsert) a draft according to `env`. Pure w.r.t. React; never throws
 * — failures are logged and swallowed so auto-save can never break the UI.
 */
export async function recordDraft(
  env: DraftEnv,
  puzzleId: string,
  draft: ProofDraft,
): Promise<void> {
  if (env.testMode) return;
  if (env.configured && env.uid) {
    try {
      await saveDraftForUser(env.uid, puzzleId, draft);
    } catch (err) {
      console.error("[freeplay] cloud draft save failed", err);
    }
    return;
  }
  try {
    saveGuestDraft(puzzleId, draft);
  } catch (err) {
    console.error("[freeplay] guest draft save failed", err);
  }
}

/** Load a draft according to `env` (null in test mode / on any failure). */
export async function fetchDraft(
  env: DraftEnv,
  puzzleId: string,
): Promise<ProofDraft | null> {
  if (env.testMode) return null;
  if (env.configured && env.uid) {
    try {
      return await loadDraftForUser(env.uid, puzzleId);
    } catch (err) {
      console.error("[freeplay] cloud draft load failed", err);
      return null;
    }
  }
  try {
    return loadGuestDraft(puzzleId);
  } catch (err) {
    console.error("[freeplay] guest draft load failed", err);
    return null;
  }
}

/** Delete a draft according to `env` (no-op in test mode). */
export async function removeDraft(env: DraftEnv, puzzleId: string): Promise<void> {
  if (env.testMode) return;
  if (env.configured && env.uid) {
    try {
      await deleteDraftForUser(env.uid, puzzleId);
    } catch (err) {
      console.error("[freeplay] cloud draft delete failed", err);
    }
    return;
  }
  try {
    deleteGuestDraft(puzzleId);
  } catch (err) {
    console.error("[freeplay] guest draft delete failed", err);
  }
}

/** List draft summaries according to `env` (empty in test mode / on failure). */
export async function listDraftIds(env: DraftEnv): Promise<DraftSummary[]> {
  if (env.testMode) return [];
  if (env.configured && env.uid) {
    try {
      return await listDraftSummariesForUser(env.uid);
    } catch (err) {
      console.error("[freeplay] cloud draft list failed", err);
      return [];
    }
  }
  try {
    return loadGuestDraftSummaries();
  } catch (err) {
    console.error("[freeplay] guest draft list failed", err);
    return [];
  }
}
