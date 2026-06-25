import type { Lesson } from "@/lib/content/types";
import type { JXGElement } from "@/lib/geometry/board-types";
import { angleDeg, dist, inward } from "@/lib/geometry/measure";
import {
  angleBisector,
  angleLabel,
  angleMark,
  circle,
  COLORS,
  glider,
  intersection,
  point,
  polygon,
  readout,
  segment,
} from "@/lib/content/boards";

const BOX: [number, number, number, number] = [-6, 6, 6, -6];
// Taller box so the far-flung A-excenter I_A stays on screen.
const WIDE: [number, number, number, number] = [-7.5, 5, 7.5, -10];

/** Perpendicular distance from point `p` to the line through `a` and `b`. */
function distToLine(p: JXGElement, a: JXGElement, b: JXGElement): number {
  const vx = b.X() - a.X();
  const vy = b.Y() - a.Y();
  const wx = p.X() - a.X();
  const wy = p.Y() - a.Y();
  const len = Math.hypot(vx, vy) || 1;
  return Math.abs(vx * wy - vy * wx) / len;
}

/** A, B, C and the triangle. A is the apex; BC the base. */
function triangle() {
  return [
    point("A", 0, 3),
    point("B", -3.4, -2),
    point("C", 3.4, -2.2),
    polygon(["A", "B", "C"]),
  ];
}

/**
 * A standalone angle at vertex V (sides toward S1, S2) with its bisector and a
 * glider P, plus the dropped perpendiculars from P to each side.
 */
function angleWithBisector() {
  return [
    point("V", -0.5, -3),
    point("S1", 4.6, 0.4),
    point("S2", -4, 2.4),
    {
      id: "lineVS1",
      type: "line",
      parents: [{ ref: "V" }, { ref: "S1" }],
      attributes: { strokeColor: "#1b1714", strokeWidth: 2 },
    },
    {
      id: "lineVS2",
      type: "line",
      parents: [{ ref: "V" }, { ref: "S2" }],
      attributes: { strokeColor: "#1b1714", strokeWidth: 2 },
    },
    angleBisector("S1", "V", "S2", "bis", {
      visible: true,
      straightFirst: false,
      straightLast: true,
      strokeColor: COLORS.ACCENT,
      dash: 2,
      strokeWidth: 2,
    }),
    glider("P", 1.4, 1.1, "bis"),
    {
      id: "F1",
      type: "orthogonalprojection",
      parents: [{ ref: "P" }, { ref: "lineVS1" }],
      attributes: { visible: false },
    },
    {
      id: "F2",
      type: "orthogonalprojection",
      parents: [{ ref: "P" }, { ref: "lineVS2" }],
      attributes: { visible: false },
    },
    segment("P", "F1", { strokeColor: COLORS.OK, dash: 2, strokeWidth: 1.5 }),
    segment("P", "F2", { strokeColor: COLORS.OK, dash: 2, strokeWidth: 1.5 }),
  ];
}

/**
 * Vertex B with its internal bisector (of ∠ABC) and external bisector (of the
 * angle BA makes with the extension C' of CB). The two are always perpendicular.
 */
function internalExternalAtB() {
  return [
    point("A", -3.6, 2.6),
    point("B", -2.2, -2.8),
    point("C", 4.2, -1.2),
    segment("B", "A", { strokeColor: "#1b1714" }),
    segment("B", "C", { strokeColor: "#1b1714" }),
    {
      id: "Cp",
      type: "point",
      parents: [
        { fn: (r: Record<string, JXGElement>) => { const dx = r.B.X() - r.C.X(), dy = r.B.Y() - r.C.Y(); const L = Math.hypot(dx, dy) || 1; return r.B.X() + (dx / L) * 3.2; } },
        { fn: (r: Record<string, JXGElement>) => { const dx = r.B.X() - r.C.X(), dy = r.B.Y() - r.C.Y(); const L = Math.hypot(dx, dy) || 1; return r.B.Y() + (dy / L) * 3.2; } },
      ],
      attributes: {
        name: "C'",
        size: 2,
        fixed: true,
        fillColor: "#9c8c70",
        strokeColor: "#9c8c70",
        label: { fontSize: 14, offset: [6, 6] },
      },
    },
    segment("B", "Cp", { strokeColor: "#9c8c70", dash: 2, strokeWidth: 1.5 }),
    {
      id: "Pi",
      type: "point",
      parents: [
        { fn: (r: Record<string, JXGElement>) => inward(r.B, r.A, r.C, 3.2)[0] },
        { fn: (r: Record<string, JXGElement>) => inward(r.B, r.A, r.C, 3.2)[1] },
      ],
      attributes: { visible: false },
    },
    {
      id: "Pe",
      type: "point",
      parents: [
        { fn: (r: Record<string, JXGElement>) => inward(r.B, r.A, r.Cp, 3.2)[0] },
        { fn: (r: Record<string, JXGElement>) => inward(r.B, r.A, r.Cp, 3.2)[1] },
      ],
      attributes: { visible: false },
    },
    segment("B", "Pi", { strokeColor: COLORS.OK, strokeWidth: 2 }),
    segment("B", "Pe", { strokeColor: COLORS.WRONG, strokeWidth: 2 }),
    angleMark("Pi", "B", "Pe", {
      fillColor: COLORS.ACCENT,
      strokeColor: COLORS.ACCENT,
      radius: 0.7,
    }),
  ];
}

/** Triangle + incenter I from two internal bisectors. */
function withIncenter() {
  return [
    ...triangle(),
    angleBisector("B", "A", "C", "bisA"),
    angleBisector("A", "B", "C", "bisB"),
    intersection("I", "bisA", "bisB"),
  ];
}

/** Adds the circumcircle and L = second meeting of ray AI with it. */
function withCircumAndL() {
  return [
    ...withIncenter(),
    {
      id: "circ",
      type: "circumcircle",
      parents: [{ ref: "A" }, { ref: "B" }, { ref: "C" }],
      attributes: { strokeColor: COLORS.ACCENT, strokeWidth: 2, point: { visible: false } },
    },
    {
      id: "lineAI",
      type: "line",
      parents: [{ ref: "A" }, { ref: "I" }],
      attributes: { visible: false },
    },
    {
      id: "L",
      type: "otherintersection",
      parents: [{ ref: "circ" }, { ref: "lineAI" }, { ref: "A" }],
      attributes: {
        name: "L",
        size: 3,
        fixed: true,
        fillColor: "#fff",
        strokeColor: COLORS.BRAND,
        strokeWidth: 2,
        label: { fontSize: 16, offset: [8, -4] },
      },
    },
  ];
}

/** I_A, the reflection of I over L (a point reflection: 2L - I). */
function excenterIA() {
  return {
    id: "IA",
    type: "point",
    parents: [
      { fn: (r: Record<string, JXGElement>) => 2 * r.L.X() - r.I.X() },
      { fn: (r: Record<string, JXGElement>) => 2 * r.L.Y() - r.I.Y() },
    ],
    attributes: {
      name: "I_A",
      size: 4,
      fixed: true,
      fillColor: "#fff",
      strokeColor: COLORS.WRONG,
      strokeWidth: 2,
      label: { fontSize: 16, offset: [8, 8], cssStyle: "font-weight:600;" },
    },
  };
}

export const incenterLemma: Lesson = {
  id: "incenter-lemma",
  title: "The Incenter–Excenter Lemma",
  summary:
    "Ray AI hits the circumcircle at L — the center of a circle through B, I, C and the excenter.",
  concept:
    "Start with the **incenter** $I$ of $\\triangle ABC$ (where the internal bisectors meet). Extend ray $AI$ until it hits the circumcircle again at $L$, and reflect $I$ over $L$ to get $I_A$. The **Incenter–Excenter Lemma** says $L$ is equidistant from $B$, $I$, $C$ and $I_A$ — so those four points lie on one circle — and $I_A$ turns out to be the $A$-**excenter**. We'll build it one angle-chase at a time, starting from what an angle bisector even *is*. Drag the triangle: every relation holds for any shape.",
  completionXp: 55,
  problems: [
    {
      id: "il-bisector-locus",
      prompt:
        "Forget the triangle for a moment. Here is a single angle, its **bisector** (dashed), and a point $P$ that glides along it. The green segments are the perpendicular distances from $P$ to the two sides. Drag $P$ — what stays true?",
      exploreHint: "Drag P along the dashed bisector.",
      xp: 10,
      boardConfig: {
        boundingBox: BOX,
        elements: [
          ...angleWithBisector(),
          readout(-5.8, 5.4, (r) => `dist(P, side 1) = ${distToLine(r.P, r.V, r.S1).toFixed(2)}`),
          readout(-5.8, 4.7, (r) => `dist(P, side 2) = ${distToLine(r.P, r.V, r.S2).toFixed(2)}`),
        ],
      },
      answerConfig: {
        kind: "multiple-choice",
        options: [
          { id: "eq", label: "$P$ is always **equidistant** from the two sides" },
          { id: "s1", label: "$P$ is always closer to side 1" },
          { id: "dep", label: "The two distances depend on where $P$ sits" },
          { id: "vert", label: "$P$ is equidistant from the two endpoints of the sides" },
        ],
        correctOptionId: "eq",
      },
      explanations: [
        {
          triggerCondition: "default_wrong",
          text: "The two green distances stay identical everywhere on the bisector. In fact the **angle bisector is exactly the set of points equidistant from the two sides** of the angle — this is the property that will pin down the incenter.",
        },
      ],
      solutionText:
        "The bisector of an angle is the **locus of points equidistant from its two sides**.",
    },
    {
      id: "il-incenter-exists",
      prompt:
        "Now apply that locus fact to a triangle. The bisectors of $\\angle A$ and $\\angle B$ meet at $I$, and the readouts give the **perpendicular distance** from $I$ to each side. Drag the triangle — what do you notice, and what does it tell you about the bisector of $\\angle C$?",
      exploreHint: "Drag A, B, or C and watch the three distances.",
      xp: 10,
      boardConfig: {
        boundingBox: BOX,
        elements: [
          ...withIncenter(),
          segment("I", "A", { strokeColor: COLORS.OK, strokeWidth: 1.5, dash: 2 }),
          segment("I", "B", { strokeColor: COLORS.OK, strokeWidth: 1.5, dash: 2 }),
          readout(-5.8, 5.4, (r) => `dist(I, AB) = ${distToLine(r.I, r.A, r.B).toFixed(2)}`),
          readout(-5.8, 4.7, (r) => `dist(I, BC) = ${distToLine(r.I, r.B, r.C).toFixed(2)}`),
          readout(-5.8, 4.0, (r) => `dist(I, CA) = ${distToLine(r.I, r.C, r.A).toFixed(2)}`),
        ],
      },
      answerConfig: {
        kind: "multiple-choice",
        options: [
          {
            id: "all3",
            label:
              "$I$ is equidistant from all three sides, so it lies on the bisector of $\\angle C$ too",
          },
          { id: "verts", label: "$I$ is equidistant from the three vertices" },
          { id: "circ", label: "$I$ is the circumcenter" },
          { id: "dep", label: "Nothing special — it depends on the triangle" },
        ],
        correctOptionId: "all3",
      },
      explanations: [
        {
          triggerCondition: "default_wrong",
          text: "The bisector of $\\angle A$ is the set of points equidistant from $AB$ and $AC$; the bisector of $\\angle B$ is equidistant from $BA$ and $BC$. Their meet $I$ is therefore equidistant from **all three** sides — so it also lies on the bisector of $\\angle C$. The three internal bisectors concur at the **incenter**.",
          boardOverlayConfig: {
            elements: [
              angleBisector("A", "C", "B", "bisC", {
                visible: true,
                straightFirst: false,
                straightLast: true,
                strokeColor: COLORS.BRAND,
                dash: 2,
                strokeWidth: 1.5,
              }),
            ],
          },
        },
      ],
      solutionText:
        "$I$ is equidistant from all three sides, so all three internal bisectors pass through it: the **incenter** exists. From now on $\\angle BAI = \\angle CAI = A/2$, and likewise at $B$ and $C$.",
    },
    {
      id: "il-bia",
      prompt:
        "In $\\triangle ABI$ the angle at $A$ is $A/2$ and the angle at $B$ is $B/2$ (bisectors). **Express $\\angle BIA$** in terms of $A$ and $B$.",
      xp: 12,
      boardConfig: {
        boundingBox: BOX,
        elements: [
          ...withIncenter(),
          segment("I", "A", { strokeColor: COLORS.OK, strokeWidth: 1.5 }),
          segment("I", "B", { strokeColor: COLORS.OK, strokeWidth: 1.5 }),
          angleMark("B", "A", "I", { fillColor: COLORS.BRAND, strokeColor: COLORS.BRAND, radius: 0.6 }),
          angleMark("A", "B", "I", { fillColor: COLORS.ACCENT, strokeColor: COLORS.ACCENT, radius: 0.6 }),
          angleMark("A", "I", "B", { fillColor: COLORS.WRONG, strokeColor: COLORS.WRONG, radius: 0.6 }),
          readout(-5.8, 5.4, (r) => `A/2 = ${(angleDeg(r.B, r.A, r.C) / 2).toFixed(1)}°`),
          readout(-5.8, 4.7, (r) => `B/2 = ${(angleDeg(r.A, r.B, r.C) / 2).toFixed(1)}°`),
          readout(-5.8, 4.0, (r) => `∠BIA = ${angleDeg(r.B, r.I, r.A).toFixed(1)}°`),
        ],
      },
      answerConfig: {
        kind: "algebraic",
        correctExpression: "180 - A/2 - B/2",
        variables: ["A", "B"],
        placeholder: "e.g. 180 - A/2 - B/2",
      },
      explanations: [
        {
          triggerCondition: "default_wrong",
          text: "The angles of $\\triangle ABI$ sum to $180^\\circ$. With $A/2$ at $A$ and $B/2$ at $B$, the angle at $I$ is $\\angle BIA = 180^\\circ - \\tfrac{A}{2} - \\tfrac{B}{2}$. Check it against the readouts.",
        },
      ],
      solutionText:
        "$\\angle BIA = 180^\\circ - \\tfrac{A}{2} - \\tfrac{B}{2}$. We'll need its supplement next.",
    },
    {
      id: "il-lbc",
      prompt:
        "Extend ray $AI$ to hit the circumcircle again at $L$. The readouts show $\\angle LAC$ and $\\angle LBC$. They stay equal as you drag — **why**, and what is $\\angle LBC$ in terms of $A$?",
      exploreHint: "Drag the triangle; watch ∠LAC and ∠LBC track each other.",
      xp: 12,
      boardConfig: {
        boundingBox: BOX,
        elements: [
          ...withCircumAndL(),
          segment("A", "L", { strokeColor: COLORS.OK, strokeWidth: 1.5, dash: 2 }),
          segment("B", "L", { strokeColor: COLORS.BRAND, strokeWidth: 1.5 }),
          segment("B", "C", { strokeColor: "#1b1714", strokeWidth: 1.5 }),
          angleMark("L", "A", "C", { fillColor: COLORS.OK, strokeColor: COLORS.OK, radius: 0.7 }),
          angleMark("L", "B", "C", { fillColor: COLORS.BRAND, strokeColor: COLORS.BRAND, radius: 0.7 }),
          readout(-5.8, 5.4, (r) => `∠LAC = ${angleDeg(r.L, r.A, r.C).toFixed(1)}°`),
          readout(-5.8, 4.7, (r) => `∠LBC = ${angleDeg(r.L, r.B, r.C).toFixed(1)}°`),
          readout(-5.8, 4.0, (r) => `A/2 = ${(angleDeg(r.B, r.A, r.C) / 2).toFixed(1)}°`),
        ],
      },
      answerConfig: {
        kind: "multiple-choice",
        options: [
          {
            id: "arc",
            label: "$\\angle LBC = \\angle LAC$ (same arc $LC$), and $\\angle LAC = A/2$, so $\\angle LBC = A/2$",
          },
          { id: "mid", label: "$\\angle LBC = A$, because $L$ is the midpoint of $BC$" },
          { id: "eq", label: "They're equal only because the triangle looks isosceles" },
          { id: "none", label: "There's no reason they should be equal" },
        ],
        correctOptionId: "arc",
      },
      explanations: [
        {
          triggerCondition: "default_wrong",
          text: "$\\angle LBC$ and $\\angle LAC$ are **inscribed angles subtending the same arc $LC$**, so they're equal (inscribed-angle theorem). And $L$ lies on ray $AI$, so $\\angle LAC = \\angle IAC = A/2$. Hence $\\angle LBC = A/2$.",
        },
        {
          triggerCondition: "selected_mid",
          text: "$L$ is the midpoint of the **arc** $BC$, not of the segment $BC$. The equality comes from the inscribed-angle theorem: $\\angle LBC = \\angle LAC = A/2$.",
        },
      ],
      solutionText:
        "By the inscribed-angle theorem, $\\angle LBC = \\angle LAC = A/2$.",
    },
    {
      id: "il-ibl",
      prompt:
        "Now look at $\\angle IBL$. Ray $BC$ lies between $BI$ and $BL$, so $\\angle IBL = \\angle IBC + \\angle CBL$. Using $\\angle IBC = B/2$ and $\\angle CBL = A/2$, **express $\\angle IBL$**.",
      xp: 12,
      boardConfig: {
        boundingBox: BOX,
        elements: [
          ...withCircumAndL(),
          segment("B", "I", { strokeColor: COLORS.OK, strokeWidth: 1.5 }),
          segment("B", "L", { strokeColor: COLORS.BRAND, strokeWidth: 1.5 }),
          segment("B", "C", { strokeColor: "#1b1714", strokeWidth: 1.5 }),
          angleMark("I", "B", "C", { fillColor: COLORS.ACCENT, strokeColor: COLORS.ACCENT, radius: 0.85 }),
          angleMark("C", "B", "L", { fillColor: COLORS.BRAND, strokeColor: COLORS.BRAND, radius: 0.6 }),
          readout(-5.8, 5.4, (r) => `∠IBC = B/2 = ${(angleDeg(r.A, r.B, r.C) / 2).toFixed(1)}°`),
          readout(-5.8, 4.7, (r) => `∠CBL = A/2 = ${(angleDeg(r.B, r.A, r.C) / 2).toFixed(1)}°`),
          readout(-5.8, 4.0, (r) => `∠IBL = ${angleDeg(r.I, r.B, r.L).toFixed(1)}°`),
        ],
      },
      answerConfig: {
        kind: "algebraic",
        correctExpression: "A/2 + B/2",
        variables: ["A", "B"],
        placeholder: "e.g. A/2 + B/2",
      },
      explanations: [
        {
          triggerCondition: "default_wrong",
          text: "$BI$ bisects $\\angle B$, so $\\angle IBC = \\tfrac{B}{2}$; and from the previous step $\\angle CBL = \\tfrac{A}{2}$. Adding the adjacent angles, $\\angle IBL = \\tfrac{A}{2} + \\tfrac{B}{2}$.",
        },
      ],
      solutionText:
        "$\\angle IBL = \\angle IBC + \\angle CBL = \\tfrac{B}{2} + \\tfrac{A}{2} = \\tfrac{A}{2} + \\tfrac{B}{2}$.",
    },
    {
      id: "il-isosceles",
      prompt:
        "Since $A$, $I$, $L$ are collinear, $\\angle BIL = 180^\\circ - \\angle BIA = \\tfrac{A}{2} + \\tfrac{B}{2}$ — the **same** value as $\\angle IBL$. The readouts confirm it. What does $\\angle IBL = \\angle BIL$ force?",
      exploreHint: "Drag the triangle; ∠IBL and ∠BIL stay locked together.",
      xp: 12,
      boardConfig: {
        boundingBox: BOX,
        elements: [
          ...withCircumAndL(),
          segment("I", "B", { strokeColor: "#1b1714", strokeWidth: 1.5 }),
          segment("L", "B", { strokeColor: COLORS.BRAND, strokeWidth: 2 }),
          segment("A", "L", { strokeColor: COLORS.OK, strokeWidth: 1.5, dash: 2 }),
          angleMark("I", "B", "L", { fillColor: COLORS.BRAND, strokeColor: COLORS.BRAND, radius: 0.7 }),
          angleMark("B", "I", "L", { fillColor: COLORS.ACCENT, strokeColor: COLORS.ACCENT, radius: 0.7 }),
          readout(-5.8, 5.4, (r) => `∠IBL = ${angleDeg(r.I, r.B, r.L).toFixed(1)}°`),
          readout(-5.8, 4.7, (r) => `∠BIL = ${angleDeg(r.B, r.I, r.L).toFixed(1)}°`),
          readout(-5.8, 4.0, (r) => `|LI| = ${dist(r.L, r.I).toFixed(2)}`),
          readout(-5.8, 3.3, (r) => `|LB| = ${dist(r.L, r.B).toFixed(2)}`),
        ],
      },
      answerConfig: {
        kind: "multiple-choice",
        options: [
          { id: "li-lb", label: "$\\triangle LBI$ is isosceles with $LI = LB$" },
          { id: "lb-bi", label: "$LB = BI$" },
          { id: "li-ib", label: "$LI = IB$" },
          { id: "nothing", label: "Nothing — equal angles don't constrain the sides" },
        ],
        correctOptionId: "li-lb",
      },
      explanations: [
        {
          triggerCondition: "default_wrong",
          text: "In $\\triangle LBI$ the **base angles** at $B$ and $I$ are equal ($\\angle IBL = \\angle BIL$), so the sides opposite them are equal: $LI = LB$. Watch the $|LI|$ and $|LB|$ readouts stay identical.",
        },
        {
          triggerCondition: "selected_lb-bi",
          text: "Equal base angles are at $B$ and $I$, so the equal sides are the ones **opposite** them: $LI$ (opposite $\\angle B$) and $LB$ (opposite $\\angle I$). Thus $LI = LB$.",
        },
      ],
      solutionText:
        "Equal base angles give $LI = LB$. The identical argument at $C$ gives $LI = LC$. So $L$ is equidistant from $B$, $I$ and $C$.",
    },
    {
      id: "il-circle",
      prompt:
        "We have $LI = LB = LC$. Now let $I_A$ be the **reflection of $I$ over $L$**, so $LI_A = LI$ by definition. The four points $B$, $I$, $C$, $I_A$ therefore lie on one circle — **where is its center?**",
      exploreHint: "Drag the triangle; all four distances from L stay equal.",
      xp: 13,
      boardConfig: {
        boundingBox: WIDE,
        elements: [
          ...withCircumAndL(),
          excenterIA(),
          circle("circL", "L", "B", { strokeColor: COLORS.WRONG, strokeWidth: 2, dash: 2 }),
          segment("L", "B", { strokeColor: COLORS.OK, strokeWidth: 1.5 }),
          segment("L", "C", { strokeColor: COLORS.OK, strokeWidth: 1.5 }),
          segment("L", "I", { strokeColor: COLORS.OK, strokeWidth: 1.5, dash: 2 }),
          segment("L", "IA", { strokeColor: COLORS.OK, strokeWidth: 1.5, dash: 2 }),
          readout(-7.3, 4.3, (r) => `|LB| = ${dist(r.L, r.B).toFixed(2)}`),
          readout(-7.3, 3.5, (r) => `|LI| = ${dist(r.L, r.I).toFixed(2)}`),
          readout(-7.3, 2.7, (r) => `|LC| = ${dist(r.L, r.C).toFixed(2)}`),
          readout(-7.3, 1.9, (r) => `|LI_A| = ${dist(r.L, r.IA).toFixed(2)}`),
        ],
      },
      answerConfig: {
        kind: "multiple-choice",
        options: [
          { id: "L", label: "$L$ — it is equidistant from all four points" },
          { id: "I", label: "$I$, the incenter" },
          { id: "mid", label: "The midpoint of $BC$" },
          { id: "circum", label: "The circumcenter of $\\triangle ABC$" },
        ],
        correctOptionId: "L",
      },
      explanations: [
        {
          triggerCondition: "default_wrong",
          text: "We proved $LI = LB = LC$, and $LI_A = LI$ because $I_A$ is the reflection of $I$ over $L$. So all four points sit at the same distance $LI$ from $L$ — the circle centered at $L$ with radius $LI$ passes through $B$, $I$, $C$ and $I_A$.",
        },
      ],
      solutionText:
        "$LI = LB = LC = LI_A$, so $L$ is the center of the circle through $B$, $I$, $C$, $I_A$.",
    },
    {
      id: "il-perp-bisectors",
      prompt:
        "One fact about bisectors before the finale. At vertex $B$, the **internal** bisector (green) splits $\\angle ABC$; the **external** bisector (red) splits the angle that $BA$ makes with the extension $C'$ of side $CB$. Drag the triangle and watch the angle between them. Why is it always $90^\\circ$?",
      exploreHint: "Drag A, B, or C — the green and red bisectors stay perpendicular.",
      xp: 12,
      boardConfig: {
        boundingBox: BOX,
        elements: [
          ...internalExternalAtB(),
          readout(-5.8, 5.4, (r) => `∠(internal, external) = ${angleDeg(r.Pi, r.B, r.Pe).toFixed(1)}°`),
          readout(-5.8, 4.7, (r) => `½∠ABC = ${(angleDeg(r.A, r.B, r.C) / 2).toFixed(1)}°`),
          readout(-5.8, 4.0, (r) => `½∠ABC' = ${(angleDeg(r.A, r.B, r.Cp) / 2).toFixed(1)}°`),
        ],
      },
      answerConfig: {
        kind: "multiple-choice",
        options: [
          {
            id: "supp",
            label:
              "$\\angle ABC$ and $\\angle ABC'$ are supplementary, so their halves add to $90^\\circ$",
          },
          { id: "right", label: "Because $\\angle ABC$ happens to be a right angle" },
          { id: "coin", label: "It's a coincidence of this particular figure" },
          { id: "dia", label: "Because $II_A$ is a diameter" },
        ],
        correctOptionId: "supp",
      },
      explanations: [
        {
          triggerCondition: "default_wrong",
          text: "The internal angle $\\angle ABC$ and the external angle $\\angle ABC'$ are **supplementary** ($\\angle ABC + \\angle ABC' = 180^\\circ$). Ray $BA$ lies between the two bisectors, so the angle between them is $\\tfrac12\\angle ABC + \\tfrac12\\angle ABC' = \\tfrac12(180^\\circ) = 90^\\circ$. The external bisector is **always perpendicular** to the internal bisector.",
        },
        {
          triggerCondition: "selected_dia",
          text: "That's the reason $\\angle IBI_A = 90^\\circ$ in the main figure — but here we're proving a more basic fact about *any* vertex: internal $+$ external angle $= 180^\\circ$, so their half-bisectors are perpendicular.",
        },
      ],
      solutionText:
        "Internal $+$ external angle $= 180^\\circ$, so the two bisectors meet at $90^\\circ$: the **external bisector is the line through the vertex perpendicular to the internal bisector**.",
    },
    {
      id: "il-excenter",
      prompt:
        "Because $I$, $L$, $I_A$ are collinear with $LI = LI_A = LB$, segment $II_A$ is a **diameter** of that circle, so $\\angle IBI_A = 90^\\circ$ (angle in a semicircle). Since $BI$ is the *internal* bisector at $B$, what is line $BI_A$?",
      exploreHint: "Drag the triangle; ∠IBI_A stays at 90°.",
      xp: 14,
      boardConfig: {
        boundingBox: WIDE,
        elements: [
          ...withCircumAndL(),
          excenterIA(),
          circle("circL", "L", "B", { strokeColor: COLORS.WRONG, strokeWidth: 1.5, dash: 2 }),
          segment("I", "IA", { strokeColor: COLORS.BRAND, strokeWidth: 1.5, dash: 2 }),
          segment("B", "I", { strokeColor: COLORS.OK, strokeWidth: 2 }),
          segment("B", "IA", { strokeColor: COLORS.WRONG, strokeWidth: 2 }),
          angleMark("I", "B", "IA", { fillColor: COLORS.ACCENT, strokeColor: COLORS.ACCENT, radius: 0.7 }),
          angleLabel("I", "B", "IA", { color: COLORS.ACCENT, dist: 1.0 }),
          readout(-7.3, 4.3, (r) => `∠IBI_A = ${angleDeg(r.I, r.B, r.IA).toFixed(1)}°`),
        ],
      },
      answerConfig: {
        kind: "multiple-choice",
        options: [
          { id: "ext", label: "The **external** bisector of $\\angle B$ (perpendicular to the internal one)" },
          { id: "int", label: "The internal bisector of $\\angle B$" },
          { id: "med", label: "The median from $B$" },
          { id: "tan", label: "The tangent to the circumcircle at $B$" },
        ],
        correctOptionId: "ext",
      },
      explanations: [
        {
          triggerCondition: "default_wrong",
          text: "$\\angle IBI_A = 90^\\circ$ means $BI_A \\perp BI$. We just saw the external bisector is exactly the line through $B$ perpendicular to the internal bisector $BI$ — so $BI_A$ **is** the external bisector of $\\angle B$. By the same argument $CI_A$ is the external bisector of $\\angle C$, so $I_A$ is the intersection of the two external bisectors and the internal bisector at $A$: the **$A$-excenter**.",
        },
        {
          triggerCondition: "selected_int",
          text: "The internal bisector at $B$ is $BI$. Since $BI_A \\perp BI$, line $BI_A$ is the **external** bisector instead.",
        },
      ],
      solutionText:
        "$BI_A \\perp BI$, so $BI_A$ is the external bisector at $B$; likewise $CI_A$ at $C$. Hence $I_A$ is the **$A$-excenter** — the full Incenter–Excenter Lemma: $L$ (the arc midpoint of $BC$) is the circumcenter of $\\triangle BIC$ and the midpoint of $II_A$.",
    },
    {
      id: "il-recap",
      prompt:
        "**Putting it all together.** From a single idea — a bisector is the set of points equidistant from the two sides — we built the incenter $I$, extended ray $AI$ to meet the circumcircle again at $L$, and proved $LI = LB = LC$. Reflecting $I$ over $L$ gives $I_A$ with $LI_A = LI$, so $B$, $I$, $C$, $I_A$ all lie on one circle centered at $L$ (red), with $II_A$ a diameter. Which statement is the **Incenter–Excenter Lemma**?",
      exploreHint: "Drag the triangle — the whole configuration holds for every shape.",
      xp: 12,
      boardConfig: {
        boundingBox: WIDE,
        elements: [
          ...withCircumAndL(),
          excenterIA(),
          circle("circL", "L", "B", { strokeColor: COLORS.WRONG, strokeWidth: 2, dash: 2 }),
          segment("L", "B", { strokeColor: COLORS.OK, strokeWidth: 1.5 }),
          segment("L", "C", { strokeColor: COLORS.OK, strokeWidth: 1.5 }),
          segment("L", "I", { strokeColor: COLORS.OK, strokeWidth: 1.5, dash: 2 }),
          segment("L", "IA", { strokeColor: COLORS.OK, strokeWidth: 1.5, dash: 2 }),
          segment("I", "IA", { strokeColor: COLORS.BRAND, strokeWidth: 1.5, dash: 2 }),
          readout(-7.3, 4.3, (r) => `|LB| = ${dist(r.L, r.B).toFixed(2)}`),
          readout(-7.3, 3.5, (r) => `|LI| = ${dist(r.L, r.I).toFixed(2)}`),
          readout(-7.3, 2.7, (r) => `|LC| = ${dist(r.L, r.C).toFixed(2)}`),
          readout(-7.3, 1.9, (r) => `|LI_A| = ${dist(r.L, r.IA).toFixed(2)}`),
        ],
      },
      answerConfig: {
        kind: "multiple-choice",
        options: [
          {
            id: "full",
            label:
              "$L$ (the midpoint of arc $BC$) is the circumcenter of $\\triangle BIC$ and the midpoint of $II_A$; it is equidistant from $B$, $I$, $C$ and the $A$-excenter $I_A$",
          },
          { id: "incenter", label: "$L$ is the incenter of $\\triangle ABC$" },
          { id: "circum", label: "$L$ is the circumcenter of $\\triangle ABC$" },
          { id: "mid", label: "$L$ is the midpoint of segment $BC$" },
        ],
        correctOptionId: "full",
      },
      explanations: [
        {
          triggerCondition: "default_wrong",
          text: "Every distance readout from $L$ stays equal: $LB = LI = LC = LI_A$. So $L$ is the center of the circle through $B$, $I$, $C$, $I_A$ — it is the **arc-midpoint of $BC$** and the **circumcenter of $\\triangle BIC$**, and since $I_A$ is the reflection of $I$ over $L$, $L$ is also the midpoint of $II_A$.",
        },
      ],
      solutionText:
        "**Incenter–Excenter Lemma.** Let $I$ be the incenter of $\\triangle ABC$ and $L$ the second intersection of ray $AI$ with the circumcircle (the midpoint of arc $BC$). Then $LB = LI = LC = LI_A$, so $L$ is the circumcenter of $\\triangle BIC$ and the midpoint of $II_A$. The point $I_A$ — the reflection of $I$ over $L$ — is the **$A$-excenter**: the intersection of the internal bisector at $A$ with the **external** bisectors at $B$ and $C$, and the center of the excircle opposite $A$. That whole circle through $B$, $I$, $C$, $I_A$ centered at $L$ is the lemma's signature configuration.",
    },
  ],
};
