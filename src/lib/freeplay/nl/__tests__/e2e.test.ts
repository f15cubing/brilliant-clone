/**
 * End-to-end: translate → map → the EXISTING verify(). Proves the NL path is a
 * thin proposer in front of the unchanged checker — including negatives showing
 * the (untrusted) AI cannot smuggle an unjustified or false step past verify().
 */
import { describe, expect, it } from "vitest";
import { verify } from "../../verify";
import { getPuzzle } from "../../puzzles";
import type { Fact } from "../../dsl";
import type { Puzzle } from "../../types";
import { descriptorToFact, factToDescriptor, matchPremises } from "../map";
import { LocalMockTranslator } from "../mock";
import type { TranslationResult, Translator } from "../types";

const inscribed = getPuzzle("inscribed-angle")!;

function runPipeline(translator: Translator, text: string, puzzle: Puzzle) {
  const points = Object.keys(puzzle.coords);
  const variables = Object.keys(puzzle.variables ?? {});
  // The NL path is angle/incidence-only; narrow the puzzle's `LFact[]` givens.
  const established = puzzle.given.filter((f): f is Fact => f.kind !== "eqratio");
  return translator
    .translate({
      text,
      puzzleId: puzzle.id,
      points,
      variables,
      established: established.map(factToDescriptor),
    })
    .then((tr) => {
      const candidateFact = descriptorToFact(tr.conclusion, points);
      const citedPremises = matchPremises(tr.premises, established, points);
      return verify({
        coords: puzzle.coords,
        bindings: puzzle.variables ?? {},
        establishedFacts: established,
        candidateFact,
        citedPremises,
      });
    });
}

/** A translator that returns whatever it's told — stands in for a hostile AI. */
class StubTranslator implements Translator {
  readonly id = "mock" as const;
  constructor(private readonly out: TranslationResult) {}
  async translate(): Promise<TranslationResult> {
    return this.out;
  }
}

describe("translate(mock) → map → verify() (positive)", () => {
  it("accepts the inscribed-angle step from a natural sentence", async () => {
    const result = await runPipeline(
      new LocalMockTranslator(),
      "angle APB = angle AQB since A, B, P, Q are concyclic",
      inscribed,
    );
    expect(result).toEqual({ valid: true, rule: "inscribed angle (same arc)" });
  });
});

describe("the AI cannot bypass verify() (negatives)", () => {
  it("a true conclusion with NO cited premises is rejected as unjustified", async () => {
    // The goal fact is true, but the hostile translator cites nothing.
    const stub = new StubTranslator({
      conclusion: { kind: "rel", name: "eqangle", points: ["A", "P", "B", "A", "Q", "B"] },
      premises: [],
    });
    const result = await runPipeline(stub, "trust me", inscribed);
    expect(result).toEqual({ valid: false, reason: "unjustified" });
  });

  it("a FALSE conclusion is rejected as not_true even if 'cited'", async () => {
    const stub = new StubTranslator({
      // P, Q, A collinear is false in this circle figure.
      conclusion: { kind: "rel", name: "coll", points: ["P", "Q", "A"] },
      premises: [{ kind: "rel", name: "cyclic", points: ["A", "B", "P", "Q"] }],
    });
    const result = await runPipeline(stub, "lie", inscribed);
    expect(result).toEqual({ valid: false, reason: "not_true" });
  });

  it("citing a non-established premise is rejected as unknown_premise", async () => {
    const stub = new StubTranslator({
      conclusion: { kind: "rel", name: "eqangle", points: ["A", "P", "B", "A", "Q", "B"] },
      premises: [{ kind: "rel", name: "cyclic", points: ["A", "B", "P", "O"] }],
    });
    const result = await runPipeline(stub, "wrong premise", inscribed);
    expect(result).toEqual({ valid: false, reason: "unknown_premise" });
  });
});
