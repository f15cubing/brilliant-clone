import { describe, expect, it } from "vitest";
import { canonicalKey, rel, type Fact } from "@/lib/freeplay/dsl";
import { factHolds, type Coords } from "@/lib/freeplay/check";
import { sub, unit, type V } from "@/lib/freeplay/geom";
import { sampleRealizations } from "@/lib/freeplay/realize";
import { imo_shortlist_2024_g3 as puzzle } from "@/lib/freeplay/puzzles/imo_shortlist_2024_g3";
import { three_circle_radical_center } from "../three_circle_radical_center";
import { circleOf, equalPower } from "../_radical";
import { RULES, verifyWith } from "../../harness";

/**
 * Three-circle radical centre (research rule) — the radical-centre step of IMO
 * 2024 Shortlist G3.
 *
 * Circles ω_A=(D,E,K,P), ω_B=(C,D,Q,L), ω_C=(K,L,P,Q). Their pairwise radical
 * axes are KP, LQ, MD; given Z on KP and on MD, the rule concludes Z on LQ, i.e.
 * coll(L,Q,Z) — the puzzle goal.
 *
 * NOTE on the prerequisite ω_C = cyclic(K,L,P,Q): it is TRUE in every realization
 * but is a documented SECONDARY GAP — it reduces to the power-of-M length fact
 * ME·MK = MC·ML (equivalently KL ∥ AB), which the shipped engine cannot establish
 * from the puzzle's facts (the official proof needs the auxiliary tangent-
 * intersection point X and the radical axis of circles DEAM, BCDM). See the
 * "secondary gap" block below. We therefore SUPPLY cyclic(K,L,P,Q) as an
 * established premise to exercise THIS rule (it never reads the conclusion off
 * the figure without the three circles cited).
 */

const coords = puzzle.coords as Coords;

const cycDEKP = rel("cyclic", ["D", "E", "K", "P"]);
const cycCDQL = rel("cyclic", ["C", "D", "Q", "L"]);
const cycKLPQ = rel("cyclic", ["K", "L", "P", "Q"]); // ω_C — the secondary-gap circle
const collKPZ = rel("coll", ["K", "P", "Z"]);
const collMDZ = rel("coll", ["M", "D", "Z"]);

const premises: Fact[] = [cycDEKP, cycCDQL, cycKLPQ, collKPZ, collMDZ];
const goal = rel("coll", ["L", "Q", "Z"]);

const ctxOf = (c: Coords) => ({ coords: c, bindings: {}, points: Object.keys(c) });
const hasFact = (facts: Fact[], f: Fact) =>
  facts.some((g) => canonicalKey(g) === canonicalKey(f));

// circles from the canonical coordinates (for the equal-power faithfulness check)
const C = (id: string) => coords[id] as V;
const wA = circleOf(C("D"), C("E"), C("K"))!;
const wB = circleOf(C("C"), C("D"), C("Q"))!;
const wC = circleOf(C("K"), C("L"), C("P"))!;

describe("three-circle radical centre (research rule)", () => {
  it("sanity: the canonical figure is faithful (3 circles, 2 colls, goal; Z is the radical centre; a decoy is false)", () => {
    for (const f of premises) expect(factHolds(f, coords), canonicalKey(f)).toBe(true);
    expect(factHolds(goal, coords)).toBe(true);
    // Z has EQUAL POWER wrt all three circles (it IS the radical centre).
    expect(equalPower(C("Z"), wA, wB)).toBe(true);
    expect(equalPower(C("Z"), wA, wC)).toBe(true);
    expect(equalPower(C("Z"), wB, wC)).toBe(true);
    // M is equal-power wrt ω_A, ω_B (so line MD is genuinely rad(ω_A,ω_B)).
    expect(equalPower(C("M"), wA, wB)).toBe(true);
    // Decoy: K, Q, Z are NOT collinear (a generic non-conclusion).
    expect(factHolds(rel("coll", ["K", "Q", "Z"]), coords)).toBe(false);
  });

  it("the rule alone derives coll(L,Q,Z)", () => {
    const out = three_circle_radical_center.derive(premises, ctxOf(coords));
    expect(hasFact(out, goal)).toBe(true);
    for (const f of out) expect(factHolds(f, coords), canonicalKey(f)).toBe(true);
  });

  it("verifies in isolation citing exactly the 3 cyclic + 2 coll premises", () => {
    const r = verifyWith([...RULES, three_circle_radical_center], {
      coords,
      bindings: {},
      establishedFacts: premises,
      candidateFact: goal,
      citedPremises: premises,
    });
    expect(r).toEqual({ valid: true, rule: "three-circle radical centre" });
  });

  it("MINIMALITY: dropping any of the THREE cyclic circles ⇒ not valid", () => {
    for (const drop of [cycDEKP, cycCDQL, cycKLPQ]) {
      const cited = premises.filter((f) => f !== drop);
      const r = verifyWith([...RULES, three_circle_radical_center], {
        coords,
        bindings: {},
        establishedFacts: premises,
        candidateFact: goal,
        citedPremises: cited,
      });
      expect(r.valid, `dropped ${canonicalKey(drop)}`).toBe(false);
    }
  });

  it("MINIMALITY: dropping either anchoring coll (K,P,Z) / (M,D,Z) ⇒ not valid", () => {
    for (const drop of [collKPZ, collMDZ]) {
      const cited = premises.filter((f) => f !== drop);
      const r = verifyWith([...RULES, three_circle_radical_center], {
        coords,
        bindings: {},
        establishedFacts: premises,
        candidateFact: goal,
        citedPremises: cited,
      });
      expect(r.valid, `dropped ${canonicalKey(drop)}`).toBe(false);
    }
  });

  it("SOUNDNESS: perturbing Q off line EC makes cyclic(K,L,P,Q) and coll(L,Q,Z) false ⇒ not emitted", () => {
    // Nudge Q perpendicular to line EC: ω_C no longer carries Q and L,Q,Z are no
    // longer collinear, so the radical-centre configuration is destroyed.
    const dir = unit(sub(C("C"), C("E")))!;
    const perp: V = [-dir[1], dir[0]];
    const scale = 0.35;
    const Qbad: V = [C("Q")[0] + perp[0] * scale, C("Q")[1] + perp[1] * scale];
    const bad: Coords = { ...coords, Q: Qbad };

    expect(factHolds(cycKLPQ, bad)).toBe(false); // ω_C broken
    expect(factHolds(goal, bad)).toBe(false); // conclusion now false

    const out = three_circle_radical_center.derive(premises, ctxOf(bad));
    expect(hasFact(out, goal)).toBe(false);
    for (const f of out) expect(factHolds(f, bad), canonicalKey(f)).toBe(true); // never a false coll
  });

  it("SOUNDNESS: three circles whose MD-axis point M is NOT equal-power ⇒ not emitted", () => {
    // Replace M by a generic point off the radical axis MD: line "M'D" is no
    // longer rad(ω_A,ω_B), so the MD-axis guard rejects the configuration.
    const Mbad: V = [C("M")[0] + 0.4, C("M")[1] + 0.3];
    const bad: Coords = { ...coords, M: Mbad };
    expect(equalPower(Mbad, wA, wB)).toBe(false);
    const out = three_circle_radical_center.derive(premises, ctxOf(bad));
    // Z is still numerically the radical centre, but the cited MD axis is bogus,
    // so the rule must not fire from coll(M',D,Z).
    expect(hasFact(out, goal)).toBe(false);
  });

  it("PROMOTED: the shipped engine now derives coll(L,Q,Z) when all three circles are cited", () => {
    const r = verifyWith(RULES, {
      coords,
      bindings: {},
      establishedFacts: premises,
      candidateFact: goal,
      citedPremises: premises,
    });
    // three_circle_radical_center is promoted into the shipped engine, so RULES
    // proves the radical-centre step directly now (promotion regression guard).
    expect(r.valid).toBe(true);
  });

  describe("SECONDARY GAP: the prerequisite cyclic(K,L,P,Q) is NOT shipped-derivable", () => {
    // The part-(a) established chain the puzzle already proves.
    const partA: Fact[] = [
      rel("midp", ["M", "A", "B"]),
      rel("cyclic", ["A", "M", "E", "D"]),
      rel("cyclic", ["B", "M", "C", "D"]),
      rel("eqangle", ["A", "M", "E", "M", "C", "E"]),
      rel("eqangle", ["B", "M", "C", "M", "E", "C"]),
      rel("coll", ["E", "C", "P"]),
      rel("coll", ["E", "C", "Q"]),
      rel("coll", ["A", "K", "D"]),
      rel("coll", ["M", "K", "E"]),
      rel("coll", ["B", "L", "D"]),
      rel("coll", ["M", "L", "C"]),
      cycDEKP,
      cycCDQL,
      rel("para", ["K", "P", "M", "C"]),
      rel("para", ["L", "Q", "M", "E"]),
    ];

    it("cyclic(K,L,P,Q) is true but the shipped engine cannot derive it from the part-(a) facts", () => {
      expect(factHolds(cycKLPQ, coords)).toBe(true);
      const r = verifyWith(RULES, {
        coords,
        bindings: {},
        establishedFacts: partA,
        candidateFact: cycKLPQ,
        citedPremises: partA,
      });
      // It reduces to the power-of-M fact ME·MK = MC·ML (equivalently KL ∥ AB /
      // C,E,K,L concyclic), which the angle layer cannot reach (line KL is
      // unconstrained) and the length layer cannot establish (the power of M
      // needs the auxiliary tangent-intersection X and the radical axis of
      // circles DEAM, BCDM — auxiliary constructions beyond the shipped engine).
      expect(r.valid).toBe(false);
      // Equivalent witnesses of the same secondary gap, also unreachable:
      expect(
        verifyWith(RULES, {
          coords,
          bindings: {},
          establishedFacts: partA,
          candidateFact: rel("para", ["K", "L", "A", "B"]),
          citedPremises: partA,
        }).valid,
      ).toBe(false);
      expect(
        verifyWith(RULES, {
          coords,
          bindings: {},
          establishedFacts: partA,
          candidateFact: rel("cyclic", ["C", "E", "K", "L"]),
          citedPremises: partA,
        }).valid,
      ).toBe(false);
    });
  });

  describe("CLOSURE: the radical-centre step coll(L,Q,Z) closes across realizations (given the three circles)", () => {
    const realizations = sampleRealizations(puzzle, 6, 0xc0ffee);
    const rulesWith = [...RULES, three_circle_radical_center];

    it("samples several independent generic realizations", () => {
      expect(realizations.length).toBeGreaterThan(1);
    });

    it("all five premises and the goal hold in every realization", () => {
      for (const r of realizations) {
        for (const f of premises) expect(factHolds(f, r.coords, r.bindings ?? {}), canonicalKey(f)).toBe(true);
        expect(factHolds(goal, r.coords, r.bindings ?? {})).toBe(true);
      }
    });

    it("coll(L,Q,Z) verifies via the rule in EVERY realization (now in the shipped engine)", () => {
      for (const r of realizations) {
        const withRule = verifyWith(rulesWith, {
          coords: r.coords,
          bindings: r.bindings ?? {},
          establishedFacts: premises,
          candidateFact: goal,
          citedPremises: premises,
        });
        expect(withRule).toEqual({ valid: true, rule: "three-circle radical centre" });

        // Promoted: the shipped RULES derive it directly too.
        const shipped = verifyWith(RULES, {
          coords: r.coords,
          bindings: r.bindings ?? {},
          establishedFacts: premises,
          candidateFact: goal,
          citedPremises: premises,
        });
        expect(shipped.valid).toBe(true);
      }
    });
  });
});
