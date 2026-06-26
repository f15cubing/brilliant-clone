/**
 * Per-uid sliding-window rate limit, expressed as a PURE decision function so it
 * can be unit tested without Firestore. `index.ts` runs `evaluateRateLimit`
 * inside a Firestore transaction over `ratelimits/{uid}` (Admin SDK only — see
 * firestore.rules, which denies all client access to that collection).
 */
export interface RateLimitConfig {
  perMinute: number;
  perDay: number;
}

export const DEFAULT_RATE_LIMIT: RateLimitConfig = { perMinute: 30, perDay: 300 };

export interface RateLimitState {
  minuteWindowStart: number;
  minuteCount: number;
  dayWindowStart: number;
  dayCount: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  /** The state to persist (incremented when allowed; unchanged when denied). */
  state: RateLimitState;
  reason?: "minute" | "day";
  retryAfterSec?: number;
}

const MINUTE = 60_000;
const DAY = 24 * 60 * 60_000;

/**
 * Decide whether a request at `nowMs` is allowed given the previous counter
 * state. Windows reset once their span elapses. When allowed, the returned
 * `state` already includes this request.
 */
export function evaluateRateLimit(
  prev: RateLimitState | null,
  nowMs: number,
  cfg: RateLimitConfig = DEFAULT_RATE_LIMIT,
): RateLimitDecision {
  let minuteWindowStart = prev?.minuteWindowStart ?? nowMs;
  let minuteCount = prev?.minuteCount ?? 0;
  let dayWindowStart = prev?.dayWindowStart ?? nowMs;
  let dayCount = prev?.dayCount ?? 0;

  if (nowMs - minuteWindowStart >= MINUTE) {
    minuteWindowStart = nowMs;
    minuteCount = 0;
  }
  if (nowMs - dayWindowStart >= DAY) {
    dayWindowStart = nowMs;
    dayCount = 0;
  }

  if (dayCount >= cfg.perDay) {
    return {
      allowed: false,
      reason: "day",
      retryAfterSec: Math.ceil((dayWindowStart + DAY - nowMs) / 1000),
      state: { minuteWindowStart, minuteCount, dayWindowStart, dayCount },
    };
  }
  if (minuteCount >= cfg.perMinute) {
    return {
      allowed: false,
      reason: "minute",
      retryAfterSec: Math.ceil((minuteWindowStart + MINUTE - nowMs) / 1000),
      state: { minuteWindowStart, minuteCount, dayWindowStart, dayCount },
    };
  }

  return {
    allowed: true,
    state: {
      minuteWindowStart,
      minuteCount: minuteCount + 1,
      dayWindowStart,
      dayCount: dayCount + 1,
    },
  };
}
