import type { Lesson } from "@/lib/content/types";
import { angleDeg } from "@/lib/geometry/measure";
import {
  angleBisector,
  angleLabel,
  angleMark,
  COLORS,
  intersection,
  point,
  polygon,
  readout,
  segment,
} from "@/lib/content/boards";

const BOX: [number, number, number, number] = [-6, 6, 6, -6];

function triangleWithIncenter() {
  return [
    point("A", -3.5, -2.2),
    point("B", 3.5, -2.6),
    point("C", 0.4, 3),
    polygon(["A", "B", "C"]),
    angleBisector("B", "A", "C", "bisA"),
    angleBisector("A", "B", "C", "bisB"),
    intersection("I", "bisA", "bisB"),
    segment("I", "A", { strokeColor: COLORS.OK, strokeWidth: 1.5, dash: 2 }),
    segment("I", "B", { strokeColor: COLORS.OK, strokeWidth: 1.5, dash: 2 }),
    segment("I", "C", { strokeColor: COLORS.OK, strokeWidth: 1.5, dash: 2 }),
  ];
}

export const incenterLemma: Lesson = {
  id: "incenter-lemma",
  title: "Incenter & Excenter Lemma",
  summary:
    "The incenter is where angle bisectors meet — and it unlocks classic angle-chase identities.",
  concept:
    "The **incenter** $I$ of $\\triangle ABC$ is the intersection of the three **internal angle bisectors**. So $\\angle BAI = \\angle CAI = A/2$, and similarly at $B$ and $C$. A famous identity: $\\angle BIC = 90^\\circ + A/2$. Drag the triangle — $I$ moves with it, but these relations never break.",
  completionXp: 35,
  problems: [
    {
      id: "il-what-is-i",
      prompt:
        "Point $I$ is constructed from $\\triangle ABC$ as shown. **What is $I$?**",
      xp: 10,
      boardConfig: {
        boundingBox: BOX,
        elements: triangleWithIncenter(),
      },
      answerConfig: {
        kind: "multiple-choice",
        options: [
          { id: "circ", label: "The circumcenter" },
          { id: "inc", label: "The incenter (angle-bisector intersection)" },
          { id: "orth", label: "The orthocenter" },
          { id: "cent", label: "The centroid" },
        ],
        correctOptionId: "inc",
      },
      explanations: [
        {
          triggerCondition: "default_wrong",
          text: "$I$ lies on the bisector of $\\angle A$ **and** the bisector of $\\angle B$. That intersection is the **incenter** — equidistant from all three sides.",
          boardOverlayConfig: {
            elements: [
              angleMark("B", "A", "C", {
                fillColor: COLORS.BRAND,
                strokeColor: COLORS.BRAND,
                radius: 1.1,
              }),
              angleMark("A", "B", "C", {
                fillColor: COLORS.ACCENT,
                strokeColor: COLORS.ACCENT,
                radius: 1.1,
              }),
            ],
          },
        },
      ],
      solutionText:
        "The incenter is the intersection of the internal angle bisectors of a triangle.",
    },
    {
      id: "il-bai",
      prompt:
        "Let $A = \\angle BAC$ (see readout). **Express $\\angle BAI$** in terms of $A$.",
      xp: 12,
      boardConfig: {
        boundingBox: BOX,
        elements: [
          ...triangleWithIncenter(),
          angleMark("B", "A", "C", { radius: 0.85 }),
          angleMark("B", "A", "I", { fillColor: COLORS.ACCENT, strokeColor: COLORS.ACCENT, radius: 0.55 }),
          angleLabel("B", "A", "C", { color: COLORS.BRAND, dist: 1.2, prefix: "A=" }),
          readout(-5.7, 5.4, (r) => `∠BAC = ${angleDeg(r.B, r.A, r.C).toFixed(1)}°`),
          readout(-5.7, 4.7, (r) => `∠BAI = ${angleDeg(r.B, r.A, r.I).toFixed(1)}°`),
        ],
      },
      answerConfig: {
        kind: "algebraic",
        correctExpression: "A/2",
        variables: ["A"],
        placeholder: "e.g. A/2",
      },
      explanations: [
        {
          triggerCondition: "default_wrong",
          text: "$AI$ bisects $\\angle A$, so $\\angle BAI = \\tfrac{A}{2}$. Compare the two readouts: the second is always half the first.",
        },
      ],
      solutionText: "Since $AI$ is an angle bisector, $\\angle BAI = A/2$.",
    },
    {
      id: "il-verify-bisect",
      prompt:
        "Drag the triangle, then press **Check**. We'll verify that $AI$ really **bisects** $\\angle A$ on your current configuration.",
      xp: 12,
      boardConfig: {
        boundingBox: BOX,
        elements: [
          ...triangleWithIncenter(),
          readout(-5.7, 5.4, (r) => `∠BAI = ${angleDeg(r.B, r.A, r.I).toFixed(1)}°`),
          readout(-5.7, 4.7, (r) => `∠CAI = ${angleDeg(r.C, r.A, r.I).toFixed(1)}°`),
        ],
      },
      answerConfig: {
        kind: "geometric",
        instruction:
          "Drag $A$, $B$, or $C$ to a new shape, then submit. We check that $\\angle BAI \\approx \\angle CAI$.",
        check: (r) => {
          if (!r.A || !r.B || !r.C || !r.I) return false;
          const bai = angleDeg(r.B, r.A, r.I);
          const cai = angleDeg(r.C, r.A, r.I);
          return Math.abs(bai - cai) < 1.5;
        },
      },
      explanations: [
        {
          triggerCondition: "default_wrong",
          text: "On the incenter, $\\angle BAI$ and $\\angle CAI$ should match to within a degree. Drag the triangle and try again — they stay equal because $AI$ is the bisector.",
          boardOverlayConfig: {
            elements: [
              angleMark("B", "A", "I", { fillColor: COLORS.ACCENT, radius: 0.7 }),
              angleMark("C", "A", "I", { fillColor: COLORS.WRONG, radius: 0.5 }),
            ],
          },
        },
      ],
      solutionText: "$AI$ bisects $\\angle A$, so $\\angle BAI = \\angle CAI$ for every triangle.",
    },
    {
      id: "il-bic",
      prompt:
        "A classic incenter identity: **express $\\angle BIC$** in terms of $A = \\angle BAC$.",
      xp: 12,
      boardConfig: {
        boundingBox: BOX,
        elements: [
          ...triangleWithIncenter(),
          angleMark("B", "I", "C", { fillColor: COLORS.ACCENT, strokeColor: COLORS.ACCENT, radius: 0.75 }),
          readout(-5.7, 5.4, (r) => `A = ${angleDeg(r.B, r.A, r.C).toFixed(1)}°`),
          readout(-5.7, 4.7, (r) => `∠BIC = ${angleDeg(r.B, r.I, r.C).toFixed(1)}°`),
        ],
      },
      answerConfig: {
        kind: "algebraic",
        correctExpression: "90 + A/2",
        variables: ["A"],
        placeholder: "e.g. 90 + A/2",
      },
      explanations: [
        {
          triggerCondition: "default_wrong",
          text: "At the incenter, $\\angle BIC = 90^\\circ + \\tfrac{A}{2}$. Check: add half of $A$ to $90$ and compare with the $\\angle BIC$ readout.",
        },
      ],
      solutionText: "$\\angle BIC = 90^\\circ + \\tfrac{A}{2}$ — a workhorse identity in olympiad geometry.",
    },
    {
      id: "il-excenter-mc",
      prompt:
        "The **$A$-excenter** $I_A$ is the intersection of the **external** bisectors at $B$ and $C$ and the **internal** bisector at $A$. Which angle identity is true at $I_A$?",
      xp: 10,
      boardConfig: {
        boundingBox: BOX,
        elements: [
          point("A", -3.5, -2.2),
          point("B", 3.5, -2.6),
          point("C", 0.4, 3),
          polygon(["A", "B", "C"]),
          angleMark("B", "A", "C", { radius: 0.8 }),
          readout(-5.7, 5.4, () => "Excenter facts are symmetric to incenter facts."),
        ],
      },
      answerConfig: {
        kind: "multiple-choice",
        options: [
          { id: "a", label: "$\\angle BI_AC = 90^\\circ - \\tfrac{A}{2}$" },
          { id: "b", label: "$\\angle BI_AC = 90^\\circ + \\tfrac{A}{2}$" },
          { id: "c", label: "$\\angle BI_AC = \\tfrac{A}{2}$" },
          { id: "d", label: "$\\angle BI_AC = 180^\\circ - A$" },
        ],
        correctOptionId: "a",
      },
      explanations: [
        {
          triggerCondition: "default_wrong",
          text: "At the $A$-excenter, $\\angle BI_AC = 90^\\circ - \\tfrac{A}{2}$ (compare with $90^\\circ + \\tfrac{A}{2}$ at the incenter). The excenter 'flips' the incenter identity.",
        },
        {
          triggerCondition: "selected_b",
          text: "$90^\\circ + \\tfrac{A}{2}$ is the **incenter** identity for $\\angle BIC$, not the excenter. At $I_A$ you get $90^\\circ - \\tfrac{A}{2}$.",
        },
      ],
      solutionText:
        "At the $A$-excenter: $\\angle BI_AC = 90^\\circ - \\tfrac{A}{2}$.",
    },
  ],
};
