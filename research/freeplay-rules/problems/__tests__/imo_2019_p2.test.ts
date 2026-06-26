/**
 * Play-test for IMO 2019 Problem 2 (P, P1, Q, Q1 concyclic) — SOLVED END-TO-END
 * (Batch 8). The full Pappus + auxiliary-circles solution is encoded in six
 * steps and every one is one-step-derivable by the research engine
 * (shipped RULES + `concyclic_from_directed_angles`); the goal is reached.
 */
import { describe, expect, it } from "vitest";
import { factHolds } from "@/lib/freeplay/check";
import { replayProblem } from "../replay";
import { imo_2019_p2 as P } from "../imo_2019_p2";

describe(`problem: ${P.id} (${P.source})`, () => {
  const report = replayProblem(P);

  it("every given is numerically true in the coordinates", () => {
    for (const g of P.given) {
      expect(factHolds(g, P.coords), JSON.stringify(g)).toBe(true);
    }
  });

  it("every step fact (and the goal) is numerically true in the coordinates", () => {
    for (const s of report.steps) {
      expect(s.numericallyTrue, s.label).toBe(true);
    }
    expect(factHolds(P.goal, P.coords)).toBe(true);
  });

  it("each step verifies with its expected rule", () => {
    const expected = [
      "Pappus's theorem",
      "algebraic angle-chase",
      "concyclic from equal directed angles",
      "concyclic from equal directed angles",
      "same circle (3 shared points)",
      "concyclic from equal directed angles",
    ];
    report.steps.forEach((s, i) => {
      expect(s.result, `step ${i + 1} (${s.label})`).toEqual({
        valid: true,
        rule: expected[i],
      });
    });
  });

  it("all steps valid and the goal is reached end-to-end", () => {
    expect(report.allValid).toBe(true);
    expect(report.goalReached).toBe(true);
  });
});
