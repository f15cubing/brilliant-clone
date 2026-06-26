import { COLORS, circle, polygon, segment } from "@/lib/content/boards";
import type { Coords } from "@/lib/freeplay/check";
import { rel } from "@/lib/freeplay/dsl";
import type { V } from "@/lib/freeplay/geom";
import type { Puzzle } from "@/lib/freeplay/types";

const deg = (d: number): V => [Math.cos((d * Math.PI) / 180), Math.sin((d * Math.PI) / 180)];
const sub = (p: V, q: V): V => [p[0] - q[0], p[1] - q[1]];
const add = (p: V, q: V): V => [p[0] + q[0], p[1] + q[1]];
const mul = (p: V, s: number): V => [p[0] * s, p[1] * s];
const cross = (p: V, q: V): number => p[0] * q[1] - p[1] * q[0];

/** Intersection of line ab with line cd. */
function meet(a: V, b: V, c: V, d: V): V {
  const r = sub(b, a);
  const s = sub(d, c);
  const t = cross(sub(c, a), s) / cross(r, s);
  return add(a, mul(r, t));
}

const O: V = [0, 0];
const A = deg(130);
const B = deg(210);
const C: V = [1, 0]; // tangent at C is the vertical line x = 1
const T: V = [1, 1]; // a point on the tangent at C
const PK = 1.6; // the parallel line p: x = 1.6
const D = meet([PK, -5], [PK, 5], B, C); // p ∩ line CB
const E = meet([PK, -5], [PK, 5], A, C); // p ∩ line CA

const coords: Coords = { O, A, B, C, T, D, E };

const feeder = rel("eqangle", ["B", "A", "E", "B", "D", "E"]); // ∠BAE = ∠BDE
const goal = rel("cyclic", ["A", "B", "D", "E"]); // A, B, D, E concyclic

/**
 * JBMO Shortlist 2015 G1 (core).
 *
 * Triangle ABC is inscribed in a circle with centre O; t is the tangent at C
 * (encoded as T on t with t ⟂ OC). A line p ∥ t meets lines BC and AC at D and
 * E. The tangent–chord angle (driven by the equal radii OA = OB = OC and the
 * perpendicular t ⟂ OC) transported along p ∥ t gives ∠BAE = ∠BDE; the
 * converse of the inscribed angle then puts A, B, D, E on one circle.
 */
export const jbmo_shortlist_2015_g1: Puzzle = {
  id: "jbmo_shortlist_2015_g1",
  title: "JBMO Shortlist 2015 G1: a tangent-parallel concyclic quad",
  blurb:
    "JBMO Shortlist 2015 G1 (proposed by Montenegro). Triangle ABC is inscribed " +
    "in a circle, and the tangent t to the circle at the vertex C is drawn. A " +
    "line p parallel to t meets the lines BC and AC at the points D and E, " +
    "respectively. Prove that A, B, D, E lie on one circle. (O is the circumcentre, " +
    "so OA = OB = OC; T marks the tangent t at C, so t ⟂ OC.)",
  difficulty: "core",
  coords,
  figure: [
    circle("circumcircle", "O", "A"),
    polygon(["A", "B", "C"]),
    segment("B", "D", { strokeColor: COLORS.BRAND, strokeWidth: 1.4, dash: 1 }), // line CB → D
    segment("A", "E", { strokeColor: COLORS.BRAND, strokeWidth: 1.4, dash: 1 }), // line CA → E
    segment("C", "T", { strokeColor: COLORS.ACCENT, strokeWidth: 2 }), // tangent t at C
    // The goal: the concyclic quadrilateral A, B, D, E (cyclic order A → B → E → D).
    polygon(["A", "B", "E", "D"], {
      fillColor: COLORS.OK,
      fillOpacity: 0.12,
      borders: { strokeColor: COLORS.OK, strokeWidth: 2 },
    }),
  ],
  given: [
    // O is the circumcentre of ABC: equal radii.
    rel("cong", ["O", "A", "O", "B"]),
    rel("cong", ["O", "B", "O", "C"]),
    rel("cong", ["O", "A", "O", "C"]),
    // t is the tangent at C: perpendicular to the radius OC (T on t).
    rel("perp", ["O", "C", "C", "T"]),
    // D on line CB, E on line CA.
    rel("coll", ["B", "C", "D"]),
    rel("coll", ["A", "C", "E"]),
    // p (line DE) is parallel to the tangent t (line CT).
    rel("para", ["D", "E", "C", "T"]),
  ],
  goal,
  solution: [
    {
      fact: feeder,
      rule: "algebraic angle-chase",
      premises: [
        rel("cong", ["O", "A", "O", "B"]),
        rel("cong", ["O", "B", "O", "C"]),
        rel("cong", ["O", "A", "O", "C"]),
        rel("perp", ["O", "C", "C", "T"]),
        rel("coll", ["B", "C", "D"]),
        rel("coll", ["A", "C", "E"]),
        rel("para", ["D", "E", "C", "T"]),
      ],
      humanReadable:
        "∠BAE = ∠BDE: the tangent-chord angle between t and chord CB equals the " +
        "inscribed angle ∠BAC (from OA = OB = OC and t ⟂ OC); carry it along " +
        "p ∥ t and the lines CA (through E) and CB (through D).",
    },
    {
      fact: goal,
      rule: "converse of inscribed angle",
      premises: [feeder],
      humanReadable:
        "A, B, D, E concyclic: A and D see segment BE under equal angles " +
        "(∠BAE = ∠BDE), so they lie on one circle through B and E.",
    },
  ],
};
