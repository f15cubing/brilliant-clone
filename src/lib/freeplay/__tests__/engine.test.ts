import { describe, expect, it } from "vitest";
import { FREEPLAY_PUZZLES } from "@/lib/freeplay/puzzles";
import { aval, canonicalKey, factLabel, rel } from "@/lib/freeplay/dsl";
import { factHolds, type Coords } from "@/lib/freeplay/check";
import { factHoldsL } from "@/lib/freeplay/lengths/dsl";
import { isGoal } from "@/lib/freeplay/proof";
import { verify } from "@/lib/freeplay/verify";
import { AngleAR } from "@/lib/freeplay/ar";
import { constForm, feq, formToExpr, fstr, parseForm } from "@/lib/freeplay/form";
import { applySubst, parseSwaps } from "@/lib/freeplay/symmetry";
import { rat } from "@/lib/freeplay/rational";
import { getPuzzle } from "@/lib/freeplay/puzzles";

describe("form parser", () => {
  const round = (s: string) => fstr(parseForm(s));
  it("parses half-angles and constants", () => {
    expect(round("A/2")).toBe("A/2");
    expect(round("A/2 + B/2")).toBe("A/2 + B/2");
    expect(round("180 - A/2 - B/2")).toBe("180 - A/2 - B/2");
  });
  it("normalizes equivalent expressions", () => {
    expect(round("B/2 + A/2")).toBe("A/2 + B/2");
    expect(round("A - A/2")).toBe("A/2");
    expect(round("(A + B)/2")).toBe("A/2 + B/2");
    expect(round("180 - (A + B)/2")).toBe("180 - A/2 - B/2");
  });
  it("rejects non-linear / malformed input", () => {
    expect(() => parseForm("A*B")).toThrow();
    expect(() => parseForm("A/")).toThrow();
    expect(() => parseForm("2 3")).toThrow();
    expect(() => parseForm("(A + B")).toThrow();
    expect(() => parseForm("@")).toThrow();
  });
});

describe("each puzzle is solvable by the engine along its reference proof", () => {
  for (const puzzle of FREEPLAY_PUZZLES) {
    it(`${puzzle.id}: every step accepts with the named rule, goal reached`, () => {
      const bindings = puzzle.variables ?? {};
      let established = [...puzzle.given];

      for (const step of puzzle.solution) {
        const result = verify({
          coords: puzzle.coords,
          bindings,
          establishedFacts: established,
          candidateFact: step.fact,
          citedPremises: step.premises,
        });
        expect(
          result.valid,
          `step "${factLabel(step.fact)}" should be valid, got ${JSON.stringify(result)}`,
        ).toBe(true);
        if (result.valid) {
          expect(result.rule, `rule name for "${factLabel(step.fact)}"`).toBe(step.rule);
        }
        established = [...established, step.fact];
      }

      if (puzzle.solutionReachesGoal !== false && puzzle.solution.length > 0) {
        const last = puzzle.solution[puzzle.solution.length - 1];
        expect(isGoal(puzzle, last.fact)).toBe(true);
      }
    });

    it(`${puzzle.id}: every reference fact actually holds in the figure`, () => {
      const bindings = puzzle.variables ?? {};
      for (const step of puzzle.solution) {
        expect(
          factHoldsL(step.fact, puzzle.coords, bindings),
          `${factLabel(step.fact)} must be numerically true`,
        ).toBe(true);
      }
      for (const g of puzzle.given) {
        expect(factHoldsL(g, puzzle.coords, bindings)).toBe(true);
      }
    });
  }
});

describe("rejections are categorized correctly", () => {
  const puzzle = getPuzzle("incenter-excenter")!;
  const bindings = puzzle.variables ?? {};
  const established = [...puzzle.given];

  it("false statement -> not_true", () => {
    const r = verify({
      coords: puzzle.coords,
      bindings,
      establishedFacts: established,
      candidateFact: rel("cong", ["A", "B", "A", "C"]), // scalene
      citedPremises: [rel("coll", ["A", "I", "L"])],
    });
    expect(r).toEqual({ valid: false, reason: "not_true" });
  });

  it("true but not entailed by cited facts -> unjustified", () => {
    const r = verify({
      coords: puzzle.coords,
      bindings,
      establishedFacts: established,
      candidateFact: rel("eqangle", ["I", "A", "B", "I", "A", "C"]), // both A/2, true
      citedPremises: [rel("coll", ["A", "I", "L"])],
    });
    expect(r).toEqual({ valid: false, reason: "unjustified" });
  });

  it("citing a non-established fact -> unknown_premise", () => {
    const r = verify({
      coords: puzzle.coords,
      bindings,
      establishedFacts: established,
      candidateFact: rel("eqangle", ["L", "A", "C", "L", "B", "C"]),
      citedPremises: [rel("cyclic", ["A", "B", "I", "L"])], // not given
    });
    expect(r).toEqual({ valid: false, reason: "unknown_premise" });
  });
});

describe("algebraic reasoning (AR) angle chasing", () => {
  // O at origin; OB and OC are opposite rays of the same horizontal line, so
  // ∠AOB and ∠AOC are supplementary (45° / 135°).
  const coords: Coords = {
    O: [0, 0],
    A: [1, 1],
    B: [-1, 0],
    C: [1, 0],
    F: [1, -1],
  };

  it("derives the supplement through a cited shared line direction", () => {
    const ar = new AngleAR(coords, {});
    ar.add(rel("coll", ["B", "O", "C"])); // OB, OC are the same line
    ar.add(aval(["A", "O", "C"], constForm(rat(45))));
    expect(ar.implies(aval(["A", "O", "B"], constForm(rat(135))))).toBe(true);
  });

  it("does NOT derive the supplement without the collinearity (rigor)", () => {
    const ar = new AngleAR(coords, {});
    ar.add(aval(["A", "O", "C"], constForm(rat(45))));
    // OB is an independent direction until coll(B,O,C) is cited.
    expect(ar.implies(aval(["A", "O", "B"], constForm(rat(135))))).toBe(false);
  });

  it("does not derive a value that isn't entailed (soundness)", () => {
    const ar = new AngleAR(coords, {});
    ar.add(rel("coll", ["B", "O", "C"]));
    ar.add(aval(["A", "O", "C"], constForm(rat(45))));
    expect(ar.implies(aval(["A", "O", "B"], constForm(rat(120))))).toBe(false);
  });

  it("verify() accepts an angle step citing the collinearity it uses", () => {
    const coll = rel("coll", ["B", "O", "C"]);
    const given = aval(["A", "O", "C"], constForm(rat(45)));
    const candidate = aval(["A", "O", "B"], constForm(rat(135)));
    const r = verify({
      coords,
      bindings: {},
      establishedFacts: [coll, given],
      candidateFact: candidate,
      citedPremises: [coll, given],
    });
    expect(r.valid).toBe(true);
  });

  it("turns two equal angle-values into an equal-angles fact", () => {
    // ∠AOC = 45° and ∠FOC = 45°  ⇒  ∠AOC = ∠FOC
    const ar = new AngleAR(coords, {});
    ar.add(aval(["A", "O", "C"], constForm(rat(45))));
    ar.add(aval(["F", "O", "C"], constForm(rat(45))));
    expect(ar.implies(rel("eqangle", ["A", "O", "C", "F", "O", "C"]))).toBe(true);
  });
});

describe("angle arithmetic between angles (angle tokens)", () => {
  const coords: Coords = {
    O: [0, 0],
    A: [1, 1],
    B: [-1, 0],
    C: [1, 0],
  };

  it("parses and renders angle(...) references", () => {
    expect(fstr(parseForm("180 - angle(A,O,C)"))).toBe("180 - \\angle AOC");
    expect(fstr(parseForm("angle(C,O,A)"))).toBe("\\angle AOC"); // arms unordered
    expect(fstr(parseForm("angle(A,O,C)/2 + 30"))).toBe("30 + \\angle AOC/2");
  });

  it("formToExpr emits parse syntax (angle(A,B,C)) that round-trips through parseForm", () => {
    // Machine serializer uses angle(...) calls, NOT fstr's \angle LaTeX, so it
    // re-parses cleanly (the bug: factToDescriptor used to emit \angle).
    expect(formToExpr(parseForm("180 - angle(A,O,C)"))).toBe("180 - angle(A,O,C)");
    expect(formToExpr(parseForm("angle(C,O,A)"))).toBe("angle(A,O,C)"); // arms unordered
    const e = formToExpr(parseForm("angle(A,O,C)/2 + 30"));
    expect(e).not.toContain("\\angle");
    expect(formToExpr(parseForm(e))).toBe(e); // idempotent round-trip
  });

  it("parseForm tolerates LaTeX/Unicode angle notation as a synonym for angle(...)", () => {
    // Exactly the AI-parser mismatch from the bug report: "180 - \\angle ABC".
    expect(feq(parseForm("180 - \\angle AOC"), parseForm("180 - angle(A,O,C)"))).toBe(true);
    expect(feq(parseForm("∠AOC"), parseForm("angle(A,O,C)"))).toBe(true);
    expect(feq(parseForm("\\angle A,O,C / 2"), parseForm("angle(A,O,C)/2"))).toBe(true);
  });

  it("splits a bare \\angle run by known multi-character labels (A2,B2,C)", () => {
    // IMO-style figures use labels like A2/B2/Q1; "\\angle A2B2C" must resolve to
    // angle(A2,B2,C), NOT angle(A,2,B,2,C). Without a label set, single-letter
    // expressions still work via the char-split fallback.
    const labels = ["A2", "B2", "C", "Q1"];
    expect(
      feq(parseForm("180 - \\angle A2B2C", labels), parseForm("180 - angle(A2,B2,C)")),
    ).toBe(true);
    // The comma form needs no label set (already unambiguous).
    expect(feq(parseForm("\\angle A2,B2,C"), parseForm("angle(A2,B2,C)"))).toBe(true);
  });

  it("numerically checks an angle-to-angle relation", () => {
    // ∠AOB = 135°, ∠AOC = 45°, so ∠AOB = 180 − ∠AOC holds
    expect(
      factHolds(aval(["A", "O", "B"], parseForm("180 - angle(A,O,C)")), coords, {}),
    ).toBe(true);
    expect(
      factHolds(aval(["A", "O", "B"], parseForm("angle(A,O,C)")), coords, {}),
    ).toBe(false);
  });

  it("verify() accepts ∠AOB = 180 − ∠AOC citing the collinearity", () => {
    const coll = rel("coll", ["B", "O", "C"]);
    const candidate = aval(["A", "O", "B"], parseForm("180 - angle(A,O,C)"));
    const r = verify({
      coords,
      bindings: {},
      establishedFacts: [coll],
      candidateFact: candidate,
      citedPremises: [coll],
    });
    expect(r).toEqual({ valid: true, rule: "algebraic angle-chase" });
  });
});

describe("parallel ⇒ equal angles (lesson 2)", () => {
  // AB ∥ CD (both horizontal), transversal AD
  const coords: Coords = {
    A: [0, 0],
    B: [4, 0],
    C: [0, 3],
    D: [4, 3],
  };

  it("derives alternate angles across a transversal", () => {
    const para = rel("para", ["A", "B", "C", "D"]);
    const r = verify({
      coords,
      bindings: {},
      establishedFacts: [para],
      candidateFact: rel("eqangle", ["B", "A", "D", "C", "D", "A"]),
      citedPremises: [para],
    });
    expect(r).toEqual({ valid: true, rule: "parallel lines: equal angles" });
  });
});

describe("converse of the inscribed angle", () => {
  // four points on a circle of radius 5 centred at the origin
  const coords: Coords = {
    P: [-4, 3],
    Q: [4, 3],
    X: [0, 5],
    Y: [3, 4],
  };

  it("equal subtended angles on the same side ⇒ concyclic", () => {
    const eq = rel("eqangle", ["P", "X", "Q", "P", "Y", "Q"]);
    const r = verify({
      coords,
      bindings: {},
      establishedFacts: [eq],
      candidateFact: rel("cyclic", ["P", "Q", "X", "Y"]),
      citedPremises: [eq],
    });
    expect(r).toEqual({ valid: true, rule: "converse of inscribed angle" });
  });

  it("does not fire when apexes are on opposite sides of the chord", () => {
    // Y' below the chord PQ (y = 3); ∠PY'Q would be the supplement, not equal
    const c2: Coords = { P: [-4, 3], Q: [4, 3], X: [0, 5], Y: [0, -5] };
    const eq = rel("eqangle", ["P", "X", "Q", "P", "Y", "Q"]);
    const r = verify({
      coords: c2,
      bindings: {},
      establishedFacts: [eq],
      candidateFact: rel("cyclic", ["P", "Q", "X", "Y"]),
      citedPremises: [eq],
    });
    // X=(0,5) and Y=(0,-5) are actually still concyclic with P,Q here, but the
    // premise ∠PXQ = ∠PY'Q is false, so the cited eqangle isn't even true.
    expect(r.valid).toBe(false);
  });

  it("supplementary angles on opposite sides ⇒ concyclic (cyclic quad)", () => {
    // X above, Y below chord PQ ⇒ ∠PXQ + ∠PYQ = 180
    const c2: Coords = { P: [-4, 3], Q: [4, 3], X: [0, 5], Y: [0, -5] };
    // learner asserts the angle arithmetic ∠PXQ = 180 − ∠PYQ
    const supp = aval(["P", "X", "Q"], parseForm("180 - angle(P, Y, Q)"));
    const r = verify({
      coords: c2,
      bindings: {},
      establishedFacts: [supp],
      candidateFact: rel("cyclic", ["P", "Q", "X", "Y"]),
      citedPremises: [supp],
    });
    expect(r).toEqual({ valid: true, rule: "converse of inscribed angle" });
  });
});

describe("same circle from two cyclics sharing 3 points", () => {
  // five points on the circle r = 5 centred at the origin
  const coords: Coords = {
    A2: [-5, 0],
    B2: [5, 0],
    C: [0, 5],
    Q1: [3, 4],
    P1: [-3, 4],
  };

  it("merges A2B2CQ1 and A2B2CP1 into A2B2Q1P1", () => {
    const c1 = rel("cyclic", ["A2", "B2", "C", "Q1"]);
    const c2 = rel("cyclic", ["B2", "A2", "C", "P1"]);
    const r = verify({
      coords,
      bindings: {},
      establishedFacts: [c1, c2],
      candidateFact: rel("cyclic", ["A2", "B2", "Q1", "P1"]),
      citedPremises: [c1, c2],
    });
    expect(r).toEqual({ valid: true, rule: "same circle (3 shared points)" });
  });

  it("rejects citing an unnecessary extra fact (anti-cheat)", () => {
    const c1 = rel("cyclic", ["A2", "B2", "C", "Q1"]);
    const c2 = rel("cyclic", ["B2", "A2", "C", "P1"]);
    const extra = rel("cyclic", ["A2", "C", "Q1", "P1"]); // true, but not needed
    const r = verify({
      coords,
      bindings: {},
      establishedFacts: [c1, c2, extra],
      candidateFact: rel("cyclic", ["A2", "B2", "Q1", "P1"]),
      citedPremises: [c1, c2, extra],
    });
    expect(r).toEqual({ valid: false, reason: "extraneous_premises" });
  });

  it("does not merge two circles that share only 2 points", () => {
    // circle1 (r=5, origin) through A2,B2,C,F; circle2 (centre (0,10)) through
    // A2,B2,D,E. They share only {A2,B2}, so C,F,D,E are NOT concyclic.
    const k = 10;
    const r2 = Math.sqrt(25 + k * k);
    const two: Coords = {
      A2: [-5, 0],
      B2: [5, 0],
      C: [0, 5],
      F: [3, 4],
      D: [0, k + r2],
      E: [0, k - r2],
    };
    const circle1 = rel("cyclic", ["A2", "B2", "C", "F"]);
    const circle2 = rel("cyclic", ["A2", "B2", "D", "E"]);
    const r = verify({
      coords: two,
      bindings: {},
      establishedFacts: [circle1, circle2],
      candidateFact: rel("cyclic", ["C", "F", "D", "E"]),
      citedPremises: [circle1, circle2],
    });
    expect(r.valid).toBe(false);
  });
});

describe("variadic collinearity (a whole line in one fact)", () => {
  // line y=0 holds B, O, C, D; apex A above it
  const coords: Coords = {
    A: [1, 1],
    B: [-1, 0],
    O: [0, 0],
    C: [1, 0],
    D: [2, 0],
  };

  it("factHolds checks every point on the line", () => {
    expect(factHolds(rel("coll", ["B", "O", "C", "D"]), coords, {})).toBe(true);
    expect(factHolds(rel("coll", ["B", "O", "C", "A"]), coords, {})).toBe(false);
  });

  it("labels all the points", () => {
    expect(factLabel(rel("coll", ["B", "O", "C", "D"]))).toBe(
      "$B, O, C, D$ are collinear",
    );
  });

  it("one 4-point coll powers a supplement angle-chase", () => {
    const line = rel("coll", ["B", "O", "C", "D"]);
    const given = aval(["A", "O", "B"], constForm(rat(135)));
    const r = verify({
      coords,
      bindings: {},
      establishedFacts: [line, given],
      candidateFact: aval(["A", "O", "C"], constForm(rat(45))),
      citedPremises: [line, given],
    });
    expect(r.valid).toBe(true);
  });
});

describe("by-symmetry / analogous arguments", () => {
  // Isosceles triangle: CA = CB, M the midpoint of AB. Base angles are 40°.
  const h = Math.tan((40 * Math.PI) / 180);
  const coords: Coords = { A: [-1, 0], B: [1, 0], C: [0, h], M: [0, 0] };
  const givens = [
    rel("midp", ["M", "A", "B"]),
    rel("cong", ["C", "A", "C", "B"]),
  ];
  const proven = aval(["C", "A", "B"], parseForm("40")); // ∠CAB = 40

  it("applySubst relabels points and angle tokens", () => {
    const f = aval(["P", "X", "Q"], parseForm("180 - angle(P, Y, Q)"));
    const s = parseSwaps("X-Y", new Set(["P", "Q", "X", "Y"]))!;
    expect(canonicalKey(applySubst(f, s))).toBe(
      canonicalKey(aval(["P", "Y", "Q"], parseForm("180 - angle(P, X, Q)"))),
    );
  });

  it("accepts the mirrored fact when the swap fixes the givens", () => {
    const subst = parseSwaps("A-B", new Set(Object.keys(coords)))!;
    const r = verify({
      coords,
      bindings: {},
      establishedFacts: [...givens, proven],
      candidateFact: applySubst(proven, subst), // ∠CBA = 40
      citedPremises: [proven],
      givens,
      analogy: { subst },
    });
    expect(r).toEqual({ valid: true, rule: "by symmetry (analogous argument)" });
  });

  it("rejects swaps that do NOT preserve the givens", () => {
    const subst = parseSwaps("A-C", new Set(Object.keys(coords)))!;
    const r = verify({
      coords,
      bindings: {},
      establishedFacts: [...givens, proven],
      candidateFact: applySubst(proven, subst),
      citedPremises: [proven],
      givens,
      analogy: { subst },
    });
    expect(r).toEqual({ valid: false, reason: "not_symmetry" });
  });
});

describe("canonical equality respects symmetry", () => {
  it("eqangle is order-insensitive", () => {
    expect(canonicalKey(rel("eqangle", ["I", "B", "L", "B", "I", "L"]))).toBe(
      canonicalKey(rel("eqangle", ["L", "B", "I", "L", "I", "B"])),
    );
  });
  it("cong segment/pair order insensitive", () => {
    expect(canonicalKey(rel("cong", ["L", "B", "L", "I"]))).toBe(
      canonicalKey(rel("cong", ["I", "L", "B", "L"])),
    );
  });
});
