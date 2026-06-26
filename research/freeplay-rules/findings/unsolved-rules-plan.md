# New-capability plan for the rejected contest problems

Goal: identify which **new deduction rules** would let the DDAR engine solve the
contest problems it currently CANNOT (the "Rejected / not pursued" table in
[`contest-problems.md`](./contest-problems.md)), feasibility-ranked, with the most
feasible/sound ones prototyped in this lab.

Engine model recap (what a new rule must fit):
- **DD rules** are coordinate-guarded and emit `Fact`s (`coll/para/perp/cong/
  cyclic/midp/eqangle`) or — in the length layer — `eqratio`.
- **AngleAR** proves *any* directed-angle theorem (angles only; consumes
  para/perp/eqangle/aval/coll). A new rule only adds value if it produces what AR
  cannot: a **length** (`cong`/`eqratio`), a **circle/incidence** (`cyclic`), or a
  **non-angle `coll`**.
- **LengthAR** is a log-length linear table: it chains `cong`/`eqratio`/`midp`
  equalities but cannot introduce constants (no `log 2`) and cannot conclude a
  non-length relation (no `cyclic`, no `coll`).
- **Verifier derive contract (important):** the length verifier strips `eqratio`
  premises out of the fact list handed to `rule.derive` — only `LengthAR` consumes
  `eqratio`. So a DD/L rule **cannot read an `eqratio` premise**; it can only
  *emit* one. (This is decisive for the converse-power capability below.)

## Feasibility ranking (one line each)

| # | Capability | Unlocks (rejected problems) | Impact | Effort | Arch. risk | Status |
|---|-----------|------------------------------|--------|--------|-----------|--------|
| 1 | **Tangent-secant power** `MA²=MB·MR` (eqratio) | JBMO SL **2005 G2**, **2015 G2** (cores) | High (2 problems, central lemma) | Low | Low — pure length-layer, mirrors `power_of_a_point` | ✅ **prototyped** (`lengths/rules/tangent_secant_power.ts`) + **2005 G2 solved end-to-end** |
| 2 | **Thales / right-angle-in-semicircle** (diameter ⇒ `perp`) | feeds right-angle steps in JBMO SL 2013 G1, 2011 G2 (partial) | Medium (a reusable 90° producer) | Low | Low — DD rule emitting `perp`, no new machinery | ✅ **prototyped** (`rules/thales_diameter.ts`) |
| 3 | **Converse Thales** (`perp`+`midp` ⇒ `cong`: right-angle median) | supporting lemma (circumcircle of a right triangle) | Low–Med | Low | Low — DD rule emitting `cong` | ⬜ feasible, not yet built (sound; symmetric to #2) |
| 4 | **Converse power-of-a-point** (equal products ⇒ `cyclic`) | JBMO SL 2005 G1, 2011 G1, 2011 G2 (the "no AR feeder" concyclicities) | High *if* reachable | Med | **High — blocked by the verifier derive contract** (can't consume the `eqratio` premise) + needs a betweenness/same-side guard | ⛔ **infeasible without a shared-harness change** (documented below) |
| 5 | **Signed ratios → Menelaus / Ceva / external division** | external-division Thales note; collinearity/concurrence cores | Med | High | **High — needs a SIGN-AWARE length table** (LengthAR is unsigned logs) | ⛔ infeasible in current LengthAR (documented) |
| 6 | **Pole–polar incidence** | JBMO SL 2009 G1, 2013 G1 | Med | High | **Very high — projective/duality machinery absent** | ⛔ out of scope (documented) |
| 7 | **Radical axis / radical center** | USAMO 2008 P2 | High for that problem | High | **Very high — multi-circle power objects absent** | ⛔ out of scope (documented) |

Prototyped this batch: **#1 (with a rejected problem closed end-to-end)** and
**#2**. The rest are analyzed below, with #4/#5/#6/#7 declared infeasible with
precise reasons (negative results).

---

## 1. Tangent-secant power — PROTOTYPED (top win)

**Rule** `tangent_secant_power` (`lengths/rules/tangent_secant_power.ts`):

```
cong(O,A,O,B), cong(O,A,O,R), perp(O,A,A,M), coll(M,B,R)
   ⇒ eqratio(M,A,M,B,M,R,M,A)      i.e.  MA/MB = MR/MA  (⇔ MA² = MB·MR)
```

- **Unlocks.** This is *literally* the crux of two rejected problems:
  - **JBMO SL 2005 G2**: tangent `AP` at `A`, `M` on `AP`, secant `B–M–R` ⇒
    `MA² = MB·MR`. Solved **end-to-end** here as
    `problems/jbmo_shortlist_2005_g2_tangent.ts` (replayed via `researchVerifyL`).
  - **JBMO SL 2015 G2**: tangent at `B` from midpoint `M` of `BP`, secant `M–A–C`
    ⇒ `MB² = MA·MC` — the same lemma, relabelled.
- **Impact: High.** Two central contest lemmas; completes the power-of-a-point
  family (chord/chord and secant/secant already ship; this adds tangent/secant).
- **Effort: Low.** ~150 lines, mirrors the shipped `power_of_a_point`.
- **Architectural risk: Low.** Pure length-layer; emits an `eqratio`, the one
  thing the layer is built for. Registered in `LENGTH_RULES`.
- **Soundness.** Logical consequence of the cited premises: `O` equidistant from
  `A,B,R` ⇒ they lie on a circle (centre `O`); `MA ⊥ OA` ⇒ `M` on the tangent at
  `A` ⇒ power(`M`) = `|MO|²−ρ² = MA²` (right triangle `OAM`); `M,B,R` collinear
  with `B,R` on the circle ⇒ power(`M`) = signed `MB·MR`. `M` is necessarily
  external (a tangent line meets the circle only at `A`), so `B,R` lie on one ray
  from `M` and the unsigned `|MB|·|MR|` equals the signed product. Guards require
  the tangency (`perp`), both circle memberships (`cong`), the secant (`coll`),
  and `sameRayFrom(M,B,R)`; every emitted ratio is gated by `factHoldsL`. False
  figures (not tangent / point off circle / `M` off the secant) emit nothing
  (negative tests), and a dropped premise breaks the derivation (minimality).
- **Scope note.** The *full* 2005 G2 / 2015 G2 finish needs `MA = MP` (a midpoint
  factor-2 length identity) to convert `MA²=MB·MR` into `MP²=MB·MR`; that factor-2
  is the known LengthAR constant gap, so we reduce to the tangent-power core (the
  same "(reduced from)" convention as `jbmo_shortlist_2010_g3_pop`).

## 2. Thales / right angle in a semicircle — PROTOTYPED

**Rule** `thales_diameter` (`rules/thales_diameter.ts`):

```
midp(O,B,C), cong(O,A,O,B)   ⇒   perp(A,B,A,C)      (∠BAC = 90°)
```

- **Unlocks.** A reusable **right-angle producer** from a diameter. Several
  rejected problems hinge on a specific 90° that AR cannot manufacture (it ignores
  `cong`/`midp` and the shipped `inscribed_angle` only equates inscribed angles,
  never pins the semicircle's 90°): JBMO SL 2013 G1 (`∠OMP=90°`) and 2011 G2
  (`∠CGH=90°`) both *consume* a right angle. (Note: in those problems the right
  angle itself comes from a pole/polar fact — see #6 — so Thales is a necessary
  *building block* there, not by itself sufficient.)
- **Impact: Medium.** General-purpose; the cleanest way to inject a right angle
  from circle data.
- **Effort: Low.** ~90 lines, models `perp_bisector`.
- **Architectural risk: Low.** Ordinary DD rule emitting `perp`; no new machinery.
- **Soundness.** `O` midpoint of `BC` ⇒ `|OB|=|OC|`; with cited `|OA|=|OB|`,
  `A,B,C` lie on a circle centred `O` with `BC` a diameter ⇒ inscribed angle on a
  diameter is 90°. Requires BOTH premises cited and re-checks the configuration
  numerically. **Anti-"read-off-figure" guarantee:** the minimality tests cite a
  figure where `∠BAC=90°` is numerically TRUE but drop a premise — the rule still
  emits nothing, proving it derives the right angle from the cited diameter +
  membership, not from the coordinates. Not registered in `RESEARCH_RULES` so the
  GAP test stays honest (tested in isolation via `verifyWith([thales_diameter])`).

## 3. Converse Thales (right-angle median) — FEASIBLE, not built

```
perp(A,B,A,C), midp(O,B,C)   ⇒   cong(O,A,O,B)      (OA = OB = OC)
```

The median to the hypotenuse equals half the hypotenuse. Sound, low-risk (DD rule
emitting `cong`), symmetric to #2. Left unbuilt only to keep this batch focused on
the highest-impact wins; recommended as a quick follow-up if a problem needs the
circumcircle of a right triangle.

## 4. Converse power-of-a-point (equal products ⇒ concyclic) — INFEASIBLE here

Intended rule: `coll(P,A,B), coll(P,C,D), eqratio(P,A,P,C,P,D,P,B) ⇒
cyclic(A,B,C,D)` (with a betweenness/same-side guard). This would attack the
cluster of rejected **concyclicity** problems that have *no AR-derivable
converse-inscribed feeder* (JBMO SL 2005 G1, 2011 G1, 2011 G2) — potentially high
impact.

**Why it does not fit the current engine (two independent blockers):**

1. **The verifier derive contract.** `lengths/verify.ts` hands `rule.derive` only
   the *ordinary* cited facts — it explicitly filters `eqratio` out (`const
   ordinary = cited.filter(f => f.kind !== "eqratio")`). `eqratio` premises are
   consumed ONLY by `LengthAR`. So a rule that needs to *read* an `eqratio`
   premise can never receive it. Reconstructing `PA·PB=PC·PD` from coordinates
   instead would be exactly the **coordinate-guard soundness trap** (reading the
   premise off the figure), so that workaround is disallowed.
2. **`LengthAR` cannot emit a `cyclic`.** It is a linear log-length table; its only
   outputs are length equalities. Concyclicity is not a length relation, so even
   if the `eqratio` reached the table it could not produce the goal.

Making this work needs a **shared-harness change** (teach `verify.ts`/`deriveOnce`
to pass `eqratio` premises into `rule.derive`), which is out of the approved scope
(do not modify shared research files others rely on). **Soundness aside (for when
it is built):** the unsigned `eqratio` matches the signed power only when `P` has
the *same* betweenness status w.r.t. both chords — `P` between `A,B` AND between
`C,D` (inside), or external to both (`sameRayFrom(P,A,B)` and `sameRayFrom(P,C,D)`).
A *mixed* configuration has equal unsigned products but opposite signed powers and
is NOT concyclic, so the rule must reject it. This guard is essential and is the
subtle part of the theorem. Recommendation: promote only alongside the harness
extension, with that betweenness guard and an explicit mixed-config negative test.

## 5. Signed ratios → Menelaus / Ceva / external division — INFEASIBLE here

Menelaus (`(AF/FB)(BD/DC)(CE/EA) = −1`) and Ceva (`= +1`), and external-division
Thales, all turn on **signed** ratio products whose *sign* encodes the
collinearity/concurrence. `LengthAR` is built on `log|PQ|` generators — strictly
**unsigned** — so it cannot represent a negative ratio or the `−1` vs `+1`
distinction that is the entire content of these theorems. The shipped `eqratio`
truth check is also unsigned (`|AB|/|CD|`). Encoding signs needs a **sign-aware
variant** (a separate `±` bit per directed segment, or directed-area generators) —
a parallel subsystem, not a rule. This matches the existing
`thales_basic_proportionality` limitation (it guards only *internal* cuts via
`isBetween`). Declared infeasible without that new subsystem; documented as the
natural next architecture investment if signed-collinearity problems become a
priority.

## 6. Pole–polar incidence — OUT OF SCOPE (infeasible)

Targets JBMO SL 2009 G1 (`Z` on the tangent at `C`) and 2013 G1 (`∠OMP=90°` for
`M` on `OC`). The pole–polar relation is **projective duality** w.r.t. a conic:
a point's polar is a *line* determined by the circle, and incidences like "Z lies
on the polar of C" are not expressible as any of `coll/para/perp/cong/cyclic/
midp/eqangle/eqratio`. The engine has no notion of a point↔line duality or of "the
polar of X", and AR/LengthAR have no hook for it. This would require a genuinely
new representation (polars as first-class objects, or a projective-coordinate
layer), far beyond a rule. **Honest verdict: not feasible in this framework; do
not force it.** (Thales #2 supplies the *kind* of right angle these problems want,
but the specific `∠OMP=90°` comes from the pole/polar of `M` on the line of
centers — which is precisely the missing machinery.)

## 7. Radical axis / radical center — OUT OF SCOPE (infeasible)

Targets USAMO 2008 P2, whose every known solution finishes via "Q is the radical
center of three circles". The radical axis of two circles is the locus of equal
**power** w.r.t. both; the radical center is the common point of three such axes.
This requires representing **multiple circles as power objects** and reasoning
about equality of powers across them — there is no circle-as-object or
power-function primitive in the DSL (circles appear only implicitly via `cyclic`
4-tuples and `cong` radii). Expressing "equal power w.r.t. two circles" or
intersecting two radical axes is not reducible to the existing predicates. **Honest
verdict: not feasible without a circle/power subsystem; out of scope.**

---

## Summary for promotion review

- **Promote-ready (sound, tested, fills a real gap):**
  - `tangent_secant_power` — closes JBMO SL 2005 G2 / 2015 G2 tangent cores;
    **demonstrated end-to-end** on a reduced 2005 G2 problem.
  - `thales_diameter` — general right-angle-in-semicircle producer.
- **Cheap follow-up:** converse Thales (#3).
- **Needs a (small) shared-harness change first:** converse power-of-a-point (#4)
  — feed `eqratio` premises into `rule.derive`, plus a betweenness guard.
- **Needs a new subsystem (don't attempt as a rule):** signed ratios / Menelaus /
  Ceva (#5, sign-aware length table).
- **Out of scope for this framework (negative results):** pole–polar (#6),
  radical axis/center (#7) — both need new geometric *representations*
  (duality / circle-power objects), not new rules.
