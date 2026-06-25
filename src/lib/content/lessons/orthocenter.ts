import type { Lesson } from "@/lib/content/types";
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

export const orthocenter: Lesson = {
  id: "orthocenter",
  title: "The Orthocenter Exists",
  summary: "Two altitudes meet at H; cyclic quadrilaterals force the third through H too.",
  concept:
    "An **altitude** drops from each vertex perpendicular to the opposite side, landing at a **foot** $D$, $E$, $F$. That makes **six right angles**. We'll draw just two altitudes, mark where they cross as $H$, and let the right angles' **cyclic quadrilaterals** force the third altitude through the very same point — so all three concur at the **orthocenter** $H$. Drag the triangle: every relation holds for any (acute) shape.",
  completionXp: 45,
  problems: [
    {
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
      answerConfig: {
        kind: "multiple-choice",
        options: [
          { id: "both90", label: "Both stay $90^\\circ$ for every triangle" },
          { id: "sum90", label: "They always sum to $90^\\circ$" },
          { id: "vary", label: "They change as the triangle changes" },
        ],
        correctOptionId: "both90",
      },
      explanations: [
        {
          triggerCondition: "default_wrong",
          text: "A *foot of a perpendicular* is where the dropped segment meets the side **at a right angle**. So $\\angle ADB = \\angle AEB = 90^\\circ$ no matter how you drag — that is the defining property of an altitude foot.",
        },
      ],
      solutionText:
        "Each altitude meets its side at $90^\\circ$: $\\angle ADB = \\angle AEB = 90^\\circ$. (The foot $F$ from $C$ likewise gives $\\angle CFA = \\angle CFB = 90^\\circ$ — six right angles in all.)",
    },
    {
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
      answerConfig: {
        kind: "multiple-choice",
        options: [
          { id: "diam", label: "On the circle with diameter $AB$ — a point seeing $AB$ at $90^\\circ$ lies on it" },
          { id: "coin", label: "On it only by coincidence for this triangle" },
          { id: "no", label: "$A,B,D,E$ are never concyclic" },
        ],
        correctOptionId: "diam",
      },
      explanations: [
        {
          triggerCondition: "default_wrong",
          text: "By the **converse of Thales**, any point that sees $AB$ at a right angle lies on the circle with diameter $AB$. Since $\\angle ADB = \\angle AEB = 90^\\circ$, both $D$ and $E$ lie on it — so $A$, $B$, $D$, $E$ are **concyclic**.",
        },
        {
          triggerCondition: "selected_coin",
          text: "It is not a coincidence: drag any vertex and $D$, $E$ stay on the dashed circle. A right angle on $AB$ forces the apex onto the circle with diameter $AB$.",
        },
      ],
      solutionText:
        "$\\angle ADB = \\angle AEB = 90^\\circ \\Rightarrow A,B,D,E$ lie on the circle with diameter $AB$: our **first cyclic quadrilateral** $ABDE$.",
    },
    {
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
      answerConfig: {
        kind: "multiple-choice",
        options: [
          { id: "ch", label: "The circle with diameter $CH$" },
          { id: "cd", label: "The circle with diameter $CD$" },
          { id: "none", label: "They are not concyclic" },
        ],
        correctOptionId: "ch",
      },
      explanations: [
        {
          triggerCondition: "default_wrong",
          text: "Since $HD$ lies along altitude $AD \\perp BC$, we get $\\angle CDH = 90^\\circ$; since $HE$ lies along altitude $BE \\perp CA$, we get $\\angle CEH = 90^\\circ$. Both $D$ and $E$ see $CH$ at a right angle, so they lie on the circle with **diameter $CH$**.",
        },
      ],
      solutionText:
        "$\\angle CDH = \\angle CEH = 90^\\circ \\Rightarrow C,D,H,E$ lie on the circle with diameter $CH$: our **second cyclic quadrilateral** $CDHE$.",
    },
    {
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
    },
    {
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
      answerConfig: {
        kind: "multiple-choice",
        options: [
          { id: "perp", label: "$\\angle BFC = 90^\\circ$, so $CH \\perp AB$: line $CH$ is exactly the third altitude" },
          { id: "hcb", label: "$\\angle HCB = B$, so nothing special happens" },
          { id: "notperp", label: "$CH$ is not perpendicular to $AB$ in general" },
        ],
        correctOptionId: "perp",
      },
      explanations: [
        {
          triggerCondition: "default_wrong",
          text: "Same-arc equality in $CDHE$ gives $\\angle HCB = \\angle HED = \\angle BED = 90^\\circ - B$. In triangle $BFC$ then $\\angle FBC = B$ and $\\angle FCB = 90^\\circ - B$, so $\\angle BFC = 180^\\circ - B - (90^\\circ - B) = 90^\\circ$. Hence $CH \\perp AB$ — line $CH$ **is** the altitude from $C$.",
        },
        {
          triggerCondition: "selected_hcb",
          text: "Check the readout: $\\angle HCB = 90^\\circ - B$, not $B$. That is exactly what forces $\\angle BFC = 90^\\circ$.",
        },
      ],
      solutionText:
        "$\\angle HCB = 90^\\circ - B \\Rightarrow \\angle BFC = 90^\\circ \\Rightarrow CH \\perp AB$. The line from $C$ through $H$ is the third altitude, so it passes through $H$ too.",
    },
    {
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
      answerConfig: {
        kind: "multiple-choice",
        options: [
          { id: "concur", label: "The three altitudes always meet at one point — the orthocenter $H$" },
          { id: "acute", label: "Only acute triangles have a single meeting point" },
          { id: "tri", label: "The altitudes form a small triangle, not a single point" },
        ],
        correctOptionId: "concur",
      },
      explanations: [
        {
          triggerCondition: "default_wrong",
          text: "We proved the altitude from $C$ passes through $H = AD \\cap BE$. So all three altitudes are **concurrent** at $H$. The gap readout stays $0.000$ as you drag — the orthocenter always exists.",
        },
        {
          triggerCondition: "selected_acute",
          text: "The proof only used the right angles at the feet and the two cyclic quadrilaterals — never that the triangle is acute. Every triangle has an orthocenter (it just lies outside for obtuse ones).",
        },
      ],
      solutionText:
        "The three altitudes of any triangle concur at a single point $H$, the **orthocenter**. Existence proved — entirely by cyclic-quadrilateral angle chasing.",
    },
  ],
};
