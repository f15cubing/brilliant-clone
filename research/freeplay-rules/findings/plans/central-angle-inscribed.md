# Implementation plan — `central_angle_double` (IMO 2024 SL G5 deeper gap)

> The "central angle = 2 × inscribed angle" capability the puzzle note asks for,
> specified as **one sound, coordinate‑guarded DD rule** that emits a directed
> `aval` (a `2×` angle‑token relation `∠P_iOP_j = 2·∠P_iP_kP_j`) from a circle's
> centre witness.
>
> **Headline verdict (be honest, read this first).** A central‑angle facility is
> buildable and sound in the mod‑180 engine — but it **does NOT close G5's
> deeper step**. The deeper step (`∠ZAK = ∠IAY`, `∠WAK = ∠IAX`) reduces to a
> cross‑circle **equal‑arc / parallel‑chord** fact (`PJ ∥ YZ`, `J = AI ∩ ω`) that
> is *not* an inscribed‑ or central‑angle consequence and is unreachable by
> `AngleAR` even when fed the full sound centre scaffolding (centre cong‑stars,
> doublings, isosceles base angles, line‑of‑centres ⊥ common chord). That
> equal‑arc fact is itself the G5‑hard content; proving it needs an auxiliary
> construction **plus** a metric/parallel bridge a directed‑angle engine cannot
> perform. **So this part of the gap is out of reach for the directed‑angle
> engine.** This plan specs the central‑angle rule anyway (it is the genuine
> named capability, sound and cheap, and precisely localises the residual
> blocker), and ranks it honestly against the isosceles workaround and a
> full‑angle (mod‑360) channel.
>
> **Status:** plan only. Nothing here is implemented. Conforms to
> [`../../CONTEXT.md`](../../CONTEXT.md) "How to add a rule". All numbers below come
> from throwaway `/tmp` experiments (a faithful JS port of `ar.ts` + a JS rebuild
> of the puzzle's `build()`), now deleted; the appendix lists them.

---

## 1. TL;DR

| | |
|---|---|
| **Rule id / name** | `central_angle_double` — "central angle = 2 × inscribed angle" |
| **Consumes** (general) | `cyclic(P1,P2,P3,P4)` + centre witness `cong(O,P1,O,P2)`, `cong(O,P2,O,P3)`, `cong(O,P3,O,P4)` |
| **Produces** | `aval([P_i,O,P_j], 2·angle(P_i,P_k,P_j))` (reflex‑guarded; see §6) — the central angle at `O` equals twice the inscribed angle at `P_k` on the same chord |
| **Output kind** | `aval` with a `2×` angle token — consumable by `AngleAR` (verified it encodes mod 180) |
| **Closes G5's deeper step?** | **No.** Adds the named capability but does not reach `∠ZAK = ∠IAY` (see §5, §8). |
| **Closes anything in G5?** | **No** — zero movement on the critical path (experiment §5.3). |
| **mod‑180 verdict** | A *full* (mod‑360) central angle is unrepresentable; only its mod‑180 shadow `≡ 2·inscribed` is. The forward (×2) direction is sound; the **halving** direction G5 needs is mod‑180‑lossy (only mod 90), and the truth check (`factHolds`, unsigned ≤180°) forces a coordinate‑selected `2θ` vs `360−2θ` form. |
| **Model rules** | `rules/concyclic_equal_radii.ts` (centre recovery from a cong‑star), `src/lib/freeplay/rules.ts` `inscribed_angle` (the 1× dual), `ar.ts` (aval/angle‑token encoding) |
| **Promotable?** | Mechanically yes (pure DD, geom‑only deps). But **not recommended for G5**, and carries a halving soundness caveat (§3.4) — recommend *holding* unless a problem genuinely needs the forward direction. |

---

## 2. The gap (recap)

`src/lib/freeplay/puzzles/imo_shortlist_2024_g5.ts` ships a multi‑case‑verified
**partial** chain (`solutionReachesGoal: false`). The verified core is the
power‑of‑a‑point length lemma

```
KA·KP = KB·KC = KY·KZ = KW·KX
```

(Solution 1's opening "so `P` lies on circle `AYZ`"). Two gaps remain, in order:

1. **First gap — converse power of a point:** `cyclic(A,Y,P,Z)` (and
   `cyclic(A,W,X,P)`) from the equal‑power condition. This is the subject of a
   *separate* plan (`power-of-a-point-radical-axis.md`); here we **grant** it.
2. **Deeper gap (this plan's target):** the two key equalities

   ```
   ∠ZAK = ∠IAY      and      ∠WAK = ∠IAX
   ```

   The puzzle's bottom comment attributes these to Solution 1's circle‑**centre**
   argument (`O, M, S` of `Γ=ABC`, `Ω=BIC`, `ω=AYZ`) and the identity
   `∠PAN = ½∠PSN = ½∠PSM = ½∠PAM` — i.e. "central angle = twice inscribed".

The in‑engine **reduction is already verified**: granting the two equalities, the
goal `∠WAY = ∠ZAX` follows by one directed‑angle chase (the puzzle test
`"the final reduction to the goal is engine-derivable from the two key
equalities"`). So the deeper gap is *exactly* those two equalities.

By the mirror symmetry `(Y,Z) ↔ (W,X)`, `∠WAK = ∠IAX` has the same structure as
`∠ZAK = ∠IAY`; this plan analyses the latter throughout, and the analog circle is
`ω' = circle(A,W,X)` (= `circle(A,W,X,P)`, which is concyclic — confirmed in §5.1).

---

## 3. Confronting the mod‑180 limitation (the central technical section)

### 3.1 Why a *literal* central angle cannot live in `AngleAR`

`AngleAR` (`src/lib/freeplay/ar.ts`) is a Gaussian table over **line‑direction**
variables, reduced **mod 180°** (the constant generator `PI = 180`; `rmod1` drops
whole turns). A line is direction‑only: `dir(P,Q)` and `dir(Q,P)` collapse to one
variable in `[0,180)`. Consequently every angle the table reasons about is a
*difference of line directions*, inherently **mod 180**.

A central angle `∠P_iOP_j` is a **full angle** — it ranges over `[0,360)` and the
inscribed‑angle theorem cares about *which arc* it subtends (`2θ` can be reflex).
That mod‑360 information has **no slot** in a mod‑180 table: the moment a central
angle enters `AngleAR` it is reduced to its mod‑180 shadow and the
reflex/non‑reflex distinction is lost.

The truth checker makes the same reduction even harder. `factHolds` for an `aval`
compares `angleDeg(P_i,O,P_j)` — an **unsigned** value in `[0,180]` — against the
form's numeric value. So a literal `aval(∠P_iOP_j = 2·angle(P_i,P_k,P_j))` is
**only numerically true when `2·inscribed ≤ 180`**. Measured in G5 (`/tmp`):

| chord, apex | inscribed θ | 2θ | unsigned central `∠·O·` | literal `2θ` form valid? |
|---|---|---|---|---|
| `YZ`, apex `A` | 44.888° | 89.776° | 89.776° | ✅ |
| `YP`, apex `A` | 31.822° | 63.644° | 63.644° | ✅ |
| `ZP`, apex `A` | 13.066° | 26.132° | 26.132° | ✅ |
| `YZ`, apex `P` | 135.112° | **270.224°** | 89.776° | ❌ (needs `360 − 2θ`) |

So even the "successful" encoding must **coordinate‑select** the form
(`2·angle(...)` vs `360 − 2·angle(...)`) to pass `factHolds` (§6). That selection
*is* the mod‑360 datum — discarded the instant it enters AR.

### 3.2 What IS soundly representable: the directed doubling, mod 180

The good news, verified empirically: the directed identity

```
∠(OP_i, OP_j)  ≡  2 · ∠(P_kP_i, P_kP_j)     (mod 180°)
```

**holds for every chord/apex split** and **`AngleAR` encodes it** (a `2×` angle
token in an `aval`; `formValue` scales `measure(token)` by the coefficient).
Sanity from `/tmp`: after adding the doublings, AR `implies` both an added
doubling and a *non‑added* true consequence — i.e. they are faithfully in the
table. The constant `360` in the reflex form folds to `2·PI ≡ 0 (mod 1 turn)`, so
both forms are AR‑equivalent mod 180 (only `factHolds` distinguishes them). This
is exactly the puzzle note's candidate rule, and it is **sound to emit** (§6).

### 3.3 Why mod‑180 doubling still cannot do G5's job

G5 does not need the forward direction (inscribed → central, ×2). It needs to
**compare two inscribed angles** (`∠ZAK = ∠ZAP` vs `∠IAY`), which via the centre
would require **halving** a central‑angle equality. Halving is the fatal step:

```
2x ≡ 2y (mod 180)   ⟹   x ≡ y (mod 90),   NOT   x ≡ y (mod 180).
```

`2x ≡ 2y` leaves `x − y ∈ {0°, 90°}`. The mod‑180 refinement to `x = y` is not
entailed — it can only be *read off the coordinates* (via AR's `balance()` whole‑turn
fixing). AR will happily conclude `x = y` because the figure satisfies it, but
that conclusion is **not a logical consequence of the cited premises** — it is the
branch picked from the diagram. That violates the cite‑driven contract
(`CONTEXT.md`: "coordinates fix only signs/branches, never collapse variables").

### 3.4 Soundness caveat of any `2×` aval in AR (pre‑existing, amplified)

This halving hazard is **not new to this rule** — the DSL already lets a learner
type `∠XYZ = 2·angle(A,B,C)`, and `AngleAR` already scales angle tokens by
arbitrary rationals. The hazard is that, once two `2×` avals and a central‑angle
equality are in the table, AR can "derive" a *halved* equality that is only
mod‑90 entailed; the multi‑realization `factHolds` check will *not* catch it
(every realization of the same theorem satisfies the mod‑180 form), so an
under‑premised step can slip through `minimality`. A rule that mass‑produces `2×`
avals **amplifies** this. Mitigation: only emit the forward fact, document that
downstream halving is unsound, and prefer not to promote unless a target problem
needs the forward direction (e.g. "this central angle equals twice a known
inscribed value", where the value flows *into* the central angle, not out).

---

## 4. The three encodings, evaluated

| option | representation | sound? | closes G5 deeper step? | cost |
|---|---|---|---|---|
| **A. Directed doubling aval** (recommended *form*, §6) | `aval(∠P_iOP_j = 2·angle(P_iP_kP_j))`, reflex‑guarded; mod‑180 in AR | **Forward: yes.** Halving (what G5 needs): **no** (§3.3–3.4) | **No** (§5, §8) | Low — one DD rule, geom‑only |
| **B. Isosceles / radius "angle‑to‑centre"** (task's "most promising") | base‑angle facts `∠OAB = ∠OBA`, equiv. `∠OAB = 90° − ∠ACB`; pure mod‑180, **no reflex** | Yes (each fact true & coordinate‑guarded) | **No** — insufficient even with full scaffolding (§5.2) | Low, but doesn't help G5 |
| **C. Full‑angle (mod‑360) channel** | a separate signed/oriented‑angle table carrying full turns | Yes, in principle | **No** — still can't reach the cross‑circle equal‑arc fact (§5) | **High** — new fact kind + new table + new verifier path; large blast radius |

### 4.1 Option B in detail (the isosceles/radius workaround)

The task flags this as the most promising sound route: since `S` is the centre of
`ω`, `SA = SY = SZ = SP` are equal radii, so `△SAY, △SAZ, △SAP, …` are isosceles,
and the classic inscribed‑angle proof (base angles + exterior angle) doubles
*without* ever naming a reflex angle. Concretely the sound, reflex‑free primitive
is the **base‑angle / angle‑to‑centre** relation

```
∠OAB = ∠OBA = 90° − ∠ACB      (O centre; A,B,C on the circle)
```

a linear mod‑180 relation, emittable as `eqangle(O,A,B, O,B,A)` (already produced
by the shipped `isosceles_converse`) or as the `aval(∠OAB = 90 − angle(A,C,B))`.

**Verdict: insufficient for G5.** Injecting the base‑angle facts at `S`
(`iso(SAP), iso(SAY), iso(SAZ)`), with or without `coll(A,I,M)` (`M` = centre of
`Ω`), leaves `∠ZAK = ∠IAY` **underivable** in the faithful AR port (§5.2). The
reason is structural, not a missing fact: the base‑angle relations live entirely
inside `ω` and relate `A`‑apex angles to the radius lines `SA, SY, SZ, SP`; they
never connect to `I` / `Ω`. G5's equality couples `ω` to the line `AI` (which
passes through the *centre of the other circle* `Ω`), and no amount of `ω`‑internal
isosceles data bridges that. So "AN bisects ∠PAM ⇒ ∠ZAK = ∠IAY" **cannot** be
closed by radius‑equidistance + the existing isosceles / angle‑sum rules.

### 4.2 Option C in detail (full‑angle channel) — cost

A genuine central‑angle facility would add a parallel **oriented‑angle** table
keyed mod 360 (a signed direction per *ray*, not per line), plus: a new fact kind
(or an `aval` variant) that records full turns; a verifier branch that consults it;
and truth‑check changes (signed angle in `[0,360)` instead of unsigned `angleDeg`).
This is comparable in scope to the `lengths/` subsystem (a whole second engine).
**And it still does not close G5** (§5), because the obstruction is not the
inability to halve — it is that the needed **equal‑arc** fact is a cross‑circle
metric relation, not any local central‑angle statement. So Option C buys a large,
broadly‑useful capability but **not** this gap. Not justified by G5.

---

## 5. The deeper step, dissected (empirical heart)

All claims below are from a **faithful JS port of `AngleAR`** (`Table` + `AngleAR`,
exact `bigint` rationals) fed the G5 givens + collinearities + the full directed
inscribed‑angle set of every cited circle (`Ω = BIC{WXYZ}`, `Γ = ABCP`) + the
**granted** `cyclic(A,Y,P,Z)`. The goal is `eqangle(Z,A,K, I,A,Y)`.

### 5.1 The reduction chain

1. `coll(A,K,P)` with `K` between `A` and `P` ⇒ **ray `AK` = ray `AP`**, so
   `∠ZAK = ∠ZAP` (and `∠ZAP` is inscribed in `ω`).
2. Hence the goal `∠ZAK = ∠IAY` ⟺ **`∠(AI,AY) ≡ ∠(AZ,AP)` (directed)** — i.e.
   `AI` and `AP` are **isogonal in `∠YAZ`** (numerically `∠YAI = ∠ZAP = 13.066°`,
   `∠YAP = ∠ZAI = 31.822°`).
3. **Incenter–excenter lemma:** `A, I, M` are collinear (`M` = centre of `Ω` =
   arc‑midpoint of `BC` on `Γ`; verified `M ∈ Γ`, `cross(AI,AM)=0`). So
   `∠IAY = ∠MAY`: line `AI` is the line from `A` to the **centre of the other
   circle**.
4. Let `J = AI ∩ ω` (second intersection). Then `∠IAY = ∠JAY` and the crux is the
   **equal‑arc / parallel‑chord** fact **`PJ ∥ YZ`** (verified `cross(PJ,YZ)=0`).
   Granting `para(P,J,Y,Z)` + `coll(A,I,J)` makes the goal AR‑derivable
   (experiment: `true`). All three framings — `∠IAY = ∠ZAP`, `YJ = ZP` (chords),
   `PJ ∥ YZ` — are the same irreducible fact.

### 5.2 What `AngleAR` can and cannot do (table of experiments)

| premises fed to the faithful AR port | derives `∠ZAK = ∠IAY`? |
|---|---|
| givens + all cited‑circle inscribed sets + granted `cyclic(A,Y,P,Z)` (**B0**) | **no** (matches the puzzle's shipped gap test) |
| B0 + `coll(A,I,M)` | no |
| B0 + isosceles base angles at `S` (`iso(SAP),iso(SAY),iso(SAZ)`) [**Option B**] | no |
| B0 + Option‑B + `coll(A,I,M)` | no |
| B0 + directed doublings at `S` (×2 avals, all chords/apexes) [**Option A**] | no |
| B0 + doublings at `S` + at `M` + `coll(A,I,M)` | no |
| B0 + doublings + isosceles at `S` & `M` + **line‑of‑centres** `perp(S,M,Y,Z)` + arc‑mid `N` (`coll(N,S,M)`, `Y A N N A Z` bisector) | **no** |
| B0 + `J=AI∩ω` on `ω` (full cyclic) + `coll(A,I,J)` | no |
| B0 + `para(P,J,Y,Z)` + `coll(A,I,J)` | **yes** |
| B0 + the isogonality `eqangle(Y,A,I, Z,A,P)` directly | **yes** |

The decisive line: even the **maximal sound centre scaffolding** fails, but
granting the single parallel `PJ ∥ YZ` (or the isogonality) succeeds. And the
needed `para(P,J,Y,Z)` is itself **not** AR‑reachable from the scaffolding
(`reachable: false`). The central equality the doubling would feed,
`∠YSJ = ∠ZSP`, is **also unreachable** (`false`).

### 5.3 Why this is structural (not a missing inscribed‑angle)

An exhaustive scan of TRUE concyclic quadruples among the named non‑centre points
finds **no hidden circle through `I`** other than `Ω`: besides `Ω`, `Γ`, `ω`, the
only extra concyclicity is `A,W,X,P` (the mirror `ω'`). The incenter `I` connects
to the configuration **only through `Ω`** and the centre/arc structure — there is
no pure‑inscribed‑angle path. The cross‑circle link (`AI`, through the centre of
`Ω`, to circle `ω`) is the equal‑arc fact `PJ ∥ YZ`, whose natural proof is the
official **central‑angle/perpendicular‑bisector** argument over *both* circles —
i.e. it needs full angles at the centres, plus an auxiliary point. This is the
content the directed‑angle engine cannot manufacture.

---

## 6. Exact fact signature of the proposed rule (`central_angle_double`)

### 6.1 Consumed → produced

| role | general | example (`ω` in G5, `O := S` centre of `AYZP`) | available in G5? |
|---|---|---|---|
| circle | `cyclic(P1,P2,P3,P4)` | `cyclic(A,Y,P,Z)` | **granted** (gap #1) |
| centre witness | `cong(O,P1,O,P2)`, `cong(O,P2,O,P3)`, `cong(O,P3,O,P4)` | `cong(S,A,S,Y)`, `cong(S,Y,S,P)`, `cong(S,P,S,Z)` | **not present** — `S` is not a puzzle point (see §6.4) |
| ⇒ produced (per chord `{P_i,P_j}`, apex `P_k`) | `aval([P_i,O,P_j], 2·angle(P_i,P_k,P_j))` **or** `aval([P_i,O,P_j], 360 − 2·angle(P_i,P_k,P_j))` (reflex case) | e.g. `aval([Z,S,P], 2·angle(Z,A,P))` | n/a — `S` absent |

The centre `O` is **recovered from the cong‑star** exactly as in
`concyclic_equal_radii.ts` (`spokeEdge` + connected components): each cited `cong`
shares one endpoint (the centre) and contributes a spoke; a 4‑node component ties
all four rim points to a common `O`. This makes the three `cong`s load‑bearing
(drop one → the component splits → `O` not pinned → no emission), so `minimality`
is meaningful.

### 6.2 Reflex selection (the mod‑360 datum, coordinate‑guarded)

For each chord `{P_i,P_j}` and apex `P_k`, compute `θ = angleDeg(P_i,P_k,P_j)` and
`c = angleDeg(P_i,O,P_j)` (unsigned, `≤180`). Emit:

- `aval([P_i,O,P_j], 2·angle(P_i,P_k,P_j))`  if `|c − 2θ| < 1e‑3` (non‑reflex), else
- `aval([P_i,O,P_j], 360 − 2·angle(P_i,P_k,P_j))`  if `|c − (360 − 2θ)| < 1e‑3`, else
- emit nothing (degenerate / collinear apex).

Both pass `factHolds`; both are AR‑equivalent mod 180. Emitting the matching one is
what keeps the rule sound at the truth‑check boundary.

### 6.3 `derive(cited, ctx)` — implementation sketch

Mirror `concyclic_equal_radii.ts` for the centre recovery, then emit avals.

```ts
import type { Fact, PointId, Rel } from "@/lib/freeplay/dsl";
import { aval, canonicalKey, rel } from "@/lib/freeplay/dsl";
import { parseForm } from "@/lib/freeplay/form";
import type { Rule } from "@/lib/freeplay/rules";
import { angleDeg, circumcenter, dist, isCollinear, type V } from "@/lib/freeplay/geom";

const EPS = 1e-6;
const ANG = 1e-3; // degrees, matches factHolds aval tolerance

const congsOf = (c: Fact[]) => c.filter((f): f is Rel => f.kind === "rel" && f.name === "cong");
const cyclicsOf = (c: Fact[]) => c.filter((f): f is Rel => f.kind === "rel" && f.name === "cyclic");

// (reuse concyclic_equal_radii's spokeEdge + components to recover O and its rim set)

export const central_angle_double: Rule = {
  id: "central_angle_double",
  name: "central angle = 2 × inscribed angle",
  derive(cited, { coords }) {
    const out: Fact[] = [];
    const emitted = new Set<string>();
    const push = (f: Fact) => { const k = canonicalKey(f); if (!emitted.has(k)) { emitted.add(k); out.push(f); } };

    // 1. recover (centre O, rim component) from the cong-star (as in concyclic_equal_radii)
    // 2. for each cited cyclic whose 4 points all lie in one O-component:
    for (const cyc of cyclicsOf(cited)) {
      const rim = [...new Set(cyc.points)];
      if (rim.length !== 4) continue;
      for (const O of centresForRim(congsOf(cited), rim, coords)) {   // O equidistant to all 4, cited
        const cO = coords[O]; if (!cO) continue;
        for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
          const Pi = rim[i], Pj = rim[j];
          const cPi = coords[Pi], cPj = coords[Pj];
          for (const k of [0,1,2,3]) {
            if (k === i || k === j) continue;
            const Pk = rim[k], cPk = coords[Pk];
            if (!cPi || !cPj || !cPk) continue;
            if (isCollinear(cPi, cPk, cPj)) continue;            // apex not on the chord line
            const theta = angleDeg(cPi, cPk, cPj);
            const central = angleDeg(cPi, cO, cPj);              // unsigned, ≤180
            if (dist(cO, cPi) < EPS || dist(cO, cPj) < EPS) continue;
            const tok = `angle(${Pi},${Pk},${Pj})`;
            if (Math.abs(central - 2 * theta) < ANG)
              push(aval([Pi, O, Pj], parseForm(`2*${tok}`)));
            else if (Math.abs(central - (360 - 2 * theta)) < ANG)
              push(aval([Pi, O, Pj], parseForm(`360 - 2*${tok}`)));
          }
        }
      }
    }
    return out;
  },
};
```

(`centresForRim` = the cong‑star centre recovery from `concyclic_equal_radii.ts`,
returning each cited centre `O` whose component contains all four `rim` points, with
`O` numerically equidistant from them — guard exactly as that rule does.)

### 6.4 G5 has no centre point `S`/`M` — a real obstruction

The rule needs the **centre as a named point** plus a cong‑star to it. In G5,
`S` (centre of `ω`) and `M` (centre of `Ω`) are **not** puzzle points, and the
puzzle exposes **no** `cong` radius facts. So the rule cannot even *fire* on the
shipped G5 figure without first **constructing** `S` (and `M`) and establishing
the radius congruences — an auxiliary‑construction step the engine has no
mechanism for. This is the same "needs an aux point" wall the project's discovery
work documents, and it compounds the §5 verdict.

---

## 7. Soundness guard (coordinates)

The rule emits an `aval` only when, in `ctx.coords`:

1. all five points (`O` and the four rim points) exist and are pairwise distinct,
   with non‑zero radius `|OP_i| > 0`;
2. `O` is **genuinely equidistant** from all four rim points (centre check),
   matching `concyclic_equal_radii`'s guard — and the cong‑star linking them is
   *cited* (load‑bearing, not read off coords);
3. the four rim points are actually concyclic and the `cyclic` is cited;
4. the apex `P_k` is **not collinear** with the chord `P_iP_j` (genuine inscribed
   angle);
5. the emitted form's numeric value equals the **unsigned** measured central angle
   `angleDeg(P_i,O,P_j)` within `1e‑3` — i.e. the reflex selection of §6.2. This
   is the guard that keeps the literal form from being false when `2θ > 180`.

The emitted fact is therefore always true in the figure (no false `aval`). The
**halving caveat** (§3.4) is *not* a property of this rule's emissions (which are
all forward, true `2×` facts) but of any *downstream* AR step that inverts them;
it is documented, not guardable inside this producer.

---

## 8. Interaction with DD / AR / LengthAR, and how far it gets G5

- **`AngleAR`** *consumes* the emitted `aval` (verified: it encodes the `2×` token
  mod 180, and `implies` added & derived doublings). It cannot *emit* this fact
  itself (no centre concept; `equation()` ignores `cong`).
- **`LengthAR`** is irrelevant (the output is an angle fact).
- **DD rules** `triangle_angle_sum`, `straight_supplement`, `angle_addition`
  cannot bootstrap the classic isosceles→central chain here: they need seed angle
  **values** (`aval`s with numbers/forms), and G5 has **no** `aval` givens — so
  the "Option B via DD arithmetic" route can't even start.
- **How far it gets G5: nowhere on the critical path.** Adding the doublings at
  `S` and `M` changes *no* reachability toward `∠ZAK = ∠IAY` (§5.2). The residual
  blocker is `PJ ∥ YZ` (equal arcs), which is **not** a central‑angle consequence
  and is unreachable (§5.2–5.3). Granting the two key equalities, the goal closes
  by AR (already verified by the puzzle test) — but this rule does **not** produce
  those equalities.

**End‑to‑end G5 status (honest):**

```
[gap #1, separate plan]  cyclic(A,Y,P,Z), cyclic(A,W,X,P)            — converse PoP
[aux construction, NO MECHANISM]  introduce S=ctr(ω), M=ctr(Ω), J=AI∩ω; radius congs
[deeper blocker, OUT OF REACH]    PJ ∥ YZ   (≡ ∠IAY=∠ZAP ≡ YJ=ZP)    — cross-circle equal arc
[in-engine, VERIFIED]    para(P,J,Y,Z) + coll(A,I,J)  ⇒  ∠ZAK=∠IAY   (AR)
[in-engine, VERIFIED]    (mirror)                      ⇒  ∠WAK=∠IAX   (AR)
[in-engine, VERIFIED]    ∠ZAK=∠IAY ∧ ∠WAK=∠IAX        ⇒  ∠WAY=∠ZAX   (AR; puzzle test)
```

`central_angle_double` touches none of the unproven lines.

---

## 9. Test plan (`research/freeplay-rules/rules/__tests__/central_angle_double.test.ts`)

Per `CONTEXT.md`, modelled on `concyclic_equal_radii.test.ts`. Helpers:
`import { verifyWith, RULES } from "../../harness"`, `factHolds` from
`@/lib/freeplay/check`. **The rule's own theorem is tested in isolation; the G5
case is tested as a documented NEGATIVE (the rule does not close it).**

**Isolation figure (generic, scalene — centre at origin, unequal arcs):**

```ts
const coords = {
  O:  [0, 0],
  P1: [5, 0], P2: [3, 4], P3: [-4, 3], P4: [0, -5],   // |OPi| = 5, no symmetry
};
const star = [rel("cong",["O","P1","O","P2"]), rel("cong",["O","P2","O","P3"]), rel("cong",["O","P3","O","P4"])];
const circle = rel("cyclic",["P1","P2","P3","P4"]);
// chord {P1,P3}, apex P2: central ∠P1OP3 = 2·∠P1P2P3  (pick a non-reflex split)
const goal = aval(["P1","O","P3"], parseForm("2*angle(P1,P2,P3)"));
```

Required cases:

1. **Faithfulness** — `factHolds(goal)` is `true`; the *literal* form on a
   **reflex** split (apex on the minor arc, `2θ > 180`) is `false`, while the
   `360 − 2·angle(...)` form there is `true` (locks §6.2).
2. **Fires in isolation** —
   `verifyWith([...RULES, central_angle_double], {candidate: goal, citedPremises: [...star, circle]})`
   → `{ valid: true, rule: "central angle = 2 × inscribed angle" }`.
3. **Minimality** — dropping **any** of the three `cong`s (centre un‑pinned) **or**
   the `cyclic` ⇒ `valid: false` (4 sub‑cases).
4. **Soundness‑negative (off‑centre)** — replace the last spoke with `cong(O,P3,O,Q)`
   for a `Q` with `|OQ| ≠ 5`: the literal doubling `aval(∠P1OQ = 2·angle(...))` is
   numerically **false**; assert `derive` does not emit it and the verifier rejects
   the step (mirrors `concyclic_equal_radii`'s off‑circle negative).
5. **Soundness‑negative (no shared centre)** — a `cong` triple with no common pivot
   (`cong(P1,P2,P3,P4)`): `derive` emits nothing.
6. **Reflex correctness** — for an apex giving `2θ > 180`, assert the rule emits the
   `360 − 2·angle(...)` form (not the literal `2·angle`), and that it verifies.
7. **Shipped engine can't already do it** —
   `verifyWith(RULES, {candidate: goal, citedPremises: [...star, circle]})` →
   `valid: false` (no shipped rule maps `cong`‑star + `cyclic` to a central `aval`;
   AR can't emit it). If this ever returns valid, the rule is redundant — stop.
8. **G5 deeper step is NOT closed (the honest negative).** Rebuild the G5 coords
   (port `build()`), add `S = circumcenter(A,Y,Z)`, `M = circumcenter(B,I,C)` as
   points with their radius cong‑stars and `cyclic(A,Y,P,Z)`; assert
   `verifyWith([...RULES, central_angle_double], {candidate: eqangle(Z,A,K,I,A,Y),
   citedPremises: <everything established + all doublings the rule emits>})` →
   `valid: false`. Name the test
   `"central_angle_double does NOT close ∠ZAK=∠IAY (residual equal-arc blocker)"`.
9. **The residual bridge would close it (localises the blocker).** With the same
   established set **plus** `para(P,J,Y,Z)` and `coll(A,I,J)` granted (`J = AI∩ω`
   as an added point), assert `verifyWith(RULES, {candidate: eqangle(Z,A,K,I,A,Y),
   citedPremises: [...]})` → `valid: true` (pure AR). This pins the gap to
   `PJ ∥ YZ` and shows the rest is in‑engine.

(Cases 8–9 double as the "shipped engine can't already do it" evidence for the
*deeper step*, complementing the puzzle's own shipped gap tests.)

---

## 10. Feasibility ranking, recommendation, and what is out of reach

**Ranking for the stated goal (close G5's deeper step):**

1. **Nothing single‑rule closes it.** The deeper step's content is the
   cross‑circle equal‑arc fact `PJ ∥ YZ` (≡ `∠IAY = ∠ZAP` ≡ `YJ = ZP`). It is not
   an inscribed‑ or central‑angle consequence (§5), needs an **auxiliary point**
   (`J`, or the centres `S, M` as points — none exist in the puzzle), and a
   **metric/parallel bridge** whose own proof is the official centre argument.
2. **Option A (`central_angle_double`)** — the genuine "central = 2 inscribed"
   capability, **sound & cheap**, but **does not advance G5** and carries the
   halving caveat (§3.4). Useful only for *other* problems that need the forward
   direction (a known central angle from a known inscribed value).
3. **Option B (isosceles/radius)** — sound, even cheaper, but **insufficient** for
   G5 (§4.1); the `ω`‑internal radius data never reaches `AI`/`Ω`.
4. **Option C (full mod‑360 channel)** — **high cost**, and **still doesn't close
   G5** (the obstruction is the equal‑arc bridge, not the halving). Not justified.

**Recommendation.**

- **For G5 specifically:** do **not** build a central‑angle rule expecting to close
  the deeper step — it won't. Record the precise residual blocker (`PJ ∥ YZ`,
  `J = AI ∩ ω`) and route G5's closure through the **`power-of-a-point-radical-axis`**
  plan for gap #1, then treat the deeper step as **out of reach** for the
  directed‑angle engine (it requires auxiliary construction + a full‑angle/centre
  metric argument). Keep the puzzle `solutionReachesGoal: false` with this note.
- **If a central‑angle capability is wanted for the library** (independent of G5):
  ship **Option A** as specified (§6–§7) — it is the sound, low‑cost realization of
  the named theorem — but **gate promotion** on (a) a real consumer that uses the
  **forward** direction and (b) accepting the §3.4 halving caveat. Hold otherwise.

**Out‑of‑reach flag (explicit).** `∠ZAK = ∠IAY` / `∠WAK = ∠IAX` are beyond a
mod‑180 directed‑angle engine: (i) the incenter links to `ω` only through the
*centre* of a second circle, an equal‑arc relation that is not angle‑chasable;
(ii) the only central route requires **halving**, which mod 180 determines the
answer only mod 90 (the mod‑180 refinement would be read off coordinates —
unsound); and (iii) firing any central rule needs centre **points** and radius
congruences the puzzle does not provide. The in‑engine *reduction* from the two
equalities to the goal is genuine and already verified — the wall is producing the
two equalities, not consuming them.

---

## Appendix — numeric experiments (run in `/tmp`, deleted)

Faithful JS port of `ar.ts` (`Table` + `AngleAR`, exact `bigint` rationals) + a JS
rebuild of the puzzle's `build()`. Canonical figure
`A,B,C = pointOnCircleAtAngle([0,0],4,{95,202,340})`.

| probe | result |
|---|---|
| target equalities hold | `∠ZAK = ∠IAY = 13.066°`, `∠WAK = ∠IAX = 12.370°`, goal `∠WAY = ∠ZAX = 44.192°` |
| `ω = AYZ` carries `P` | `SA=SY=SZ=SP = 4.5453`; `A,Y,P,Z` concyclic |
| reduction | goal ⟺ `∠(AI,AY) ≡ ∠(AZ,AP)` (isogonal); `∠YAI=∠ZAP=13.066`, `∠YAP=∠ZAI=31.822` |
| incenter–excenter | `A,I,M` collinear (`cross=0`), `M ∈ Γ` (arc‑mid `BC`, centre of `Ω`) |
| crux | `PJ ∥ YZ` (`J = AI∩ω`): `cross(PJ,YZ)=0`; `YJ = ZP = 2.0552` |
| directed doubling | `∠(OP_i,OP_j) ≡ 2·∠(P_kP_i,P_kP_j)` (mod 180) holds for all splits; `AngleAR` encodes it (self‑ + derived‑implication `true`) |
| reflex/`factHolds` | apex on minor arc → `2θ = 270.224° > 180`; literal `2θ` form fails, `360−2θ` form (`= 89.776°`) holds |
| **AR reachability** | B0 → goal **no**; +isosceles(`S`) **no**; +doublings(`S`,`M`)+`coll(AIM)` **no**; +full centre scaffolding (doublings, isosceles, `perp(S,M,YZ)`, arc‑mid `N`, bisector) **no** |
| **bridge** | +`para(P,J,Y,Z)`+`coll(A,I,J)` → goal **yes**; +`eqangle(Y,A,I,Z,A,P)` → **yes**; `para(P,J,Y,Z)` itself AR‑reachable from scaffolding **no**; central equality `∠YSJ=∠ZSP` reachable **no** |
| hidden circles | only extra true concyclic quad through the named pts is `A,W,X,P` (mirror `ω'`); **no circle through `I`** except `Ω` ⇒ no pure‑inscribed‑angle path |
| halving ambiguity | granting `∠YSJ=∠ZSP` + the two doublings, AR concludes `∠YAJ=∠ZAP` **only** by coordinate branch‑fixing (`2x≡2y ⇒ x≡y` is false mod 180; true only mod 90) — the §3.4 soundness caveat |
