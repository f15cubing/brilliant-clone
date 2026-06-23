import type { Lesson } from "@/lib/content/types";
import { angleDeg } from "@/lib/geometry/measure";
import {
  angleMark,
  circle,
  COLORS,
  glider,
  keepConvexOrder,
  polygon,
  readout,
} from "@/lib/content/boards";
import type { BoardElementDef } from "@/lib/geometry/board-types";

const BOX: [number, number, number, number] = [-6, 6, 6, -6];

function center(): BoardElementDef {
  return {
    id: "O",
    type: "point",
    parents: [0, 0],
    attributes: { name: "O", size: 3, fixed: true, fillColor: "#fff", strokeColor: "#94a3b8", strokeWidth: 2 },
  };
}
function radiusAnchor(): BoardElementDef {
  return { id: "R", type: "point", parents: [3.7, 0], attributes: { visible: false, fixed: true } };
}

function cyclicQuad(): BoardElementDef[] {
  const ORDER = ["A", "B", "C", "D"];
  const convex = keepConvexOrder("O", ORDER);
  return [
    center(),
    radiusAnchor(),
    circle("c", "O", "R"),
    { ...glider("A", -3.2, 1.85, "c"), constrain: convex },
    { ...glider("B", 1.85, 3.2, "c"), constrain: convex },
    { ...glider("C", 2.83, -2.37, "c"), constrain: convex },
    { ...glider("D", -3.2, -1.85, "c"), constrain: convex },
    polygon(["A", "B", "C", "D"]),
    angleMark("D", "A", "B", { fillColor: COLORS.ACCENT, strokeColor: COLORS.ACCENT, radius: 0.7 }),
    angleMark("B", "C", "D", { fillColor: COLORS.ACCENT, strokeColor: COLORS.ACCENT, radius: 0.7 }),
    angleMark("A", "B", "C", { fillColor: COLORS.BRAND, strokeColor: COLORS.BRAND, radius: 0.7 }),
    angleMark("C", "D", "A", { fillColor: COLORS.BRAND, strokeColor: COLORS.BRAND, radius: 0.7 }),
  ];
}

export const cyclicQuadrilaterals: Lesson = {
  id: "cyclic-quadrilaterals",
  title: "Cyclic Quadrilaterals",
  summary: "Opposite angles of a cyclic quadrilateral sum to 180°.",
  concept:
    "A **cyclic quadrilateral** has all four vertices on one circle. Its key property: **opposite angles sum to $180^\\circ$**. The converse is also true — if a quadrilateral's opposite angles sum to $180^\\circ$, its vertices are concyclic.",
  completionXp: 35,
  problems: [
    {
      id: "cq-opposite",
      prompt:
        "$ABCD$ lies on a circle (orange angles are $\\angle A$ and $\\angle C$). Drag the vertices around the circle. What is $\\angle A + \\angle C$?",
      xp: 10,
      boardConfig: {
        boundingBox: BOX,
        elements: [
          ...cyclicQuad(),
          readout(-5.7, 5.4, (r) => `∠A = ${angleDeg(r.D, r.A, r.B).toFixed(1)}°`),
          readout(-5.7, 4.7, (r) => `∠C = ${angleDeg(r.B, r.C, r.D).toFixed(1)}°`),
          readout(
            -5.7,
            4.0,
            (r) => `∠A + ∠C = ${(angleDeg(r.D, r.A, r.B) + angleDeg(r.B, r.C, r.D)).toFixed(1)}°`,
          ),
        ],
      },
      answerConfig: {
        kind: "multiple-choice",
        options: [
          { id: "o90", label: "$90^\\circ$" },
          { id: "o180", label: "$180^\\circ$" },
          { id: "o360", label: "$360^\\circ$" },
          { id: "ovar", label: "It varies" },
        ],
        correctOptionId: "o180",
      },
      explanations: [
        {
          triggerCondition: "default_wrong",
          text: "Opposite angles of a cyclic quadrilateral are **supplementary**: $\\angle A + \\angle C = 180^\\circ$. The sum readout stays at $180^\\circ$ as you drag.",
        },
      ],
      solutionText: "$\\angle A + \\angle C = 180^\\circ$ for any cyclic quadrilateral.",
    },
    {
      id: "cq-express",
      prompt: "Express $\\angle C$ in terms of the opposite angle $\\angle A$.",
      xp: 10,
      boardConfig: {
        boundingBox: BOX,
        elements: [
          ...cyclicQuad(),
          readout(-5.7, 5.4, (r) => `∠A = ${angleDeg(r.D, r.A, r.B).toFixed(1)}°`),
          readout(-5.7, 4.7, (r) => `∠C = ${angleDeg(r.B, r.C, r.D).toFixed(1)}°`),
        ],
      },
      answerConfig: {
        kind: "algebraic",
        correctExpression: "180 - A",
        variables: ["A"],
        placeholder: "180 - A",
      },
      explanations: [
        {
          triggerCondition: "default_wrong",
          text: "From $\\angle A + \\angle C = 180^\\circ$ we get $\\angle C = 180^\\circ - \\angle A$.",
        },
      ],
      solutionText: "$\\angle C = 180^\\circ - \\angle A$.",
    },
    {
      id: "cq-other-pair",
      prompt:
        "The other pair of opposite angles is $\\angle B$ and $\\angle D$ (blue). Drag the vertices. What is $\\angle B + \\angle D$?",
      xp: 10,
      boardConfig: {
        boundingBox: BOX,
        elements: [
          ...cyclicQuad(),
          readout(-5.7, 5.4, (r) => `∠B = ${angleDeg(r.A, r.B, r.C).toFixed(1)}°`),
          readout(-5.7, 4.7, (r) => `∠D = ${angleDeg(r.C, r.D, r.A).toFixed(1)}°`),
          readout(
            -5.7,
            4.0,
            (r) => `∠B + ∠D = ${(angleDeg(r.A, r.B, r.C) + angleDeg(r.C, r.D, r.A)).toFixed(1)}°`,
          ),
        ],
      },
      answerConfig: {
        kind: "multiple-choice",
        options: [
          { id: "o180", label: "$180^\\circ$" },
          { id: "o200", label: "Whatever is left after $\\angle A + \\angle C$" },
          { id: "ovar", label: "It varies" },
        ],
        correctOptionId: "o180",
      },
      explanations: [
        {
          triggerCondition: "default_wrong",
          text: "Both pairs of opposite angles are supplementary. Since all four interior angles sum to $360^\\circ$ and $\\angle A + \\angle C = 180^\\circ$, the remaining $\\angle B + \\angle D = 180^\\circ$ too.",
        },
      ],
      solutionText: "$\\angle B + \\angle D = 180^\\circ$ as well.",
    },
    {
      id: "cq-make-right",
      prompt:
        "**Drag the vertices** until $\\angle A = 90^\\circ$. Watch what happens to the opposite angle $\\angle C$, then submit.",
      xp: 14,
      boardConfig: {
        boundingBox: BOX,
        elements: [
          ...cyclicQuad(),
          readout(-5.7, 5.4, (r) => `∠A = ${angleDeg(r.D, r.A, r.B).toFixed(1)}°`),
          readout(-5.7, 4.7, (r) => `∠C = ${angleDeg(r.B, r.C, r.D).toFixed(1)}°`),
        ],
      },
      answerConfig: {
        kind: "geometric",
        instruction: "Drag the vertices until ∠A = 90°, then submit.",
        check: (r) => Math.abs(angleDeg(r.D, r.A, r.B) - 90) < 1.5,
      },
      explanations: [
        {
          triggerCondition: "default_wrong",
          text: "Keep adjusting until $\\angle A$ reads $90^\\circ$. When it does, $\\angle C$ must read $90^\\circ$ as well, since the two are supplementary.",
        },
      ],
      solutionText:
        "With $\\angle A = 90^\\circ$, the opposite angle $\\angle C = 180^\\circ - 90^\\circ = 90^\\circ$.",
    },
    {
      id: "cq-converse",
      prompt:
        "A quadrilateral $PQRS$ has $\\angle P = 105^\\circ$ and $\\angle R = 75^\\circ$. What can you conclude?",
      xp: 11,
      boardConfig: {
        boundingBox: BOX,
        elements: [...cyclicQuad()],
      },
      answerConfig: {
        kind: "multiple-choice",
        options: [
          { id: "cyclic", label: "$PQRS$ is cyclic (its vertices lie on a circle)" },
          { id: "square", label: "$PQRS$ must be a square" },
          { id: "none", label: "Nothing — it cannot be cyclic" },
        ],
        correctOptionId: "cyclic",
      },
      explanations: [
        {
          triggerCondition: "default_wrong",
          text: "Since $\\angle P + \\angle R = 105^\\circ + 75^\\circ = 180^\\circ$, the opposite angles are supplementary. By the **converse**, $PQRS$ is cyclic.",
        },
      ],
      solutionText:
        "Opposite angles sum to $180^\\circ \\Rightarrow$ the quadrilateral is cyclic (converse holds).",
    },
  ],
};
