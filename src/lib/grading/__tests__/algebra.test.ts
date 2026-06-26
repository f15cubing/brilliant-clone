import { describe, expect, it } from "vitest";
import { isAlgebraicallyEquivalent, latexToMathExpr } from "@/lib/grading/algebra";

describe("latexToMathExpr", () => {
  it("strips sizing/spacing wrappers", () => {
    expect(latexToMathExpr("\\left(x+1\\right)")).toBe("(x+1)");
    expect(latexToMathExpr("x\\,+\\;y")).toBe("x+y");
  });

  it("converts fractions to parenthesized division", () => {
    expect(latexToMathExpr("\\frac{a}{b}")).toBe("((a)/(b))");
    expect(latexToMathExpr("\\dfrac{1}{2}")).toBe("((1)/(2))");
  });

  it("converts operators and symbols", () => {
    expect(latexToMathExpr("3\\cdot x")).toBe("3*x");
    expect(latexToMathExpr("a\\times b")).toBe("a*b");
    expect(latexToMathExpr("a\\div b")).toBe("a/b");
    expect(latexToMathExpr("2\\pi")).toBe("2pi");
  });

  it("drops degree decorations (dimensionless here)", () => {
    expect(latexToMathExpr("90^\\circ")).toBe("90");
    expect(latexToMathExpr("x\\degree")).toBe("x");
    expect(latexToMathExpr("45°")).toBe("45");
  });

  it("rewrites braced exponents and leftover braces", () => {
    expect(latexToMathExpr("x^{2}")).toBe("x^(2)");
    expect(latexToMathExpr("{x+1}")).toBe("(x+1)");
  });

  it("drops unknown backslash-commands rather than throwing", () => {
    expect(() => latexToMathExpr("\\unknown x")).not.toThrow();
    expect(latexToMathExpr("\\unknown x")).toBe("unknownx");
  });
});

describe("isAlgebraicallyEquivalent", () => {
  it("grades equivalent linear expressions equal", () => {
    expect(isAlgebraicallyEquivalent("x+x", "2x", ["x"])).toBe(true);
    expect(isAlgebraicallyEquivalent("2x", "x+x", ["x"])).toBe(true);
  });

  it("grades equivalent fractions equal", () => {
    expect(isAlgebraicallyEquivalent("\\frac{x}{2}", "x/2", ["x"])).toBe(true);
    expect(isAlgebraicallyEquivalent("\\frac{x}{2}", "0.5*x", ["x"])).toBe(true);
  });

  it("grades equivalent powers equal", () => {
    expect(isAlgebraicallyEquivalent("x^{2}", "x^2", ["x"])).toBe(true);
    expect(isAlgebraicallyEquivalent("x^{2}", "x*x", ["x"])).toBe(true);
  });

  it("grades multi-variable expressions equal", () => {
    expect(
      isAlgebraicallyEquivalent("a+b+a", "2a+b", ["a", "b"]),
    ).toBe(true);
  });

  it("treats degree decorations as dimensionless constants", () => {
    expect(isAlgebraicallyEquivalent("90^\\circ", "90", [])).toBe(true);
    expect(isAlgebraicallyEquivalent("180-x", "180-x", ["x"])).toBe(true);
  });

  it("grades non-equivalent expressions unequal", () => {
    expect(isAlgebraicallyEquivalent("x+1", "x+2", ["x"])).toBe(false);
    expect(isAlgebraicallyEquivalent("2x", "3x", ["x"])).toBe(false);
    expect(isAlgebraicallyEquivalent("x^{2}", "x", ["x"])).toBe(false);
  });

  it("returns false for empty / blank input", () => {
    expect(isAlgebraicallyEquivalent("", "x", ["x"])).toBe(false);
    expect(isAlgebraicallyEquivalent("   ", "x", ["x"])).toBe(false);
  });

  it("handles malformed input safely (no throw, returns false)", () => {
    expect(() => isAlgebraicallyEquivalent("@#$", "x", ["x"])).not.toThrow();
    expect(isAlgebraicallyEquivalent("@#$", "x", ["x"])).toBe(false);
    expect(isAlgebraicallyEquivalent("(x+", "x", ["x"])).toBe(false);
  });

  it("rejects non-finite results", () => {
    expect(isAlgebraicallyEquivalent("1/0", "1", [])).toBe(false);
  });

  it("rejects non-numeric (boolean) results", () => {
    expect(isAlgebraicallyEquivalent("x>2", "x", ["x"])).toBe(false);
  });
});
