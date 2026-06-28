import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_DWELL, type DwellConfig } from "@/lib/content/types";

export type DwellOutcome = "correct" | "wrong";

/** Pure: how long the learner must dwell on feedback before advancing. */
export function dwellDurationFor(
  outcome: DwellOutcome,
  cfg: DwellConfig = DEFAULT_DWELL,
): number {
  return outcome === "wrong" ? cfg.wrongMs : cfg.correctMs;
}

/** Thin timer hook: `arm(ms)` locks for `ms`, then unlocks. `clear` cancels. */
export function useDwellLock(): {
  locked: boolean;
  arm: (ms: number) => void;
  clear: () => void;
} {
  const [locked, setLocked] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const arm = useCallback(
    (ms: number) => {
      clear();
      if (ms <= 0) {
        setLocked(false);
        return;
      }
      setLocked(true);
      timer.current = setTimeout(() => setLocked(false), ms);
    },
    [clear],
  );

  useEffect(() => clear, [clear]);

  return { locked, arm, clear };
}
