import type { Lesson, Problem } from "@/lib/content/types";
import type { BoardElementDef, JXGElement } from "@/lib/geometry/board-types";
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

/** Perpendicular distance from point `p` to the line through `a` and `b`. */
function distToLine(p: JXGElement, a: JXGElement, b: JXGElement): number {
  const vx = b.X() - a.X();
  const vy = b.Y() - a.Y();
  const wx = p.X() - a.X();
  const wy = p.Y() - a.Y();
  const len = Math.hypot(vx, vy) || 1;
  return Math.abs(vx * wy - vy * wx) / len;
}

/** The three draggable vertices of an acute triangle (H stays inside). The
 * `keepTriangleAcute` constraint blocks drags that would make ABC obtuse/right. */
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

// Stage `orth-chase1` stays a classic algebraic problem rendered by the
// unchanged ProblemPlayer, so it is defined as a const referenced from both
// `problems` and its `{ kind: "problem" }` stage.
const chase1Problem: Problem = {
  id: "orth-chase1",
  prompt:
    "Time to chase angles. In right triangle $ABD$, $\\angle BAD = 90^\\circ - B$. In the cyclic quadrilateral $ABDE$, $\\angle BED$ subtends the **same arc $BD$** as $\\angle BAD$. **Express $\\angle BED$** in terms of $B$.",
  exploreHint: "Drag the triangle; ∠BAD and ∠BED track each other exactly.",
  xp: 12,
  boardConfig: {
    boundingBox: BOX,
    elements: [
      ...vertices(),
      ...sideLines(),
      polygon(["A", "B", "C"]),
      foot("D", "A", "lineBC"),
      foot("E", "B", "lineCA"),
      ...diameterCircle("cAB", "A", "B", { strokeColor: COLORS.WRONG, dash: 2 }),
      segment("A", "D", { strokeColor: COLORS.ACCENT, strokeWidth: 2 }),
      segment("E", "B", { strokeColor: COLORS.BRAND, strokeWidth: 1.5 }),
      segment("E", "D", { strokeColor: COLORS.OK, strokeWidth: 1.5 }),
      angleMark("B", "A", "D", { fillColor: COLORS.ACCENT, strokeColor: COLORS.ACCENT, radius: 0.7 }),
      angleMark("B", "E", "D", { fillColor: COLORS.BRAND, strokeColor: COLORS.BRAND, radius: 0.7 }),
      readout(-5.7, 5.4, (r) => `B = ${angleDeg(r.A, r.B, r.C).toFixed(1)}°`),
      readout(-5.7, 4.7, (r) => `∠BAD = ${angleDeg(r.B, r.A, r.D).toFixed(1)}°`),
      readout(-5.7, 4.0, (r) => `∠BED = ${angleDeg(r.B, r.E, r.D).toFixed(1)}°`),
    ],
  },
  answerConfig: {
    kind: "algebraic",
    correctExpression: "90 - B",
    variables: ["B"],
    placeholder: "e.g. 90 - B",
  },
  explanations: [
    {
      triggerCondition: "default_wrong",
      text: "In right triangle $ABD$ ($\\angle ADB = 90^\\circ$, $\\angle ABD = B$) the third angle is $\\angle BAD = 90^\\circ - B$. Inside cyclic quadrilateral $ABDE$, $\\angle BED$ and $\\angle BAD$ subtend the same arc $BD$, so they are equal: $\\angle BED = 90^\\circ - B$.",
    },
  ],
  solutionText:
    "$\\angle BAD = 90^\\circ - B$ (right triangle $ABD$), and same-arc equality in $ABDE$ gives $\\angle BED = \\angle BAD = 90^\\circ - B$.",
};

export const orthocenter: Lesson = {
  id: "orthocenter",
  title: "The Orthocenter Exists",
  summary: "Two altitudes meet at H; cyclic quadrilaterals force the third through H too.",
  concept:
    "An **altitude** drops from each vertex perpendicular to the opposite side, landing at a **foot** $D$, $E$, $F$. That makes **six right angles**. We'll draw just two altitudes, mark where they cross as $H$, and let the right angles' **cyclic quadrilaterals** force the third altitude through the very same point — so all three concur at the **orthocenter** $H$. Drag the triangle: every relation holds for any (acute) shape.",
  completionXp: 45,
  problems: [chase1Problem],
  stages: [
    {
      kind: "concept",
      title: "The idea",
      body: "An **altitude** drops from each vertex perpendicular to the opposite side, meeting it at a **foot** — a right angle. We'll draw just *two* altitudes, mark where they cross as $H$, and let the right angles build **cyclic quadrilaterals** that drag the third altitude through the very same point. No coordinates: pure angle chasing forces all three altitudes to concur at the **orthocenter** $H$.",
    },
    {
      kind: "instruction-mc",
      problem: {
        id: "orth-feet",
        prompt:
          "Drop a perpendicular from $A$ to $BC$ (foot $D$) and from $B$ to $CA$ (foot $E$). Drag the triangle and watch the readouts. What do $\\angle ADB$ and $\\angle AEB$ do?",
        exploreHint: "Drag A, B, or C and watch both angles.",
        xp: 10,
        boardConfig: {
          boundingBox: BOX,
          elements: [
            ...vertices(),
            ...sideLines(),
            polygon(["A", "B", "C"]),
            foot("D", "A", "lineBC"),
            foot("E", "B", "lineCA"),
            segment("A", "D", { strokeColor: COLORS.ACCENT, strokeWidth: 2 }),
            segment("B", "E", { strokeColor: COLORS.BRAND, strokeWidth: 2 }),
            angleMark("A", "D", "B", { fillColor: COLORS.ACCENT, strokeColor: COLORS.ACCENT, radius: 0.5 }),
            angleMark("A", "E", "B", { fillColor: COLORS.BRAND, strokeColor: COLORS.BRAND, radius: 0.5 }),
            readout(-5.7, 5.4, (r) => `∠ADB = ${angleDeg(r.A, r.D, r.B).toFixed(1)}°`),
            readout(-5.7, 4.7, (r) => `∠AEB = ${angleDeg(r.A, r.E, r.B).toFixed(1)}°`),
          ],
        },
        options: [
          {
            id: "both90",
            label: "Both stay $90^\\circ$ for every triangle",
            correct: true,
            teaching:
              "Exactly. A *foot of a perpendicular* is where the dropped segment meets the side **at a right angle**, so $\\angle ADB = \\angle AEB = 90^\\circ$ no matter how you drag.",
          },
          {
            id: "sum90",
            label: "They always sum to $90^\\circ$",
            correct: false,
            misconception: "feet-sum-90",
            teaching:
              "They don't combine — each foot is independently a right angle. Read the values: both sit at $90^\\circ$, so their *sum* is $180^\\circ$, not $90^\\circ$.",
          },
          {
            id: "vary",
            label: "They change as the triangle changes",
            correct: false,
            misconception: "feet-vary",
            teaching:
              "Drag any vertex — both readouts stay pinned at $90^\\circ$. A right angle at the foot is the *defining* property of an altitude, so it never varies.",
          },
        ],
        consolidation: {
          principle:
            "An altitude meets the opposite side at a right angle, so every foot gives a $90^\\circ$ angle — six right angles across the three feet $D$, $E$, $F$.",
        },
      },
    },
    {
      kind: "instruction-mc",
      problem: {
        id: "orth-cyclic-abde",
        prompt:
          "Both $D$ and $E$ see the segment $AB$ at $90^\\circ$. The dashed circle has $AB$ as **diameter**. Drag the triangle — where do $D$ and $E$ sit, and why?",
        exploreHint: "Drag the triangle; D and E never leave the dashed circle.",
        xp: 10,
        boardConfig: {
          boundingBox: BOX,
          elements: [
            ...vertices(),
            ...sideLines(),
            polygon(["A", "B", "C"]),
            foot("D", "A", "lineBC"),
            foot("E", "B", "lineCA"),
            ...diameterCircle("cAB", "A", "B"),
            segment("A", "D", { strokeColor: COLORS.ACCENT, dash: 2, strokeWidth: 1.5 }),
            segment("B", "E", { strokeColor: COLORS.BRAND, dash: 2, strokeWidth: 1.5 }),
            angleMark("A", "D", "B", { fillColor: COLORS.ACCENT, strokeColor: COLORS.ACCENT, radius: 0.5 }),
            angleMark("A", "E", "B", { fillColor: COLORS.BRAND, strokeColor: COLORS.BRAND, radius: 0.5 }),
            readout(-5.7, 5.4, (r) => `∠ADB = ${angleDeg(r.A, r.D, r.B).toFixed(1)}°`),
            readout(-5.7, 4.7, (r) => `∠AEB = ${angleDeg(r.A, r.E, r.B).toFixed(1)}°`),
          ],
        },
        options: [
          {
            id: "diam",
            label: "On the circle with diameter $AB$ — a point seeing $AB$ at $90^\\circ$ lies on it",
            correct: true,
            teaching:
              "Yes. By the **converse of Thales**, any point that sees $AB$ at a right angle lies on the circle with diameter $AB$. Since $\\angle ADB = \\angle AEB = 90^\\circ$, both $D$ and $E$ join $A$, $B$ on it — they are **concyclic**.",
          },
          {
            id: "coin",
            label: "On it only by coincidence for this triangle",
            correct: false,
            misconception: "cyclic-coincidence",
            teaching:
              "It is not a coincidence: drag any vertex and $D$, $E$ stay on the dashed circle. A right angle on $AB$ *forces* the apex onto the circle with diameter $AB$.",
          },
          {
            id: "no",
            label: "$A,B,D,E$ are never concyclic",
            correct: false,
            misconception: "denies-concyclic",
            teaching:
              "They are concyclic: both $D$ and $E$ see $AB$ at $90^\\circ$, so by the converse of Thales they share the circle with diameter $AB$ with $A$ and $B$.",
          },
        ],
        consolidation: {
          principle:
            "**Converse of Thales:** a point seeing a segment at $90^\\circ$ lies on the circle with that segment as diameter — so right angles manufacture cyclic quadrilaterals. Here that gives the first one, $ABDE$.",
        },
      },
    },
    {
      kind: "instruction-mc",
      problem: {
        id: "orth-cyclic-cdhe",
        prompt:
          "Let the two altitudes meet at $H$. Now look at the right angles $\\angle CDH$ and $\\angle CEH$ (the altitudes are perpendicular to the sides). On which circle do $C$, $D$, $H$, $E$ lie?",
        exploreHint: "Drag the triangle; D and E stay on the dashed circle on diameter CH.",
        xp: 11,
        boardConfig: {
          boundingBox: BOX,
          elements: [
            ...vertices(),
            ...sideLines(),
            polygon(["A", "B", "C"]),
            foot("D", "A", "lineBC"),
            foot("E", "B", "lineCA"),
            altLine("altA", "A", "D"),
            altLine("altB", "B", "E"),
            orthocenterH(),
            segment("A", "D", { strokeColor: COLORS.ACCENT, dash: 2, strokeWidth: 1.5 }),
            segment("B", "E", { strokeColor: COLORS.BRAND, dash: 2, strokeWidth: 1.5 }),
            ...diameterCircle("cCH", "C", "H"),
            angleMark("C", "D", "H", { fillColor: COLORS.ACCENT, strokeColor: COLORS.ACCENT, radius: 0.5 }),
            angleMark("C", "E", "H", { fillColor: COLORS.BRAND, strokeColor: COLORS.BRAND, radius: 0.5 }),
            readout(-5.7, 5.4, (r) => `∠CDH = ${angleDeg(r.C, r.D, r.H).toFixed(1)}°`),
            readout(-5.7, 4.7, (r) => `∠CEH = ${angleDeg(r.C, r.E, r.H).toFixed(1)}°`),
          ],
        },
        options: [
          {
            id: "ch",
            label: "The circle with diameter $CH$",
            correct: true,
            teaching:
              "Right. $HD$ lies along altitude $AD \\perp BC$ so $\\angle CDH = 90^\\circ$, and $HE$ lies along altitude $BE \\perp CA$ so $\\angle CEH = 90^\\circ$. Both $D$ and $E$ see $CH$ at a right angle, so they lie on the circle with **diameter $CH$**.",
          },
          {
            id: "cd",
            label: "The circle with diameter $CD$",
            correct: false,
            misconception: "wrong-diameter",
            teaching:
              "Not $CD$. The right angles $\\angle CDH$ and $\\angle CEH$ both open onto the segment $CH$, so $CH$ — not $CD$ — is the diameter that captures $D$, $E$, $C$, $H$.",
          },
          {
            id: "none",
            label: "They are not concyclic",
            correct: false,
            misconception: "denies-concyclic-2",
            teaching:
              "They are concyclic: $\\angle CDH = \\angle CEH = 90^\\circ$, so by the converse of Thales $D$ and $E$ join $C$ and $H$ on the circle with diameter $CH$.",
          },
        ],
        consolidation: {
          principle:
            "Feeding the orthocenter $H$ back into the figure makes a **second** cyclic quadrilateral $CDHE$ — the same right-angle/diameter idea spawns new concyclic points to chase.",
        },
      },
    },
    { kind: "problem", problem: chase1Problem },
    {
      kind: "instruction-mc",
      problem: {
        id: "orth-chase2",
        prompt:
          "In cyclic quadrilateral $CDHE$, $\\angle HCB$ (i.e. $\\angle HCD$) subtends the same arc $HD$ as $\\angle HED$, which equals $\\angle BED = 90^\\circ - B$. Extend $CH$ to meet $AB$ at $F$. Watch $\\angle BFC$. What does this prove?",
        exploreHint: "Drag the triangle; ∠AFC stays pinned at 90°.",
        xp: 13,
        boardConfig: {
          boundingBox: BOX,
          elements: [
            ...vertices(),
            ...sideLines(),
            polygon(["A", "B", "C"]),
            foot("D", "A", "lineBC"),
            foot("E", "B", "lineCA"),
            altLine("altA", "A", "D"),
            altLine("altB", "B", "E"),
            orthocenterH(),
            { id: "lineCH", type: "line", parents: [{ ref: "C" }, { ref: "H" }], attributes: { visible: false } },
            foot("F", "C", "lineAB"),
            segment("A", "D", { strokeColor: COLORS.ACCENT, dash: 2, strokeWidth: 1.2 }),
            segment("B", "E", { strokeColor: COLORS.BRAND, dash: 2, strokeWidth: 1.2 }),
            segment("C", "F", { strokeColor: COLORS.WRONG, strokeWidth: 2 }),
            angleMark("H", "C", "B", { fillColor: COLORS.WRONG, strokeColor: COLORS.WRONG, radius: 0.7 }),
            angleMark("A", "F", "C", { fillColor: COLORS.OK, strokeColor: COLORS.OK, radius: 0.5 }),
            readout(-5.7, 5.4, (r) => `B = ${angleDeg(r.A, r.B, r.C).toFixed(1)}°`),
            readout(-5.7, 4.7, (r) => `∠HCB = ${angleDeg(r.H, r.C, r.B).toFixed(1)}°`),
            readout(-5.7, 4.0, (r) => `∠AFC = ${angleDeg(r.A, r.F, r.C).toFixed(1)}°`),
          ],
        },
        options: [
          {
            id: "perp",
            label: "$\\angle BFC = 90^\\circ$, so $CH \\perp AB$: line $CH$ is exactly the third altitude",
            correct: true,
            teaching:
              "Yes. Same-arc equality in $CDHE$ gives $\\angle HCB = \\angle HED = 90^\\circ - B$. In triangle $BFC$ then $\\angle FBC = B$ and $\\angle FCB = 90^\\circ - B$, so $\\angle BFC = 180^\\circ - B - (90^\\circ - B) = 90^\\circ$. Hence $CH \\perp AB$ — line $CH$ **is** the altitude from $C$.",
          },
          {
            id: "hcb",
            label: "$\\angle HCB = B$, so nothing special happens",
            correct: false,
            misconception: "wrong-angle-value",
            teaching:
              "Check the readout: $\\angle HCB = 90^\\circ - B$, not $B$. That value is exactly what forces $\\angle BFC = 90^\\circ$ in triangle $BFC$.",
          },
          {
            id: "notperp",
            label: "$CH$ is not perpendicular to $AB$ in general",
            correct: false,
            misconception: "denies-perp",
            teaching:
              "Drag the triangle — $\\angle AFC$ stays pinned at $90^\\circ$. The angle chase forces $\\angle BFC = 90^\\circ$, so $CH \\perp AB$ for *every* shape.",
          },
        ],
        consolidation: {
          principle:
            "Same-arc equality carried across both cyclic quadrilaterals pushes $90^\\circ - B$ down to $\\angle HCB$, forcing $\\angle BFC = 90^\\circ$: the line $CH$ is the third altitude.",
        },
      },
    },
    {
      kind: "instruction-mc",
      problem: {
        id: "orth-orthocenter",
        prompt:
          "All three altitudes are now drawn. The gap readout measures how far $H$ (the meet of the altitudes from $A$ and $B$) is from the altitude from $C$. Drag the triangle. What is the conclusion?",
        exploreHint: "Drag any vertex; the gap stays 0 — all three altitudes share the point H.",
        xp: 11,
        boardConfig: {
          boundingBox: BOX,
          elements: [
            ...vertices(),
            ...sideLines(),
            polygon(["A", "B", "C"]),
            foot("D", "A", "lineBC"),
            foot("E", "B", "lineCA"),
            foot("F", "C", "lineAB"),
            altLine("altA", "A", "D"),
            altLine("altB", "B", "E"),
            orthocenterH(),
            segment("A", "D", { strokeColor: COLORS.ACCENT, strokeWidth: 2 }),
            segment("B", "E", { strokeColor: COLORS.BRAND, strokeWidth: 2 }),
            segment("C", "F", { strokeColor: COLORS.WRONG, strokeWidth: 2 }),
            readout(-5.7, 5.4, (r) => `gap from H to altitude CF = ${distToLine(r.H, r.C, r.F).toFixed(3)}`),
          ],
        },
        options: [
          {
            id: "concur",
            label: "The three altitudes always meet at one point — the orthocenter $H$",
            correct: true,
            teaching:
              "Exactly. We proved the altitude from $C$ passes through $H = AD \\cap BE$, so all three altitudes are **concurrent** at $H$. The gap readout stays $0.000$ as you drag — the orthocenter always exists.",
          },
          {
            id: "acute",
            label: "Only acute triangles have a single meeting point",
            correct: false,
            misconception: "acute-only",
            teaching:
              "The proof only used the right angles at the feet and the two cyclic quadrilaterals — never that the triangle is acute. Every triangle has an orthocenter (it just lies *outside* for obtuse ones).",
          },
          {
            id: "tri",
            label: "The altitudes form a small triangle, not a single point",
            correct: false,
            misconception: "no-concurrency",
            teaching:
              "Watch the gap readout: it stays $0.000$. The altitudes don't bound a little triangle — they all pass through the single point $H$.",
          },
        ],
        consolidation: {
          principle:
            "The three altitudes of any triangle are **concurrent** — they meet at the orthocenter $H$ — proved entirely by cyclic-quadrilateral angle chasing.",
          selfExplainPrompt:
            "In your own words: how did the two cyclic quadrilaterals force the altitude from $C$ to pass through $H$?",
        },
      },
    },
  ],
};
