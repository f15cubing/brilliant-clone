import { describe, expect, it } from "vitest";
import { aval, factLabel, rel } from "@/lib/freeplay/dsl";
import { constForm } from "@/lib/freeplay/form";
import { rat } from "@/lib/freeplay/rational";
import type { FactEntry } from "@/lib/freeplay/proof";
import { compileProof } from "@/lib/freeplay/proofRecord";
import type { Puzzle } from "@/lib/freeplay/types";

const g1 = rel("midp", ["M", "A", "B"]);
const g2 = rel("midp", ["N", "A", "C"]);
const goal = rel("para", ["M", "N", "B", "C"]);

/** A minimal puzzle — compileProof only reads metadata + goal. */
const puzzle: Puzzle = {
  id: "midsegment",
  title: "The midsegment of a triangle",
  blurb: "M and N are midpoints of AB and AC. Prove MN ∥ BC.",
  difficulty: "core",
  coords: {},
  figure: [],
  given: [g1, g2],
  goal,
  solution: [],
};

describe("compileProof", () => {
  it("captures givens, derived steps (with premises) and metadata", () => {
    const facts: FactEntry[] = [
      { id: 0, fact: g1, source: "given" },
      { id: 1, fact: g2, source: "given" },
      {
        id: 2,
        fact: goal,
        source: "derived",
        rule: "midsegment is parallel to the base",
        premises: [g1, g2],
      },
    ];

    const proof = compileProof(facts, puzzle);

    expect(proof.puzzleId).toBe("midsegment");
    expect(proof.title).toBe(puzzle.title);
    expect(proof.blurb).toBe(puzzle.blurb);
    expect(proof.difficulty).toBe("core");
    expect(proof.givens).toEqual([g1, g2]);
    expect(proof.goal).toEqual(goal);
    expect(proof.stepCount).toBe(1);

    expect(proof.steps).toHaveLength(1);
    const [step] = proof.steps;
    expect(step.fact).toEqual(goal);
    expect(step.rule).toBe("midsegment is parallel to the base");
    expect(step.premises).toEqual([g1, g2]);
    expect(step.humanReadable).toBe(factLabel(goal));
    expect(step).not.toHaveProperty("analogy");
  });

  it("preserves given order and derivation order", () => {
    const d1 = rel("cong", ["A", "B", "C", "D"]);
    const facts: FactEntry[] = [
      { id: 0, fact: g2, source: "given" },
      { id: 1, fact: g1, source: "given" },
      { id: 2, fact: d1, source: "derived", rule: "r1", premises: [g2] },
      { id: 3, fact: goal, source: "derived", rule: "r2", premises: [d1] },
    ];

    const proof = compileProof(facts, puzzle);
    expect(proof.givens).toEqual([g2, g1]);
    expect(proof.steps.map((s) => s.fact)).toEqual([d1, goal]);
  });

  it("defaults a missing rule to \"\" and missing premises to []", () => {
    const facts: FactEntry[] = [
      { id: 0, fact: goal, source: "derived" },
    ];
    const [step] = compileProof(facts, puzzle).steps;
    expect(step.rule).toBe("");
    expect(step.premises).toEqual([]);
  });

  it("captures an analogy substitution when present", () => {
    const facts: FactEntry[] = [
      {
        id: 0,
        fact: goal,
        source: "derived",
        rule: "by symmetry (analogous argument)",
        premises: [g1],
        analogy: { subst: { B: "C", C: "B" } },
      },
    ];
    const [step] = compileProof(facts, puzzle).steps;
    expect(step.analogy).toEqual({ subst: { B: "C", C: "B" } });
  });

  it("produces a fully JSON-serializable record (no undefined fields)", () => {
    // Include an aval step so the rational `form` is exercised too.
    const avalFact = aval(["B", "I", "A"], constForm(rat(90)));
    const facts: FactEntry[] = [
      { id: 0, fact: g1, source: "given" },
      {
        id: 1,
        fact: avalFact,
        source: "derived",
        rule: "angle chase",
        premises: [g1],
      },
    ];
    const proof = compileProof(facts, puzzle);
    const roundTripped = JSON.parse(JSON.stringify(proof));
    expect(roundTripped).toEqual(proof);
    expect(JSON.stringify(proof)).not.toContain("undefined");
  });
});
