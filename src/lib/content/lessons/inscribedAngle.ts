import type { Lesson, Problem } from "@/lib/content/types";
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
      strokeColor: "#9c8c70",
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

// Stage 3 remains a classic algebraic problem rendered by the unchanged
// ProblemPlayer; it is the lesson's only entry in `problems`.
const expressProblem: Problem = {
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
};

export const inscribedAngle: Lesson = {
  id: "inscribed-angle",
  title: "The Inscribed Angle Theorem",
  summary: "An inscribed angle is half the central angle on the same arc.",
  concept:
    "An **inscribed angle** is half of the **central angle** that subtends the same arc. Two consequences you'll use constantly: angles subtending the *same* arc are equal, and an angle inscribed in a *semicircle* is a right angle.",
  completionXp: 35,
  problems: [expressProblem],
  stages: [
    {
      kind: "concept",
      title: "The idea",
      body: "An **inscribed angle** is half of the **central angle** that subtends the same arc. We'll see why, meet two consequences you'll use constantly, then prove one of them yourself.",
    },
    {
      kind: "instruction-mc",
      problem: {
        id: "ia-half",
        prompt:
          "Blue is the central angle $\\angle AOB$; orange is the inscribed angle $\\angle APB$ on the same arc. Drag $P$ around the arc and compare the two readouts.",
        exploreHint: "Drag P around the arc",
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
        xp: 10,
        options: [
          {
            id: "eq",
            label: "Equal to it",
            correct: false,
            misconception: "equal",
            teaching:
              "Check the readouts — they are never equal. The inscribed angle is consistently *smaller*: exactly half the central angle on the same arc.",
          },
          {
            id: "half",
            label: "Half of it",
            correct: true,
            teaching:
              "Exactly. Drag $P$ anywhere on the arc and the inscribed $\\angle APB$ stays at half of the central $\\angle AOB$.",
          },
          {
            id: "dbl",
            label: "Double it",
            correct: false,
            misconception: "inverted",
            teaching:
              "Backwards: the *central* angle is the larger one (double), so the inscribed angle is **half** the central angle.",
          },
          {
            id: "qtr",
            label: "A quarter of it",
            correct: false,
            misconception: "wrong-ratio",
            teaching:
              "Not a quarter — the readouts hold a steady $1:2$ ratio, so the inscribed angle is **half**, not a quarter.",
          },
        ],
        consolidation: {
          principle:
            "**Inscribed Angle Theorem:** an inscribed angle is half the central angle subtending the same arc — $\\angle APB = \\tfrac12\\angle AOB$.",
          selfExplainPrompt:
            "In your own words: why doesn't moving $P$ along the arc change the angle?",
        },
      },
    },
    {
      kind: "comprehension",
      task: {
        id: "ia-half-proof",
        prompt:
          "But *why* is it exactly half? Add one construction line — the diameter from $P$ through the center $O$ to the far point $D$ — then justify each step.",
        xp: 10,
        boardConfig: {
          boundingBox: BOX,
          elements: [
            center(),
            { id: "P", type: "point", parents: [0, 3.6], attributes: { name: "P", fixed: true, size: 4, fillColor: "#fff", strokeColor: COLORS.ACCENT, strokeWidth: 2 } },
            { id: "D", type: "point", parents: [0, -3.6], attributes: { name: "D", fixed: true, size: 3, fillColor: "#fff", strokeColor: "#9c8c70", strokeWidth: 2 } },
            { id: "A", type: "point", parents: [-3.117, -1.8], attributes: { name: "A", fixed: true, size: 4, fillColor: "#fff", strokeColor: COLORS.BRAND, strokeWidth: 2 } },
            { id: "B", type: "point", parents: [3.117, -1.8], attributes: { name: "B", fixed: true, size: 4, fillColor: "#fff", strokeColor: COLORS.BRAND, strokeWidth: 2 } },
            circle("c", "O", "P"),
            segment("P", "D", { strokeColor: "#9c8c70", strokeWidth: 2, dash: 2 }),
            segment("O", "A", { strokeColor: COLORS.BRAND, strokeWidth: 2 }),
            segment("O", "B", { strokeColor: COLORS.BRAND, strokeWidth: 2 }),
            segment("P", "A", { strokeColor: COLORS.ACCENT, strokeWidth: 2 }),
            segment("P", "B", { strokeColor: COLORS.ACCENT, strokeWidth: 2 }),
            angleMark("A", "P", "B", { fillColor: COLORS.ACCENT, strokeColor: COLORS.ACCENT, radius: 0.9 }),
            angleMark("A", "O", "B", { fillColor: COLORS.BRAND, strokeColor: COLORS.BRAND, radius: 0.9 }),
            readout(-5.7, 5.4, (r) => `inscribed ∠APB = ${angleDeg(r.A, r.P, r.B).toFixed(1)}°`),
            readout(-5.7, 4.7, (r) => `central ∠AOB = ${angleDeg(r.A, r.O, r.B).toFixed(1)}°`),
          ],
        },
        lines: [
          {
            statement: "$OA = OB = OP$.",
            reasons: [
              { id: "radii", label: "All radii of a circle are equal", correct: true, teaching: "$OA$, $OB$, and $OP$ all run from the center $O$ to the circle, so they are radii of the same circle and have equal length." },
              { id: "given", label: "Given", correct: false, misconception: "not-given", teaching: "It isn't simply handed to us — the equality holds *because* $OA$, $OB$, $OP$ are radii of the same circle." },
              { id: "isos", label: "Base angles of an isosceles triangle", correct: false, misconception: "consequence-not-reason", teaching: "That's what the equal radii will let us conclude on the next line; here we only need that the radii themselves are equal." },
            ],
          },
          {
            statement:
              "So $\\triangle OAP$ and $\\triangle OBP$ are isosceles, giving $\\angle OPA = \\angle OAP$ and $\\angle OPB = \\angle OBP$.",
            reasons: [
              { id: "base-angles", label: "Base angles of an isosceles triangle are equal", correct: true, teaching: "Each triangle has two equal radii as its legs, so the two angles opposite those legs (its base angles) are equal." },
              { id: "vertical", label: "Vertical angles", correct: false, misconception: "no-crossing", teaching: "There is no pair of crossing lines forming vertical angles here — the equal angles come from the isosceles triangles." },
              { id: "ext", label: "Exterior angle theorem", correct: false, misconception: "next-step", teaching: "The exterior-angle step is coming next; first we use the isosceles triangles to get the equal base angles." },
            ],
          },
          {
            statement:
              "The exterior angle at $O$ of each triangle gives $\\angle AOD = 2\\angle OPA$ and $\\angle BOD = 2\\angle OPB$.",
            reasons: [
              { id: "ext-angle", label: "Exterior angle = sum of the two remote interior angles", correct: true, teaching: "$\\angle AOD$ is exterior to $\\triangle OAP$ at $O$, so it equals $\\angle OAP + \\angle OPA$; since those base angles are equal, that is $2\\angle OPA$." },
              { id: "straight", label: "Angles on a straight line sum to $180^\\circ$", correct: false, misconception: "wrong-rule", teaching: "$P$, $O$, $D$ are collinear, but the *doubling* comes from the exterior-angle rule, not from the straight-line sum." },
              { id: "base2", label: "Base angles of an isosceles triangle", correct: false, misconception: "prev-step", teaching: "That was the previous line; here we combine those equal base angles using the exterior angle at $O$." },
            ],
          },
          {
            statement:
              "$\\therefore\\ \\angle AOB = \\angle AOD + \\angle BOD = 2(\\angle OPA + \\angle OPB) = 2\\angle APB$, so $\\angle APB = \\tfrac12\\angle AOB$.",
            reasons: [
              { id: "add", label: "Angle addition (the parts make the whole)", correct: true, teaching: "$\\angle AOB$ is split by $OD$ into $\\angle AOD$ and $\\angle BOD$, and $\\angle APB$ is split by $PD$ into $\\angle OPA$ and $\\angle OPB$ — adding the two doubled pieces gives exactly $2\\angle APB$." },
              { id: "iat", label: "Inscribed Angle Theorem", correct: false, misconception: "circular", teaching: "That would be circular: the Inscribed Angle Theorem is precisely what this proof is establishing, so we can't cite it as the reason." },
              { id: "alt", label: "Alternate angles", correct: false, misconception: "needs-parallels", teaching: "Alternate angles need parallel lines; the result here comes from adding the angle pieces at $O$ and at $P$." },
            ],
          },
        ],
        validatedText:
          "That's the whole proof: drop the diameter through $P$, use the two isosceles triangles and the exterior-angle rule, and the inscribed angle works out to exactly half the central angle — for every position of $P$.",
      },
    },
    { kind: "problem", problem: expressProblem },
    {
      kind: "instruction-mc",
      problem: {
        id: "ia-same-arc",
        prompt:
          "Two apexes $P$ and $Q$ both sit on the major arc above chord $AB$. Drag them independently and watch $\\angle APB$ and $\\angle AQB$.",
        exploreHint: "Drag P and Q independently",
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
        xp: 12,
        options: [
          {
            id: "equal",
            label: "They are always equal",
            correct: true,
            teaching:
              "Both subtend the same chord $AB$ from the same arc, so each is half of the *same* central angle — equal, wherever $P$ and $Q$ sit.",
          },
          {
            id: "sum180",
            label: "They sum to $180^\\circ$",
            correct: false,
            misconception: "opposite-arc",
            teaching:
              "That is the rule for *opposite* angles of a cyclic quadrilateral — apexes on **opposite** arcs. Here $P$ and $Q$ share the **same** arc, so the angles are equal.",
          },
          {
            id: "depends",
            label: "It depends on where $P$ and $Q$ are",
            correct: false,
            misconception: "position-dependent",
            teaching:
              "Drag them — the two readouts stay locked together. Position on the arc doesn't matter; only the shared arc does.",
          },
        ],
        consolidation: {
          principle:
            "Angles subtending the **same arc** are equal: $\\angle APB = \\angle AQB$. This is the workhorse of angle chasing with concyclic points.",
        },
      },
    },
    {
      kind: "instruction-mc",
      problem: {
        id: "ia-semicircle",
        prompt:
          "Now $AB$ is a **diameter** (it passes through the center $O$). Drag $P$ around the circle. What is $\\angle APB$?",
        exploreHint: "Drag P around the circle",
        boardConfig: {
          boundingBox: BOX,
          elements: [
            center(),
            { id: "A", type: "point", parents: [-3.6, 0], attributes: { name: "A", fixed: true, size: 4, fillColor: "#fff", strokeColor: COLORS.BRAND, strokeWidth: 2 } },
            { id: "B", type: "point", parents: [3.6, 0], attributes: { name: "B", fixed: true, size: 4, fillColor: "#fff", strokeColor: COLORS.BRAND, strokeWidth: 2 } },
            circle("c", "O", "B"),
            segment("A", "B", { strokeColor: "#9c8c70", strokeWidth: 2, dash: 2 }),
            glider("P", 1.2, 3.4, "c"),
            segment("P", "A", { strokeColor: COLORS.ACCENT, strokeWidth: 2 }),
            segment("P", "B", { strokeColor: COLORS.ACCENT, strokeWidth: 2 }),
            ...centralArcMark("cen", "O", "A", "B", "P", { fillColor: COLORS.BRAND, strokeColor: COLORS.BRAND, radius: 0.9 }),
            angleMark("A", "P", "B", { fillColor: COLORS.ACCENT, strokeColor: COLORS.ACCENT }),
            readout(-5.7, 5.4, (r) => `central ∠AOB = ${angleDeg(r.A, r.O, r.B).toFixed(1)}°`),
            readout(-5.7, 4.7, (r) => `∠APB = ${angleDeg(r.A, r.P, r.B).toFixed(1)}°`),
          ],
        },
        xp: 12,
        options: [
          {
            id: "a60",
            label: "$60^\\circ$",
            correct: false,
            misconception: "guess-60",
            teaching:
              "Drag $P$ — the readout never settles on $60^\\circ$. With $AB$ a diameter the central angle is $180^\\circ$, so the inscribed angle is half: $90^\\circ$.",
          },
          {
            id: "a90",
            label: "$90^\\circ$",
            correct: true,
            teaching:
              "Right. A diameter spans a straight central angle of $180^\\circ$, and half of that is a right angle — for **every** position of $P$.",
          },
          {
            id: "a120",
            label: "It varies as $P$ moves",
            correct: false,
            misconception: "thinks-varies",
            teaching:
              "It looks like it might, but the readout is pinned at $90^\\circ$: a diameter always gives a right angle, wherever $P$ is.",
          },
        ],
        consolidation: {
          principle:
            "A neat special case worth remembering: an angle inscribed in a **semicircle** is always a right angle ($90^\\circ$). It falls straight out of the half-the-central-angle rule.",
        },
      },
    },
    {
      kind: "comprehension",
      task: {
        id: "ia-comprehension",
        prompt:
          "Here is the proof that two angles on the same arc are equal — the exact fact you'll prove in Freeplay. Pick the justification for each line.",
        xp: 8,
        lines: [
          {
            statement: "$A, B, P, Q$ lie on one circle (they are **concyclic**).",
            reasons: [
              { id: "given", label: "Given", correct: true, teaching: "Yes — this is the setup we are handed." },
              { id: "iat", label: "Inscribed Angle Theorem", correct: false, misconception: "rule-vs-given", teaching: "Not yet — that's the *tool* we apply next; the shared circle is simply given." },
              { id: "tsum", label: "Angle sum in a triangle", correct: false, misconception: "irrelevant-rule", teaching: "No triangle angle-sum here; the points being concyclic is just the given." },
            ],
          },
          {
            statement:
              "$\\angle APB$ and $\\angle AQB$ subtend the **same chord $AB$** from the **same arc**.",
            reasons: [
              { id: "samearc", label: "Both apexes lie on the same arc", correct: true, teaching: "Exactly — $P$ and $Q$ are on the same side of $AB$, so both angles open onto the same arc." },
              { id: "vertical", label: "Vertical angles", correct: false, misconception: "no-crossing", teaching: "There is no $X$-crossing here; this is about a shared arc, not vertical angles." },
              { id: "supp", label: "They are supplementary", correct: false, misconception: "opposite-arc", teaching: "Supplementary is the *opposite-arc* (cyclic-quadrilateral) case. Same arc gives equality, not a sum of $180^\\circ$." },
            ],
          },
          {
            statement: "$\\therefore\\ \\angle APB = \\angle AQB$.",
            reasons: [
              { id: "inscribed-same", label: "Inscribed angle (same arc)", correct: true, teaching: "That's the rule, by its Freeplay name: equal inscribed angles on the same arc." },
              { id: "alt", label: "Alternate angles", correct: false, misconception: "needs-parallels", teaching: "Alternate angles need parallel lines; here equality comes from the inscribed-angle rule." },
              { id: "line", label: "Angles on a straight line", correct: false, misconception: "no-straight-line", teaching: "No straight-line pair here — the equality is the inscribed-angle (same arc) rule." },
            ],
          },
        ],
        validatedText:
          "That's the entire proof: from $A, B, P, Q$ concyclic, the rule **inscribed angle (same arc)** gives $\\angle APB = \\angle AQB$. Now build it yourself.",
      },
    },
    {
      kind: "handoff",
      handoff: {
        title: "Now prove it yourself",
        body: "You've seen *why* it's true and read the proof. In Freeplay you'll construct it step by step on a figure you can drag — state that $A, B, P, Q$ are concyclic and derive $\\angle APB = \\angle AQB$.",
        freeplayPuzzleIds: ["inscribed-angle"],
        ctaLabel: "Open the Freeplay proof",
      },
    },
  ],
};
