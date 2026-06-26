/**
 * Single-step theorem library. Each rule, given the facts the learner CITED,
 * returns every fact derivable by one application of that theorem. Geometry
 * guards (using the figure coordinates) keep each rule sound — a rule only
 * emits a fact when the configuration actually licenses it.
 *
 * The verifier matches the learner's asserted fact against these derivations.
 */
import type { Aval, Fact, PointId, Rel } from "./dsl";
import { aval, angleKey, factEqual, rel } from "./dsl";
import type { Coords, VarBindings } from "./check";
import { constForm, decodeAngle, fadd, feq, fsub, isAngleToken } from "./form";
import { rat } from "./rational";
import {
  angleDeg,
  cross,
  isBetween,
  isCollinear,
  lineIntersect,
  rayBetween,
  sameRayFrom,
  sameSideOfLine,
  sub,
  unit,
  type V,
} from "./geom";

const DEG180 = constForm(rat(180));

export interface RuleCtx {
  coords: Coords;
  bindings: VarBindings;
  points: PointId[];
}

export interface Rule {
  id: string;
  name: string;
  derive(cited: Fact[], ctx: RuleCtx): Fact[];
}

const relsOf = (cited: Fact[], name: Rel["name"]): Rel[] =>
  cited.filter((f): f is Rel => f.kind === "rel" && f.name === name);
const avalsOf = (cited: Fact[]): Aval[] =>
  cited.filter((f): f is Aval => f.kind === "aval");

const inscribed_angle: Rule = {
  id: "inscribed_angle",
  name: "inscribed angle (same arc)",
  derive(cited, { coords }) {
    const out: Fact[] = [];
    for (const c of relsOf(cited, "cyclic")) {
      const pts = c.points;
      for (let i = 0; i < 4; i++) {
        for (let j = i + 1; j < 4; j++) {
          const chord = [pts[i], pts[j]];
          const apex = pts.filter((_, k) => k !== i && k !== j);
          const [p, q] = chord;
          const [s, t] = apex;
          const cp = coords[p];
          const cq = coords[q];
          const cs = coords[s];
          const ct = coords[t];
          if (!cp || !cq || !cs || !ct) continue;
          if (sameSideOfLine(cp, cq, cs, ct)) {
            out.push(rel("eqangle", [p, s, q, p, t, q]));
          }
        }
      }
    }
    return out;
  },
};

const collinear_same_ray: Rule = {
  id: "collinear_same_ray",
  name: "equal angles on a shared ray",
  derive(cited, { coords, points }) {
    const out: Fact[] = [];
    for (const c of relsOf(cited, "coll")) {
      const ids = c.points;
      for (const v of ids) {
        const others = ids.filter((x) => x !== v);
        if (others.length !== 2) continue;
        const [o1, o2] = others;
        const cv = coords[v];
        const c1 = coords[o1];
        const c2 = coords[o2];
        if (!cv || !c1 || !c2) continue;
        if (!sameRayFrom(cv, c1, c2)) continue;
        for (const x of points) {
          if (x === v || x === o1 || x === o2) continue;
          const cx = coords[x];
          if (!cx) continue;
          // skip degenerate (x on the shared ray)
          if (sameRayFrom(cv, c1, cx)) continue;
          out.push(rel("eqangle", [o1, v, x, o2, v, x]));
        }
      }
    }
    return out;
  },
};

const angle_value_transfer: Rule = {
  id: "angle_value_transfer",
  name: "transfer angle value across equal angles",
  derive(cited) {
    const out: Fact[] = [];
    const avs = avalsOf(cited);
    for (const eq of relsOf(cited, "eqangle")) {
      const s1: [PointId, PointId, PointId] = [eq.points[0], eq.points[1], eq.points[2]];
      const s2: [PointId, PointId, PointId] = [eq.points[3], eq.points[4], eq.points[5]];
      const k1 = angleKey(...s1);
      const k2 = angleKey(...s2);
      for (const av of avs) {
        const ak = angleKey(...av.angle);
        if (ak === k1) out.push(aval(s2, av.form));
        if (ak === k2) out.push(aval(s1, av.form));
      }
    }
    return out;
  },
};

const angle_value_equal: Rule = {
  id: "angle_value_equal",
  name: "equal values give equal angles",
  derive(cited) {
    const out: Fact[] = [];
    const avs = avalsOf(cited);
    for (let i = 0; i < avs.length; i++) {
      for (let j = i + 1; j < avs.length; j++) {
        if (!feq(avs[i].form, avs[j].form)) continue;
        if (angleKey(...avs[i].angle) === angleKey(...avs[j].angle)) continue;
        out.push(rel("eqangle", [...avs[i].angle, ...avs[j].angle]));
      }
    }
    return out;
  },
};

const angle_addition: Rule = {
  id: "angle_addition",
  name: "adjacent angles add",
  derive(cited, { coords }) {
    const out: Fact[] = [];
    const avs = avalsOf(cited);
    for (let i = 0; i < avs.length; i++) {
      for (let j = i + 1; j < avs.length; j++) {
        const a1 = avs[i];
        const a2 = avs[j];
        const v = a1.angle[1];
        if (a2.angle[1] !== v) continue;
        const cv = coords[v];
        if (!cv) continue;
        const arms1 = [a1.angle[0], a1.angle[2]];
        const arms2 = [a2.angle[0], a2.angle[2]];
        for (const s1 of arms1) {
          for (const s2 of arms2) {
            const cs1 = coords[s1];
            const cs2 = coords[s2];
            if (!cs1 || !cs2) continue;
            if (!sameRayFrom(cv, cs1, cs2)) continue;
            const o1 = arms1.find((x) => x !== s1);
            const o2 = arms2.find((x) => x !== s2);
            if (!o1 || !o2) continue;
            const co1 = coords[o1];
            const co2 = coords[o2];
            if (!co1 || !co2) continue;
            if (rayBetween(cv, co1, cs1, co2)) {
              out.push(aval([o1, v, o2], fadd(a1.form, a2.form)));
            }
          }
        }
      }
    }
    return out;
  },
};

const triangle_angle_sum: Rule = {
  id: "triangle_angle_sum",
  name: "angles of a triangle sum to 180°",
  derive(cited, { coords }) {
    const out: Fact[] = [];
    const avs = avalsOf(cited);
    for (let i = 0; i < avs.length; i++) {
      for (let j = i + 1; j < avs.length; j++) {
        const a1 = avs[i];
        const a2 = avs[j];
        const p = a1.angle[1];
        const q = a2.angle[1];
        if (p === q) continue;
        const arms1 = [a1.angle[0], a1.angle[2]];
        const arms2 = [a2.angle[0], a2.angle[2]];
        if (!arms1.includes(q) || !arms2.includes(p)) continue;
        const r1 = arms1.find((x) => x !== q);
        const r2 = arms2.find((x) => x !== p);
        if (!r1 || r1 !== r2) continue;
        const r = r1;
        const cp = coords[p];
        const cq = coords[q];
        const cr = coords[r];
        if (!cp || !cq || !cr) continue;
        if (isCollinear(cp, cq, cr)) continue;
        out.push(aval([p, r, q], fsub(fsub(DEG180, a1.form), a2.form)));
      }
    }
    return out;
  },
};

const straight_supplement: Rule = {
  id: "straight_supplement",
  name: "angles on a straight line sum to 180°",
  derive(cited, { coords }) {
    const out: Fact[] = [];
    const avs = avalsOf(cited);
    for (const c of relsOf(cited, "coll")) {
      const ids = c.points;
      for (const v of ids) {
        const ends = ids.filter((x) => x !== v);
        if (ends.length !== 2) continue;
        const cv = coords[v];
        const ce0 = coords[ends[0]];
        const ce1 = coords[ends[1]];
        if (!cv || !ce0 || !ce1) continue;
        if (!isBetween(ce0, cv, ce1)) continue;
        for (const av of avs) {
          if (av.angle[1] !== v) continue;
          const arms = [av.angle[0], av.angle[2]];
          for (let k = 0; k < 2; k++) {
            const armPt = arms[k];
            const other = arms[1 - k];
            const cArm = coords[armPt];
            if (!cArm) continue;
            for (const [e0, e1] of [
              [ends[0], ends[1]],
              [ends[1], ends[0]],
            ]) {
              const cE0 = coords[e0];
              if (!cE0) continue;
              if (sameRayFrom(cv, cArm, cE0)) {
                out.push(aval([other, v, e1], fsub(DEG180, av.form)));
              }
            }
          }
        }
      }
    }
    return out;
  },
};

const isosceles: Rule = {
  id: "isosceles",
  name: "isosceles: equal base angles ⇒ equal sides",
  derive(cited, { coords }) {
    const out: Fact[] = [];
    for (const eq of relsOf(cited, "eqangle")) {
      const v1 = eq.points[1];
      const v2 = eq.points[4];
      if (v1 === v2) continue;
      const arms1 = [eq.points[0], eq.points[2]];
      const arms2 = [eq.points[3], eq.points[5]];
      if (!arms1.includes(v2) || !arms2.includes(v1)) continue;
      const t1 = arms1.find((x) => x !== v2);
      const t2 = arms2.find((x) => x !== v1);
      if (!t1 || t1 !== t2) continue;
      const T = t1;
      const cT = coords[T];
      const c1 = coords[v1];
      const c2 = coords[v2];
      if (!cT || !c1 || !c2) continue;
      if (isCollinear(cT, c1, c2)) continue;
      out.push(rel("cong", [T, v1, T, v2]));
    }
    return out;
  },
};

const midsegment: Rule = {
  id: "midsegment",
  name: "midsegment is parallel to the base",
  derive(cited, { coords }) {
    const out: Fact[] = [];
    const mids = relsOf(cited, "midp");
    for (let i = 0; i < mids.length; i++) {
      for (let j = i + 1; j < mids.length; j++) {
        const m1 = mids[i];
        const m2 = mids[j];
        const ends1 = [m1.points[1], m1.points[2]];
        const ends2 = [m2.points[1], m2.points[2]];
        for (const apex of ends1) {
          if (!ends2.includes(apex)) continue;
          const o1 = ends1.find((x) => x !== apex);
          const o2 = ends2.find((x) => x !== apex);
          if (!o1 || !o2) continue;
          const cM1 = coords[m1.points[0]];
          const cM2 = coords[m2.points[0]];
          if (!cM1 || !cM2) continue;
          out.push(rel("para", [m1.points[0], m2.points[0], o1, o2]));
        }
      }
    }
    return out;
  },
};

const para_equal_angles: Rule = {
  id: "para_equal_angles",
  name: "parallel lines: equal angles",
  derive(cited, { coords, points }) {
    const out: Fact[] = [];
    const onLine = (a: PointId, b: PointId): PointId[] =>
      points.filter((x) => {
        const ca = coords[a];
        const cb = coords[b];
        const cx = coords[x];
        return !!ca && !!cb && !!cx && isCollinear(ca, cb, cx);
      });

    for (const p of relsOf(cited, "para")) {
      const [a, b, c, d] = p.points;
      const line1 = onLine(a, b);
      const line2 = onLine(c, d);
      for (const u of line1) {
        for (const refU of line1) {
          if (u === refU) continue;
          for (const w of line2) {
            if (w === u) continue;
            for (const refW of line2) {
              if (refW === w || refW === u || refW === refU) continue;
              // transversal u–w; alternate/corresponding angles at u and w
              const aU = angleDeg(coords[refU], coords[u], coords[w]);
              const aW = angleDeg(coords[refW], coords[w], coords[u]);
              if (aU < 1e-3 || aW < 1e-3) continue;
              if (Math.abs(aU - aW) < 1e-4) {
                out.push(rel("eqangle", [refU, u, w, refW, w, u]));
              }
            }
          }
        }
      }
    }
    return out;
  },
};

const converse_inscribed: Rule = {
  id: "converse_inscribed",
  name: "converse of inscribed angle",
  derive(cited, { coords }) {
    const out: Fact[] = [];

    // Two apexes seeing the SAME segment under angles that are either equal
    // (apexes on the same side) or supplementary (apexes on opposite sides)
    // ⇒ the four points are concyclic.
    const emitConcyclic = (p: PointId, q: PointId, x: PointId, y: PointId) => {
      if (x === y || p === q) return;
      const cP = coords[p];
      const cQ = coords[q];
      const cx = coords[x];
      const cy = coords[y];
      if (!cP || !cQ || !cx || !cy) return;
      const m1 = angleDeg(cP, cx, cQ); // ∠PXQ
      const m2 = angleDeg(cP, cy, cQ); // ∠PYQ
      if (m1 < 1e-6 || m2 < 1e-6) return;
      const same = sameSideOfLine(cP, cQ, cx, cy);
      const equalSameSide = same && Math.abs(m1 - m2) < 1e-3;
      const suppOppSide = !same && Math.abs(m1 + m2 - 180) < 1e-3;
      if (equalSameSide || suppOppSide) out.push(rel("cyclic", [p, q, x, y]));
    };

    // (1) equal angles given directly as an `eqangle` over the same segment.
    //     An equality claim is only meaningful on the SAME side of the chord.
    for (const eq of relsOf(cited, "eqangle")) {
      const [a, b, c, d, e, f] = eq.points;
      if ([a, c].sort().join(",") !== [d, f].sort().join(",")) continue;
      if (b === e || a === c) continue;
      const cP = coords[a];
      const cQ = coords[c];
      const cb = coords[b];
      const ce = coords[e];
      if (!cP || !cQ || !cb || !ce) continue;
      if (!sameSideOfLine(cP, cQ, cb, ce)) continue;
      if (Math.abs(angleDeg(cP, cb, cQ) - angleDeg(cP, ce, cQ)) < 1e-3) {
        out.push(rel("cyclic", [a, c, b, e]));
      }
    }

    // (2) angle arithmetic: ∠(a,b,c) = (const) − ∠(x,vy,z) (or = ∠(x,vy,z))
    //     where both angles subtend the SAME segment. This is the learner's
    //     "∠CQ1A2 = 180 − ∠A2B2C" form (supplementary ⇒ cyclic quadrilateral).
    for (const av of avalsOf(cited)) {
      const tokens = Object.keys(av.form.v).filter(isAngleToken);
      const others = Object.keys(av.form.v).filter((k) => !isAngleToken(k));
      if (tokens.length !== 1 || others.length !== 0) continue;
      const [a, b, c] = av.angle; // this angle: vertex b, arms a,c
      const [x, vy, z] = decodeAngle(tokens[0]); // other angle: vertex vy, arms x,z
      if ([a, c].sort().join(",") !== [x, z].sort().join(",")) continue;
      emitConcyclic(a, c, b, vy);
    }

    return out;
  },
};

const subsets4 = (pts: PointId[]): PointId[][] => {
  const out: PointId[][] = [];
  for (let a = 0; a < pts.length; a++)
    for (let b = a + 1; b < pts.length; b++)
      for (let c = b + 1; c < pts.length; c++)
        for (let d = c + 1; d < pts.length; d++)
          out.push([pts[a], pts[b], pts[c], pts[d]]);
  return out;
};

const concyclic_merge: Rule = {
  id: "concyclic_merge",
  name: "same circle (3 shared points)",
  derive(cited, { coords }) {
    const out: Fact[] = [];
    const cyc = relsOf(cited, "cyclic");
    for (let i = 0; i < cyc.length; i++) {
      for (let j = i + 1; j < cyc.length; j++) {
        const set2 = new Set(cyc[j].points);
        const shared = [...new Set(cyc[i].points)].filter((p) => set2.has(p));
        if (shared.length < 3) continue;
        // The shared points must include a non-collinear triple to pin a
        // unique circle (3 collinear points don't determine one).
        let pinned = false;
        for (let a = 0; a < shared.length && !pinned; a++)
          for (let b = a + 1; b < shared.length && !pinned; b++)
            for (let c = b + 1; c < shared.length && !pinned; c++) {
              const ca = coords[shared[a]];
              const cb = coords[shared[b]];
              const cc = coords[shared[c]];
              if (ca && cb && cc && !isCollinear(ca, cb, cc)) pinned = true;
            }
        if (!pinned) continue;
        const union = [...new Set([...cyc[i].points, ...cyc[j].points])];
        for (const quad of subsets4(union)) out.push(rel("cyclic", quad));
      }
    }
    return out;
  },
};

// ---- projective: Pappus -----------------------------------------------------

const perms3 = <T,>([a, b, c]: T[]): T[][] => [
  [a, b, c],
  [a, c, b],
  [b, a, c],
  [b, c, a],
  [c, a, b],
  [c, b, a],
];

/** A named point coincident with `p` (within tolerance), if any. */
function namedAt(p: V, coords: Coords, points: PointId[]): PointId | null {
  const tol = 1e-6 * (1 + Math.abs(p[0]) + Math.abs(p[1]));
  for (const id of points) {
    const c = coords[id];
    if (c && Math.hypot(c[0] - p[0], c[1] - p[1]) < tol) return id;
  }
  return null;
}

const parallel = (a: V, b: V, c: V, d: V): boolean => {
  const u = unit(sub(b, a));
  const w = unit(sub(d, c));
  return !!u && !!w && Math.abs(cross(u, w)) < 1e-6;
};

type Cross =
  | { kind: "fin"; id: PointId }
  | { kind: "inf"; a: PointId; b: PointId; c: PointId; d: PointId }
  | null;

/**
 * Pappus's hexagon theorem. Given two lines (each a cited `coll` of 3 points),
 * the three "cross" intersection points are collinear. We try every
 * correspondence between the two triples; intersections are matched to named
 * points via coordinates. When one cross-pair is parallel (its intersection is
 * at infinity), the conclusion becomes a parallelism between the other two
 * points and that direction — exactly the projective step used in IMO 2019 P2.
 */
const pappus: Rule = {
  id: "pappus",
  name: "Pappus's theorem",
  derive(cited, { coords, points }) {
    const out: Fact[] = [];
    const lines = relsOf(cited, "coll")
      .map((c) => c.points)
      .filter((p) => p.length === 3);

    for (const L1 of lines) {
      for (const L2base of lines) {
        if (new Set([...L1, ...L2base]).size !== 6) continue;
        for (const L2 of perms3(L2base)) {
          const pairs: [number, number][] = [
            [0, 1],
            [0, 2],
            [1, 2],
          ];
          const got: Cross[] = pairs.map(([i, j]) => {
            const a = coords[L1[i]];
            const b = coords[L2[j]];
            const c = coords[L1[j]];
            const d = coords[L2[i]];
            if (!a || !b || !c || !d) return null;
            const ip = lineIntersect(a, b, c, d);
            if (ip === null) return { kind: "inf", a: L1[i], b: L2[j], c: L1[j], d: L2[i] };
            const id = namedAt(ip, coords, points);
            return id ? { kind: "fin", id } : null;
          });

          if (got.some((g) => g === null)) continue;
          const fins = got.filter((g) => g!.kind === "fin") as { kind: "fin"; id: PointId }[];
          const infs = got.filter((g) => g!.kind === "inf") as Extract<Cross, { kind: "inf" }>[];

          if (infs.length === 0 && fins.length === 3) {
            const [x, y, z] = fins.map((f) => f.id);
            if (x !== y && y !== z && x !== z && isCollinear(coords[x], coords[y], coords[z])) {
              out.push(rel("coll", [x, y, z]));
            }
          } else if (infs.length === 1 && fins.length === 2) {
            const [x, y] = fins.map((f) => f.id);
            if (x === y) continue;
            const inf = infs[0];
            // The "point at infinity" must be justified by a cited parallelism
            // (not silently read off the coordinates) — so the cited para is a
            // necessary premise of this step.
            const paraCited = relsOf(cited, "para").some((pf) =>
              factEqual(pf, rel("para", [inf.a, inf.b, inf.c, inf.d])),
            );
            if (!paraCited) continue;
            for (const [p, q] of [
              [inf.a, inf.b],
              [inf.c, inf.d],
            ] as [PointId, PointId][]) {
              if (parallel(coords[x], coords[y], coords[p], coords[q])) {
                out.push(rel("para", [x, y, p, q]));
              }
            }
          }
        }
      }
    }
    return out;
  },
};

export const RULES: Rule[] = [
  inscribed_angle,
  collinear_same_ray,
  angle_value_transfer,
  angle_value_equal,
  angle_addition,
  triangle_angle_sum,
  straight_supplement,
  isosceles,
  midsegment,
  para_equal_angles,
  converse_inscribed,
  concyclic_merge,
  pappus,
];
