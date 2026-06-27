/**
 * `resolveFactRefs`: pull "by fact N" citations out of a learner's NL step and
 * return the numbered (1-based) positions plus the claim text with the citations
 * stripped. The hard rule: a bare number (an angle/length expression like
 * "180 - x") must NEVER be read as a fact reference — only a `fact`/`facts`
 * keyword or a `#` introduces one.
 */
import { describe, expect, it } from "vitest";
import { resolveFactRefs } from "../factrefs";

describe("resolveFactRefs", () => {
  it("resolves a single 'fact 3'", () => {
    const r = resolveFactRefs("∠ADE = ∠ACB fact 3", 7);
    expect(r.numbers).toEqual([3]);
    expect(r.outOfRange).toEqual([]);
  });

  it("resolves 'by fact 3'", () => {
    expect(resolveFactRefs("∠ADE = ∠ACB by fact 3", 7).numbers).toEqual([3]);
  });

  it("resolves 'fact #3' and bare '#3'", () => {
    expect(resolveFactRefs("∠ADE = ∠ACB by fact #3", 7).numbers).toEqual([3]);
    expect(resolveFactRefs("∠ADE = ∠ACB #3", 7).numbers).toEqual([3]);
  });

  it("resolves a comma+and list 'facts 3, 5 and 7'", () => {
    const r = resolveFactRefs("∠ADE = ∠ACB by facts 3, 5 and 7", 7);
    expect(r.numbers).toEqual([3, 5, 7]);
    expect(r.cleanedText).toBe("∠ADE = ∠ACB");
  });

  it("resolves an 'and' list 'fact 3 and 4'", () => {
    expect(resolveFactRefs("X = Y by fact 3 and 4", 7).numbers).toEqual([3, 4]);
  });

  it("is case-insensitive ('Fact 3')", () => {
    expect(resolveFactRefs("X = Y by Fact 3", 7).numbers).toEqual([3]);
  });

  it("sorts and de-dupes referenced numbers", () => {
    expect(resolveFactRefs("X = Y by facts 5, 3 and 3", 7).numbers).toEqual([3, 5]);
  });

  it("routes a position outside 1..factCount to outOfRange", () => {
    const r = resolveFactRefs("X = Y by fact 18", 7);
    expect(r.numbers).toEqual([]);
    expect(r.outOfRange).toEqual([18]);
  });

  it("treats 0 / #0 as out of range (positions are 1-based)", () => {
    expect(resolveFactRefs("X = Y by fact 0", 7).outOfRange).toEqual([0]);
    expect(resolveFactRefs("X = Y #0", 7).outOfRange).toEqual([0]);
  });

  it("NEVER treats a bare number as a reference", () => {
    const r = resolveFactRefs("angle ADE = 180 - angle ACB", 5);
    expect(r.numbers).toEqual([]);
    expect(r.outOfRange).toEqual([]);
    expect(r.cleanedText).toBe("angle ADE = 180 - angle ACB");
  });

  it("ignores numbers in expressions like '= 90' or 'A/2 + B/2'", () => {
    expect(resolveFactRefs("∠ABC = 90", 7).numbers).toEqual([]);
    expect(resolveFactRefs("∠ABC = A/2 + B/2", 7).numbers).toEqual([]);
  });

  it("strips the citation phrase from cleanedText", () => {
    expect(resolveFactRefs("∠ADE = ∠ACB by fact 3", 7).cleanedText).toBe(
      "∠ADE = ∠ACB",
    );
  });

  it("keeps the non-citation clause in a mixed sentence", () => {
    const r = resolveFactRefs("∠ADE=∠ACB by fact 1 and since A,D,B collinear", 7);
    expect(r.numbers).toEqual([1]);
    expect(r.cleanedText).toContain("since A,D,B collinear");
    expect(r.cleanedText).not.toContain("fact 1");
  });

  it("returns empty cleanedText when only fact numbers were written", () => {
    expect(resolveFactRefs("fact 3", 7).cleanedText).toBe("");
    expect(resolveFactRefs("facts 1 and 2", 7).cleanedText).toBe("");
    expect(resolveFactRefs("by fact 3", 7).cleanedText).toBe("");
  });
});
