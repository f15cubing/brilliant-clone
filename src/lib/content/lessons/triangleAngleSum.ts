import type { Lesson, Problem } from "@/lib/content/types";
import { angleDeg } from "@/lib/geometry/measure";
import {
  angleLabel,
  angleMark,
  circle,
  COLORS,
  point,
  polygon,
  readout,
  segment,
} from "@/lib/content/boards";

const BOX: [number, number, number, number] = [-6, 6, 6, -6];

// Algebraic: express the third angle. Rendered by the unchanged ProblemPlayer
// and referenced from both `problems` and a `problem` stage.
const solveCProblem: Problem = {
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
};

// Algebraic: the exterior-angle consequence. Referenced from both `problems`
// and a `problem` stage.
const exteriorProblem: Problem = {
  id: "tas-exterior",
  prompt:
    "The ray $BC$ is extended to $D$, forming the **exterior angle** $\\angle ACD$ (shown in blue). Express $\\angle ACD$ in terms of $\\angle A$ and $\\angle B$.",
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
          { fn: (r) => r.C.X() + (r.C.X() - r.B.X()) * 0.6 },
          { fn: (r) => r.C.Y() + (r.C.Y() - r.B.Y()) * 0.6 },
        ],
        attributes: { name: "D", size: 2, fixed: true, color: "#9c8c70" },
      },
      polygon(["A", "B", "C"]),
      segment("C", "D", { strokeColor: "#9c8c70", dash: 2 }),
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
};

// Geometric action: drag C until the apex angle is a right angle. Referenced
// from both `problems` and a `problem` stage.
const makeRightProblem: Problem = {
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
      { id: "M", type: "midpoint", parents: [{ ref: "A" }, { ref: "B" }], attributes: { visible: false, fixed: true } },
      circle("dia", "M", "A", { strokeColor: "#9c8c70", strokeWidth: 1.5, dash: 2 }),
      readout(-5.7, -5.2, () => "Dashed circle: diameter AB"),
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
      text: "Not quite $90^\\circ$ yet. The set of points $C$ with $\\angle ACB = 90^\\circ$ forms the circle with diameter $AB$ — you'll meet this again in the inscribed-angle lesson.",
    },
  ],
  solutionText:
    "Every right-angled position of $C$ lies on the circle with diameter $AB$.",
};

export const triangleAngleSum: Lesson = {
  id: "triangle-angle-sum",
  title: "Angles in a Triangle",
  summary: "The interior angles of any triangle sum to 180°.",
  concept:
    "In **any** triangle, the three interior angles add up to $180^\\circ$. Drag the vertices and watch the relationship hold for every shape. An immediate consequence: an *exterior* angle equals the sum of the two remote interior angles.",
  completionXp: 30,
  problems: [solveCProblem, exteriorProblem, makeRightProblem],
  stages: [
    {
      kind: "concept",
      title: "The idea",
      body: "In **any** triangle the three interior angles add up to $180^\\circ$ — drag the vertices and watch it hold for every shape. We'll measure it, prove it with one construction line, and then put it to work, including its useful cousin: an *exterior* angle equals the sum of the two remote interior angles.",
    },
    {
      kind: "instruction-mc",
      problem: {
        id: "tas-sum",
        prompt:
          "Drag the vertices $A$, $B$, $C$ and watch the live **Sum** readout. What is $\\angle A + \\angle B + \\angle C$ for **every** triangle?",
        exploreHint: "Drag A, B, C and watch the Sum",
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
        xp: 10,
        options: [
          {
            id: "o90",
            label: "$90^\\circ$",
            correct: false,
            misconception: "right-angle-guess",
            teaching:
              "Too small — $90^\\circ$ is a single right angle, not the total. The **Sum** readout sits at $180^\\circ$, twice that.",
          },
          {
            id: "o180",
            label: "$180^\\circ$",
            correct: true,
            teaching:
              "Exactly. Drag any vertex and the **Sum** readout stays pinned at $180^\\circ$ — the three interior angles of every triangle total $180^\\circ$.",
          },
          {
            id: "o360",
            label: "$360^\\circ$",
            correct: false,
            misconception: "exterior-sum",
            teaching:
              "$360^\\circ$ is the sum of the *exterior* angles (or the angles around a point). The *interior* angles of a triangle sum to $180^\\circ$ — check the readout.",
          },
          {
            id: "ovar",
            label: "It depends on the triangle",
            correct: false,
            misconception: "thinks-varies",
            teaching:
              "Drag the vertices through tall, flat, and skewed shapes — the **Sum** readout never budges from $180^\\circ$. It's the same for every triangle.",
          },
        ],
        consolidation: {
          principle:
            "**Angle sum of a triangle:** the three interior angles of any triangle add up to $180^\\circ$ — $\\angle A + \\angle B + \\angle C = 180^\\circ$.",
          selfExplainPrompt:
            "In your own words: why does the total stay $180^\\circ$ no matter how you drag the vertices?",
        },
      },
    },
    {
      kind: "comprehension",
      task: {
        id: "tas-proof",
        prompt:
          "But *why* is it always $180^\\circ$? Draw a line through the apex $C$ **parallel to the base $AB$**, then justify each step.",
        xp: 10,
        lines: [
          {
            statement:
              "Draw a line through $C$ parallel to $AB$. The angle it makes with $CA$ equals $\\angle A$, and the angle it makes with $CB$ equals $\\angle B$.",
            reasons: [
              {
                id: "alt",
                label: "Alternate angles (parallel lines)",
                correct: true,
                teaching:
                  "Yes — $CA$ and $CB$ are transversals cutting the two parallel lines, so each base angle reappears at $C$ as its alternate angle.",
              },
              {
                id: "corr",
                label: "Corresponding angles",
                correct: false,
                misconception: "wrong-parallel-pair",
                teaching:
                  "Corresponding angles sit on the *same* side of the transversal; here the matching angles are on opposite sides of $CA$ (and $CB$), so they are **alternate** angles.",
              },
              {
                id: "vert",
                label: "Vertical angles",
                correct: false,
                misconception: "no-crossing",
                teaching:
                  "Vertical angles need two crossing lines at a single point. The equality here comes from the parallel line, i.e. alternate angles.",
              },
            ],
          },
          {
            statement:
              "Those two angles together with $\\angle ACB$ lie along the straight line through $C$, so the three of them sum to $180^\\circ$.",
            reasons: [
              {
                id: "straight",
                label: "Angles on a straight line",
                correct: true,
                teaching:
                  "Right — the three angles sit side by side along one straight line through $C$, so they make a straight angle of $180^\\circ$.",
              },
              {
                id: "around",
                label: "Angles around a point sum to $360^\\circ$",
                correct: false,
                misconception: "full-turn",
                teaching:
                  "A full turn is $360^\\circ$, but these three angles only cover the half-turn *above* the straight line, which is $180^\\circ$.",
              },
              {
                id: "tsum",
                label: "Angle sum in a triangle",
                correct: false,
                misconception: "circular",
                teaching:
                  "That would be circular — the triangle angle sum is exactly what we're proving. This line stands on the straight angle at $C$.",
              },
            ],
          },
          {
            statement:
              "$\\therefore\\ \\angle A + \\angle B + \\angle ACB = 180^\\circ$.",
            reasons: [
              {
                id: "subst",
                label: "Substituting the equal alternate angles",
                correct: true,
                teaching:
                  "Exactly — replace the two angles at $C$ with the equal $\\angle A$ and $\\angle B$ from the first line, and the straight-line sum becomes the triangle's three interior angles.",
              },
              {
                id: "ext",
                label: "Exterior angle theorem",
                correct: false,
                misconception: "wrong-rule",
                teaching:
                  "The exterior-angle rule is a *consequence* of this result, not the reason. Here we simply substitute the equal alternate angles into the straight-line sum.",
              },
              {
                id: "isos",
                label: "Base angles of an isosceles triangle",
                correct: false,
                misconception: "needs-isosceles",
                teaching:
                  "Nothing here is assumed isosceles — the proof works for *any* triangle by substituting the alternate angles.",
              },
            ],
          },
        ],
        validatedText:
          "That's the whole proof: a line through $C$ parallel to $AB$ makes the base angles $\\angle A$ and $\\angle B$ reappear at the apex as alternate angles, and those two plus $\\angle ACB$ lie on a straight line — so the interior angles sum to $180^\\circ$ for every triangle.",
      },
    },
    { kind: "problem", problem: solveCProblem },
    { kind: "problem", problem: exteriorProblem },
    {
      kind: "instruction-mc",
      problem: {
        id: "tas-straight-line",
        prompt:
          "Point $O$ lies on the straight line $XY$, and ray $OP$ splits the angle. Drag $P$ and watch the **sum** readout. What do $\\angle XOP$ and $\\angle POY$ always sum to?",
        exploreHint: "Drag P and watch the sum",
        boardConfig: {
          boundingBox: BOX,
          elements: [
            { id: "X", type: "point", parents: [-4.5, 0], attributes: { name: "X", fixed: true, size: 3, color: "#9c8c70" } },
            { id: "Y", type: "point", parents: [4.5, 0], attributes: { name: "Y", fixed: true, size: 3, color: "#9c8c70" } },
            { id: "O", type: "point", parents: [0, 0], attributes: { name: "O", fixed: true, size: 4, fillColor: "#fff", strokeColor: COLORS.BRAND, strokeWidth: 2 } },
            segment("X", "Y", { strokeColor: "#9c8c70", strokeWidth: 2 }),
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
        xp: 10,
        options: [
          {
            id: "s90",
            label: "$90^\\circ$",
            correct: false,
            misconception: "right-angle-guess",
            teaching:
              "$90^\\circ$ only happens when $OP$ is perpendicular to $XY$. Drag $P$ and the **sum** readout still holds at $180^\\circ$.",
          },
          {
            id: "s180",
            label: "$180^\\circ$",
            correct: true,
            teaching:
              "Right. The two angles fill the half-turn above the line $XY$, so the **sum** readout stays at $180^\\circ$ wherever $P$ goes.",
          },
          {
            id: "s360",
            label: "$360^\\circ$",
            correct: false,
            misconception: "full-turn",
            teaching:
              "$360^\\circ$ is a full turn (all the way around $O$). These two angles only cover the half-turn on one side of $XY$, which is $180^\\circ$.",
          },
        ],
        consolidation: {
          principle:
            "**Angles on a straight line** sum to $180^\\circ$ — this straight-angle fact is what the parallel-line proof leaned on.",
        },
      },
    },
    { kind: "problem", problem: makeRightProblem },
  ],
};
