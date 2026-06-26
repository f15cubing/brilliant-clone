import { describe, expect, it } from "vitest";
import { evaluateRateLimit, type RateLimitState } from "../ratelimit";

const cfg = { perMinute: 3, perDay: 5 };

describe("evaluateRateLimit", () => {
  it("allows and increments from a null state", () => {
    const d = evaluateRateLimit(null, 1_000, cfg);
    expect(d.allowed).toBe(true);
    expect(d.state.minuteCount).toBe(1);
    expect(d.state.dayCount).toBe(1);
  });

  it("denies once the per-minute cap is hit", () => {
    const state: RateLimitState = {
      minuteWindowStart: 0,
      minuteCount: 3,
      dayWindowStart: 0,
      dayCount: 3,
    };
    const d = evaluateRateLimit(state, 10_000, cfg);
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("minute");
    expect(d.retryAfterSec).toBeGreaterThan(0);
    expect(d.state.minuteCount).toBe(3); // unchanged when denied
  });

  it("resets the minute window after 60s", () => {
    const state: RateLimitState = {
      minuteWindowStart: 0,
      minuteCount: 3,
      dayWindowStart: 0,
      dayCount: 3,
    };
    const d = evaluateRateLimit(state, 61_000, cfg);
    expect(d.allowed).toBe(true);
    expect(d.state.minuteCount).toBe(1);
    expect(d.state.dayCount).toBe(4); // day window still open
  });

  it("denies on the per-day cap even within a fresh minute", () => {
    const state: RateLimitState = {
      minuteWindowStart: 61_000,
      minuteCount: 0,
      dayWindowStart: 0,
      dayCount: 5,
    };
    const d = evaluateRateLimit(state, 62_000, cfg);
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("day");
  });
});
