/**
 * R2-D2 (proof archive): records a completed freeplay proof on a win.
 *
 * Persistence routing (mirrors ProgressContext):
 *   - admin/test mode (`useAuth().testMode`) -> DO NOT persist;
 *   - signed-in (`configured && user`)        -> Firestore via proofService;
 *   - everyone else (guest / Firebase off)    -> append to localStorage.
 *
 * The pure `recordCompiledProof` does the actual routing (easy to unit-test);
 * the `useProofRecorder` hook wires it to `useAuth()`, exposes a save status,
 * and guards so a single solve saves exactly ONCE — even under React
 * re-renders or StrictMode's double-invoked effects.
 */
import { useCallback, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { saveProofForUser } from "@/lib/firebase/proofService";
import type { CompiledProof } from "./proofRecord";

/** localStorage key holding the guest history (an array of stored proofs). */
export const GUEST_PROOFS_KEY = "geo-freeplay-proofs-guest";

export type SaveStatus = "idle" | "saving" | "saved" | "error";
export type SaveScope = "cloud" | "local";

export interface ProofSaveState {
  status: SaveStatus;
  /** Where the save was (or would be) routed; absent while idle/test-mode. */
  scope?: SaveScope;
}

/** A guest record: the compiled proof plus a client-side `solvedAt`. */
export type GuestStoredProof = CompiledProof & { solvedAt: number };

/** Read the guest history array (empty/parse errors degrade to `[]`). */
export function loadGuestProofs(): GuestStoredProof[] {
  try {
    const raw = localStorage.getItem(GUEST_PROOFS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as GuestStoredProof[]) : [];
  } catch {
    return [];
  }
}

/** Append one proof to the guest history (stamped with `Date.now()`). */
function appendGuestProof(compiled: CompiledProof): void {
  const history = loadGuestProofs();
  history.push({ ...compiled, solvedAt: Date.now() });
  localStorage.setItem(GUEST_PROOFS_KEY, JSON.stringify(history));
}

export interface RecordEnv {
  configured: boolean;
  uid: string | null;
  testMode: boolean;
}

/**
 * Persist a compiled proof according to `env`. Pure w.r.t. React: returns the
 * resulting save state. Never throws — failures resolve to an error state.
 */
export async function recordCompiledProof(
  env: RecordEnv,
  compiled: CompiledProof,
): Promise<ProofSaveState> {
  // Mirror ProgressContext: in admin test mode we never persist.
  if (env.testMode) return { status: "idle" };

  if (env.configured && env.uid) {
    try {
      await saveProofForUser(env.uid, compiled);
      return { status: "saved", scope: "cloud" };
    } catch (err) {
      console.error("[freeplay] cloud proof save failed", err);
      return { status: "error", scope: "cloud" };
    }
  }

  // Guest: Firebase not configured, or configured but no signed-in user.
  try {
    appendGuestProof(compiled);
    return { status: "saved", scope: "local" };
  } catch (err) {
    console.error("[freeplay] guest proof save failed", err);
    return { status: "error", scope: "local" };
  }
}

/**
 * The single-save idempotency guard, factored out so it is unit-testable
 * without React. Returns a predicate that yields `true` the FIRST time a given
 * attempt key is seen and `false` for every repeat (React re-render /
 * StrictMode double-invoke).
 */
export function makeAttemptGuard(): (key: string) => boolean {
  const handled = new Set<string>();
  return (key: string): boolean => {
    if (handled.has(key)) return false;
    handled.add(key);
    return true;
  };
}

export interface UseProofRecorder {
  save: ProofSaveState;
  /**
   * Record `compiled` once for the given `attemptKey`. Repeat calls with the
   * same key (re-renders, StrictMode double-invoke) are no-ops.
   */
  recordSolvedProof: (compiled: CompiledProof, attemptKey: string) => void;
}

export function useProofRecorder(): UseProofRecorder {
  const { user, configured, testMode } = useAuth();
  const [save, setSave] = useState<ProofSaveState>({ status: "idle" });
  // The single-save idempotency guard. Held in a ref so it survives re-renders
  // and StrictMode's double-invoked effects.
  const guardRef = useRef<(key: string) => boolean>();
  if (!guardRef.current) guardRef.current = makeAttemptGuard();

  const recordSolvedProof = useCallback(
    (compiled: CompiledProof, attemptKey: string) => {
      // Claim the key (returns false on repeats) BEFORE awaiting so a
      // synchronous second invocation bails.
      if (!guardRef.current!(attemptKey)) return;

      setSave({ status: "saving" });
      void recordCompiledProof(
        { configured, uid: user?.uid ?? null, testMode },
        compiled,
      ).then(setSave);
    },
    [configured, user, testMode],
  );

  return { save, recordSolvedProof };
}
