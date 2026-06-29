import type { Lesson, Problem } from "@/lib/content/types";
import { parallelAngleDeg } from "@/lib/geometry/parallelAngles";
import { angleMark, COLORS, parallelAngleMark, readout } from "@/lib/content/boards";
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

// Stage: algebraic problem rendered by the unchanged ProblemPlayer. Referenced
// from both `problems` and a `{kind:"problem"}` stage.
const expressProblem: Problem = {
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
};

// Stage: geometric (drag-to-satisfy) problem rendered by the unchanged
// ProblemPlayer. Referenced from both `problems` and a `{kind:"problem"}` stage.
const perpProblem: Problem = {
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
};

export const parallelLines: Lesson = {
  id: "parallel-lines",
  title: "Parallel Lines & Transversals",
  summary: "Corresponding angles are equal; co-interior angles sum to 180°.",
  concept:
    "When a transversal cuts two **parallel** lines, **corresponding angles are equal**, **alternate angles are equal**, and **co-interior (same-side) angles sum to $180^\\circ$**. These rules let you 'transport' angles across a figure — the backbone of angle chasing.",
  completionXp: 35,
  problems: [expressProblem, perpProblem],
  stages: [
    {
      kind: "concept",
      title: "The idea",
      body: "When a transversal cuts two **parallel** lines it creates a family of related angles: **corresponding angles are equal**, **alternate angles are equal**, and **co-interior (same-side) angles sum to $180^\\circ$**. We'll meet each rule on a figure you can drag, then prove one of them yourself.",
    },
    {
      kind: "instruction-mc",
      problem: {
        id: "pl-corresponding",
        prompt:
          "The transversal crosses two parallel lines at $P$ and $Q$. Drag $P$'s and $Q$'s controls to change the slope. Compare the two marked **corresponding** angles.",
        exploreHint: "Drag the transversal to change the slope",
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
        xp: 10,
        options: [
          {
            id: "equal",
            label: "They are equal",
            correct: true,
            teaching:
              "Exactly — the two readouts always match. Corresponding angles sit in the *same position* at each intersection, so the parallel lines force them to be equal.",
          },
          {
            id: "sum",
            label: "They sum to $180^\\circ$",
            correct: false,
            misconception: "supplementary",
            teaching:
              "That's the rule for *co-interior* (same-side) angles. Corresponding angles instead occupy matching positions and are **equal** — watch the two readouts stay locked together.",
          },
          {
            id: "depends",
            label: "It depends on the slope",
            correct: false,
            misconception: "slope-dependent",
            teaching:
              "Drag the transversal to any slope — the two readouts move together but never split apart. As long as the lines are parallel, corresponding angles stay equal.",
          },
        ],
        consolidation: {
          principle:
            "**Corresponding angles (parallel lines):** angles in matching positions at each intersection are equal. This is the rule the other two are built on.",
          selfExplainPrompt:
            "In your own words: why does keeping the lines parallel force the two corresponding angles to stay equal?",
        },
      },
    },
    {
      kind: "instruction-mc",
      problem: {
        id: "pl-alternate",
        prompt:
          "Now the marked angles are **alternate interior** angles (a 'Z' shape, on opposite sides of the transversal between the lines). What is true of them?",
        exploreHint: "Drag the transversal and compare the two readouts",
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
        xp: 11,
        options: [
          {
            id: "equal",
            label: "They are equal",
            correct: true,
            teaching:
              "Right. Each alternate interior angle equals $180^\\circ$ minus the corresponding angle, so the two of them match each other — the 'Z' carries the angle straight across.",
          },
          {
            id: "sum",
            label: "They sum to $90^\\circ$",
            correct: false,
            misconception: "complementary",
            teaching:
              "No — the readouts never add to $90^\\circ$. Alternate interior angles are **equal**, not complementary; they only collapse to $90^\\circ$ each in the special perpendicular case.",
          },
          {
            id: "depends",
            label: "It depends on the slope",
            correct: false,
            misconception: "slope-dependent",
            teaching:
              "Try several slopes — the two readouts stay identical. Parallel lines keep alternate interior angles equal no matter how the transversal tilts.",
          },
        ],
        consolidation: {
          principle:
            "**Alternate interior angles (parallel lines)** are equal — the 'Z' transports an angle to the opposite side of the transversal between the two lines.",
        },
      },
    },
    {
      kind: "comprehension",
      task: {
        id: "pl-proof",
        prompt:
          "Why *are* alternate interior angles equal? Here is the short proof — it leans only on corresponding and vertical angles. Pick the justification for each line.",
        xp: 8,
        boardConfig: {
          boundingBox: [-5, 5, 5, -5],
          elements: [
            // Two parallel lines.
            { id: "TL", type: "point", parents: [-5, 2], attributes: { visible: false, fixed: true } },
            { id: "TR", type: "point", parents: [5, 2], attributes: { visible: false, fixed: true } },
            { id: "BL", type: "point", parents: [-5, -2], attributes: { visible: false, fixed: true } },
            { id: "BR", type: "point", parents: [5, -2], attributes: { visible: false, fixed: true } },
            { type: "line", parents: [{ ref: "TL" }, { ref: "TR" }], attributes: { strokeColor: "#475569", strokeWidth: 2.5 } },
            { type: "line", parents: [{ ref: "BL" }, { ref: "BR" }], attributes: { strokeColor: "#475569", strokeWidth: 2.5 } },
            // Transversal through P (top) and Q (bottom).
            { id: "Ttop", type: "point", parents: [-1.6, 4], attributes: { visible: false, fixed: true } },
            { id: "Tbot", type: "point", parents: [1.6, -4], attributes: { visible: false, fixed: true } },
            { type: "line", parents: [{ ref: "Ttop" }, { ref: "Tbot" }], attributes: { strokeColor: COLORS.BRAND, strokeWidth: 2.5 } },
            { id: "P", type: "point", parents: [-0.8, 2], attributes: { name: "P", fixed: true, size: 4, fillColor: "#fff", strokeColor: COLORS.BRAND, strokeWidth: 2, label: { offset: [-16, 4], fontSize: 16 } } },
            { id: "Q", type: "point", parents: [0.8, -2], attributes: { name: "Q", fixed: true, size: 4, fillColor: "#fff", strokeColor: COLORS.BRAND, strokeWidth: 2, label: { offset: [10, -2], fontSize: 16 } } },
            // Angle 1 (corresponding, at P) and angle 3 (alternate, at Q) share a
            // colour — they are the equal pair the proof concludes with. Angle 2
            // (corresponding at Q) is the bridge.
            angleMark("TR", "P", "Q", { fillColor: COLORS.ACCENT, strokeColor: COLORS.ACCENT, radius: 0.7 }),
            angleMark("BR", "Q", "Tbot", { fillColor: COLORS.BRAND, strokeColor: COLORS.BRAND, radius: 0.7 }),
            angleMark("BL", "Q", "P", { fillColor: COLORS.ACCENT, strokeColor: COLORS.ACCENT, radius: 0.7 }),
            { type: "text", parents: [0.15, 1.4, "1"], attributes: { fontSize: 15, anchorX: "middle", anchorY: "middle", cssStyle: `font-weight:700;color:${COLORS.ACCENT};`, fixed: true, highlight: false } },
            { type: "text", parents: [1.7, -2.7, "2"], attributes: { fontSize: 15, anchorX: "middle", anchorY: "middle", cssStyle: `font-weight:700;color:${COLORS.BRAND};`, fixed: true, highlight: false } },
            { type: "text", parents: [-0.15, -1.35, "3"], attributes: { fontSize: 15, anchorX: "middle", anchorY: "middle", cssStyle: `font-weight:700;color:${COLORS.ACCENT};`, fixed: true, highlight: false } },
          ],
        },
        lines: [
          {
            statement:
              "The corresponding angles at $P$ and $Q$ are equal: $\\angle 1 = \\angle 2$.",
            reasons: [
              { id: "corr", label: "Corresponding angles (parallel lines)", correct: true, teaching: "Yes — $\\angle 1$ and $\\angle 2$ sit in matching positions at the two intersections, so the parallel lines make them equal." },
              { id: "alt", label: "Alternate angles (parallel lines)", correct: false, misconception: "assumes-conclusion", teaching: "That's the very thing we're trying to prove — we can't use it as a step. Start instead from the corresponding angles." },
              { id: "vert", label: "Vertically opposite angles", correct: false, misconception: "no-crossing-here", teaching: "$P$ and $Q$ are different intersection points, so these aren't a vertical pair. Their equality comes from being corresponding angles." },
            ],
          },
          {
            statement:
              "At $Q$, the corresponding angle $\\angle 2$ and the alternate interior angle $\\angle 3$ are vertically opposite, so $\\angle 2 = \\angle 3$.",
            reasons: [
              { id: "vert", label: "Vertically opposite angles", correct: true, teaching: "Exactly — $\\angle 2$ and $\\angle 3$ are formed by the same two crossing lines at $Q$ and open in opposite directions, so they are equal." },
              { id: "corr", label: "Corresponding angles (parallel lines)", correct: false, misconception: "wrong-rule", teaching: "Both angles live at the single point $Q$, so this is a vertical pair, not a corresponding pair across the two lines." },
              { id: "coint", label: "Co-interior angles sum to $180^\\circ$", correct: false, misconception: "wrong-rule", teaching: "Co-interior angles add to $180^\\circ$; here $\\angle 2$ and $\\angle 3$ are *equal*, which is the vertical-angle relationship." },
            ],
          },
          {
            statement:
              "$\\therefore\\ \\angle 1 = \\angle 3$: the alternate interior angles are equal.",
            reasons: [
              { id: "subst", label: "Equals of equals are equal (substitution)", correct: true, teaching: "Right — $\\angle 1 = \\angle 2$ and $\\angle 2 = \\angle 3$ chain together to give $\\angle 1 = \\angle 3$, which is exactly the alternate-angle equality." },
              { id: "tsum", label: "Angle sum in a triangle", correct: false, misconception: "irrelevant-rule", teaching: "There's no triangle in play; the conclusion follows simply by combining the two equalities we already established." },
              { id: "straight", label: "Angles on a straight line sum to $180^\\circ$", correct: false, misconception: "wrong-rule", teaching: "We're concluding two angles are *equal*, not that a pair sums to $180^\\circ$ — that comes from substituting one equality into the other." },
            ],
          },
        ],
        validatedText:
          "That's the whole argument: corresponding angles give $\\angle 1 = \\angle 2$, vertical angles give $\\angle 2 = \\angle 3$, so $\\angle 1 = \\angle 3$. Alternate interior angles are equal — and this is exactly what you'll construct in Freeplay.",
      },
    },
    {
      kind: "instruction-mc",
      problem: {
        id: "pl-cointerior",
        prompt:
          "The two marked angles are **co-interior** (same side of the transversal, between the lines). Drag and read off their sum. What is $\\angle$P $+ \\angle$Q here?",
        exploreHint: "Drag the transversal and watch the sum readout",
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
        xp: 11,
        options: [
          {
            id: "o90",
            label: "$90^\\circ$",
            correct: false,
            misconception: "complementary",
            teaching:
              "The sum readout never lands on $90^\\circ$. Co-interior angles are supplementary — they sum to $180^\\circ$, not $90^\\circ$.",
          },
          {
            id: "o180",
            label: "$180^\\circ$",
            correct: true,
            teaching:
              "Exactly — the sum readout is pinned at $180^\\circ$ for every slope. Co-interior (same-side interior) angles are supplementary.",
          },
          {
            id: "o360",
            label: "$360^\\circ$",
            correct: false,
            misconception: "full-turn",
            teaching:
              "$360^\\circ$ is a full turn around a point; here we're adding just the two same-side interior angles, and the readout shows that sum is $180^\\circ$.",
          },
        ],
        consolidation: {
          principle:
            "**Co-interior angles (parallel lines)** are supplementary: same-side interior angles sum to $180^\\circ$. Equivalently, each is $180^\\circ$ minus its alternate angle.",
        },
      },
    },
    { kind: "problem", problem: expressProblem },
    { kind: "problem", problem: perpProblem },
    {
      kind: "handoff",
      handoff: {
        title: "Now prove it yourself",
        body: "You've seen the rules and read the short proof. In Freeplay you'll build it on a figure you can drag — start from two parallel lines cut by a transversal and construct the equality of the **alternate** interior angles, using corresponding and vertical angles as your steps.",
        freeplayPuzzleIds: ["alternate-angles"],
        ctaLabel: "Open the Freeplay proof",
      },
    },
  ],
};
