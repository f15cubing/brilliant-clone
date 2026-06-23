import type { Lesson } from "@/lib/content/types";
import { angleDeg } from "@/lib/geometry/measure";
import { subtendedCentralDeg } from "@/lib/geometry/circleAngles";
import {
  angleMark,
  centralArcMark,
  circle,
  COLORS,
  glider,
  keepChordClearOfApexes,
  readout,
  sameSideAsCenter,
  segment,
} from "@/lib/content/boards";
import type { BoardElementDef } from "@/lib/geometry/board-types";

const BOX: [number, number, number, number] = [-6, 6, 6, -6];

function center(): BoardElementDef {
  return {
    id: "O",
    type: "point",
    parents: [0, 0],
    attributes: {
      name: "O",
      size: 3,
      fixed: true,
      fillColor: "#fff",
      strokeColor: "#94a3b8",
      strokeWidth: 2,
    },
  };
}

function radiusAnchor(): BoardElementDef {
  return {
    id: "R",
    type: "point",
    parents: [3.6, 0],
    attributes: { visible: false, fixed: true },
  };
}

export const inscribedAngle: Lesson = {
  id: "inscribed-angle",
  title: "The Inscribed Angle Theorem",
  summary: "An inscribed angle is half the central angle on the same arc.",
  concept:
    "An **inscribed angle** is half of the **central angle** that subtends the same arc. Two consequences you'll use constantly: angles subtending the *same* arc are equal, and an angle inscribed in a *semicircle* is $90^\\circ$ (Thales).",
  completionXp: 35,
  problems: [
    {
      id: "ia-half",
      prompt:
        "Blue is the central angle $\\angle AOB$; orange is the inscribed angle $\\angle APB$ on the same arc. Drag $P$ around the arc. How does the inscribed angle compare to the central angle?",
      xp: 10,
      boardConfig: {
        boundingBox: BOX,
        elements: [
          center(),
          radiusAnchor(),
          circle("c", "O", "R"),
          glider("A", -3.38, -1.23, "c"),
          glider("B", 3.38, -1.23, "c"),
          glider("P", 0, 3.6, "c"),
          segment("O", "A", { strokeColor: COLORS.BRAND, strokeWidth: 2 }),
          segment("O", "B", { strokeColor: COLORS.BRAND, strokeWidth: 2 }),
          segment("P", "A", { strokeColor: COLORS.ACCENT, strokeWidth: 2 }),
          segment("P", "B", { strokeColor: COLORS.ACCENT, strokeWidth: 2 }),
          ...centralArcMark("cen", "O", "A", "B", "P", { fillColor: COLORS.BRAND, strokeColor: COLORS.BRAND, radius: 0.9 }),
          angleMark("A", "P", "B", { fillColor: COLORS.ACCENT, strokeColor: COLORS.ACCENT, radius: 0.9 }),
          readout(-5.7, 5.4, (r) => `central ∠AOB = ${subtendedCentralDeg(r.O, r.A, r.B, r.P).toFixed(1)}°`),
          readout(-5.7, 4.7, (r) => `inscribed ∠APB = ${angleDeg(r.A, r.P, r.B).toFixed(1)}°`),
        ],
      },
      answerConfig: {
        kind: "multiple-choice",
        options: [
          { id: "eq", label: "Equal to it" },
          { id: "half", label: "Half of it" },
          { id: "dbl", label: "Double it" },
          { id: "qtr", label: "A quarter of it" },
        ],
        correctOptionId: "half",
      },
      explanations: [
        {
          triggerCondition: "default_wrong",
          text: "Compare the two readouts: the inscribed angle is always exactly **half** the central angle subtending the same arc.",
        },
        {
          triggerCondition: "selected_dbl",
          text: "You have it backwards — the *central* angle is double the inscribed angle, so the inscribed angle is **half** the central angle.",
        },
      ],
      solutionText:
        "Inscribed Angle Theorem: $\\angle APB = \\tfrac{1}{2}\\angle AOB$.",
    },
    {
      id: "ia-express",
      prompt:
        "Let the central angle be $c = \\angle AOB$ (see readout). **Express the inscribed angle $\\angle APB$** in terms of $c$.",
      xp: 10,
      boardConfig: {
        boundingBox: BOX,
        elements: [
          center(),
          radiusAnchor(),
          circle("c", "O", "R"),
          glider("A", -3.0, -1.9, "c"),
          glider("B", 3.2, -1.6, "c"),
          glider("P", -0.6, 3.55, "c"),
          segment("O", "A", { strokeColor: COLORS.BRAND, strokeWidth: 2 }),
          segment("O", "B", { strokeColor: COLORS.BRAND, strokeWidth: 2 }),
          segment("P", "A", { strokeColor: COLORS.ACCENT, strokeWidth: 2 }),
          segment("P", "B", { strokeColor: COLORS.ACCENT, strokeWidth: 2 }),
          ...centralArcMark("cen", "O", "A", "B", "P", { fillColor: COLORS.BRAND, strokeColor: COLORS.BRAND, radius: 0.9 }),
          angleMark("A", "P", "B", { fillColor: COLORS.ACCENT, strokeColor: COLORS.ACCENT, radius: 0.9 }),
          readout(-5.7, 5.4, (r) => `c = ∠AOB = ${subtendedCentralDeg(r.O, r.A, r.B, r.P).toFixed(1)}°`),
          readout(-5.7, 4.7, (r) => `∠APB = ${angleDeg(r.A, r.P, r.B).toFixed(1)}°`),
        ],
      },
      answerConfig: {
        kind: "algebraic",
        correctExpression: "c/2",
        variables: ["c"],
        placeholder: "c/2",
      },
      explanations: [
        {
          triggerCondition: "default_wrong",
          text: "The inscribed angle is half the central angle: $\\angle APB = \\dfrac{c}{2}$. Check the readouts — the second is always half the first.",
        },
      ],
      solutionText: "$\\angle APB = \\dfrac{c}{2}$.",
    },
    {
      id: "ia-same-arc",
      prompt:
        "Two apexes $P$ and $Q$ both sit on the major arc above chord $AB$. Drag them independently. What is true of $\\angle APB$ and $\\angle AQB$?",
      xp: 12,
      boardConfig: {
        boundingBox: BOX,
        elements: [
          center(),
          radiusAnchor(),
          circle("c", "O", "R"),
          { ...glider("A", -3.38, -1.23, "c"), constrain: keepChordClearOfApexes("O", "B", ["P", "Q"]) },
          { ...glider("B", 3.38, -1.23, "c"), constrain: keepChordClearOfApexes("O", "A", ["P", "Q"]) },
          { ...glider("P", -1.8, 3.1, "c"), constrain: sameSideAsCenter("O", "A", "B") },
          { ...glider("Q", 2.0, 2.95, "c"), constrain: sameSideAsCenter("O", "A", "B") },
          segment("P", "A", { strokeColor: COLORS.ACCENT, strokeWidth: 2 }),
          segment("P", "B", { strokeColor: COLORS.ACCENT, strokeWidth: 2 }),
          segment("Q", "A", { strokeColor: COLORS.BRAND, strokeWidth: 2 }),
          segment("Q", "B", { strokeColor: COLORS.BRAND, strokeWidth: 2 }),
          angleMark("A", "P", "B", { fillColor: COLORS.ACCENT, strokeColor: COLORS.ACCENT, radius: 0.8 }),
          angleMark("A", "Q", "B", { fillColor: COLORS.BRAND, strokeColor: COLORS.BRAND, radius: 0.8 }),
          readout(-5.7, 5.4, (r) => `∠APB = ${angleDeg(r.A, r.P, r.B).toFixed(1)}°`),
          readout(-5.7, 4.7, (r) => `∠AQB = ${angleDeg(r.A, r.Q, r.B).toFixed(1)}°`),
        ],
      },
      answerConfig: {
        kind: "multiple-choice",
        options: [
          { id: "equal", label: "They are always equal" },
          { id: "sum180", label: "They sum to $180^\\circ$" },
          { id: "depends", label: "It depends on where $P$ and $Q$ are" },
        ],
        correctOptionId: "equal",
      },
      explanations: [
        {
          triggerCondition: "default_wrong",
          text: "Both angles subtend the same arc $AB$, so each equals half the same central angle — hence they are **equal**. This is why concyclic points are so powerful in angle chasing.",
        },
      ],
      solutionText:
        "Angles subtending the same arc are equal: $\\angle APB = \\angle AQB$.",
    },
    {
      id: "ia-semicircle",
      prompt:
        "Now $AB$ is a **diameter** (it passes through the center $O$). Drag $P$ around the circle. What is $\\angle APB$?",
      xp: 12,
      boardConfig: {
        boundingBox: BOX,
        elements: [
          center(),
          { id: "A", type: "point", parents: [-3.6, 0], attributes: { name: "A", fixed: true, size: 4, fillColor: "#fff", strokeColor: COLORS.BRAND, strokeWidth: 2 } },
          { id: "B", type: "point", parents: [3.6, 0], attributes: { name: "B", fixed: true, size: 4, fillColor: "#fff", strokeColor: COLORS.BRAND, strokeWidth: 2 } },
          circle("c", "O", "B"),
          segment("A", "B", { strokeColor: "#94a3b8", strokeWidth: 2, dash: 2 }),
          glider("P", 1.2, 3.4, "c"),
          segment("P", "A", { strokeColor: COLORS.ACCENT, strokeWidth: 2 }),
          segment("P", "B", { strokeColor: COLORS.ACCENT, strokeWidth: 2 }),
          angleMark("A", "P", "B", { fillColor: COLORS.ACCENT, strokeColor: COLORS.ACCENT }),
          readout(-5.7, 5.4, (r) => `∠APB = ${angleDeg(r.A, r.P, r.B).toFixed(1)}°`),
        ],
      },
      answerConfig: {
        kind: "multiple-choice",
        options: [
          { id: "a60", label: "$60^\\circ$" },
          { id: "a90", label: "$90^\\circ$" },
          { id: "a120", label: "It varies as $P$ moves" },
        ],
        correctOptionId: "a90",
      },
      explanations: [
        {
          triggerCondition: "default_wrong",
          text: "A diameter spans a central angle of $180^\\circ$, so the inscribed angle is half of that: $90^\\circ$. The angle in a semicircle is always a right angle (Thales' theorem).",
        },
      ],
      solutionText: "Thales: an angle inscribed in a semicircle is $90^\\circ$.",
    },
    {
      id: "ia-arc",
      prompt:
        "An inscribed angle cuts off an arc of measure $a^\\circ$ (the central angle over that arc, shown purple). **Express the inscribed angle** in terms of $a$.",
      xp: 11,
      boardConfig: {
        boundingBox: BOX,
        elements: [
          center(),
          radiusAnchor(),
          circle("c", "O", "R"),
          glider("A", -3.2, -1.6, "c"),
          glider("B", 2.6, -2.5, "c"),
          glider("P", 0.2, 3.59, "c"),
          segment("O", "A", { strokeColor: COLORS.BRAND, strokeWidth: 2 }),
          segment("O", "B", { strokeColor: COLORS.BRAND, strokeWidth: 2 }),
          segment("P", "A", { strokeColor: COLORS.ACCENT, strokeWidth: 2 }),
          segment("P", "B", { strokeColor: COLORS.ACCENT, strokeWidth: 2 }),
          ...centralArcMark("cen", "O", "A", "B", "P", { fillColor: COLORS.BRAND, strokeColor: COLORS.BRAND, radius: 0.9 }),
          angleMark("A", "P", "B", { fillColor: COLORS.ACCENT, strokeColor: COLORS.ACCENT, radius: 0.9 }),
          readout(-5.7, 5.4, (r) => `arc a = ${subtendedCentralDeg(r.O, r.A, r.B, r.P).toFixed(1)}°`),
          readout(-5.7, 4.7, (r) => `inscribed = ${angleDeg(r.A, r.P, r.B).toFixed(1)}°`),
        ],
      },
      answerConfig: {
        kind: "algebraic",
        correctExpression: "a/2",
        variables: ["a"],
        placeholder: "a/2",
      },
      explanations: [
        {
          triggerCondition: "default_wrong",
          text: "The arc's measure equals its central angle $a$, and the inscribed angle is half the central angle, so the inscribed angle is $\\dfrac{a}{2}$.",
        },
      ],
      solutionText: "Inscribed angle $= \\dfrac{a}{2}$ where $a$ is the subtended arc.",
    },
  ],
};
