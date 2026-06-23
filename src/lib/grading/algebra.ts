import { evaluate } from "mathjs";

/**
 * Convert the LaTeX that MathLive emits into a string math.js can parse.
 * Scoped to the kinds of answers this course needs (linear expressions,
 * simple fractions, powers) rather than being a general LaTeX parser.
 */
export function latexToMathExpr(latex: string): string {
  let s = latex;
  // Strip sizing wrappers and spacing macros.
  s = s.replace(/\\left|\\right/g, "");
  s = s.replace(/\\![,;:]?|\\,|\\;|\\:|\\quad|\\qquad/g, "");
  // Fractions: \frac{A}{B} -> ((A)/(B)). Repeat for the (rare) stacked case.
  const frac = /\\d?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/;
  while (frac.test(s)) s = s.replace(frac, "(($1)/($2))");
  // Operators and symbols.
  s = s.replace(/\\cdot|\\times/g, "*");
  s = s.replace(/\\div/g, "/");
  s = s.replace(/\\pi/g, "pi");
  // Degrees are dimensionless here.
  s = s.replace(/\^\\circ|\\circ|\\degree|°/g, "");
  // Exponents: ^{...} -> ^(...)
  s = s.replace(/\^\{([^{}]*)\}/g, "^($1)");
  // Remaining braces become grouping parens.
  s = s.replace(/[{}]/g, (m) => (m === "{" ? "(" : ")"));
  // Any leftover backslash-commands we don't handle: drop the backslash.
  s = s.replace(/\\/g, "");
  s = s.replace(/\s+/g, "");
  return s;
}

function randomScope(vars: string[]): Record<string, number> {
  const scope: Record<string, number> = {};
  for (const v of vars) scope[v] = 10 + Math.random() * 70;
  return scope;
}

/**
 * Returns true when `userLatex` is symbolically equivalent to `correctExpr`
 * (a math.js-syntax string). Equivalence is decided by evaluating both at
 * several random assignments of the free variables.
 */
export function isAlgebraicallyEquivalent(
  userLatex: string,
  correctExpr: string,
  variables: string[],
): boolean {
  const userExpr = latexToMathExpr(userLatex).trim();
  if (!userExpr) return false;

  const trials = variables.length === 0 ? 1 : 10;
  for (let i = 0; i < trials; i++) {
    const scope = randomScope(variables);
    let a: unknown;
    let b: unknown;
    try {
      a = evaluate(userExpr, { ...scope });
      b = evaluate(correctExpr, { ...scope });
    } catch {
      return false;
    }
    if (typeof a !== "number" || typeof b !== "number") return false;
    if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
    const tol = 1e-6 * Math.max(1, Math.abs(b));
    if (Math.abs(a - b) > tol) return false;
  }
  return true;
}
