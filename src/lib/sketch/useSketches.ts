/**
 * Load the current env's saved sketches, with a `refresh()` to re-pull after a
 * save/delete. Thin wrapper over `sketchStore.listSketches` that tracks the
 * auth-derived `env` so the list follows sign-in/out.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { listSketches, type SketchEnv } from "./sketchStore";
import type { Construction } from "./types";

export interface UseSketchesResult {
  sketches: Construction[];
  loading: boolean;
  env: SketchEnv;
  refresh: () => Promise<void>;
}

export function useSketches(): UseSketchesResult {
  const { user, configured } = useAuth();
  const uid = user?.uid ?? null;
  // Stable identity so consumers' effects (e.g. autosave) don't reset each render.
  const env = useMemo<SketchEnv>(() => ({ configured, uid }), [configured, uid]);
  const [sketches, setSketches] = useState<Construction[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setSketches(await listSketches(env));
    } catch {
      setSketches([]);
    } finally {
      setLoading(false);
    }
  }, [env]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { sketches, loading, env, refresh };
}
