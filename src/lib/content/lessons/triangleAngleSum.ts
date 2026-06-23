import type { Lesson } from "@/lib/content/types";
import { angleDeg } from "@/lib/geometry/measure";
import {
  angleLabel,
  angleMark,
  COLORS,
  point,
  polygon,
  readout,
  segment,
} from "@/lib/content/boards";

const BOX: [number, number, number, number] = [-6, 6, 6, -6];

export const triangleAngleSum: Lesson = {
  id: "triangle-angle-sum",
  title: "Angles in a Triangle",
  summary: "The interior angles of any triangle sum to 180°.",
  concept:
    "In **any** triangle, the three interior angles add up to $180^\\circ$. Drag the vertices and watch the relationship hold for every shape. An immediate consequence: an *exterior* angle equals the sum of the two remote interior angles.",
  completionXp: 30,
  problems: [
    {
      id: "tas-sum",
      prompt:
        "Drag the vertices $A$, $B$, $C$ and watch the live readout. What is $\\angle A + \\angle B + \\angle C$ for **every** triangle?",
      xp: 10,
      boardConfig: {
        boundingBox: BOX,
        elements: [
          point("A", -3.5, -2.2),
          point("B", 3.5, -2.6),
          point("C", 0.4, 3),
          polygon(["A", "B", "C"]),
          angleMark("B", "A", "C"),
          angleMark("C", "B", "A"),
          angleMark("A", "C", "B"),
          angleLabel("B", "A", "C", { color: COLORS.BRAND }),
          angleLabel("A", "B", "C", { color: COLORS.BRAND }),
          angleLabel("A", "C", "B", { color: COLORS.BRAND }),
          readout(
            -5.7,
            5.4,
            (r) =>
              `Sum = ${(
                angleDeg(r.B, r.A, r.C) +
                angleDeg(r.A, r.B, r.C) +
                angleDeg(r.A, r.C, r.B)
              ).toFixed(1)}°`,
          ),
        ],
      },
      answerConfig: {
        kind: "multiple-choice",
        options: [
          { id: "o90", label: "$90^\\circ$" },
          { id: "o180", label: "$180^\\circ$" },
          { id: "o360", label: "$360^\\circ$" },
          { id: "ovar", label: "It depends on the triangle" },
        ],
        correctOptionId: "o180",
      },
      explanations: [
        {
          triggerCondition: "default_wrong",
          text: "Watch the **Sum** readout as you drag — it stays pinned at $180^\\circ$. The three interior angles of a triangle always total $180^\\circ$.",
        },
        {
          triggerCondition: "selected_o360",
          text: "$360^\\circ$ is the sum of the *exterior* angles (or the angles around a point). The *interior* angles of a triangle sum to $180^\\circ$.",
        },
      ],
      solutionText:
        "The interior angles of any triangle sum to $180^\\circ$ — a cornerstone of angle chasing.",
    },
    {
      id: "tas-solve-c",
      prompt:
        "Using the readouts for $\\angle A$ and $\\angle B$, **express $\\angle C$** in terms of $\\angle A$ and $\\angle B$.",
      xp: 10,
      boardConfig: {
        boundingBox: BOX,
        elements: [
          point("A", -3.5, -2),
          point("B", 3.6, -2.4),
          point("C", -0.6, 3.1),
          polygon(["A", "B", "C"]),
          angleLabel("B", "A", "C", { color: COLORS.BRAND }),
          angleLabel("A", "B", "C", { color: COLORS.BRAND }),
          angleLabel("A", "C", "B", { color: COLORS.ACCENT }),
          readout(-5.7, 5.4, (r) => `A = ${angleDeg(r.B, r.A, r.C).toFixed(1)}°`),
          readout(-5.7, 4.7, (r) => `B = ${angleDeg(r.A, r.B, r.C).toFixed(1)}°`),
          readout(-5.7, 4.0, (r) => `C = ${angleDeg(r.A, r.C, r.B).toFixed(1)}°`),
        ],
      },
      answerConfig: {
        kind: "algebraic",
        correctExpression: "180 - A - B",
        variables: ["A", "B"],
        placeholder: "180 - A - B",
      },
      explanations: [
        {
          triggerCondition: "default_wrong",
          text: "Since $\\angle A + \\angle B + \\angle C = 180^\\circ$, solving for $\\angle C$ gives $\\angle C = 180^\\circ - \\angle A - \\angle B$.",
        },
      ],
      solutionText: "$\\angle C = 180^\\circ - \\angle A - \\angle B$.",
    },
    {
      id: "tas-exterior",
      prompt:
        "The ray $BC$ is extended to $D$, forming the **exterior angle** $\\angle ACD$ (shown in orange). Express $\\angle ACD$ in terms of $\\angle A$ and $\\angle B$.",
      xp: 12,
      boardConfig: {
        boundingBox: BOX,
        elements: [
          point("A", -3.2, -1.8),
          point("B", -1.4, -3.2),
          point("C", 2.6, -0.6),
          {
            id: "D",
            type: "point",
            parents: [
              { fn: (r) => r.C.X() + (r.C.X() - r.B.X()) * 1.1 },
              { fn: (r) => r.C.Y() + (r.C.Y() - r.B.Y()) * 1.1 },
            ],
            attributes: { name: "D", size: 2, fixed: true, color: "#94a3b8" },
          },
          polygon(["A", "B", "C"]),
          segment("C", "D", { strokeColor: "#94a3b8", dash: 2 }),
          angleMark("A", "C", "D", { fillColor: COLORS.ACCENT, strokeColor: COLORS.ACCENT }),
          angleLabel("B", "A", "C", { color: COLORS.BRAND }),
          angleLabel("A", "B", "C", { color: COLORS.BRAND }),
          readout(
            -5.7,
            5.4,
            (r) =>
              `A + B = ${(angleDeg(r.B, r.A, r.C) + angleDeg(r.A, r.B, r.C)).toFixed(1)}°`,
          ),
          readout(
            -5.7,
            4.7,
            (r) => `exterior ∠ACD = ${angleDeg(r.A, r.C, r.D).toFixed(1)}°`,
          ),
        ],
      },
      answerConfig: {
        kind: "algebraic",
        correctExpression: "A + B",
        variables: ["A", "B"],
        placeholder: "A + B",
      },
      explanations: [
        {
          triggerCondition: "default_wrong",
          text: "The exterior angle and $\\angle C$ are supplementary: $\\angle ACD = 180^\\circ - \\angle C$. But $\\angle C = 180^\\circ - \\angle A - \\angle B$, so $\\angle ACD = \\angle A + \\angle B$. The readouts confirm it.",
        },
      ],
      solutionText:
        "Exterior angle theorem: $\\angle ACD = \\angle A + \\angle B$ (the two *remote* interior angles).",
    },
    {
      id: "tas-straight-line",
      prompt:
        "Point $O$ lies on the straight line $XY$, and ray $OP$ splits the angle. Drag $P$. What do $\\angle XOP$ and $\\angle POY$ always sum to?",
      xp: 10,
      boardConfig: {
        boundingBox: BOX,
        elements: [
          { id: "X", type: "point", parents: [-4.5, 0], attributes: { name: "X", fixed: true, size: 3, color: "#94a3b8" } },
          { id: "Y", type: "point", parents: [4.5, 0], attributes: { name: "Y", fixed: true, size: 3, color: "#94a3b8" } },
          { id: "O", type: "point", parents: [0, 0], attributes: { name: "O", fixed: true, size: 4, fillColor: "#fff", strokeColor: COLORS.BRAND, strokeWidth: 2 } },
          segment("X", "Y", { strokeColor: "#94a3b8", strokeWidth: 2 }),
          point("P", 2.2, 3.2),
          segment("O", "P", { strokeColor: COLORS.BRAND }),
          angleMark("X", "O", "P", { fillColor: COLORS.ACCENT, strokeColor: COLORS.ACCENT }),
          angleMark("P", "O", "Y", { fillColor: COLORS.BRAND, strokeColor: COLORS.BRAND }),
          readout(-5.7, 5.4, (r) => `∠XOP = ${angleDeg(r.X, r.O, r.P).toFixed(1)}°`),
          readout(-5.7, 4.7, (r) => `∠POY = ${angleDeg(r.P, r.O, r.Y).toFixed(1)}°`),
          readout(
            -5.7,
            4.0,
            (r) => `sum = ${(angleDeg(r.X, r.O, r.P) + angleDeg(r.P, r.O, r.Y)).toFixed(1)}°`,
          ),
        ],
      },
      answerConfig: {
        kind: "multiple-choice",
        options: [
          { id: "s90", label: "$90^\\circ$" },
          { id: "s180", label: "$180^\\circ$" },
          { id: "s360", label: "$360^\\circ$" },
        ],
        correctOptionId: "s180",
      },
      explanations: [
        {
          triggerCondition: "default_wrong",
          text: "Angles on a straight line (a 'straight angle') sum to $180^\\circ$. The sum readout confirms this no matter where $P$ goes.",
        },
      ],
      solutionText: "Angles on a straight line sum to $180^\\circ$.",
    },
    {
      id: "tas-make-right",
      prompt:
        "**Drag vertex $C$** until the angle at $C$ is a right angle ($\\angle ACB = 90^\\circ$). Submit when the marker turns into a right-angle square.",
      xp: 14,
      boardConfig: {
        boundingBox: BOX,
        elements: [
          { id: "A", type: "point", parents: [-3.5, -2], attributes: { name: "A", fixed: true, size: 4, fillColor: "#fff", strokeColor: COLORS.BRAND, strokeWidth: 2 } },
          { id: "B", type: "point", parents: [3.5, -2], attributes: { name: "B", fixed: true, size: 4, fillColor: "#fff", strokeColor: COLORS.BRAND, strokeWidth: 2 } },
          point("C", -1.5, 2.6),
          polygon(["A", "B", "C"]),
          angleMark("A", "C", "B"),
          angleLabel("A", "C", "B", { color: COLORS.ACCENT, dist: 1.3 }),
          readout(-5.7, 5.4, (r) => `∠ACB = ${angleDeg(r.A, r.C, r.B).toFixed(1)}°`),
        ],
      },
      answerConfig: {
        kind: "geometric",
        instruction: "Drag C until ∠ACB = 90°, then submit.",
        check: (r) => Math.abs(angleDeg(r.A, r.C, r.B) - 90) < 1.5,
      },
      explanations: [
        {
          triggerCondition: "default_wrong",
          text: "Not quite $90^\\circ$ yet. The set of points $C$ with $\\angle ACB = 90^\\circ$ forms the circle with diameter $AB$ (Thales' theorem) — you'll meet this again in the inscribed-angle lesson.",
        },
      ],
      solutionText:
        "Every right-angled position of $C$ lies on the circle with diameter $AB$ — that's Thales' theorem.",
    },
  ],
};
