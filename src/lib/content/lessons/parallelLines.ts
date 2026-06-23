import type { Lesson } from "@/lib/content/types";
import { parallelAngleDeg } from "@/lib/geometry/parallelAngles";
import { COLORS, parallelAngleMark, readout } from "@/lib/content/boards";
import type { BoardElementDef } from "@/lib/geometry/board-types";

const BOX: [number, number, number, number] = [-6, 6, 6, -6];

const MARK = { radius: 0.8, fillOpacity: 0.3 };

function hidden(id: string, x: number, y: number): BoardElementDef {
  return { id, type: "point", parents: [x, y], attributes: { visible: false, fixed: true } };
}

/** Two parallel lines + a draggable transversal, with the two intersection points. */
function baseParallel(): BoardElementDef[] {
  return [
    hidden("L1L", -5.5, 2.2),
    hidden("L1R", 5.5, 2.2),
    hidden("L2L", -5.5, -2.2),
    hidden("L2R", 5.5, -2.2),
    { id: "line1", type: "line", parents: [{ ref: "L1L" }, { ref: "L1R" }], attributes: { strokeColor: "#475569", strokeWidth: 2.5 } },
    { id: "line2", type: "line", parents: [{ ref: "L2L" }, { ref: "L2R" }], attributes: { strokeColor: "#475569", strokeWidth: 2.5 } },
    { id: "U", type: "point", parents: [1.6, 4.4], attributes: { name: "", size: 4, fillColor: "#fff", strokeColor: COLORS.BRAND, strokeWidth: 2 } },
    { id: "V", type: "point", parents: [-1.6, -4.4], attributes: { name: "", size: 4, fillColor: "#fff", strokeColor: COLORS.BRAND, strokeWidth: 2 } },
    { id: "trans", type: "line", parents: [{ ref: "U" }, { ref: "V" }], attributes: { strokeColor: COLORS.BRAND, strokeWidth: 2.5 } },
    { id: "P1", type: "intersection", parents: [{ ref: "line1" }, { ref: "trans" }, 0], attributes: { name: "P", size: 3, fillColor: COLORS.BRAND, strokeColor: COLORS.BRAND } },
    { id: "P2", type: "intersection", parents: [{ ref: "line2" }, { ref: "trans" }, 0], attributes: { name: "Q", size: 3, fillColor: COLORS.BRAND, strokeColor: COLORS.BRAND } },
  ];
}

export const parallelLines: Lesson = {
  id: "parallel-lines",
  title: "Parallel Lines & Transversals",
  summary: "Corresponding angles are equal; co-interior angles sum to 180°.",
  concept:
    "When a transversal cuts two **parallel** lines, **corresponding angles are equal**, **alternate angles are equal**, and **co-interior (same-side) angles sum to $180^\\circ$**. These rules let you 'transport' angles across a figure — the backbone of angle chasing.",
  completionXp: 35,
  problems: [
    {
      id: "pl-corresponding",
      prompt:
        "The transversal crosses two parallel lines at $P$ and $Q$. Drag $P$'s and $Q$'s controls to change the slope. Compare the two marked **corresponding** angles.",
      xp: 10,
      boardConfig: {
        boundingBox: BOX,
        elements: [
          ...baseParallel(),
          ...parallelAngleMark("corrP", "P1", "corresponding", {
            ...MARK,
            fillColor: COLORS.ACCENT,
            strokeColor: COLORS.ACCENT,
          }),
          ...parallelAngleMark("corrQ", "P2", "corresponding", {
            ...MARK,
            fillColor: COLORS.ACCENT,
            strokeColor: COLORS.ACCENT,
          }),
          readout(-5.7, 5.4, (r) => `angle at P = ${parallelAngleDeg(r, "P1", "corresponding").toFixed(1)}°`),
          readout(-5.7, 4.7, (r) => `angle at Q = ${parallelAngleDeg(r, "P2", "corresponding").toFixed(1)}°`),
        ],
      },
      answerConfig: {
        kind: "multiple-choice",
        options: [
          { id: "equal", label: "They are equal" },
          { id: "sum", label: "They sum to $180^\\circ$" },
          { id: "depends", label: "It depends on the slope" },
        ],
        correctOptionId: "equal",
      },
      explanations: [
        {
          triggerCondition: "default_wrong",
          text: "Corresponding angles (same position at each intersection) are **equal** when the lines are parallel. The two readouts always match.",
        },
      ],
      solutionText: "Corresponding angles are equal across parallel lines.",
    },
    {
      id: "pl-alternate",
      prompt:
        "Now the marked angles are **alternate interior** angles (a 'Z' shape, on opposite sides of the transversal between the lines). What is true of them?",
      xp: 11,
      boardConfig: {
        boundingBox: BOX,
        elements: [
          ...baseParallel(),
          ...parallelAngleMark("altP", "P1", "alternate", {
            ...MARK,
            fillColor: COLORS.BRAND,
            strokeColor: COLORS.BRAND,
          }),
          ...parallelAngleMark("altQ", "P2", "alternate", {
            ...MARK,
            fillColor: COLORS.BRAND,
            strokeColor: COLORS.BRAND,
          }),
          readout(-5.7, 5.4, (r) => `alt. angle at P = ${parallelAngleDeg(r, "P1", "alternate").toFixed(1)}°`),
          readout(-5.7, 4.7, (r) => `alt. angle at Q = ${parallelAngleDeg(r, "P2", "alternate").toFixed(1)}°`),
        ],
      },
      answerConfig: {
        kind: "multiple-choice",
        options: [
          { id: "equal", label: "They are equal" },
          { id: "sum", label: "They sum to $90^\\circ$" },
          { id: "depends", label: "It depends on the slope" },
        ],
        correctOptionId: "equal",
      },
      explanations: [
        {
          triggerCondition: "default_wrong",
          text: "Alternate interior angles are **equal**. (Each equals $180^\\circ$ minus the corresponding angle, so they match each other.)",
        },
      ],
      solutionText: "Alternate interior angles are equal.",
    },
    {
      id: "pl-cointerior",
      prompt:
        "The two marked angles are **co-interior** (same side of the transversal, between the lines). Drag and read off their sum. What is $\\angle$P $+ \\angle$Q here?",
      xp: 11,
      boardConfig: {
        boundingBox: BOX,
        elements: [
          ...baseParallel(),
          ...parallelAngleMark("cointP", "P1", "cointerior", {
            ...MARK,
            fillColor: COLORS.ACCENT,
            strokeColor: COLORS.ACCENT,
          }),
          ...parallelAngleMark("cointQ", "P2", "cointerior", {
            ...MARK,
            fillColor: COLORS.BRAND,
            strokeColor: COLORS.BRAND,
          }),
          readout(-5.7, 5.4, (r) => `∠P = ${parallelAngleDeg(r, "P1", "cointerior").toFixed(1)}°`),
          readout(-5.7, 4.7, (r) => `∠Q = ${parallelAngleDeg(r, "P2", "cointerior").toFixed(1)}°`),
          readout(-5.7, 4.0, (r) => {
            const p = parallelAngleDeg(r, "P1", "cointerior");
            const q = parallelAngleDeg(r, "P2", "cointerior");
            return `sum = ${(p + q).toFixed(1)}°`;
          }),
        ],
      },
      answerConfig: {
        kind: "multiple-choice",
        options: [
          { id: "o90", label: "$90^\\circ$" },
          { id: "o180", label: "$180^\\circ$" },
          { id: "o360", label: "$360^\\circ$" },
        ],
        correctOptionId: "o180",
      },
      explanations: [
        {
          triggerCondition: "default_wrong",
          text: "Co-interior (same-side interior) angles are **supplementary**: they sum to $180^\\circ$, as the readout confirms.",
        },
      ],
      solutionText: "Co-interior angles sum to $180^\\circ$.",
    },
    {
      id: "pl-express",
      prompt:
        "Call the co-interior angle at $P$ simply $x$ (see readout). **Express the co-interior angle at $Q$** in terms of $x$.",
      xp: 12,
      boardConfig: {
        boundingBox: BOX,
        elements: [
          ...baseParallel(),
          ...parallelAngleMark("cointP", "P1", "cointerior", {
            ...MARK,
            fillColor: COLORS.ACCENT,
            strokeColor: COLORS.ACCENT,
          }),
          ...parallelAngleMark("cointQ", "P2", "cointerior", {
            ...MARK,
            fillColor: COLORS.BRAND,
            strokeColor: COLORS.BRAND,
          }),
          readout(-5.7, 5.4, (r) => `x = ∠P = ${parallelAngleDeg(r, "P1", "cointerior").toFixed(1)}°`),
          readout(-5.7, 4.7, (r) => `∠Q = ${parallelAngleDeg(r, "P2", "cointerior").toFixed(1)}°`),
        ],
      },
      answerConfig: {
        kind: "algebraic",
        correctExpression: "180 - x",
        variables: ["x"],
        placeholder: "180 - x",
      },
      explanations: [
        {
          triggerCondition: "default_wrong",
          text: "Co-interior angles are supplementary, so the angle at $Q$ is $180^\\circ - x$.",
        },
      ],
      solutionText: "Co-interior angle at $Q = 180^\\circ - x$.",
    },
    {
      id: "pl-perp",
      prompt:
        "**Drag the transversal** until it is perpendicular to the parallel lines — i.e. the corresponding angle at $P$ is $90^\\circ$. Submit when you reach it.",
      xp: 14,
      boardConfig: {
        boundingBox: BOX,
        elements: [
          ...baseParallel(),
          ...parallelAngleMark("corrP", "P1", "corresponding", {
            ...MARK,
            fillColor: COLORS.ACCENT,
            strokeColor: COLORS.ACCENT,
          }),
          readout(-5.7, 5.4, (r) => `angle at P = ${parallelAngleDeg(r, "P1", "corresponding").toFixed(1)}°`),
        ],
      },
      answerConfig: {
        kind: "geometric",
        instruction: "Drag the transversal endpoints until the angle at P = 90°.",
        check: (r) => Math.abs(parallelAngleDeg(r, "P1", "corresponding") - 90) < 2,
      },
      explanations: [
        {
          triggerCondition: "default_wrong",
          text: "Not perpendicular yet — adjust the transversal until the angle at $P$ reads $90^\\circ$. When a transversal is perpendicular to one of two parallel lines, it's perpendicular to both.",
        },
      ],
      solutionText:
        "A transversal perpendicular to one parallel line is perpendicular to the other as well.",
    },
  ],
};
