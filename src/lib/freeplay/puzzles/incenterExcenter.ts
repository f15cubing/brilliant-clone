import { COLORS, polygon, segment } from "@/lib/content/boards";
import type { BoardElementDef } from "@/lib/geometry/board-types";
import { aval, rel } from "@/lib/freeplay/dsl";
import { parseForm } from "@/lib/freeplay/form";
import type { Puzzle } from "@/lib/freeplay/types";
import { buildIncenterConfig } from "./incenterExcenterConfig";

const { coords } = buildIncenterConfig();
const F = (s: string) => parseForm(s);

const circumcircle: BoardElementDef = {
  type: "circumcircle",
  parents: [{ ref: "A" }, { ref: "B" }, { ref: "C" }],
  attributes: {
    strokeColor: COLORS.ACCENT,
    strokeWidth: 1.5,
    dash: 2,
    point: { visible: false },
  },
};

/**
 * Challenge: a multi-step angle chase from the Incenter–Excenter Lemma (Lesson
 * 5). Goal: LI = LB, where I is the incenter and L the second meeting of ray AI
 * with the circumcircle. Uses angle-value facts (∠ = A/2, 180 − A/2 − B/2, …).
 */
export const incenterExcenter: Puzzle = {
  id: "incenter-excenter",
  title: "Incenter–Excenter Lemma: LI = LB",
  blurb:
    "I is the incenter of triangle ABC; ray AI meets the circumcircle again at L. Prove that LI = LB (so L is equidistant from B and the incenter).",
  difficulty: "challenge",
  coords,
  variables: {
    A: ["B", "A", "C"],
    B: ["A", "B", "C"],
    C: ["B", "C", "A"],
  },
  figure: [
    polygon(["A", "B", "C"]),
    circumcircle,
    segment("A", "L", { strokeColor: COLORS.OK, dash: 2, strokeWidth: 1.5 }),
    segment("B", "I", { strokeColor: COLORS.OK, strokeWidth: 1.5 }),
    segment("C", "I", { strokeColor: COLORS.OK, strokeWidth: 1.5 }),
    segment("B", "L", { strokeColor: COLORS.BRAND, strokeWidth: 1.5 }),
  ],
  given: [
    rel("cyclic", ["A", "B", "C", "L"]),
    rel("coll", ["A", "I", "L"]),
    aval(["I", "A", "C"], F("A/2")),
    aval(["I", "A", "B"], F("A/2")),
    aval(["I", "B", "A"], F("B/2")),
    aval(["I", "B", "C"], F("B/2")),
  ],
  goal: rel("cong", ["L", "B", "L", "I"]),
  solution: [
    {
      fact: rel("eqangle", ["L", "A", "C", "L", "B", "C"]),
      rule: "inscribed angle (same arc)",
      premises: [rel("cyclic", ["A", "B", "C", "L"])],
      humanReadable: "∠LAC and ∠LBC subtend the same arc LC, so they are equal.",
    },
    {
      fact: rel("eqangle", ["I", "A", "C", "L", "A", "C"]),
      rule: "equal angles on a shared ray",
      premises: [rel("coll", ["A", "I", "L"])],
      humanReadable: "L lies on line AI, so ∠IAC and ∠LAC are the same angle.",
    },
    {
      fact: aval(["L", "A", "C"], F("A/2")),
      rule: "transfer angle value across equal angles",
      premises: [rel("eqangle", ["I", "A", "C", "L", "A", "C"]), aval(["I", "A", "C"], F("A/2"))],
      humanReadable: "Therefore ∠LAC = A/2.",
    },
    {
      fact: aval(["L", "B", "C"], F("A/2")),
      rule: "transfer angle value across equal angles",
      premises: [rel("eqangle", ["L", "A", "C", "L", "B", "C"]), aval(["L", "A", "C"], F("A/2"))],
      humanReadable: "Hence ∠LBC = A/2.",
    },
    {
      fact: aval(["I", "B", "L"], F("A/2 + B/2")),
      rule: "adjacent angles add",
      premises: [aval(["I", "B", "C"], F("B/2")), aval(["L", "B", "C"], F("A/2"))],
      humanReadable: "∠IBL = ∠IBC + ∠CBL = B/2 + A/2.",
    },
    {
      fact: aval(["A", "I", "B"], F("180 - A/2 - B/2")),
      rule: "angles of a triangle sum to 180°",
      premises: [aval(["I", "A", "B"], F("A/2")), aval(["I", "B", "A"], F("B/2"))],
      humanReadable: "In triangle ABI, ∠AIB = 180 − A/2 − B/2.",
    },
    {
      fact: aval(["B", "I", "L"], F("A/2 + B/2")),
      rule: "angles on a straight line sum to 180°",
      premises: [rel("coll", ["A", "I", "L"]), aval(["A", "I", "B"], F("180 - A/2 - B/2"))],
      humanReadable: "A, I, L are collinear, so ∠BIL = 180 − ∠AIB = A/2 + B/2.",
    },
    {
      fact: rel("eqangle", ["I", "B", "L", "B", "I", "L"]),
      rule: "equal values give equal angles",
      premises: [aval(["I", "B", "L"], F("A/2 + B/2")), aval(["B", "I", "L"], F("A/2 + B/2"))],
      humanReadable: "∠IBL and ∠BIL are both A/2 + B/2, so they are equal.",
    },
    {
      fact: rel("cong", ["L", "B", "L", "I"]),
      rule: "isosceles: equal base angles ⇒ equal sides",
      premises: [rel("eqangle", ["I", "B", "L", "B", "I", "L"])],
      humanReadable: "Triangle LBI has equal base angles at B and I, so LI = LB.",
    },
  ],
};
