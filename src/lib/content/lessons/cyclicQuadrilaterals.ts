import type { Lesson, Problem } from "@/lib/content/types";
import { angleDeg } from "@/lib/geometry/measure";
import {
  angleMark,
  COLORS,
  glider,
  keepConvexOrder,
  polygon,
  readout,
  segment,
} from "@/lib/content/boards";
import type { BoardElementDef } from "@/lib/geometry/board-types";

const BOX: [number, number, number, number] = [-6, 6, 6, -6];

function center(): BoardElementDef {
  return {
    id: "O",
    type: "point",
    parents: [0, 0],
    attributes: { name: "O", size: 3, fixed: true, fillColor: "#fff", strokeColor: "#9c8c70", strokeWidth: 2 },
  };
}
function cyclicQuad(): BoardElementDef[] {
  const ORDER = ["A", "B", "C", "D"];
  const convex = keepConvexOrder("O", ORDER);
  return [
    center(),
    { id: "c", type: "circle", parents: [{ ref: "O" }, 3.7], attributes: { strokeColor: "#9c8c70", strokeWidth: 2 } },
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

// Stage 4 (cq-express) and stage 6 (cq-make-right) remain classic problems
// rendered by the unchanged ProblemPlayer; both are referenced from `problems`
// AND from their `{ kind: "problem" }` stages, so the const is the single source.
const expressProblem: Problem = {
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
};

const makeRightProblem: Problem = {
  id: "cq-make-right",
  prompt:
    "**Drag the vertices** until $\\angle A = 90^\\circ$. Watch what happens to the opposite angle $\\angle C$, then submit.",
  xp: 14,
  boardConfig: {
    boundingBox: BOX,
    elements: [
      ...cyclicQuad(),
      segment("B", "D", { strokeColor: COLORS.BRAND, strokeWidth: 2, dash: 2 }),
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
    "With $\\angle A = 90^\\circ$, the opposite angle $\\angle C = 180^\\circ - 90^\\circ = 90^\\circ$. The diagonal $BD$ then passes through the center $O$ — it becomes a diameter (a $90^\\circ$ inscribed angle subtends a diameter).",
};

export const cyclicQuadrilaterals: Lesson = {
  id: "cyclic-quadrilaterals",
  title: "Cyclic Quadrilaterals",
  summary: "Opposite angles of a cyclic quadrilateral sum to 180°.",
  concept:
    "A **cyclic quadrilateral** has all four vertices on one circle. Its key property: **opposite angles sum to $180^\\circ$**. The converse is also true — if a quadrilateral's opposite angles sum to $180^\\circ$, its vertices are concyclic.",
  completionXp: 35,
  problems: [expressProblem, makeRightProblem],
  stages: [
    {
      kind: "concept",
      title: "The idea",
      body: "A **cyclic quadrilateral** has all four vertices on one circle. Its signature property: **opposite angles are supplementary** — each pair sums to $180^\\circ$. We'll watch it hold as you drag, prove *why* from the inscribed-angle rule, then meet its powerful converse.",
    },
    {
      kind: "instruction-mc",
      problem: {
        id: "cq-opposite",
        prompt:
          "$ABCD$ lies on a circle (orange angles are $\\angle A$ and $\\angle C$). Drag the vertices around the circle. What is $\\angle A + \\angle C$?",
        exploreHint: "Drag the vertices around the circle",
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
        xp: 10,
        options: [
          {
            id: "o90",
            label: "$90^\\circ$",
            correct: false,
            misconception: "guess-90",
            teaching:
              "Check the sum readout — it never settles on $90^\\circ$. Opposite angles of a cyclic quadrilateral are **supplementary**, holding steady at $180^\\circ$.",
          },
          {
            id: "o180",
            label: "$180^\\circ$",
            correct: true,
            teaching:
              "Exactly. Drag any vertex around the circle and the sum readout stays pinned at $180^\\circ$: opposite angles are supplementary.",
          },
          {
            id: "o360",
            label: "$360^\\circ$",
            correct: false,
            misconception: "all-four-angles",
            teaching:
              "$360^\\circ$ is the sum of **all four** interior angles. We're adding only the *opposite* pair $\\angle A$ and $\\angle C$, which is half of that: $180^\\circ$.",
          },
          {
            id: "ovar",
            label: "It varies",
            correct: false,
            misconception: "thinks-varies",
            teaching:
              "Individually $\\angle A$ and $\\angle C$ change as you drag, but watch the **sum** readout — it stays locked at $180^\\circ$ throughout.",
          },
        ],
        consolidation: {
          principle:
            "**Cyclic quadrilateral:** opposite angles are supplementary — $\\angle A + \\angle C = 180^\\circ$ (and likewise $\\angle B + \\angle D$).",
          selfExplainPrompt:
            "In your own words: why does the sum stay at $180^\\circ$ no matter how you drag the vertices?",
        },
      },
    },
    {
      kind: "comprehension",
      task: {
        id: "cq-proof",
        prompt:
          "Here is *why* opposite angles are supplementary. $\\angle A$ and $\\angle C$ are inscribed angles standing on the two arcs cut off by diagonal $BD$. Pick the justification for each line.",
        xp: 9,
        boardConfig: {
          boundingBox: BOX,
          elements: [
            center(),
            { id: "c", type: "circle", parents: [{ ref: "O" }, 3.7], attributes: { strokeColor: "#d8cdb8", strokeWidth: 1.5 } },
            { id: "A", type: "point", parents: [-3.2, 1.85], attributes: { name: "A", fixed: true, size: 4, fillColor: "#fff", strokeColor: COLORS.BRAND, strokeWidth: 2, label: { offset: [-14, 4], fontSize: 16 } } },
            { id: "B", type: "point", parents: [1.85, 3.2], attributes: { name: "B", fixed: true, size: 4, fillColor: "#fff", strokeColor: COLORS.BRAND, strokeWidth: 2, label: { offset: [6, 8], fontSize: 16 } } },
            { id: "C", type: "point", parents: [2.83, -2.37], attributes: { name: "C", fixed: true, size: 4, fillColor: "#fff", strokeColor: COLORS.BRAND, strokeWidth: 2, label: { offset: [8, -4], fontSize: 16 } } },
            { id: "D", type: "point", parents: [-3.2, -1.85], attributes: { name: "D", fixed: true, size: 4, fillColor: "#fff", strokeColor: COLORS.BRAND, strokeWidth: 2, label: { offset: [-14, -4], fontSize: 16 } } },
            polygon(["A", "B", "C", "D"]),
            // The two arcs cut off by diagonal BD, colour-matched to the angle
            // each one subtends: arc BCD (∠A) and arc BAD (∠C).
            { type: "arc", parents: [{ ref: "O" }, { ref: "D" }, { ref: "B" }], attributes: { strokeColor: COLORS.ACCENT, strokeWidth: 4, highlight: false } },
            { type: "arc", parents: [{ ref: "O" }, { ref: "B" }, { ref: "D" }], attributes: { strokeColor: COLORS.BRAND, strokeWidth: 4, highlight: false } },
            segment("B", "D", { strokeColor: "#1b1714", strokeWidth: 2, dash: 2 }),
            { type: "segment", parents: [{ ref: "O" }, { ref: "B" }], attributes: { strokeColor: "#c7bca6", strokeWidth: 1.5, dash: 1 } },
            { type: "segment", parents: [{ ref: "O" }, { ref: "D" }], attributes: { strokeColor: "#c7bca6", strokeWidth: 1.5, dash: 1 } },
            angleMark("D", "A", "B", { fillColor: COLORS.ACCENT, strokeColor: COLORS.ACCENT, radius: 0.7 }),
            angleMark("B", "C", "D", { fillColor: COLORS.BRAND, strokeColor: COLORS.BRAND, radius: 0.7 }),
            { type: "text", parents: [4.0, -3.1, "arc BCD"], attributes: { fontSize: 13, anchorX: "middle", anchorY: "middle", cssStyle: `font-weight:700;color:${COLORS.ACCENT};`, fixed: true, highlight: false } },
            { type: "text", parents: [-4.1, 2.9, "arc BAD"], attributes: { fontSize: 13, anchorX: "middle", anchorY: "middle", cssStyle: `font-weight:700;color:${COLORS.BRAND};`, fixed: true, highlight: false } },
          ],
        },
        lines: [
          {
            statement:
              "$\\angle A = \\tfrac12\\,(\\text{arc } BCD)$ and $\\angle C = \\tfrac12\\,(\\text{arc } BAD)$ — each opposite angle is half the arc it subtends.",
            reasons: [
              {
                id: "inscribed-half",
                label: "Inscribed angle = half the central angle on the same arc",
                correct: true,
                teaching:
                  "Yes. $\\angle A$ stands on arc $BCD$ and $\\angle C$ stands on the opposite arc $BAD$, and each inscribed angle is half the central angle (the arc) it subtends.",
              },
              {
                id: "equal-opp",
                label: "Opposite angles of a quadrilateral are equal",
                correct: false,
                misconception: "confuses-parallelogram",
                teaching:
                  "That's the *parallelogram* rule, not this one. Here we relate each angle to its arc using the inscribed-angle theorem — the angles turn out supplementary, not equal.",
              },
              {
                id: "quad-sum",
                label: "The angles of a quadrilateral sum to $360^\\circ$",
                correct: false,
                misconception: "wrong-rule-here",
                teaching:
                  "True overall, but this line is about *one* angle and *one* arc. The link we need is each inscribed angle to half its subtended arc.",
              },
            ],
          },
          {
            statement:
              "The two arcs $BCD$ and $BAD$ together make the whole circle, so their central angles sum to $360^\\circ$.",
            reasons: [
              {
                id: "around-point",
                label: "Angles around a point sum to $360^\\circ$",
                correct: true,
                teaching:
                  "Right — the two arcs meet only at $B$ and $D$ and together sweep the entire circle, so the central angles at $O$ make one full turn: $360^\\circ$.",
              },
              {
                id: "straight-line",
                label: "Angles on a straight line sum to $180^\\circ$",
                correct: false,
                misconception: "half-not-full-turn",
                teaching:
                  "That's a half-turn. The two arcs cover the *whole* circle — a full turn around the center $O$, which is $360^\\circ$.",
              },
              {
                id: "vertical",
                label: "Vertical angles are equal",
                correct: false,
                misconception: "no-crossing",
                teaching:
                  "No crossing lines form vertical angles here. The point is that the two arcs together make a full $360^\\circ$ turn at the center.",
              },
            ],
          },
          {
            statement:
              "$\\therefore\\ \\angle A + \\angle C = \\tfrac12(\\text{arc } BCD + \\text{arc } BAD) = \\tfrac12(360^\\circ) = 180^\\circ$.",
            reasons: [
              {
                id: "combine",
                label: "Add the two halves and substitute the $360^\\circ$ total",
                correct: true,
                teaching:
                  "Exactly. Adding the two half-arc expressions gives half of $(\\text{arc }BCD + \\text{arc }BAD) = 360^\\circ$, which is $180^\\circ$.",
              },
              {
                id: "cyclic-rule",
                label: "Opposite angles of a cyclic quadrilateral are supplementary",
                correct: false,
                misconception: "circular",
                teaching:
                  "That would be circular — supplementary opposite angles is precisely the claim this proof establishes, so we can't cite it as the reason.",
              },
              {
                id: "converse",
                label: "Converse of the cyclic-quadrilateral theorem",
                correct: false,
                misconception: "wrong-direction",
                teaching:
                  "The converse runs the other way (from supplementary angles back to concyclic). Here we're computing the sum directly from the two half-arcs.",
              },
            ],
          },
        ],
        validatedText:
          "That's the whole proof: $\\angle A$ and $\\angle C$ are each half of their subtended arc, the two arcs make a full $360^\\circ$ turn, so $\\angle A + \\angle C = \\tfrac12(360^\\circ) = 180^\\circ$ — for every cyclic quadrilateral.",
      },
    },
    { kind: "problem", problem: expressProblem },
    {
      kind: "instruction-mc",
      problem: {
        id: "cq-other-pair",
        prompt:
          "The other pair of opposite angles is $\\angle B$ and $\\angle D$ (blue). Drag the vertices. What is $\\angle B + \\angle D$?",
        exploreHint: "Drag the vertices around the circle",
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
        xp: 10,
        options: [
          {
            id: "o180",
            label: "$180^\\circ$",
            correct: true,
            teaching:
              "Right. The other pair is supplementary too: all four angles sum to $360^\\circ$, and $\\angle A + \\angle C = 180^\\circ$, so $\\angle B + \\angle D = 180^\\circ$ as well.",
          },
          {
            id: "o200",
            label: "Whatever is left after $\\angle A + \\angle C$",
            correct: false,
            misconception: "leftover-thinking",
            teaching:
              "Close, and the arithmetic agrees — but it isn't a leftover scrap. Since $\\angle A + \\angle C = 180^\\circ$, the remaining $\\angle B + \\angle D$ is exactly $360^\\circ - 180^\\circ = 180^\\circ$, the *same* supplementary law.",
          },
          {
            id: "ovar",
            label: "It varies",
            correct: false,
            misconception: "thinks-varies",
            teaching:
              "Drag the vertices — the sum readout holds at $180^\\circ$. Each opposite pair is independently supplementary.",
          },
        ],
        consolidation: {
          principle:
            "**Both** pairs of opposite angles are supplementary: $\\angle A + \\angle C = \\angle B + \\angle D = 180^\\circ$ (they share the $360^\\circ$ angle sum equally).",
        },
      },
    },
    { kind: "problem", problem: makeRightProblem },
    {
      kind: "instruction-mc",
      problem: {
        id: "cq-converse",
        prompt:
          "A quadrilateral $PQRS$ has $\\angle P = 105^\\circ$ and $\\angle R = 75^\\circ$. What can you conclude?",
        boardConfig: {
          boundingBox: BOX,
          elements: [...cyclicQuad()],
        },
        xp: 11,
        options: [
          {
            id: "cyclic",
            label: "$PQRS$ is cyclic (its vertices lie on a circle)",
            correct: true,
            teaching:
              "Exactly. $\\angle P + \\angle R = 105^\\circ + 75^\\circ = 180^\\circ$, so the opposite angles are supplementary — and by the **converse**, the four vertices must lie on one circle.",
          },
          {
            id: "square",
            label: "$PQRS$ must be a square",
            correct: false,
            misconception: "over-specifies",
            teaching:
              "Far too strong. Supplementary opposite angles guarantee only that $PQRS$ is *cyclic*; the angles here aren't even all $90^\\circ$, so it certainly need not be a square.",
          },
          {
            id: "none",
            label: "Nothing — it cannot be cyclic",
            correct: false,
            misconception: "denies-converse",
            teaching:
              "The converse is exactly what rescues us: opposite angles summing to $180^\\circ$ *forces* the vertices onto a circle. So we can conclude $PQRS$ is cyclic.",
          },
        ],
        consolidation: {
          principle:
            "**Converse:** if a quadrilateral's opposite angles sum to $180^\\circ$, its vertices are concyclic. This is how supplementary angles *prove* points lie on a circle.",
        },
      },
    },
    {
      kind: "handoff",
      handoff: {
        title: "Now prove it yourself",
        body: "Every angle fact you just used comes from one engine: inscribed angles on the same arc are equal. In Freeplay you'll construct that proof step by step on a figure you can drag — the building block behind the whole cyclic-quadrilateral story.",
        freeplayPuzzleIds: ["inscribed-angle"],
        ctaLabel: "Open the Freeplay proof",
      },
    },
  ],
};
