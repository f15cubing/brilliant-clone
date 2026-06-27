/**
 * React wiring for freeplay draft persistence (resume an in-progress proof).
 *
 * `useProofDraft(puzzleId)`:
 *   - loads the saved draft once (async cloud / sync guest), exposing
 *     `initialDraft` + `loading` so the arena can hydrate its reducer ONCE the
 *     draft has resolved (gating on `loading` avoids a flash of empty proof);
 *   - `persist(facts)` debounces a draft write so rapid changes coalesce;
 *   - `clear()` deletes the draft (on solve or reset);
 *   - any pending write is flushed on unmount so the last step is never lost.
 *
 * Routing (cloud vs guest vs test-mode no-op) lives in the pure `proofDraft`
 * module; this hook just feeds it the current auth env.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { draftFromFacts, type FactEntry, type ProofDraft } from "./proof";
import { fetchDraft, recordDraft, removeDraft, type DraftEnv } from "./proofDraft";

/** How long to wait after the last change before writing a draft. */
export const DRAFT_SAVE_DEBOUNCE_MS = 600;

export interface UseProofDraft {
  /** The saved draft for this puzzle (resolved once `loading` is false). */
  initialDraft: ProofDraft | null;
  loading: boolean;
  /** Schedule a debounced save of the current proof facts. */
  persist: (facts: FactEntry[]) => void;
  /** Cancel any pending save and delete the stored draft. */
  clear: () => void;
}

export function useProofDraft(puzzleId: string): UseProofDraft {
  const { user, configured, testMode, loading: authLoading } = useAuth();
  const env = useMemo<DraftEnv>(
    () => ({ configured, uid: user?.uid ?? null, testMode }),
    [configured, user, testMode],
  );

  // Store the loaded draft together with the puzzle it belongs to, so `loading`
  // can be derived synchronously — switching puzzles is "loading" on the very
  // first render (before the load effect runs), avoiding a flash of the wrong
  // puzzle's draft.
  const [loaded, setLoaded] = useState<{
    puzzleId: string;
    draft: ProofDraft | null;
  } | null>(null);

  // Keep the latest env available to the debounce timer and unmount flush.
  const envRef = useRef(env);
  envRef.current = env;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<FactEntry[] | null>(null);

  // Load the saved draft once auth has settled (re-loads if puzzle/user changes).
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    fetchDraft(env, puzzleId)
      .then((d) => {
        if (!cancelled) setLoaded({ puzzleId, draft: d });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ puzzleId, draft: null });
      });
    return () => {
      cancelled = true;
    };
  }, [env, puzzleId, authLoading]);

  const loading = !loaded || loaded.puzzleId !== puzzleId;
  const initialDraft =
    loaded && loaded.puzzleId === puzzleId ? loaded.draft : null;

  const persist = useCallback(
    (facts: FactEntry[]) => {
      pendingRef.current = facts;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        const f = pendingRef.current;
        pendingRef.current = null;
        if (f) void recordDraft(envRef.current, puzzleId, draftFromFacts(f));
      }, DRAFT_SAVE_DEBOUNCE_MS);
    },
    [puzzleId],
  );

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingRef.current = null;
    void removeDraft(envRef.current, puzzleId);
  }, [puzzleId]);

  // On leaving the puzzle, flush a pending save so the last step is persisted.
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      const f = pendingRef.current;
      pendingRef.current = null;
      if (f) void recordDraft(envRef.current, puzzleId, draftFromFacts(f));
    };
  }, [puzzleId]);

  return { initialDraft, loading, persist, clear };
}
