import { describe, expect, it } from "vitest";
import { canonicalKey, rel, type Fact } from "@/lib/freeplay/dsl";
import { factHolds, type Coords } from "@/lib/freeplay/check";
import { sub, unit, type V } from "@/lib/freeplay/geom";
import { sampleRealizations } from "@/lib/freeplay/realize";
import { verify } from "@/lib/freeplay/verify";
import { imo_shortlist_2024_g3 as puzzle } from "@/lib/freeplay/puzzles/imo_shortlist_2024_g3";
import { three_circle_radical_center } from "../rules/three_circle_radical_center";
import { circleOf, equalPower } from "../rules/_radical";

/**
 * Three-circle radical centre (promoted from research/freeplay-rules) — the
 * radical-centre step of IMO 2024 Shortlist G3.
 *
 * NOTE: the end-to-end `verify()` block at the bottom only passes once the
 * orchestrator has registered this rule in `src/lib/freeplay/rules/index.ts`
 * (`PROMOTED_RULES`). The `derive`-level checks (isolation, minimality,
 * soundness) and the secondary-gap assertions are registration-independent and
 * pass immediately.
 *
 * The third circle ω_C = cyclic(K,L,P,Q) is a documented SECONDARY GAP — it
 * reduces to the power-of-M fact ME·MK = MC·ML (equivalently KL ∥ AB), which the
 * shipped engine cannot establish (the official proof needs the auxiliary
 * tangent-intersection X and the radical axis of circles DEAM, BCDM). It is
 * SUPPLIED here as an established premise to exercise this rule.
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

const C = (id: string) => coords[id] as V;
const wA = circleOf(C("D"), C("E"), C("K"))!;
const wB = circleOf(C("C"), C("D"), C("Q"))!;
const wC = circleOf(C("K"), C("L"), C("P"))!;

describe("three-circle radical centre (promoted rule)", () => {
  it("GIVENS: the three circles, two colls and the goal are realized; Z is the radical centre; a decoy is false", () => {
    for (const f of premises) expect(factHolds(f, coords), canonicalKey(f)).toBe(true);
    expect(factHolds(goal, coords)).toBe(true);
    expect(equalPower(C("Z"), wA, wB)).toBe(true);
    expect(equalPower(C("Z"), wA, wC)).toBe(true);
    expect(equalPower(C("Z"), wB, wC)).toBe(true);
    expect(equalPower(C("M"), wA, wB)).toBe(true);
    expect(factHolds(rel("coll", ["K", "Q", "Z"]), coords)).toBe(false); // decoy
  });

  it("DERIVE: emits coll(L,Q,Z) from the three circles + two colls", () => {
    const out = three_circle_radical_center.derive(premises, ctxOf(coords));
    expect(hasFact(out, goal)).toBe(true);
    for (const f of out) expect(factHolds(f, coords), canonicalKey(f)).toBe(true);
  });

  it("MINIMALITY (derive): dropping any of the THREE circles ⇒ not emitted", () => {
    for (const drop of [cycDEKP, cycCDQL, cycKLPQ]) {
      const cited = premises.filter((f) => f !== drop);
      const out = three_circle_radical_center.derive(cited, ctxOf(coords));
      expect(hasFact(out, goal), `dropped ${canonicalKey(drop)}`).toBe(false);
    }
  });

  it("MINIMALITY (derive): dropping either anchoring coll (K,P,Z)/(M,D,Z) ⇒ not emitted", () => {
    for (const drop of [collKPZ, collMDZ]) {
      const cited = premises.filter((f) => f !== drop);
      const out = three_circle_radical_center.derive(cited, ctxOf(coords));
      expect(hasFact(out, goal), `dropped ${canonicalKey(drop)}`).toBe(false);
    }
  });

  it("SOUNDNESS: perturbing Q off line EC ⇒ coll(L,Q,Z) false and never emitted", () => {
    const dir = unit(sub(C("C"), C("E")))!;
    const perp: V = [-dir[1], dir[0]];
    const Qbad: V = [C("Q")[0] + perp[0] * 0.35, C("Q")[1] + perp[1] * 0.35];
    const bad: Coords = { ...coords, Q: Qbad };
    expect(factHolds(cycKLPQ, bad)).toBe(false);
    expect(factHolds(goal, bad)).toBe(false);
    const out = three_circle_radical_center.derive(premises, ctxOf(bad));
    expect(hasFact(out, goal)).toBe(false);
    for (const f of out) expect(factHolds(f, bad), canonicalKey(f)).toBe(true);
  });

  it("SOUNDNESS: perturbing M off the radical axis MD ⇒ never emitted", () => {
    const Mbad: V = [C("M")[0] + 0.4, C("M")[1] + 0.3];
    const bad: Coords = { ...coords, M: Mbad };
    expect(equalPower(Mbad, wA, wB)).toBe(false);
    const out = three_circle_radical_center.derive(premises, ctxOf(bad));
    expect(hasFact(out, goal)).toBe(false);
  });

  describe("SECONDARY GAP: the prerequisite cyclic(K,L,P,Q) is NOT shipped-derivable", () => {
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

    it("cyclic(K,L,P,Q) (and KL∥AB, C,E,K,L concyclic) are true but unreachable by the shipped engine", () => {
      expect(factHolds(cycKLPQ, coords)).toBe(true);
      for (const cand of [
        cycKLPQ,
        rel("para", ["K", "L", "A", "B"]),
        rel("cyclic", ["C", "E", "K", "L"]),
      ]) {
        const r = verify({
          coords,
          bindings: {},
          establishedFacts: partA,
          candidateFact: cand,
          citedPremises: partA,
        });
        expect(r.valid, canonicalKey(cand)).toBe(false);
      }
    });
  });

  // ---- Registration regression guard (green once added to PROMOTED_RULES) ----
  describe("end-to-end via shipped verify() [requires registration in PROMOTED_RULES]", () => {
    const realizations = sampleRealizations(puzzle, 6, 0xc0ffee);

    it("verify() proves coll(L,Q,Z) via this rule across realizations (given the three circles)", () => {
      const res = verify({
        coords,
        bindings: {},
        establishedFacts: premises,
        candidateFact: goal,
        citedPremises: premises,
        realizations,
      });
      expect(res).toEqual({ valid: true, rule: "three-circle radical centre" });
    });
  });
});
