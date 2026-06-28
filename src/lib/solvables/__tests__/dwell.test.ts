import { describe, expect, it } from "vitest";
import { dwellDurationFor } from "@/lib/solvables/dwell";

describe("dwellDurationFor", () => {
  it("defaults to 3000ms wrong / 1500ms correct", () => {
    expect(dwellDurationFor("wrong")).toBe(3000);
    expect(dwellDurationFor("correct")).toBe(1500);
  });

  it("respects a per-stage override", () => {
    const cfg = { wrongMs: 5000, correctMs: 800 };
    expect(dwellDurationFor("wrong", cfg)).toBe(5000);
    expect(dwellDurationFor("correct", cfg)).toBe(800);
  });
});
