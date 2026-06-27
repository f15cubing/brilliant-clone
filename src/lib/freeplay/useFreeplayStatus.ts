/**
 * Per-puzzle freeplay status for the catalog: which puzzles are SOLVED and which
 * have an in-progress draft to CONTINUE. Reads both backends via the same
 * routing the rest of the feature uses (cloud vs guest), and excludes solved
 * puzzles from `draftIds` so a finished puzzle never also shows "Continue".
 */
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { loadSolvedProofs } from "./proofArchive";
import { listDraftIds, type DraftEnv } from "./proofDraft";

const EMPTY: ReadonlySet<string> = new Set<string>();

export interface FreeplayStatus {
  solvedIds: ReadonlySet<string>;
  draftIds: ReadonlySet<string>;
  loading: boolean;
}

export function useFreeplayStatus(): FreeplayStatus {
  const { user, configured, testMode, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<{
    solvedIds: Set<string>;
    draftIds: Set<string>;
  } | null>(null);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    setStatus(null);
    const uid = user?.uid ?? null;
    const draftEnv: DraftEnv = { configured, uid, testMode };
    Promise.all([loadSolvedProofs({ configured, uid }), listDraftIds(draftEnv)])
      .then(([solved, drafts]) => {
        if (cancelled) return;
        const solvedIds = new Set(solved.map((p) => p.puzzleId));
        const draftIds = new Set(
          drafts.map((d) => d.puzzleId).filter((id) => !solvedIds.has(id)),
        );
        setStatus({ solvedIds, draftIds });
      })
      .catch(() => {
        if (!cancelled) {
          setStatus({ solvedIds: new Set(), draftIds: new Set() });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [configured, user, testMode, authLoading]);

  return {
    solvedIds: status?.solvedIds ?? EMPTY,
    draftIds: status?.draftIds ?? EMPTY,
    loading: status === null,
  };
}
