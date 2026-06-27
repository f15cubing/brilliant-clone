/**
 * End-to-end: translate → map → the EXISTING verify(). Proves the NL path is a
 * thin proposer in front of the unchanged checker — including negatives showing
 * the (untrusted) AI cannot smuggle an unjustified or false step past verify().
 */
import { describe, expect, it } from "vitest";
import { verify } from "../../verify";
import { getPuzzle } from "../../puzzles";
import { rel, type Fact } from "../../dsl";
import type { Puzzle } from "../../types";
import { descriptorToFact, factToDescriptor, groundPremises, matchPremises } from "../map";
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

/**
 * Grounding (the real NLPanel flow): translate → GROUND against the learner's
 * text → map → verify. AI-invented premises (no `source` quote in the sentence)
 * are dropped before verify, so they no longer trip the minimality check — while
 * premises the learner actually wrote stay and are still held to minimality.
 */
describe("premise grounding drops AI padding before verify()", () => {
  const points = Object.keys(inscribed.coords);
  // Context = the real given (cyclic) plus a TRUE but EXTRANEOUS length fact:
  // the two radii OA, OB are equal. The inscribed-angle step needs only cyclic.
  const established: Fact[] = [
    rel("cyclic", ["A", "B", "P", "Q"]),
    rel("cong", ["O", "A", "O", "B"]),
  ];

  const groundedVerify = (tr: TranslationResult, text: string) => {
    const { kept } = groundPremises(tr.premises, text);
    return verify({
      coords: inscribed.coords,
      bindings: inscribed.variables ?? {},
      establishedFacts: established,
      candidateFact: descriptorToFact(tr.conclusion, points),
      citedPremises: matchPremises(kept, established, points),
    });
  };

  it("accepts the step once an UNGROUNDED extra premise is dropped", async () => {
    const text = "angle APB = angle AQB since A, B, P, Q are concyclic";
    // The AI pads with cong(O,A,O,B), which the learner never wrote (no source).
    const stub = new StubTranslator({
      conclusion: { kind: "rel", name: "eqangle", points: ["A", "P", "B", "A", "Q", "B"] },
      premises: [
        {
          kind: "rel",
          name: "cyclic",
          points: ["A", "B", "P", "Q"],
          source: "A, B, P, Q are concyclic",
        },
        { kind: "rel", name: "cong", points: ["O", "A", "O", "B"] },
      ],
    });
    expect(await groundedVerify(await stub.translate(), text)).toEqual({
      valid: true,
      rule: "inscribed angle (same arc)",
    });
  });

  it("still rejects an extraneous premise the learner DID write (grounded)", async () => {
    const text = "angle APB = angle AQB since A, B, P, Q are concyclic and OA = OB";
    const stub = new StubTranslator({
      conclusion: { kind: "rel", name: "eqangle", points: ["A", "P", "B", "A", "Q", "B"] },
      premises: [
        {
          kind: "rel",
          name: "cyclic",
          points: ["A", "B", "P", "Q"],
          source: "A, B, P, Q are concyclic",
        },
        { kind: "rel", name: "cong", points: ["O", "A", "O", "B"], source: "OA = OB" },
      ],
    });
    expect(await groundedVerify(await stub.translate(), text)).toEqual({
      valid: false,
      reason: "extraneous_premises",
    });
  });
});

/**
 * The faithful-completeness fix on a real multi-premise step: a Pappus citation
 * names two collinear lines + a parallel, and ALL THREE must reach verify() for
 * the step to be accepted. Exercises both translators end-to-end (translate ->
 * groundPremises -> matchPremises -> verify) on the shipped imo-2019-p2 figure.
 */
describe("multi-premise steps translate faithfully (no dropping)", () => {
  const imo = getPuzzle("imo-2019-p2")!;
  const points = Object.keys(imo.coords);
  const established = imo.given.filter((f): f is Fact => f.kind !== "eqratio");

  const runGrounded = async (translator: Translator, text: string) => {
    const tr = await translator.translate({
      text,
      puzzleId: imo.id,
      points,
      variables: Object.keys(imo.variables ?? {}),
      established: established.map(factToDescriptor),
    });
    const { kept } = groundPremises(tr.premises, text);
    return verify({
      coords: imo.coords,
      bindings: imo.variables ?? {},
      establishedFacts: established,
      candidateFact: descriptorToFact(tr.conclusion, points),
      citedPremises: matchPremises(kept, established, points),
    });
  };

  it("mock: an inline Pappus citation keeps all 3 premises and verifies", async () => {
    const text =
      "A2B2 is parallel to AB by infinite Pappus on APA1 and BQB1, and PQ parallel to AB";
    expect(await runGrounded(new LocalMockTranslator(), text)).toEqual({
      valid: true,
      rule: "Pappus's theorem",
    });
  });

  it("OpenAI-shaped: a faithful 3-premise response survives grounding + verifies", async () => {
    const text = "A2B2 ∥ AB by infinite Pappus on A,P,A1 and B,Q,B1, since PQ ∥ AB";
    const stub = new StubTranslator({
      conclusion: { kind: "rel", name: "para", points: ["A2", "B2", "A", "B"] },
      premises: [
        { kind: "rel", name: "coll", points: ["A", "P", "A1"], source: "A,P,A1" },
        { kind: "rel", name: "coll", points: ["B", "Q", "B1"], source: "B,Q,B1" },
        { kind: "rel", name: "para", points: ["P", "Q", "A", "B"], source: "PQ ∥ AB" },
      ],
    });
    expect(await runGrounded(stub, text)).toEqual({ valid: true, rule: "Pappus's theorem" });
  });

  it("no-drop: every grounded premise of an N-premise response is kept", async () => {
    const text = "A2B2 ∥ AB by infinite Pappus on A,P,A1 and B,Q,B1, since PQ ∥ AB";
    const stub = new StubTranslator({
      conclusion: { kind: "rel", name: "para", points: ["A2", "B2", "A", "B"] },
      premises: [
        { kind: "rel", name: "coll", points: ["A", "P", "A1"], source: "A,P,A1" },
        { kind: "rel", name: "coll", points: ["B", "Q", "B1"], source: "B,Q,B1" },
        { kind: "rel", name: "para", points: ["P", "Q", "A", "B"], source: "PQ ∥ AB" },
      ],
    });
    const { kept, dropped } = groundPremises((await stub.translate()).premises, text);
    expect(kept).toHaveLength(3);
    expect(dropped).toBe(0);
  });
});
