import { describe, expect, it } from "vitest";
import { rel } from "@/lib/freeplay/dsl";
import {
  DRAFT_VERSION,
  draftFromFacts,
  hydrateProofState,
  initProofState,
  type FactEntry,
  type ProofDraft,
} from "@/lib/freeplay/proof";
import type { Puzzle } from "@/lib/freeplay/types";

const g1 = rel("midp", ["M", "A", "B"]);
const g2 = rel("midp", ["N", "A", "C"]);
const step = rel("para", ["M", "N", "B", "C"]);
const goal = rel("cong", ["A", "B", "A", "C"]);

/** A minimal puzzle — hydration only reads `given` and `goal`. */
const puzzle: Puzzle = {
  id: "midsegment",
  title: "The midsegment of a triangle",
  blurb: "M and N are midpoints. Prove AB = AC.",
  difficulty: "core",
  coords: {},
  figure: [],
  given: [g1, g2],
  goal,
  solution: [],
};

describe("draftFromFacts", () => {
  it("keeps only derived steps, tagged with the current version", () => {
    const facts: FactEntry[] = [
      { id: 0, fact: g1, source: "given" },
      { id: 1, fact: g2, source: "given" },
      { id: 2, fact: step, source: "derived", rule: "r1", premises: [g1, g2] },
    ];
    const draft = draftFromFacts(facts);
    expect(draft.version).toBe(DRAFT_VERSION);
    expect(draft.derived).toHaveLength(1);
    expect(draft.derived[0].fact).toEqual(step);
  });
});

describe("hydrateProofState", () => {
  it("with no draft, matches a fresh proof", () => {
    expect(hydrateProofState(puzzle)).toEqual(initProofState(puzzle));
    expect(hydrateProofState(puzzle, null)).toEqual(initProofState(puzzle));
  });

  it("with an empty draft, matches a fresh proof", () => {
    expect(hydrateProofState(puzzle, { version: 1, derived: [] })).toEqual(
      initProofState(puzzle),
    );
  });

  it("appends derived steps after givens with re-sequenced ids and nextId", () => {
    const draft: ProofDraft = {
      version: 1,
      // A stale id (99) should be re-sequenced to follow the givens.
      derived: [
        { id: 99, fact: step, source: "derived", rule: "r1", premises: [g1, g2] },
      ],
    };
    const state = hydrateProofState(puzzle, draft);

    expect(state.facts).toHaveLength(3);
    expect(state.facts.slice(0, 2).map((f) => f.source)).toEqual([
      "given",
      "given",
    ]);
    const derived = state.facts[2];
    expect(derived).toMatchObject({
      id: 2,
      source: "derived",
      rule: "r1",
      fact: step,
      premises: [g1, g2],
    });
    expect(state.nextId).toBe(3);
    expect(state.status).toBe("playing");
  });

  it("round-trips draftFromFacts -> hydrate", () => {
    const original = hydrateProofState(puzzle, {
      version: DRAFT_VERSION,
      derived: [{ id: 7, fact: step, source: "derived", rule: "r1" }],
    });
    const rebuilt = hydrateProofState(puzzle, draftFromFacts(original.facts));
    expect(rebuilt.facts).toEqual(original.facts);
    expect(rebuilt.nextId).toBe(original.nextId);
  });

  it("ignores a structurally invalid draft (falls back to fresh)", () => {
    const bad = {
      version: 1,
      derived: [{ id: 5, source: "derived" }],
    } as unknown as ProofDraft;
    expect(hydrateProofState(puzzle, bad)).toEqual(initProofState(puzzle));
  });

  it("recomputes 'solved' defensively when a step reaches the goal", () => {
    const draft: ProofDraft = {
      version: 1,
      derived: [{ id: 3, fact: goal, source: "derived", rule: "r" }],
    };
    expect(hydrateProofState(puzzle, draft).status).toBe("solved");
  });
});
