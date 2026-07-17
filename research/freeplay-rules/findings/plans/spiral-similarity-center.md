# Implementation plan — `spiral_similarity_center` (closes IMO 2024 SL G1)

> One sound, coordinate‑guarded **DD** rule that produces a `cong` (length
> equality) the angle layer cannot: the equidistance of a spiral‑similarity
> centre / Miquel point from corresponding endpoints, in the **rotation**
> (equal‑segment) case.
>
> **Status:** IMPLEMENTED. This rule (`spiral_similarity_center`) has been built,
> promoted to `src/lib/freeplay/rules/`, registered, and tested; G1 is fully closed.
> This document is the historical design plan. See [`README.md`](./README.md) for
> the current implementation status. Conforms to
> [`../../CONTEXT.md`](../../CONTEXT.md) "How to add a rule".

---

## 1. TL;DR

| | |
|---|---|
| **Rule id / name** | `spiral_similarity_center` — "spiral‑similarity centre (Miquel point) equidistance" |
| **Consumes** (G1 labels) | `coll(B,E,P)`, `coll(C,F,P)`, `cyclic(B,C,P,T)`, `cyclic(E,F,P,T)`, `cong(B,E,C,F)` |
| **Produces** | `cong(T,E,T,F)` (the G1 goal) **and** `cong(T,B,T,C)` |
| **Output kind** | `cong` — unreachable for `AngleAR` (no length table) and for `LengthAR` (no rotation machinery) |
| **Closes** | the final, currently‑`solutionReachesGoal:false` step of `src/lib/freeplay/puzzles/imo_shortlist_2024_g1.ts` |
| **Model rules** | `src/lib/freeplay/rules/sas_shared_vertex.ts`, `concyclic_equal_radii.ts`, `perp_bisector.ts` |
| **Promotable?** | Yes (pure DD, geom‑only deps). One wiring caveat — see §10. |

---

## 2. The gap (recap)

`imo_shortlist_2024_g1.ts` ships a multi‑case‑verified partial proof of
"Solution 3" that stops at one move. After its four steps the engine knows:

- `cong(C,F,B,E)` — `CF = BE` (SAS congruent triangles `△ACF ≅ △DEB`);
- `cyclic(B,C,D,P)` — `P = BE ∩ CF` lies on circle `ABCD`;

and from the givens it knows `T` is the **arc‑`BAC` midpoint**:
`cyclic(A,B,C,T)` (on the circle) + `cong(T,B,T,C)` (on the perpendicular
bisector of `BC`), plus `coll(B,E,P)`, `coll(C,F,P)`.

The **unreachable** move is the goal `cong(T,E,T,F)` (`TE = TF`, i.e. `T` is on
the perpendicular bisector of `EF` too). Mathematically: `T` is the **Miquel
point** of `BCFE` = the centre of the spiral similarity carrying `B→C`, `E→F`;
because `BE = CF` that similarity is a **rotation**, hence `T` is equidistant
from corresponding endpoints (`TB = TC` and `TE = TF`). No shipped rule
produces a spiral‑similarity centre's equidistance — `AngleAR` is angles‑only
and **never emits `cong`** (`ar.ts` `equation()` returns `null` for
`cong/cyclic/coll/midp`).

---

## 3. The theorem to encode

### 3.1 General statement (the rule)

> **Spiral‑similarity‑centre equidistance (rotation case).**
> Let two lines meet at `P`. Let `X, Y` lie on one line and `Z, W` on the other,
> i.e. `coll(X,Y,P)` and `coll(Z,W,P)`. Let `T (≠ P)` be the **second common
> point** of the two circles `(X,Z,P)` and `(Y,W,P)`. Then `T` is the centre of
> the unique spiral similarity sending `X↦Z` and `Y↦W`, so
> `TZ/TX = TW/TY = ZW/XY` (the ratio law). In particular, **if `XY = ZW`** the
> similarity is a rotation and
> `TX = TZ` **and** `TY = TW`.

Correspondence with the user's `(X,Y,Z,W,T)` framing: the two equal segments are
`XY` and `ZW` (with `X↔Z`, `Y↔W`); `T` lies on the Miquel circles `(T,X,Z,·)`
and `(T,Y,W,·)` whose common "`·`" is `P = XY ∩ ZW`; conclude `cong(T,X,T,Z)` and
`cong(T,Y,T,W)`.

### 3.2 Specialisation to G1

`(X, Y, Z, W, T, P) = (B, E, C, F, T, P)`:

- lines: `coll(B,E,P)` and `coll(C,F,P)` (the two segment‑lines through `P`);
- circles: `(B,C,P)` = circumcircle of `ABCD` (it carries `B,C` and — once
  `P ∈ ABCD` is established — `P`), and `(E,F,P)`;
- `T` = their second intersection;
- equal segments: `cong(B,E,C,F)` (`BE = CF`);
- conclusion: `cong(T,E,T,F)` (goal) and `cong(T,B,T,C)`.

### 3.3 Numeric confirmation (throwaway `/tmp` experiments, now deleted)

- **Ratio law / theorem holds.** 173 107 random configs with `T` on **both**
  circles and `P = XY ∩ ZW`: `max | (ZW/XY) − (TZ/TX) | , | (ZW/XY) − (TW/TY) |`
  (relative) `= 9.5e‑12`. ⇒ `XY = ZW ⇒ TX = TZ ∧ TY = TW`.
- **G1 instance** (canonical coords of the puzzle): `BE = CF`, `TE = TF`,
  `TB = TC` all hold; `cyclic(B,C,P,T)` and `cyclic(E,F,P,T)` both hold; `T` is
  the centre of the `(B→C, E→F)` spiral (complex ratio `|ρ| = 1.000000`), and
  `T =` second intersection of circles `(BCP)`, `(EFP)`.
- **Both circles are necessary** (drives the premise design, §4):
  - *Drop circle `(E,F,P)`*: the **other** arc‑midpoint `T'` (antipode of `T`)
    satisfies `T'B = T'C`, `T'` on circle `(B,C,P)`, `BE = CF`, and the
    collinearities — yet `T'E ≠ T'F`. So "arc‑mid + `BE=CF` + colls" does **not**
    entail `TE = TF`.
  - *Replace circle `(B,C,P)` by `cong(T,B,T,C)` (perp‑bisector of `BC`) + circle
    `(E,F,P)`*: two points satisfy `{UB=UC, U ∈ (E,F,P)}`; only the spiral centre
    has `UE = UF`. So a single circle plus the perpendicular bisector is **not**
    enough either.

Conclusion: the **two‑circle incidence** is the minimal sound way to pin `T` as
the spiral centre. The puzzle's `cong(T,B,T,C)` given is therefore an *output*,
not an input.

---

## 4. Exact fact signature

### 4.1 Consumed → produced

| role | general | G1 | available in G1? |
|---|---|---|---|
| line 1 | `coll(X,Y,P)` | `coll(B,E,P)` | **given** |
| line 2 | `coll(Z,W,P)` | `coll(C,F,P)` | **given** |
| circle 1 | `cyclic(X,Z,P,T)` | `cyclic(B,C,P,T)` | **derivable** (see §8) |
| circle 2 | `cyclic(Y,W,P,T)` | `cyclic(E,F,P,T)` | **true, not yet established** — see §8/§10 |
| equal segs | `cong(X,Y,Z,W)` | `cong(B,E,C,F)` ≡ `cong(C,F,B,E)` | **established** (SAS step) |
| ⇒ produced | `cong(T,X,T,Z)`, `cong(T,Y,T,W)` | `cong(T,B,T,C)`, **`cong(T,E,T,F)`** | goal = `cong(T,E,T,F)` |

`cong(X,Y,Z,W)` is symmetric in its two segments, so the puzzle's
`cong(C,F,B,E)` is the same canonical fact as `cong(B,E,C,F)` (see `relKey` in
`dsl.ts`).

### 4.2 How `T` is presented, and why this premise set is minimal

`T` is presented as **"the second intersection of the two Miquel circles"** via
its two concyclicity incidences `cyclic(X,Z,P,T)` and `cyclic(Y,W,P,T)`. This is
exactly the user's "`T` on circle `ABCD` and on circle `EFP`; `P` the second
intersection".

The **four incidences** (`2 coll + 2 cyclic`) pin `T` as the spiral centre
(unique second intersection); the **fifth** premise `cong(X,Y,Z,W)` upgrades the
spiral similarity to a **rotation**, which is what licenses an *equality*
(`cong`) rather than a ratio. Each premise is load‑bearing (and the verifier's
minimality check will drop each in turn):

| drop | what breaks | counter‑model |
|---|---|---|
| `coll(X,Y,P)` | `X↔Y` / `P` pairing on line 1 lost → wrong correspondence | ratio law fails |
| `coll(Z,W,P)` | same on line 2 | ratio law fails |
| `cyclic(X,Z,P,T)` | `T` not pinned to circle 1 (only perp‑bis + circle 2) | §3.3 "`U`" point |
| `cyclic(Y,W,P,T)` | `T` not pinned to circle 2 | §3.3 arc‑mid `T'` |
| `cong(X,Y,Z,W)` | ratio `≠ 1` → `TX ≠ TZ`, `TY ≠ TW` | any non‑isometric spiral |

Note `cong(T,B,T,C)` (a puzzle **given**) is **not** cited — it is re‑derived as
an output, so citing it would be flagged `extraneous_premises`.

---

## 5. `derive(cited, ctx)` — implementation sketch

Same shape as `sas_shared_vertex.ts` / `concyclic_equal_radii.ts`: match the
combinatorial pattern over cited facts, then gate on coordinates.

```ts
import type { Fact, PointId, Rel } from "@/lib/freeplay/dsl";
import { canonicalKey, rel } from "@/lib/freeplay/dsl";
import type { Rule } from "@/lib/freeplay/rules";
import { circumcenter, dist, isCollinear, type V } from "@/lib/freeplay/geom";

const EPS = 1e-6;
const cyclicsOf = (c: Fact[]) => c.filter((f): f is Rel => f.kind === "rel" && f.name === "cyclic");
const congsOf   = (c: Fact[]) => c.filter((f): f is Rel => f.kind === "rel" && f.name === "cong");

// all cited 3-point sub-collinearities, as a fast membership test
function collTriples(cited: Fact[]): Set<string> {
  const s = new Set<string>();
  for (const f of cited) if (f.kind === "rel" && f.name === "coll") {
    const p = f.points;
    for (let i=0;i<p.length;i++) for (let j=i+1;j<p.length;j++) for (let k=j+1;k<p.length;k++)
      s.add([p[i],p[j],p[k]].sort().join(","));
  }
  return s;
}
const hasColl = (s: Set<string>, a: PointId, b: PointId, c: PointId) =>
  s.has([a,b,c].sort().join(","));

const lenEq = (a:V,b:V,c:V,d:V) => Math.abs(dist(a,b)-dist(c,d)) < EPS*Math.max(1,dist(a,b),dist(c,d));
const onCircle = (p:V,q:V,r:V,x:V) => { const o=circumcenter(p,q,r); if(!o) return false;
  const R=dist(o,p); return Math.abs(dist(o,x)-R) < EPS*Math.max(1,R); };

export const spiral_similarity_center: Rule = {
  id: "spiral_similarity_center",
  name: "spiral-similarity centre (Miquel point) equidistance",
  derive(cited, { coords }) {
    const out: Fact[] = [];
    const emitted = new Set<string>();
    const push = (f: Fact) => { const k = canonicalKey(f); if (!emitted.has(k)) { emitted.add(k); out.push(f); } };

    const cyclics = cyclicsOf(cited);
    const colls = collTriples(cited);
    const congKeys = new Set(congsOf(cited).map(canonicalKey));
    const hasCong = (a:PointId,b:PointId,c:PointId,d:PointId) =>
      congKeys.has(canonicalKey(rel("cong",[a,b,c,d])));

    for (let i = 0; i < cyclics.length; i++) {
      for (let j = i + 1; j < cyclics.length; j++) {
        const s1 = [...new Set(cyclics[i].points)];
        const s2 = [...new Set(cyclics[j].points)];
        const shared = s1.filter(p => s2.includes(p));
        if (shared.length !== 2) continue;            // circles meet in {P,T}
        const rest1 = s1.filter(p => !shared.includes(p)); // {X,Z}
        const rest2 = s2.filter(p => !shared.includes(p)); // {Y,W}
        if (rest1.length !== 2 || rest2.length !== 2) continue;

        for (const P of shared) {                     // try each shared pt as P
          const T = shared[0] === P ? shared[1] : shared[0];
          // pairing fixed by the cited collinearities through P:
          for (const X of rest1) {
            const Z = rest1[0] === X ? rest1[1] : rest1[0];
            const Y = rest2.find(y => hasColl(colls, X, y, P)); // X,Y,P collinear
            if (!Y) continue;
            const W = rest2[0] === Y ? rest2[1] : rest2[0];
            if (!hasColl(colls, Z, W, P)) continue;   // Z,W,P collinear
            if (!hasCong(X, Y, Z, W)) continue;        // XY = ZW cited

            const cpts = [X,Y,Z,W,P,T].map(p => coords[p]);
            if (cpts.some(c => !c)) continue;
            const [cX,cY,cZ,cW,cP,cT] = cpts as V[];
            // distinctness: all six points pairwise distinct
            let coincident = false;
            for (let a=0;a<6 && !coincident;a++) for (let b=a+1;b<6;b++)
              if (dist(cpts[a]!, cpts[b]!) < EPS) { coincident = true; break; }
            if (coincident) continue;
            if (!isCollinear(cX,cY,cP) || !isCollinear(cZ,cW,cP)) continue;
            if (isCollinear(cX,cY,cT) || isCollinear(cZ,cW,cT)) continue; // T off both lines
            // re-verify both circle memberships from coords (defence in depth)
            if (!onCircle(cX,cZ,cP,cT) || !onCircle(cY,cW,cP,cT)) continue;
            // ROTATION gate: XY = ZW  (the equal-segment hypothesis)
            if (!lenEq(cX,cY,cZ,cW)) continue;
            // emit only the equalities that actually hold numerically
            if (lenEq(cT,cX,cT,cZ)) push(rel("cong",[T,X,T,Z]));
            if (lenEq(cT,cY,cT,cW)) push(rel("cong",[T,Y,T,W]));
          }
        }
      }
    }
    return out;
  },
};
```

(Pseudocode — mirror the careful guard style and `null`/degeneracy handling of
`concyclic_equal_radii.ts` when implementing.)

---

## 6. Soundness guard (coordinates)

The rule emits a `cong` only when **all** of the following hold in `ctx.coords`,
so it can never emit a false fact and never "reads" an uncited premise off the
diagram:

1. all six points exist and are pairwise distinct; `T ≠ P`;
2. `X,Y,P` collinear and `Z,W,P` collinear, **and** these collinearities are
   among the cited `coll` facts (load‑bearing, not read from coords);
3. `T` is **off** both lines (`X,Y,T` and `Z,W,T` non‑collinear) — genuine
   triangles / non‑degenerate circles;
4. `T` lies on circle `(X,Z,P)` **and** on circle `(Y,W,P)`
   (`circumcenter` + equal‑radius check, matching `factHolds`'s `cyclic` test);
5. the rotation gate `|XY| = |ZW|` holds (matching `factHolds`'s `cong`
   tolerance), and `cong(X,Y,Z,W)` is cited;
6. the emitted equality itself holds numerically (`|TX| = |TZ|`, resp.
   `|TY| = |TW|`).

Because §3.3's ratio law makes `|XY| = |ZW| ⇒ |TX| = |TZ| ∧ |TY| = |TW|` a
*theorem* under premises (1)–(5), guard (6) is satisfied automatically whenever
the premises genuinely hold — it only protects against degenerate samples and
cited facts that aren't actually realised. (Unlike `sas_congruence`, there is no
reflection ambiguity: the two‑circle + collinearity data pins the *direct*
spiral centre uniquely.)

---

## 7. Interaction with DD / AR / LengthAR

- **AngleAR (`ar.ts`)** is directed‑angle‑only and **cannot emit `cong`**:
  `equation()` returns `null` for `cong/cyclic/coll/midp`, and there is no length
  table. The output `cong(T,E,T,F)` is therefore invisible to AR — it must come
  from a DD rule. *(Confirmed by reading `ar.ts`.)*
- **LengthAR (`lengths/`)** is a log‑distance / `eqratio` Gaussian table. It can
  chain *ratio* equalities but has **no rotation/spiral machinery** and no way to
  introduce the centre `T` or to learn `T` is the spiral centre from circle
  incidences. It cannot derive the ratio law `TZ/TX = TW/TY = ZW/XY`, let alone
  the rotation specialisation, which is a `cong` (not an `eqratio`) anyway.
- ⇒ This must be a **coordinate‑guarded DD rule emitting `cong`**, exactly like
  the existing length‑producing research rules (`perp_bisector`,
  `sas_congruence`, `sas_shared_vertex`, `concyclic_equal_radii`).
- **No interference:** the rule fires only on the specific `2 coll + 2 cyclic +
  1 cong` shape and re‑checks all incidences numerically, so it adds no spurious
  derivations to other puzzles. Cost is `O(#cyclic² · #rest pairings)` — tiny.

---

## 8. How it closes G1 (one‑step derivation)

After the shipped four steps, extend the proof:

**Prereq A — `cyclic(B,C,P,T)` (derivable by the shipped `concyclic_merge`).**
- `cyclic(A,B,C,T)` + `cyclic(A,B,C,D)` share `{A,B,C}` ⇒ `A,B,C,D,T` concyclic
  (gives `cyclic(B,C,D,T)`).
- `cyclic(B,C,D,T)` + `cyclic(B,C,D,P)` share `{B,C,D}` ⇒ `B,C,D,T,P` concyclic
  ⇒ **`cyclic(B,C,P,T)`**.

**Prereq B — `cyclic(E,F,P,T)` (the Miquel concyclicity).** True in the figure
(`T` is the Miquel point), but **not** derivable by the shipped engine and not in
the current `given` list. It is one of `T`'s defining incidences as the spiral
centre. See §10 for the two ways to make it available; the research G1‑closure
test supplies it as an established incidence (it holds in the coords).

**Final step (the new rule).**

```
cong(T,E,T,F)
  rule:     spiral-similarity centre (Miquel point) equidistance
  premises: coll(B,E,P), coll(C,F,P),
            cyclic(B,C,P,T), cyclic(E,F,P,T),
            cong(C,F,B,E)
  reading:  T is the 2nd intersection of circles (B,C,P) and (E,F,P) and
            P = BE ∩ CF, so T is the centre of the spiral similarity B→C, E→F;
            since BE = CF it is a rotation, hence TE = TF (and TB = TC).
```

This reaches the puzzle `goal = cong(T,E,T,F)`. (`cong(T,B,T,C)` is also emitted
— a re‑derivation of the puzzle's given, useful as a cross‑check.)

---

## 9. Test plan (`research/freeplay-rules/rules/__tests__/spiral_similarity_center.test.ts`)

Following `CONTEXT.md` and the `perp_bisector` / `sas_shared_vertex` test
templates. Helpers: `import { verifyWith, RULES } from "../../harness"` and
`factHolds` from `@/lib/freeplay/check`.

**Isolation figure (generic, rotation, exact rational — 3‑4‑5 rotation about
`T`):**

```ts
const coords = {
  T: [0, 0],
  B: [6, 2],  C: [2, 6],          // C = rot(B), pure rotation cos=3/5 sin=4/5
  E: [1, 5],  F: [-3.4, 3.8],     // F = rot(E)
  P: [7/17, 91/17],               // P = line(B,E) ∩ line(C,F)
};
// BE² = CF² = 34 ; TB² = TC² = 40 ; TE² = TF² = 26 ; all lengths distinct (scalene)
const colBEP = rel("coll", ["B","E","P"]);
const colCFP = rel("coll", ["C","F","P"]);
const cyc1   = rel("cyclic", ["B","C","P","T"]);
const cyc2   = rel("cyclic", ["E","F","P","T"]);
const congBE = rel("cong", ["B","E","C","F"]);
const goal   = rel("cong", ["T","E","T","F"]);
const prem   = [colBEP, colCFP, cyc1, cyc2, congBE];
```

Required cases:

1. **Faithfulness** — `factHolds` is `true` for every premise and the goal, and
   `false` for decoys (`cong(T,B,T,E)`, `cong(B,E,T,B)`) so coincidences can't
   fake it.
2. **Fires in isolation** — `verifyWith([spiral_similarity_center], {... candidate: goal, citedPremises: prem})`
   → `{ valid: true, rule: "spiral-similarity centre (Miquel point) equidistance" }`.
   Also assert it emits `cong(T,B,T,C)`.
3. **Minimality** — for **each** of the 5 premises, dropping it ⇒ `valid:false`
   (5 sub‑cases). This is exactly §4.2.
4. **Soundness‑negative A (`BE ≠ CF`)** — same `T,B,E` but a *non‑isometric*
   spiral (ratio `k = 1.6`): `C=[1.673366,8.452209]`, `F=[-3.624647,6.169436]`,
   `P=[-2.184764,6.789843]`. All four incidences still hold but `BE ≠ CF`,
   `TE ≠ TF`, `TB ≠ TC`. Assert `derive(...)` emits **no** `cong(T,E,T,F)` and
   the verifier rejects the (false) step.
5. **Soundness‑negative B (`T` not the centre)** — take `T'` = the *other*
   arc‑midpoint (e.g. reuse the G1 figure's antipodal `T'`): `T'B = T'C`, `T'` on
   circle `(B,C,P)`, `BE = CF`, colls hold, **but `T'` ∉ circle `(E,F,P)`** so
   `cyclic(E,F,P,T')` is `false` and cannot be cited; `cong(T',E,T',F)` is
   `false`. Assert the rule does not emit it and the verifier rejects it. (This
   is the case that proves the second circle is load‑bearing, §3.3.)
6. **Shipped engine can't already do it** — `verifyWith(RULES, {... candidate: goal, citedPremises: prem})`
   → `valid:false`. (No shipped rule maps `2 coll + 2 cyclic + 1 cong` to a
   `cong`; AR can't emit `cong`.) If this ever returns valid, the rule is
   redundant — stop and pick another target.
7. **G1 extends to the goal** — rebuild the G1 coords (port `buildFigure`), take
   the established facts (`coll(B,E,P)`, `coll(C,F,P)`, `cong(C,F,B,E)`,
   `cyclic(B,C,P,T)` [derived], `cyclic(E,F,P,T)` [Miquel incidence, holds in
   coords]) and assert
   `verifyWith([...RULES, spiral_similarity_center], {... candidate: cong(T,E,T,F), citedPremises: the five}) → valid:true`,
   while `verifyWith(RULES, ...) → valid:false`.

---

## 10. Risks, limitations, promotability

- **`cyclic(E,F,P,T)` availability (main caveat).** The rule is fully sound and
  minimal, but to *close the shipped G1 puzzle* it needs `T`'s second‑circle
  incidence, which the current `given` list omits (the puzzle pins `T` as the
  arc‑midpoint). Two clean remedies, in order of preference:
  1. **Expose it as a given** when the puzzle is (separately) re‑encoded:
     present `T` as "the second intersection of circle `ABCD` and circle `EFP`",
     adding `cyclic(E,F,P,T)` (a faithful construction fact). The original
     arc‑midpoint facts then become *consequences* (`cong(T,B,T,C)` is even
     re‑emitted by this rule). Out of scope to edit here; flagged for the puzzle
     owner.
  2. A companion "Miquel concyclicity" rule deriving `cyclic(E,F,P,T)` — but that
     theorem *is* the spiral argument (it needs the metric `BE = CF` to identify
     which point is the Miquel point), so it is no simpler. **Not recommended.**
  - "arc‑mid only" pinning (`cyclic(A,B,C,T)` + `cong(T,B,T,C)` instead of the
    two circles) is **unsound** — §3.3 exhibits the antipodal arc‑midpoint `T'`
    as a counter‑model. Do **not** take that shortcut.
- **Scope = rotation only.** The rule emits `cong` solely when `XY = ZW`. The
  general `XY ≠ ZW` case yields a *ratio* (`TZ/TX = TW/TY = ZW/XY`), an `eqratio`
  belonging to the `lengths/rules/` subsystem (LengthAR) — a natural, separate
  follow‑up, not needed for G1.
- **Degeneracies** handled by guards: parallel lines (no `P`), `T = P`, three
  collinear circle points, coincident points — all cause the rule to stay
  silent.
- **Pairing safety.** Both assignments of the shared pair to `{P,T}` are tried;
  the cited collinearities select `P` and fix the `X↔Y`, `Z↔W` correspondence.
  A wrong assignment would try to emit `cong(P,·,P,·)`, which fails guard (6).
- **Promotability: yes.** Pure DD rule depending only on `@/lib/freeplay/geom`,
  `dsl`, and the `Rule` type — identical footprint to `sas_shared_vertex.ts`.
  Promote by copying to `src/lib/freeplay/rules/spiral_similarity_center.ts` and
  appending to that folder's `PROMOTED_RULES` (never edits `rules.ts`). It is a
  genuine, broadly useful gap‑filler (Miquel / spiral‑similarity centre
  configurations recur across olympiad geometry), so promotion is warranted once
  the `cyclic(E,F,P,T)` wiring above is in place.

---

## Appendix — numeric experiments (run in `/tmp`, deleted)

| probe | setup | result |
|---|---|---|
| theorem | 173 107 random `T`‑on‑both‑circles configs | ratio law `TZ/TX = TW/TY = ZW/XY` max rel err `9.5e‑12` |
| G1 instance | puzzle canonical coords | `BE=CF`, `TE=TF`, `TB=TC`; `T` = 2nd int of `(BCP),(EFP)`; spiral `|ρ|=1` |
| need circle 2 | drop `(E,F,P)`, use antipodal arc‑mid `T'` | `T'B=T'C` ✓, `T'∈(BCP)` ✓, `BE=CF` ✓, but `T'E≠T'F` ✗ |
| need circle 1 | perp‑bis(`BC`) + `(E,F,P)` only | two points `{UB=UC, U∈(EFP)}`; only spiral centre has `UE=UF` |
| test coords | 3‑4‑5 rotation about `T=(0,0)` | `B(6,2) C(2,6) E(1,5) F(-3.4,3.8) P(7/17,91/17)`; `BE²=CF²=34`, `TB²=TC²=40`, `TE²=TF²=26` |
