/**
 * `groundPremises`: drop premises the learner never actually wrote. A premise is
 * kept only when its `source` is a (normalization-tolerant) quote from the
 * sentence — so AI-invented premises are removed BEFORE verify(), while premises
 * the learner really wrote survive and stay subject to the minimality check.
 */
import { describe, expect, it } from "vitest";
import { groundPremises } from "../map";
import type { FactDescriptor } from "../types";

const cyclic = (source?: string): FactDescriptor => ({
  kind: "rel",
  name: "cyclic",
  points: ["A", "B", "P", "Q"],
  source,
});
const coll = (source?: string): FactDescriptor => ({
  kind: "rel",
  name: "coll",
  points: ["P", "A", "B"],
  source,
});

describe("groundPremises", () => {
  const text = "angle APB = angle AQB since A, B, P, Q are concyclic";

  it("keeps a premise whose source is a quote from the sentence", () => {
    const { kept, dropped } = groundPremises([cyclic("A, B, P, Q are concyclic")], text);
    expect(kept).toHaveLength(1);
    expect(dropped).toBe(0);
  });

  it("is tolerant of case, spacing, and punctuation in the quote", () => {
    const { kept } = groundPremises([cyclic("a b p q  ARE concyclic!!!")], text);
    expect(kept).toHaveLength(1);
  });

  it("drops a premise the learner never wrote (foreign source)", () => {
    const { kept, dropped } = groundPremises([coll("P, A, B are collinear")], text);
    expect(kept).toHaveLength(0);
    expect(dropped).toBe(1);
  });

  it("drops a premise with a missing source", () => {
    expect(groundPremises([cyclic(undefined)], text).kept).toHaveLength(0);
  });

  it("drops an empty or too-short source (even if it technically appears)", () => {
    expect(groundPremises([cyclic("")], text).kept).toHaveLength(0);
    // "ab" occurs in the normalized text ("...abpq...") but is below the min length.
    expect(groundPremises([cyclic("ab")], text).kept).toHaveLength(0);
  });

  it("normalizes operator glyphs so a ratio quote still matches", () => {
    const t = "PA·PB = PC·PD since the chords meet at P";
    const ratio: FactDescriptor = {
      kind: "eqratio",
      points: ["P", "A", "P", "C", "P", "D", "P", "B"],
      source: "PA·PB = PC·PD",
    };
    expect(groundPremises([ratio], t).kept).toHaveLength(1);
  });

  it("rejects a source that is (nearly) the whole sentence (echo bypass)", () => {
    const t = "a".repeat(40);
    expect(groundPremises([coll("a".repeat(40))], t).kept).toHaveLength(0); // exact echo
    expect(groundPremises([coll("a".repeat(38))], t).kept).toHaveLength(0); // ~95%
    expect(groundPremises([coll("a".repeat(10))], t).kept).toHaveLength(1); // a real span
  });

  it("keeps grounded and drops ungrounded in a mixed list, counting drops", () => {
    const { kept, dropped } = groundPremises(
      [cyclic("A, B, P, Q are concyclic"), coll("P, A, B are collinear")],
      text,
    );
    expect(kept).toHaveLength(1);
    expect(dropped).toBe(1);
    expect(kept[0]).toEqual(cyclic("A, B, P, Q are concyclic"));
  });
});
