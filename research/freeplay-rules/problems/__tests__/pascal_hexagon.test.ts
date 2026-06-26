import { describe, expect, it } from "vitest";
import { factHolds } from "@/lib/freeplay/check";
import { replayProblem } from "../replay";
import { pascal_hexagon } from "../pascal_hexagon";

describe("play-test: Pascal's theorem (pascal-hexagon)", () => {
  it("every given and the goal hold numerically in the realization", () => {
    for (const g of pascal_hexagon.given) {
      expect(
        factHolds(g, pascal_hexagon.coords, pascal_hexagon.bindings ?? {}),
        `given ${JSON.stringify(g)} must be numerically true`,
      ).toBe(true);
    }
    expect(
      factHolds(pascal_hexagon.goal, pascal_hexagon.coords, pascal_hexagon.bindings ?? {}),
    ).toBe(true);
  });

  it("replays end-to-end: goal reached and every step valid", () => {
    const report = replayProblem(pascal_hexagon);
    expect(report.allValid).toBe(true);
    expect(report.goalReached).toBe(true);
    for (const s of report.steps) {
      expect(s.numericallyTrue, `step ${s.label} numerically true`).toBe(true);
    }
  });

  it("the final collinearity is justified by the Pascal rule", () => {
    const report = replayProblem(pascal_hexagon);
    const last = report.steps[report.steps.length - 1];
    expect(last.result.valid).toBe(true);
    if (last.result.valid) {
      expect(last.result.rule).toBe("Pascal's theorem");
    }
  });
});
