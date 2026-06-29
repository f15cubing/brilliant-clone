import type { Lesson, Problem } from "@/lib/content/types";
import type { BoardElementDef } from "@/lib/geometry/board-types";
import { angleDeg } from "@/lib/geometry/measure";
import {
  angleMark,
  circle,
  COLORS,
  intersection,
  keepTriangleAcute,
  point,
  polygon,
  readout,
  segment,
} from "@/lib/content/boards";

const BOX: [number, number, number, number] = [-6, 6, 6, -6];

/** The three draggable vertices of an acute triangle (H and DEF stay inside).
 * The `keepTriangleAcute` constraint blocks drags that would make ABC obtuse/right. */
function vertices(): BoardElementDef[] {
  const acute = keepTriangleAcute(["A", "B", "C"]);
  return [
    { ...point("A", 0, 3), constrain: acute },
    { ...point("B", -3.4, -2), constrain: acute },
    { ...point("C", 3.4, -2.2), constrain: acute },
  ];
}

/** Hidden infinite lines along each side, used as projection / intersection hosts. */
function sideLines(): BoardElementDef[] {
  return [
    { id: "lineBC", type: "line", parents: [{ ref: "B" }, { ref: "C" }], attributes: { visible: false } },
    { id: "lineCA", type: "line", parents: [{ ref: "C" }, { ref: "A" }], attributes: { visible: false } },
    { id: "lineAB", type: "line", parents: [{ ref: "A" }, { ref: "B" }], attributes: { visible: false } },
  ];
}

/** Foot of the perpendicular from `fromVertex` onto the hidden side line `onLine`. */
function foot(id: string, fromVertex: string, onLine: string): BoardElementDef {
  return {
    id,
    type: "orthogonalprojection",
    parents: [{ ref: fromVertex }, { ref: onLine }],
    attributes: {
      name: id,
      size: 3,
      fixed: true,
      fillColor: "#fff",
      strokeColor: COLORS.OK,
      strokeWidth: 2,
      label: { fontSize: 16, offset: [6, 6], cssStyle: "font-weight:600;" },
    },
  };
}

/** Hidden altitude line through a vertex and its foot (host for the orthocenter). */
function altLine(id: string, v: string, ft: string): BoardElementDef {
  return { id, type: "line", parents: [{ ref: v }, { ref: ft }], attributes: { visible: false } };
}

/** The orthocenter as the meet of the altitudes from A and B. */
function orthocenterH(): BoardElementDef {
  return {
    ...intersection("H", "altA", "altB"),
    attributes: {
      name: "H",
      size: 4,
      fixed: true,
      fillColor: "#fff",
      strokeColor: COLORS.ACCENT,
      strokeWidth: 2,
      withLabel: true,
      label: { fontSize: 18, offset: [8, 6], cssStyle: "font-weight:700;" },
    },
  };
}

/** A dashed circle drawn on diameter `p`-`q` (passes through both endpoints). */
function diameterCircle(
  id: string,
  p: string,
  q: string,
  attrs: Record<string, unknown> = {},
): BoardElementDef[] {
  const midId = `${id}_m`;
  return [
    { id: midId, type: "midpoint", parents: [{ ref: p }, { ref: q }], attributes: { visible: false, fixed: true } },
    circle(id, midId, p, { strokeColor: COLORS.WRONG, strokeWidth: 1.5, dash: 2, ...attrs }),
  ];
}

/** All three altitude feet, ready for the orthic triangle. */
function feet(): BoardElementDef[] {
  return [
    foot("D", "A", "lineBC"),
    foot("E", "B", "lineCA"),
    foot("F", "C", "lineAB"),
  ];
}

// Stage "orthic-half-angles" stays an algebraic problem rendered by the
// unchanged ProblemPlayer; it is the lesson's only entry in `problems` and is
// also referenced from its `{ kind: "problem" }` stage.
const halfAnglesProblem: Problem = {
  id: "orthic-half-angles",
  prompt:
    "Now chase the two half-angles at $D$. In $BDHF$, $\\angle FDH$ subtends the same arc $FH$ as $\\angle FBH = \\angle ABE = 90^\\circ - A$. And in $CDHE$ (from last lesson), $\\angle EDH$ subtends the same arc $EH$ as $\\angle ECH = \\angle ACF = 90^\\circ - A$. **Express each of $\\angle FDH$ and $\\angle EDH$** in terms of $A$.",
  exploreHint: "Drag the triangle; ∠FDH and ∠EDH read the same value.",
  xp: 11,
  boardConfig: {
    boundingBox: BOX,
    elements: [
      ...vertices(),
      ...sideLines(),
      polygon(["A", "B", "C"], { fillOpacity: 0.04 }),
      ...feet(),
      altLine("altA", "A", "D"),
      altLine("altB", "B", "E"),
      orthocenterH(),
      polygon(["D", "E", "F"], {
        borders: { strokeColor: COLORS.BRAND, strokeWidth: 1.5 },
        fillColor: COLORS.BRAND,
        fillOpacity: 0.05,
      }),
      segment("D", "H", { strokeColor: COLORS.ACCENT, strokeWidth: 2 }),
      angleMark("F", "D", "H", { fillColor: COLORS.WRONG, strokeColor: COLORS.WRONG, radius: 0.7 }),
      angleMark("E", "D", "H", { fillColor: COLORS.OK, strokeColor: COLORS.OK, radius: 1.0 }),
      readout(-5.7, 5.4, (r) => `A = ${angleDeg(r.B, r.A, r.C).toFixed(1)}°`),
      readout(-5.7, 4.7, (r) => `∠FDH = ${angleDeg(r.F, r.D, r.H).toFixed(1)}°`),
      readout(-5.7, 4.0, (r) => `∠EDH = ${angleDeg(r.E, r.D, r.H).toFixed(1)}°`),
    ],
  },
  answerConfig: {
    kind: "algebraic",
    correctExpression: "90 - A",
    variables: ["A"],
    placeholder: "e.g. 90 - A",
  },
  explanations: [
    {
      triggerCondition: "default_wrong",
      text: "From cyclic $BDHF$: $\\angle FDH = \\angle FBH = \\angle ABE = 90^\\circ - A$ (right triangle $ABE$). From cyclic $CDHE$: $\\angle EDH = \\angle ECH = \\angle ACF = 90^\\circ - A$ (right triangle $ACF$). Both half-angles equal $90^\\circ - A$ — check the readouts.",
    },
  ],
  solutionText:
    "$\\angle FDH = \\angle EDH = 90^\\circ - A$. The two half-angles on either side of altitude $AD$ are equal.",
};

export const orthicIncenter: Lesson = {
  id: "orthic-incenter",
  title: "Orthocenter = Incenter of the Orthic Triangle",
  summary: "Reusing the cyclic quads, each altitude bisects an angle of DEF, so H is its incenter.",
  concept:
    "The three altitude feet $D$, $E$, $F$ form their own triangle — the **orthic triangle** $DEF$. Reusing the cyclic quadrilaterals from the previous lesson, we'll see that each altitude of $\\triangle ABC$ **bisects** an angle of $DEF$. So the orthocenter $H$ is the point where the orthic triangle's angle bisectors meet: its **incenter**. Drag the triangle and watch the half-angles stay equal.",
  completionXp: 35,
  problems: [halfAnglesProblem],
  stages: [
    {
      kind: "concept",
      title: "The idea",
      body: "The three altitude feet $D$, $E$, $F$ form their own triangle — the **orthic triangle** $DEF$ — with the orthocenter $H$ sitting inside it. Reusing the cyclic quadrilaterals from the previous lesson, we'll show each altitude of $\\triangle ABC$ **bisects** an angle of $DEF$. Three angle bisectors meeting at one point can only mean one thing: $H$ is the **incenter** of the orthic triangle.",
    },
    {
      kind: "instruction-mc",
      problem: {
        id: "orthic-triangle",
        prompt:
          "Join the three feet $D$, $E$, $F$ to form the shaded triangle, with the orthocenter $H$ marked inside it. What is this inner triangle?",
        exploreHint: "Drag A, B, or C; D, E, F are the feet of the altitudes.",
        xp: 8,
        boardConfig: {
          boundingBox: BOX,
          elements: [
            ...vertices(),
            ...sideLines(),
            polygon(["A", "B", "C"], { fillOpacity: 0.04 }),
            ...feet(),
            altLine("altA", "A", "D"),
            altLine("altB", "B", "E"),
            polygon(["D", "E", "F"], {
              borders: { strokeColor: COLORS.ACCENT, strokeWidth: 2.5 },
              fillColor: COLORS.ACCENT,
              fillOpacity: 0.12,
            }),
            orthocenterH(),
          ],
        },
        options: [
          {
            id: "orthic",
            label: "The **orthic triangle** — its vertices are the three altitude feet",
            correct: true,
            teaching:
              "Exactly — $D$, $E$, $F$ are the **feet of the altitudes**, so $DEF$ is the **orthic triangle** of $\\triangle ABC$. Our goal: show the orthocenter $H$ is its incenter.",
          },
          {
            id: "medial",
            label: "The medial triangle — its vertices are the side midpoints",
            correct: false,
            misconception: "medial-vs-orthic",
            teaching:
              "The medial triangle uses the **midpoints** of the sides. Here $D$, $E$, $F$ are altitude *feet*, so this is the **orthic** triangle.",
          },
          {
            id: "none",
            label: "A random inner triangle with no special name",
            correct: false,
            misconception: "no-special-name",
            teaching:
              "It does have a name: $D$, $E$, $F$ are the **feet of the altitudes**, so $DEF$ is the **orthic triangle** — and we'll show $H$ is its incenter.",
          },
        ],
        consolidation: {
          principle:
            "The triangle whose vertices are the three **altitude feet** is the **orthic triangle**. Many of a triangle's deepest properties live inside it.",
        },
      },
    },
    {
      kind: "instruction-mc",
      problem: {
        id: "orthic-cyclic-bdhf",
        prompt:
          "A new cyclic quadrilateral. Since $HD$ lies along altitude $AD \\perp BC$ and $HF$ lies along altitude $CF \\perp AB$, we get $\\angle BDH = \\angle BFH = 90^\\circ$. On which circle do $B$, $D$, $H$, $F$ lie?",
        exploreHint: "Drag the triangle; D and F stay on the dashed circle on diameter BH.",
        xp: 9,
        boardConfig: {
          boundingBox: BOX,
          elements: [
            ...vertices(),
            ...sideLines(),
            polygon(["A", "B", "C"]),
            ...feet(),
            altLine("altA", "A", "D"),
            altLine("altB", "B", "E"),
            orthocenterH(),
            ...diameterCircle("cBH", "B", "H"),
            segment("A", "D", { strokeColor: COLORS.ACCENT, dash: 2, strokeWidth: 1.5 }),
            segment("C", "F", { strokeColor: COLORS.WRONG, dash: 2, strokeWidth: 1.5 }),
            angleMark("B", "D", "H", { fillColor: COLORS.ACCENT, strokeColor: COLORS.ACCENT, radius: 0.5 }),
            angleMark("B", "F", "H", { fillColor: COLORS.WRONG, strokeColor: COLORS.WRONG, radius: 0.5 }),
            readout(-5.7, 5.4, (r) => `∠BDH = ${angleDeg(r.B, r.D, r.H).toFixed(1)}°`),
            readout(-5.7, 4.7, (r) => `∠BFH = ${angleDeg(r.B, r.F, r.H).toFixed(1)}°`),
          ],
        },
        options: [
          {
            id: "bh",
            label: "The circle with diameter $BH$",
            correct: true,
            teaching:
              "Right — both $D$ and $F$ see $BH$ at a right angle ($\\angle BDH = \\angle BFH = 90^\\circ$), so by the converse of Thales they lie on the circle with **diameter $BH$**. Hence $B$, $D$, $H$, $F$ are concyclic.",
          },
          {
            id: "bd",
            label: "The circle with diameter $BD$",
            correct: false,
            misconception: "wrong-diameter",
            teaching:
              "Look at which segment the right angles open onto: $\\angle BDH = \\angle BFH = 90^\\circ$ are subtended by $BH$, not $BD$. The diameter is **$BH$**.",
          },
          {
            id: "none",
            label: "They are not concyclic",
            correct: false,
            misconception: "missed-thales",
            teaching:
              "They *are* concyclic: two points ($D$ and $F$) that see $BH$ at $90^\\circ$ must lie on the circle with diameter $BH$ — the converse of Thales.",
          },
        ],
        consolidation: {
          principle:
            "**Converse of Thales:** if two points see a segment at $90^\\circ$, they lie on the circle having that segment as a diameter. Right angles manufacture cyclic quadrilaterals.",
        },
      },
    },
    { kind: "problem", problem: halfAnglesProblem },
    {
      kind: "instruction-mc",
      problem: {
        id: "orthic-incenter",
        prompt:
          "Since $\\angle FDH = \\angle EDH$, the altitude $AD$ **bisects** $\\angle FDE$ of the orthic triangle. The same argument at $E$ and $F$ shows $BE$ and $CF$ bisect the other two orthic angles. What does that make $H$?",
        exploreHint: "Drag the triangle; ∠FDH and ∠EDH stay locked equal — AD bisects the angle at D.",
        xp: 12,
        boardConfig: {
          boundingBox: BOX,
          elements: [
            ...vertices(),
            ...sideLines(),
            polygon(["A", "B", "C"], { fillOpacity: 0.04 }),
            ...feet(),
            altLine("altA", "A", "D"),
            altLine("altB", "B", "E"),
            orthocenterH(),
            polygon(["D", "E", "F"], {
              borders: { strokeColor: COLORS.ACCENT, strokeWidth: 2.5 },
              fillColor: COLORS.ACCENT,
              fillOpacity: 0.1,
            }),
            segment("D", "H", { strokeColor: COLORS.BRAND, strokeWidth: 1.5 }),
            segment("E", "H", { strokeColor: COLORS.BRAND, strokeWidth: 1.5 }),
            segment("F", "H", { strokeColor: COLORS.BRAND, strokeWidth: 1.5 }),
            angleMark("F", "D", "H", { fillColor: COLORS.WRONG, strokeColor: COLORS.WRONG, radius: 0.6 }),
            angleMark("E", "D", "H", { fillColor: COLORS.OK, strokeColor: COLORS.OK, radius: 0.85 }),
            readout(-5.7, 5.4, (r) => `∠FDH = ${angleDeg(r.F, r.D, r.H).toFixed(1)}°`),
            readout(-5.7, 4.7, (r) => `∠EDH = ${angleDeg(r.E, r.D, r.H).toFixed(1)}°`),
          ],
        },
        options: [
          {
            id: "incenter",
            label: "The **incenter** of the orthic triangle $DEF$",
            correct: true,
            teaching:
              "Exactly. $H$ lies on all three altitudes, and each altitude bisects an angle of $DEF$. The point where a triangle's three angle bisectors meet is its **incenter**.",
          },
          {
            id: "circum",
            label: "The circumcenter of $DEF$",
            correct: false,
            misconception: "circumcenter",
            teaching:
              "The circumcenter is where the *perpendicular bisectors* meet. Here the altitudes are *angle bisectors* of $DEF$, so $H$ is the **incenter**.",
          },
          {
            id: "centroid",
            label: "The centroid of $DEF$",
            correct: false,
            misconception: "centroid",
            teaching:
              "The centroid is where the *medians* meet. These altitudes are *angle bisectors* of $DEF$, and concurrent angle bisectors meet at the **incenter**.",
          },
        ],
        consolidation: {
          principle:
            "The point where a triangle's three **angle bisectors** concur is its **incenter**. Each altitude of $\\triangle ABC$ bisects an orthic angle, so the orthocenter $H$ is the **incenter of the orthic triangle** $DEF$.",
          selfExplainPrompt:
            "In your own words: why does \"each altitude bisects an orthic angle\" force $H$ to be the incenter rather than some other center?",
        },
      },
    },
  ],
};
