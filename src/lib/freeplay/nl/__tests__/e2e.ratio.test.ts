/**
 * End-to-end for the RATIO (`eqratio`) extension: translate → map → the EXISTING
 * verify(), on shipped ratio puzzles, via the offline mock. Includes negatives
 * proving the (untrusted) AI cannot smuggle a FALSE or unjustified proportion
 * past verify() — the immovable invariant holds for ratios too.
 */
import { describe, expect, it } from "vitest";
import { eqratio } from "../../lengths/dsl";
import { getPuzzle } from "../../puzzles";
import type { LFact } from "../../lengths/dsl";
import type { Puzzle } from "../../types";
import { verify } from "../../verify";
import { descriptorToFact, factToDescriptor, matchPremises } from "../map";
import { LocalMockTranslator } from "../mock";
import type { TranslationResult, Translator } from "../types";

const pop = getPuzzle("jbmo-2010-g3-power-of-a-point")!;
const sas = getPuzzle("sas-similarity-converse")!;

/** translate → map → verify on a puzzle, with ESTABLISHED ratios flowing too. */
function runPipeline(translator: Translator, text: string, puzzle: Puzzle) {
  const points = Object.keys(puzzle.coords);
  const variables = Object.keys(puzzle.variables ?? {});
  // v2: no angle-only filter — the full LFact givens (incl. eqratio) are context.
  const established: LFact[] = puzzle.given;
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

describe("ratio e2e (positive, via the mock)", () => {
  it("power of a point: AD·AB = AE·AC from the concyclic + two secants", async () => {
    const result = await runPipeline(
      new LocalMockTranslator(),
      "AD·AB = AE·AC since B, C, D, E are concyclic and A, D, B are collinear " +
        "and A, E, C are collinear",
      pop,
    );
    expect(result).toEqual({ valid: true, rule: "power of a point" });
  });

  it("SAS similarity: BE/CD = AB/AD from the two-sides ratio + shared angle", async () => {
    const result = await runPipeline(
      new LocalMockTranslator(),
      "AB·CD = AD·BE since AB/AD = AE/AC and angle BAE = angle DAC",
      sas,
    );
    expect(result).toEqual({ valid: true, rule: "algebraic length-chase" });
  });
});

describe("ratio e2e (negatives — the AI cannot bypass verify())", () => {
  it("a FALSE proportion (wrong pairing) is rejected as not_true", async () => {
    // AD/AE = AB/AC is FALSE (the true relation is AD/AE = AC/AB).
    const stub = new StubTranslator({
      conclusion: { kind: "eqratio", points: ["A", "D", "A", "E", "A", "B", "A", "C"] },
      premises: [
        { kind: "rel", name: "cyclic", points: ["B", "C", "D", "E"] },
        { kind: "rel", name: "coll", points: ["A", "D", "B"] },
        { kind: "rel", name: "coll", points: ["A", "E", "C"] },
      ],
    });
    const result = await runPipeline(stub, "false ratio", pop);
    expect(result).toEqual({ valid: false, reason: "not_true" });
  });

  it("a TRUE proportion with NO cited premises is rejected as unjustified", async () => {
    const stub = new StubTranslator({
      conclusion: { kind: "eqratio", points: ["A", "D", "A", "E", "A", "C", "A", "B"] },
      premises: [],
    });
    const result = await runPipeline(stub, "trust me", pop);
    expect(result).toEqual({ valid: false, reason: "unjustified" });
  });

  it("the goal fact is genuinely the true proportion (sanity)", () => {
    expect(pop.goal).toEqual(eqratio("A", "D", "A", "E", "A", "C", "A", "B"));
  });
});
