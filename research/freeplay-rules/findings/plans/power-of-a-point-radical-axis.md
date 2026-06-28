# Implementation plan — power of a point / radical axis family (closes IMO 2024 SL G3, G4, G5)

> A FAMILY of three sound, coordinate‑guarded, one‑step DDAR rules built on a
> shared **circle‑power / radical‑axis** primitive:
>
> | Rule | Layer | Consumes (general) | Produces | Closes |
> |---|---|---|---|---|
> | `converse_power_of_a_point` | `lengths/rules/` | `eqratio` (equal power) + 2 `coll` | `cyclic` | **G5** first gap |
> | `two_circle_radical_axis` | `rules/` | 2 `cyclic` + 2 `cong` + `para` + 2 `coll` | `cyclic` | **G4** |
> | `three_circle_radical_center` | `rules/` | 3 `cyclic` + 2 `coll` | `coll` | **G3** |
>
> **Status:** plan only. Nothing here is implemented. Conforms to
> [`../../CONTEXT.md`](../../CONTEXT.md) "How to add a rule" (sound,
> coordinate‑guarded, one‑step; isolation + minimality + soundness‑negative +
> "shipped engine can't already do it" tests). All numeric claims below were
> checked with throwaway `/tmp` experiments that reconstruct each puzzle's
> canonical `build()` (now deleted; see the Appendix for the exact probes/figures).

---

## 0. Orientation

Each of `src/lib/freeplay/puzzles/imo_shortlist_2024_g{3,4,5}.ts` ships a
faithful, multi‑realization‑verified **partial** proof (`solutionReachesGoal:
false`) that stops at one missing capability — and all three missing moves are
the same classical idea: **power of a point** and its multi‑circle generalisation
**radical axis / radical centre**. This plan specs the three rules that close
them, sharing one coordinate helper.

Why these are genuinely missing (the strategic test from `CONTEXT.md`): the
AngleAR table proves *any* directed‑angle theorem, so a new rule only earns its
keep if it produces something the angle layer cannot. Here:

- **G5** turns an `eqratio` (a *length* fact) into a `cyclic`. AngleAR has no
  length table; `LengthAR` cannot emit a `cyclic`; the directed‑angle converse
  (`concyclic_from_directed_angles`) cannot fire because `A,P` are on **opposite**
  sides of `YZ` (the inscribed‑angle equality is the opposite‑side / supplementary
  form, not entailed by any cited angle fact).
- **G4** and **G3** produce a `cyclic` / `coll` from **equality of powers across
  several circles** — a relation with no angle content and no DSL primitive for
  "circle as a power object". They must be coordinate‑guarded DD rules.

### 0.1 How I confirmed each gap is real (target true, currently unprovable)

The three shipped puzzle tests already assert each target is numerically **true**
but the shipped `verify()` (which runs `RULES` + `RATIO_RULES` + AngleAR +
LengthAR, and *does* pass cited `eqratio`s via `ctx.citedRatios`) returns
**invalid**. I re‑confirmed the truth side independently in `/tmp`.

| Gap | target | true? | shipped `verify()` result | evidence |
|---|---|---|---|---|
| G5 | `cyclic(A,Y,P,Z)` | yes | `valid:false` (`unjustified`) | `__tests__/imo_shortlist_2024_g5.test.ts` "cannot reach cyclic(A,Y,P,Z)…" |
| G4 | `cyclic(P,C,X,Q)` (and goal `para(P,Q,A,B)`) | yes | `valid:false` | `__tests__/imo_shortlist_2024_g4.test.ts` "THE GAP: cyclic(P,C,X,Q) … not engine‑derivable" |
| G3 | `coll(L,Q,Z)` | yes | `{valid:false, reason:"unjustified"}` | `__tests__/imo_shortlist_2024_g3.test.ts` "documents the ENGINE GAP…" |

Because those gap tests use the **real shipped** `verify()`, they are the
authoritative "`verify` returns invalid" check the task asks for; each new rule's
own test re‑asserts it with `verifyWith(RULES, …)` / `researchVerify*` (see the
per‑rule test plans).

### 0.2 Shared infrastructure (one new helper)

G4 and G3 both need to compute the **power of a point** and the **radical axis of
two circles** from coordinates. Add one tiny research helper (e.g.
`research/freeplay-rules/rules/_radical.ts`), depending only on
`@/lib/freeplay/geom`:

```ts
import { circumcenter, dist, sub, dot, unit, cross, type V } from "@/lib/freeplay/geom";

export type Circle = { O: V; r: number };

/** Circle through three points (null if collinear). */
export function circleOf(a: V, b: V, c: V): Circle | null {
  const O = circumcenter(a, b, c);
  return O ? { O, r: dist(O, a) } : null;
}
/** Signed power of Z wrt the circle: |ZO|² − r²  (=0 on the circle, <0 inside). */
export function power(Z: V, c: Circle): number {
  return dot(sub(Z, c.O), sub(Z, c.O)) - c.r * c.r;
}
export function onCircle(Z: V, c: Circle, eps = 1e-6): boolean {
  return Math.abs(power(Z, c)) < eps * Math.max(1, c.r * c.r);
}
/** Equal power of Z wrt two circles (i.e. Z on their radical axis). */
export function equalPower(Z: V, c1: Circle, c2: Circle, eps = 1e-6): boolean {
  return Math.abs(power(Z, c1) - power(Z, c2)) < eps * Math.max(1, Math.abs(power(Z, c1)));
}
```

G5 does **not** need circle reconstruction — it works from the cited `eqratio`
plus betweenness — but it is conceptually the *converse* of the shipped forward
`lengths/rules/power_of_a_point.ts`, so the three rules are one coherent
"power‑of‑a‑point family".

### 0.3 The one cross‑cutting architecture fact: `ctx.citedRatios`

The old negative‑results doc [`../unsolved-rules-plan.md`](../unsolved-rules-plan.md)
(§4) declared converse power‑of‑a‑point **infeasible** because the verifier
"strips `eqratio` out of the facts handed to `rule.derive`". **That blocker is
now resolved in the shipped engine.** `src/lib/freeplay/verify.ts`'s `deriveOnce`
builds the rule context with the cited ratios exposed:

```ts
const citedRatios = cited.filter((f): f is EqRatio => f.kind === "eqratio");
const facts = expandColls(ordinary);
const ruleCtx = { ...ctx, citedRatios };
// …rule.derive(facts, ruleCtx)…
```

and `RuleCtx` (in `src/lib/freeplay/rules.ts`) carries `citedRatios?: EqRatio[]`.
The shipped `sas_similarity` already reads it. So a length rule **can** require a
cited proportion as a genuine, load‑bearing premise (read it off `ctx`, never off
the coordinates). This is decisive for G5 — see §1.7 for the one residual
lab‑harness wrinkle.

### 0.4 Tractability ranking (easiest → hardest)

1. **G5 `converse_power_of_a_point`** — *most tractable.* Small rule, a direct
   mirror of the shipped forward `power_of_a_point`; the only subtlety is the
   betweenness/sign guard, and the only plumbing wrinkle is exercising
   `ctx.citedRatios` in the lab harness (§1.7). Predicted "easiest" — confirmed.
2. **G4 `two_circle_radical_axis`** — *medium.* New circle‑power helper, a
   multi‑premise configuration matcher (two membership circles sharing a chord,
   two `cong` apex conditions, a `para`), all ordinary facts (no `citedRatios`).
   Soundness is clean; the work is the role‑matching and the minimality argument.
3. **G3 `three_circle_radical_center`** — *hardest.* Needs the helper **and** a
   third circle `cyclic(K,L,P,Q)` that the puzzle's current chain does **not**
   yet derive (a nested sub‑gap, §3.6); the three‑circle radical‑axis matching is
   the most intricate. Predicted "hardest" — confirmed.

---

# 1. G5 — Converse power of a point  (`converse_power_of_a_point`)

## 1.1 The gap (recap)

`imo_shortlist_2024_g5.ts` verifies the power‑of‑a‑point length core
`KA·KP = KB·KC = KY·KZ = KW·KX` (Solution 1's opening line). The first
unreachable move is **"P lies on circle AYZ"**, i.e. `cyclic(A,Y,P,Z)`, the
**converse** of power of a point: lines `AP` and `YZ` meet at `K` with
`KA·KP = KY·KZ`, therefore `A,Y,P,Z` are concyclic. The engine has every
*forward* power rule (`cyclic` + 2 `coll` ⇒ `eqratio`) but nothing turning an
`eqratio` into a `cyclic`, and the directed‑angle converse cannot help (`A,P` on
opposite sides of `YZ`).

(Note: closing this concyclicity advances G5 but does **not** reach the puzzle
goal `∠WAY = ∠ZAX` — that needs the separate "central angle = 2×inscribed" rule,
planned in [`central-angle-inscribed.md`](./central-angle-inscribed.md). This rule
closes the *converse‑PoP* gap specifically, as the task scopes it.)

## 1.2 The theorem

### General statement

> **Converse power of a point.** Let lines `ℓ₁, ℓ₂` meet at `K`, with `A, P ∈ ℓ₁`
> and `Y, Z ∈ ℓ₂` (all four `≠ K`). Suppose `KA·KP = KY·KZ` **and** `K` has the
> same position relative to both segments — either `K` strictly **between** `A,P`
> **and** between `Y,Z` (intersecting chords, `K` inside), or `K` **outside** both
> (two secants, `A,P` on one ray from `K`, `Y,Z` on another). Then `A, Y, P, Z`
> are concyclic.

The sign condition is essential: with **mixed** position (`K` inside one chord,
outside the other) the *unsigned* products can still be equal while the *signed*
powers have opposite sign, and the four points are **not** concyclic. The rule
must reject that case (verified, §1.6 / Appendix).

### Specialisation to G5

`(K, A, P, Y, Z) = (K, A, P, Y, Z)` with the established
`powerYZ = eqratio(K,A,K,Y,K,Z,K,P)` (`KA·KP = KY·KZ`) and the two cited lines.
Mirror application with `powerWX = eqratio(K,A,K,W,K,X,K,P)` ⇒ `cyclic(A,W,P,X)`.

## 1.3 Exact fact signature

| role | general | G5 instance | available in G5? |
|---|---|---|---|
| equal power (cited ratio) | `eqratio(K,A,K,Y,K,Z,K,P)` | `powerYZ` | **established** (verified step 6) |
| line 1 | `coll(K,A,P)` | `collAKP` | **given** |
| line 2 | `coll(K,Y,Z)` | `collYKZ` | **derivable** (`collYKZ` is a given: `coll(Y,K,Z)`) |
| ⇒ produced | `cyclic(A,Y,P,Z)` | `cyclic(A,Y,P,Z)` | **the gap** |

`eqratio(K,A,K,Y,K,Z,K,P)` means `KA/KY = KZ/KP` ⇔ `KA·KP = KY·KZ` (the four
segments all share endpoint `K`). The rule pairs `{A,P}` (product `KA·KP`) with
line `coll(K,A,P)`, and `{Y,Z}` (product `KY·KZ`) with line `coll(K,Y,Z)`.

### Minimality (each premise load‑bearing)

| drop | what breaks |
|---|---|
| `eqratio(K,A,K,Y,K,Z,K,P)` | no equal‑power premise → rule cannot fire (it is read **only** from `ctx.citedRatios`, never reconstructed from coords). Without it the same four points + colls would let it fire off the figure — which is exactly the soundness trap we forbid. |
| `coll(K,A,P)` | `K` and line `ℓ₁` (the `A,P` pair) unidentified → no fire |
| `coll(K,Y,Z)` | line `ℓ₂` (the `Y,Z` pair) unidentified → no fire |

`coll` is "free structure" in the verifier's minimality pass (it is exempt from
the necessity check), so the genuinely necessity‑checked premise is the
`eqratio`; the rule's structure makes it indispensable (see §1.5).

## 1.4 Why it must be a LENGTH rule reading `ctx.citedRatios`

- It **consumes** an `eqratio` (a length fact) and **produces** a `cyclic`. So it
  lives in `lengths/rules/` (an `LRule`) — only that layer sees ratios.
- It reads the ratio from `ctx.citedRatios` (not from `cited`, which the length
  verifier filters; not from coordinates, which would be unsound — any four
  concyclic points trivially satisfy the product equality, so reconstructing it
  from coords would make the rule fire without the premise and fail minimality).
- It cannot be an AngleAR or LengthAR consequence: AngleAR has no length input;
  `LengthAR` emits only length equalities, never a `cyclic`. So a DD‑style
  `derive` that emits the `cyclic` is required.

## 1.5 `derive(cited, ctx)` — sketch

```ts
import type { Fact, PointId, Rel } from "@/lib/freeplay/dsl";
import { canonicalKey, rel } from "@/lib/freeplay/dsl";
import { dist, isBetween, sameRayFrom, isCollinear, circumcenter, type V } from "@/lib/freeplay/geom";
import { canonicalKeyL, eqratio, factHoldsL, isAmongL, type LFact, type LRule } from "../dsl";

const EPS = 1e-6;
const collsOf = (c: Fact[]) => c.filter((f): f is Rel => f.kind === "rel" && f.name === "coll");

export const converse_power_of_a_point: LRule = {
  id: "converse_power_of_a_point",
  name: "converse power of a point",
  derive(cited, { coords, citedRatios = [] }) {
    const out: LFact[] = [];
    const emitted = new Set<string>();
    const push = (f: LFact) => { const k = canonicalKeyL(f); if (!emitted.has(k)) { emitted.add(k); out.push(f); } };

    // 3-point colls only; pair lines that share exactly one endpoint K.
    const lines = collsOf(cited).map(c => c.points).filter(p => p.length === 3);
    for (let i = 0; i < lines.length; i++) for (let j = i + 1; j < lines.length; j++) {
      const shared = lines[i].filter(p => lines[j].includes(p));
      if (shared.length !== 1) continue;
      const K = shared[0];
      const [A, P] = lines[i].filter(p => p !== K);
      const [Y, Z] = lines[j].filter(p => p !== K);
      if (new Set([K, A, P, Y, Z]).size !== 5) continue;

      // The equal-power premise MUST be cited (read from ctx, never from coords).
      // KA·KP = KY·KZ  ⇔  eqratio(K,A,K,Y,K,Z,K,P); accept any equivalent pairing.
      const ratio = eqratio(K, A, K, Y, K, Z, K, P);
      if (!isAmongL(ratio, citedRatios)) continue;

      const [cK, cA, cP, cY, cZ] = [K, A, P, Y, Z].map(p => coords[p]) as V[];
      if ([cK, cA, cP, cY, cZ].some(c => !c)) continue;

      // GUARD 1 — both lines really pass through K.
      if (!isCollinear(cK, cA, cP) || !isCollinear(cK, cY, cZ)) continue;
      // GUARD 2 — equal-power SIGN match (intersecting chords OR two secants).
      const chords  = isBetween(cA, cK, cP) && isBetween(cY, cK, cZ);
      const secants = sameRayFrom(cK, cA, cP) && sameRayFrom(cK, cY, cZ);
      if (!chords && !secants) continue;             // reject MIXED config (unsound)
      // GUARD 3 — the conclusion holds numerically (4 distinct, no 3 collinear).
      const cyc = rel("cyclic", [A, Y, P, Z]);
      if (!factHoldsL(cyc, coords)) continue;

      push(cyc);
    }
    return out;
  },
};
```

## 1.6 Soundness guard

`cyclic(A,Y,P,Z)` is emitted only when **all** hold:

1. `coll(K,A,P)` and `coll(K,Y,Z)` are cited and numerically realised (`K` on both
   lines);
2. the equal‑power ratio `eqratio(K,A,K,Y,K,Z,K,P)` is in `ctx.citedRatios`
   (load‑bearing, off `ctx`, never reconstructed from coords);
3. the **sign guard**: `K` strictly between `A,P` *and* between `Y,Z` (chords),
   **or** `K` on a common ray to `A,P` *and* to `Y,Z` (secants) — the mixed case
   is rejected;
4. the four points are concyclic numerically (matching `factHolds`'s `cyclic`
   test).

Under (1)+(2)+(3) the equality of *signed* powers `KA·KP = KY·KZ` (same sign by
the guard) is exactly the converse‑PoP hypothesis, so concyclicity is a
**theorem** — guard (4) only rejects degenerate samples. The mixed‑config
counter‑model (equal unsigned products, opposite signed powers, **not**
concyclic) is in the Appendix and becomes the soundness‑negative test.

## 1.7 Interaction with DD / AngleAR / LengthAR, and the lab‑harness wrinkle

- The candidate is a `cyclic` (ordinary), so the verifier tries DD rules (this
  rule fires), then AngleAR (cannot — no length input, opposite‑side angle not
  entailed), then LengthAR (cannot emit `cyclic`). The step is attributed to this
  rule's name.
- **Shipped engine: works end‑to‑end** once promoted. `verify()` →
  `deriveOnce` passes `citedRatios` to `rule.derive` (§0.3); the established
  `powerYZ` is a cited `eqratio`, so the rule sees it.
- **Lab harness wrinkle (the one infra dependency).** The research length
  verifier `research/freeplay-rules/lengths/verify.ts` builds its `RuleCtx`
  **without** `citedRatios`, so `researchVerifyL` / `verifyL` cannot drive a
  `citedRatios`‑reading rule end‑to‑end. Two clean options:
  1. **Test at the `derive()` level** (no shared‑file edit), passing the ratio
     explicitly — exactly the pattern the shipped `sas_similarity` test uses
     (`src/lib/freeplay/__tests__/sas_similarity.test.ts`:
     `sas_similarity.derive([…], { ...ctx, citedRatios: [ratioPrem] })`). This
     covers isolation, minimality, and soundness‑negative. Use the **shipped**
     `verify()` (which passes `citedRatios`) for the "gap" assertion — already
     done by the G5 puzzle test.
  2. **One‑line additive change** to the research harness `deriveOnce`: compute
     `const citedRatios = cited.filter(f => f.kind === "eqratio")` and pass
     `{ ...ctx, citedRatios }` to `rule.derive` (mirroring shipped `verify.ts`).
     This is purely additive (existing research length rules ignore the field;
     the research `sas_similarity` uses a bridge‑ratio trick and is unaffected),
     and it would let `verifyL([converse_power_of_a_point], …)` run end‑to‑end.
     It touches a shared research file, so it needs orchestrator sign‑off per
     `CONTEXT.md`.

  Recommendation: implement with option (1) for the rule's own tests, and apply
  the option (2) one‑liner so the G5 end‑to‑end lab replay matches the shipped
  behaviour. Post‑promotion, the shipped `verify()` exercises it with no change.

## 1.8 How it closes the G5 step

After the verified chain establishes `popGamma`, `popYZ`, `powerYZ`
(`KA·KP = KY·KZ`), the new one‑step move:

```
cyclic(A,Y,P,Z)
  rule:     converse power of a point
  premises: eqratio(K,A,K,Y,K,Z,K,P), coll(K,A,P), coll(K,Y,Z)
  reading:  lines AP and YZ meet at K with KA·KP = KY·KZ and K interior to both
            chords, so A,Y,P,Z are concyclic ("P lies on circle AYZ").
```

Mirror step ⇒ `cyclic(A,W,P,X)`. These are precisely Solution 1's "so `P` lies on
`ω`". The remaining `∠WAY=∠ZAX` then needs the central‑angle rule (separate plan)
— this rule removes the *first* of G5's two documented gaps.

## 1.9 Redundancy check

No shipped rule maps an `eqratio` to a `cyclic`: the `cyclic` producers are
`converse_inscribed` (same‑side `eqangle`/`aval` only), `concyclic_merge`
(merge of two `cyclic`s sharing 3 points), `concyclic_equal_radii`
(`cong`‑star), and `concyclic_from_directed_angles` (directed‑angle table — and
its entailment is absent here, the opposite‑side case). Confirmed by the G5 gap
test returning `unjustified` even with the full chain (incl. `powerYZ`)
established.

## 1.10 Test plan — `research/freeplay-rules/lengths/rules/__tests__/converse_power_of_a_point.test.ts`

Figure A (intersecting chords, generic): four points on a radius‑5 circle with
chords crossing at an interior `K` (reuse the style of
`lengths/rules/__tests__/power_of_a_point.test.ts`). Establish
`ratio = eqratio(K,A,K,Y,K,Z,K,P)`, `coll(K,A,P)`, `coll(K,Y,Z)`; goal
`cyclic(A,Y,P,Z)`.

1. **Faithfulness** — `factHoldsL` true for the ratio, both colls, goal; `K`
   strictly inside both chords; the four half‑lengths distinct (no accidental
   symmetry).
2. **Fires in isolation** — `converse_power_of_a_point.derive([collKAP, collKYZ],
   { coords, bindings:{}, points, citedRatios:[ratio] })` emits `cyclic(A,Y,P,Z)`.
   (If option 2 of §1.7 is applied: also `verifyL([converse_power_of_a_point], …)`
   → `{ valid:true, rule:"converse power of a point" }`.)
3. **Minimality** — (a) `citedRatios: []` (ratio dropped) ⇒ no emit; (b) drop
   `coll(K,A,P)` ⇒ no emit; (c) drop `coll(K,Y,Z)` ⇒ no emit.
4. **Soundness‑negative (mixed config)** — the Appendix figure: `K` between `A,P`
   but on a common ray to `Y,Z`, equal **unsigned** products, `cyclic` **false**.
   Assert `derive(...)` emits nothing even with the ratio cited (the sign guard
   rejects it), and the step is rejected.
5. **Soundness‑negative (secants config, positive control)** — an external `K`
   with two secants (mirror of `power_of_a_point.test.ts` config 2): the rule
   *does* fire (covers the `secants` branch).
6. **Shipped engine can't already do it** — the G5 gap is the canonical witness:
   port the G5 coords (or cite the puzzle test) and assert the shipped `verify()`
   (or `researchVerifyL` **without** this rule) returns `valid:false` for
   `cyclic(A,Y,P,Z)`.
7. **G5 extension** — on the G5 canonical coords with the established chain, the
   rule (via shipped `verify()` or the option‑2 harness) derives `cyclic(A,Y,P,Z)`
   citing `powerYZ, collAKP, collYKZ`; the shipped engine alone does not.

## 1.11 Risks / promotability

- **Risk: harness `citedRatios`** (§1.7) — the only plumbing snag; mitigated by
  derive‑level tests + the additive one‑liner; shipped path already supports it.
- **Risk: ratio canonical form** — `eqratioKey` collapses 4 equivalent forms;
  use `isAmongL`/`canonicalKeyL` to match (do not string‑compare), and the rule
  tries the `{A,P}`/`{Y,Z}` pairing dictated by the two colls.
- **Promotable: yes** → `src/lib/freeplay/lengths/rules/converse_power_of_a_point.ts`,
  appended to that folder's `RATIO_RULES`. Shipped `verify()` already passes
  `citedRatios`, so no shipped‑engine change is required. Broadly reusable (the
  converse‑PoP closes a whole class of "no AR feeder" concyclicities).

---

# 2. G4 — Two‑circle radical axis  (`two_circle_radical_axis`)

## 2.1 The gap (recap)

`imo_shortlist_2024_g4.ts` verifies the right half of Solution 3's angle chase
(`∠XCP=∠QAB`, `∠YDP=∠QBA`) and stops one inference short of `PQ ∥ AB`. The
missing move is `cyclic(P,C,X,Q)` (`Q` on circle `(P,C,X)`), equivalently
"the radical axis / common chord of circles `(P,C,X)` and `(P,D,Y)` is parallel
to `AB`, forcing `Q = AX ∩ BY` onto circle `(P,C,X)`". The shipped engine has no
radical‑axis rule.

## 2.2 The theorem

### General statement

> **Two‑circle radical axis (common chord).** Let `Γ₁`, `Γ₂` be two circles
> meeting in the chord `AB` (so `A,B ∈ Γ₁ ∩ Γ₂`). Let `C, X ∈ Γ₁` and
> `D, Y ∈ Γ₂`. Let `ω₁` be the circle through `C, X` and a point `P` with
> `PC = PX`, and `ω₂` the circle through `D, Y` and the **same** `P` with
> `PD = PY` (so `ω₁ ∩ ω₂ ∋ P`). If `AB ∥ CD`, then the second intersection of
> `ω₁` and `ω₂` is `Q = AX ∩ BY`; in particular `cyclic(P,C,X,Q)` (and
> `cyclic(P,D,Y,Q)`), and the radical axis `PQ ∥ AB`.

This is the radical‑axis lemma behind IMO 2024 G4. Like `pascal`/`reim`, it is a
configuration theorem matched structurally and re‑verified numerically.

### Specialisation to G4

`(Γ₁, Γ₂, C, X, D, Y, P, Q) = ((A,B,C,X), (A,B,D,Y), C, X, D, Y, P, Q)`; the
shared chord is `AB`; produce `cyclic(P,C,X,Q)`.

## 2.3 Numeric confirmation (`/tmp`, deleted — see Appendix)

- **Theorem holds:** `cyclic(P,C,X,Q)` held in **2000/2000** random valid G4
  figures. `Q` equals the **second intersection** of `ω₁=(P,C,X)` and
  `ω₂=(P,D,Y)` to `3e‑14`; `power(Q,ω₁)=power(Q,ω₂)=0`; radical axis `PQ ∥ AB`.
- **`cong(P,C,P,X)` is load‑bearing:** sliding `X` along `Γ₁` to break `PC=PX`
  makes `cyclic(P,C,X',Q')` **false** and `PQ'∦AB`. Even keeping `PX'=PC` but
  moving `X'` **off** `Γ₁` makes it false ⇒ `cyclic(A,B,C,X)` is load‑bearing.
- **`para(A,B,C,D)` is load‑bearing:** placing `A,B` at different ratios (so
  `AB∦CD`) makes `cyclic(P,C,X,Q)` **false**.
- By symmetry `cong(P,D,P,Y)` and `cyclic(A,B,D,Y)` are load‑bearing (they pin
  `Y`, which defines `Q` via line `BY`).

## 2.4 Exact fact signature

| role | general | G4 instance | available in G4? |
|---|---|---|---|
| circle `Γ₁` membership | `cyclic(A,B,C,X)` | `cycABCX` | **given** |
| circle `Γ₂` membership | `cyclic(A,B,D,Y)` | `cycABDY` | **given** |
| `ω₁` apex (`PC=PX`) | `cong(P,C,P,X)` | `congPCPX` | **given** |
| `ω₂` apex (`PD=PY`) | `cong(P,D,P,Y)` | `congPDPY` | **given** |
| shared‑chord direction | `para(A,B,C,D)` | `paraABCD` | **given** |
| `Q` on line `AX` | `coll(A,X,Q)` | `collAXQ` | **given** |
| `Q` on line `BY` | `coll(B,Y,Q)` | `collBYQ` | **given** |
| ⇒ produced | `cyclic(P,C,X,Q)` (& `cyclic(P,D,Y,Q)`) | `cyclic(P,C,X,Q)` | **the gap** |

### Minimality

`coll` premises are verifier "free structure" (exempt from the necessity check)
but are needed for the rule to **fire** (they identify `Q` and the pairing
`A↔C↔X` / `B↔D↔Y`). The necessity‑checked premises are the two `cong`s, the two
`cyclic`s, and the `para` — each shown load‑bearing in §2.3, and each
**structurally consumed** by the rule (drop ⇒ the configuration cannot be
identified ⇒ no fire):

| drop | what breaks |
|---|---|
| `cyclic(A,B,C,X)` | `Γ₁` (shared chord `AB`, member `C,X`) unidentified → no fire (and theorem false, §2.3) |
| `cyclic(A,B,D,Y)` | `Γ₂` unidentified → no fire |
| `cong(P,C,P,X)` | apex `P` / triple `{P,C,X}` of `ω₁` unidentified → no fire (theorem false) |
| `cong(P,D,P,Y)` | apex/triple of `ω₂` unidentified → no fire |
| `para(A,B,C,D)` | radical‑axis direction uncertified → no fire (theorem false) |

## 2.5 `derive(cited, ctx)` — sketch

```ts
import type { Fact, PointId, Rel } from "@/lib/freeplay/dsl";
import { canonicalKey, factEqual, rel } from "@/lib/freeplay/dsl";
import type { Rule } from "@/lib/freeplay/rules";
import { dist, isCollinear, unit, cross, lineIntersect, type V } from "@/lib/freeplay/geom";
import { circleOf, onCircle } from "./_radical";

const EPS = 1e-6;
const rels = (c: Fact[], n: Rel["name"]) => c.filter((f): f is Rel => f.kind === "rel" && f.name === n);
const congEq = (s: Set<string>, a:PointId,b:PointId,c:PointId,d:PointId) =>
  s.has(canonicalKey(rel("cong",[a,b,c,d])));
// cited 3-pt colls as membership test
function collSet(c: Fact[]): Set<string> { /* …like spiral plan… */ return new Set(); }
const hasColl = (s:Set<string>, a:PointId,b:PointId,c:PointId) => s.has([a,b,c].sort().join(","));

export const two_circle_radical_axis: Rule = {
  id: "two_circle_radical_axis",
  name: "two-circle radical axis",
  derive(cited, { coords }) {
    const out: Fact[] = [];
    const emitted = new Set<string>();
    const push = (f: Fact) => { const k = canonicalKey(f); if (!emitted.has(k)) { emitted.add(k); out.push(f); } };

    const cyc = rels(cited, "cyclic");
    const congKeys = new Set(rels(cited, "cong").map(canonicalKey));
    const paras = rels(cited, "para");
    const colls = collSet(cited);

    // Γ1, Γ2 = two cited cyclics sharing exactly a 2-point chord {A,B}.
    for (let i = 0; i < cyc.length; i++) for (let j = i + 1; j < cyc.length; j++) {
      const s1 = [...new Set(cyc[i].points)], s2 = [...new Set(cyc[j].points)];
      const chord = s1.filter(p => s2.includes(p));
      if (chord.length !== 2) continue;                       // {A,B}
      const r1 = s1.filter(p => !chord.includes(p));          // {C} side... need 2
      const r2 = s2.filter(p => !chord.includes(p));
      if (r1.length !== 2 || r2.length !== 2) continue;
      const [A, B] = chord;
      // try which of r1 is C vs X, etc. (the cong + colls disambiguate)
      for (const C of r1) { const X = r1[0]===C ? r1[1] : r1[0];
      for (const D of r2) { const Y = r2[0]===D ? r2[1] : r2[0];
        // find apex P shared by cong(P,C,P,X) and cong(P,D,P,Y):
        // P is the point with congEq(P,C,P,X) && congEq(P,D,P,Y) — search candidates
        // among points appearing in cited congs (small set).
        for (const P of candidateApexes(cited)) {
          if (!congEq(congKeys, P, C, P, X) || !congEq(congKeys, P, D, P, Y)) continue;
          // Q on AX and on BY (cited):
          const Q = qOnBothLines(colls, A, X, B, Y); if (!Q) continue;
          // shared-chord direction certified by a cited para AB ∥ CD:
          if (!paras.some(pf => factEqual(pf, rel("para",[A,B,C,D])))) continue;

          const [cA,cB,cC,cX,cD,cY,cP,cQ] = [A,B,C,X,D,Y,P,Q].map(p=>coords[p]) as V[];
          if ([cA,cB,cC,cX,cD,cY,cP,cQ].some(c=>!c)) continue;
          // GUARDS (coords):
          if (Math.abs(dist(cP,cC)-dist(cP,cX))>EPS*Math.max(1,dist(cP,cC))) continue; // PC=PX
          if (Math.abs(dist(cP,cD)-dist(cP,cY))>EPS*Math.max(1,dist(cP,cD))) continue; // PD=PY
          if (Math.abs(cross(unit(sub(cB,cA))!, unit(sub(cD,cC))!))>EPS) continue;     // AB∥CD
          if (!isCollinear(cA,cX,cQ) || !isCollinear(cB,cY,cQ)) continue;              // Q=AX∩BY
          const w1 = circleOf(cP,cC,cX), w2 = circleOf(cP,cD,cY);
          if (!w1 || !w2) continue;
          if (!onCircle(cQ,w1) || !onCircle(cQ,w2)) continue;   // Q on both circles
          if (dist(cQ,cP) < EPS) continue;                       // Q ≠ P (genuine 2nd pt)
          // radical axis PQ ∥ AB (the licensing relation):
          if (Math.abs(cross(unit(sub(cQ,cP))!, unit(sub(cB,cA))!)) > EPS) continue;

          push(rel("cyclic",[P,C,X,Q]));
          push(rel("cyclic",[P,D,Y,Q]));
        }
      }}
    }
    return out;
  },
};
```

(`candidateApexes`, `qOnBothLines`, `collSet` are small helpers in the spirit of
`pascal.ts`/`spiral-similarity-center.md` §5; `sub` from geom.)

## 2.6 Soundness guard

Emit only when, in `ctx.coords`: all eight points exist & are distinct; `PC=PX`
and `PD=PY` (matching `cong`); `AB∥CD` (matching `para`); `Q` on lines `AX` and
`BY` (the cited colls); `ω₁=(P,C,X)` and `ω₂=(P,D,Y)` exist, with `Q` on **both**
and `Q ≠ P`; and the radical axis `PQ ∥ AB`. The configuration theorem (§2.3,
2000/2000) makes the conclusion follow from the cited premises; the numeric
guards reject degenerate samples and never read the conclusion off the figure
without the premises (each non‑coll premise is structurally consumed).

## 2.7 Interaction with DD / AngleAR / LengthAR

- Output is a `cyclic`; AngleAR cannot emit `cyclic` and the opposite‑side
  inscribed‑angle relation is not entailed; LengthAR emits only length facts. So a
  DD rule in `rules/` is required. No `eqratio` is involved → **no `citedRatios`
  dependency** (unlike G5). It is exercised by the angle harness `verifyWith` /
  `researchVerify`.
- **No interference:** fires only on the specific `2 cyclic (sharing a chord) +
  2 cong + 1 para + 2 coll` shape and re‑checks every incidence; cost is
  `O(#cyclic² · pairings)` — small.

## 2.8 How it closes G4

```
cyclic(P,C,X,Q)
  rule:     two-circle radical axis
  premises: cyclic(A,B,C,X), cyclic(A,B,D,Y), cong(P,C,P,X), cong(P,D,P,Y),
            para(A,B,C,D), coll(A,X,Q), coll(B,Y,Q)
  reading:  Q = AX∩BY is the 2nd common point of circles (P,C,X),(P,D,Y); the
            common chord PQ is parallel to AB, so Q lies on circle (P,C,X).
```

Then the puzzle's own Solution‑3 lemma closes the goal: with `cyclic(P,C,X,Q)`
established, the directed‑angle chase
`∠AQP = ∠XQP = ∠XCP = ∠QAB ⇒ PQ ∥ AB` is in‑engine (the G4 puzzle test already
shows `para(P,Q1,A,B)` verifies as an `algebraic angle-chase` once
`cyclic(P,C,X,Q1)` is granted). So this single rule + the existing AngleAR step
reaches `goal = para(P,Q,A,B)` end‑to‑end.

## 2.9 Redundancy check

No shipped rule produces this `cyclic`: `concyclic_merge` needs two circles
sharing 3 points (here `ω₁`,`ω₂` share only `P,Q`); `concyclic_equal_radii` needs
a `cong`‑star centre; `converse_inscribed`/`concyclic_from_directed_angles` need
an (here absent / opposite‑side) inscribed‑angle equality. Confirmed by the G4
gap test returning `valid:false` for `cyclic(P,C,X,Q)` with all givens cited.

## 2.10 Test plan — `research/freeplay-rules/rules/__tests__/two_circle_radical_axis.test.ts`

Port the puzzle `buildG4(P,D,C,t)` (canonical `([0,0],[-3,-6],[6,-5],0.45)`) for
a faithful generic figure. Helpers: `verifyWith`, `RULES` from `../../harness`;
`factHolds` from `@/lib/freeplay/check`.

1. **Faithfulness** — `factHolds` true for all seven premises and the goal;
   `false` for a decoy (`cyclic(P,D,X,Q)`).
2. **Fires in isolation** — `verifyWith([...RULES, two_circle_radical_axis],
   {candidate: cyclic(P,C,X,Q), citedPremises: the seven})` →
   `{valid:true, rule:"two-circle radical axis"}`; also emits `cyclic(P,D,Y,Q)`.
3. **Minimality** — drop each of the **non‑coll** premises (`cyclic(A,B,C,X)`,
   `cyclic(A,B,D,Y)`, `cong(P,C,P,X)`, `cong(P,D,P,Y)`, `para(A,B,C,D)`) ⇒
   `valid:false` (5 sub‑cases; §2.4).
4. **Soundness‑negative A** — move `X` along `Γ₁` so `PC≠PX`: rebuild `Q'`; all
   colls/cyclics for `Γ₁` still hold but `cyclic(P,C,X',Q')` is **false** ⇒ no
   emit, step rejected.
5. **Soundness‑negative B** — break `para` (place `A,B` at different ratios so
   `AB∦CD`): `cyclic(P,C,X,Q)` **false** ⇒ no emit, step rejected.
6. **Shipped engine can't already do it** — `verifyWith(RULES, …)` for
   `cyclic(P,C,X,Q)` → `valid:false`.
7. **G4 extends to the goal** — with `cyclic(P,C,X,Q)` derived, assert
   `verifyWith([...RULES, two_circle_radical_axis], {candidate: para(P,Q,A,B),
   citedPremises: cyclic(P,C,X,Q), coll(A,X,Q), coll(B,C,P), cyclic(A,B,C,X)})`
   is valid (the in‑engine angle chase), while `verifyWith(RULES, {candidate:
   para(P,Q,A,B), …givens…})` is not.

## 2.11 Risks / promotability

- **Risk: configuration specificity.** Like `pascal`/`reim`, the matcher is
  shaped to the two‑circles‑sharing‑a‑chord + cong‑apex + para pattern; it is
  sound and minimal but not a fully general "radical axis" primitive. The reusable
  core is `_radical.ts` (§0.2). A broader variant (drop the `para` and instead
  certify the radical axis via a third circle) overlaps G3 — see §3.
- **Risk: apex search.** `P` is recovered from the two `cong`s; restrict
  candidates to points named in cited `cong`s (small) and re‑check numerically.
- **Promotable: yes** → `src/lib/freeplay/rules/two_circle_radical_axis.ts`,
  appended to that folder's `PROMOTED_RULES` (never edits `rules.ts`). Depends
  only on `geom` + the new `_radical.ts` (promote that helper alongside, e.g. as
  `src/lib/freeplay/radical.ts`).

---

# 3. G3 — Three‑circle radical centre  (`three_circle_radical_center`)

## 3.1 The gap (recap)

`imo_shortlist_2024_g3.ts` reaches official part (a): the two auxiliary circles
`cyclic(D,E,K,P)`, `cyclic(C,D,Q,L)` and the parallels `KP∥MC`, `LQ∥ME`. The
final concurrency `coll(L,Q,Z)` (with `Z = MD ∩ KP`) is the radical‑centre step
(part c) — the three lines `KP`, `LQ`, `MD` are the three pairwise radical axes
of three circles and concur at the radical centre `Z`. The shipped engine has no
radical‑centre rule (and `coll(L,Q,Z)` is not a Pappus/Pascal incidence).

## 3.2 The theorem

### General statement

> **Three‑circle radical centre.** Given three circles `ω_A, ω_B, ω_C`, their
> three pairwise radical axes `rad(ω_A,ω_C)`, `rad(ω_B,ω_C)`, `rad(ω_A,ω_B)`
> concur at a single point `Z` (the radical centre). Hence if `Z` is the
> intersection of two of them, it lies on the third.

### Specialisation to G3

The three circles are `ω_A=(D,E,K,P)`, `ω_B=(C,D,Q,L)`, `ω_C=(K,L,P,Q)`. Their
common chords give the axes:

- `rad(ω_A,ω_C)` = line `KP` (`ω_A ∩ ω_C = {K,P}`);
- `rad(ω_B,ω_C)` = line `LQ` (`ω_B ∩ ω_C = {L,Q}`);
- `rad(ω_A,ω_B)` = line `MD` (`ω_A ∩ ω_B = {M,D}`: `D` common to both, and `M`
  has **equal power** w.r.t. both — verified, §3.3).

Given `coll(K,P,Z)` (`Z` on `KP`) and `coll(M,D,Z)` (`Z` on `MD`), the radical
centre is `Z`, so `Z ∈ LQ`, i.e. `coll(L,Q,Z)`.

## 3.3 Numeric confirmation (`/tmp`, deleted — see Appendix)

- All three circles concyclic; `Z` has **equal power** w.r.t. all three
  (`power(Z,ω_A)=power(Z,ω_B)=power(Z,ω_C) = −0.468…`).
- `power(M,ω_A)=power(M,ω_B)=2.0895` (and `power(D,·)=0`), so line `MD` **is** the
  radical axis of `ω_A,ω_B`.
- `KP∩MD = LQ∩MD = Z` (concurrency).
- **Robustness:** over **3000/3000** random valid figures `coll(L,Q,Z)` held,
  `cyclic(K,L,P,Q)` held, and `Z` was the radical centre. Soundness‑negative:
  a bogus `Q'` gives `coll(L,Q',Z)` **false**.

## 3.4 Exact fact signature

| role | general | G3 instance | available in G3? |
|---|---|---|---|
| circle `ω_A` | `cyclic(D,E,K,P)` | `cycDEKP` | **derived** (verified step) |
| circle `ω_B` | `cyclic(C,D,Q,L)` | `cycCDQL` | **derived** (verified step) |
| circle `ω_C` | `cyclic(K,L,P,Q)` | `cyclic(K,L,P,Q)` | **true, NOT yet derived** — §3.6 |
| `Z` on axis `rad(ω_A,ω_C)=KP` | `coll(K,P,Z)` | `collKPZ` | **given** |
| `Z` on axis `rad(ω_A,ω_B)=MD` | `coll(M,D,Z)` | `collMDZ` | **given** |
| ⇒ produced | `coll(L,Q,Z)` (`L,Q = ω_B∩ω_C`) | `coll(L,Q,Z)` | **the gap (goal)** |

### Minimality

The two `coll`s are verifier free structure (locate `Z` and the `MD` axis) but
needed to fire. The necessity‑checked premises are the **three `cyclic`s**, each
structurally consumed:

| drop | what breaks |
|---|---|
| `cyclic(D,E,K,P)` | `ω_A` unidentified → axes `KP`, `MD` uncomputable → no fire |
| `cyclic(C,D,Q,L)` | `ω_B` unidentified → axis `LQ`, `MD` uncomputable → no fire |
| `cyclic(K,L,P,Q)` | `ω_C` unidentified → axes `KP`, `LQ` uncomputable → no fire |

## 3.5 `derive(cited, ctx)` — sketch

```ts
import type { Fact, PointId, Rel } from "@/lib/freeplay/dsl";
import { canonicalKey, rel } from "@/lib/freeplay/dsl";
import type { Rule } from "@/lib/freeplay/rules";
import { dist, isCollinear, type V } from "@/lib/freeplay/geom";
import { circleOf, power, equalPower, type Circle } from "./_radical";

const EPS = 1e-6;
const cyclicsOf = (c: Fact[]) => c.filter((f): f is Rel => f.kind === "rel" && f.name === "cyclic");
function collSet(c: Fact[]): Set<string> { /* cited 3-pt colls */ return new Set(); }
const hasColl = (s:Set<string>,a:PointId,b:PointId,d:PointId) => s.has([a,b,d].sort().join(","));

export const three_circle_radical_center: Rule = {
  id: "three_circle_radical_center",
  name: "three-circle radical centre",
  derive(cited, { coords }) {
    const out: Fact[] = [];
    const emitted = new Set<string>();
    const push = (f: Fact) => { const k = canonicalKey(f); if (!emitted.has(k)) { emitted.add(k); out.push(f); } };

    const cyc = cyclicsOf(cited).map(c => [...new Set(c.points)]);
    const colls = collSet(cited);

    // Pick an ordered triple of circles (ωA, ωB, ωC) where ωA∩ωC and ωB∩ωC are
    // 2-point common chords (KP and LQ), and ωA∩ωB share a point (D).
    for (const A of cyc) for (const B of cyc) for (const Cc of cyc) {
      if (A===B||B===Cc||A===Cc) continue;
      const AC = A.filter(p => Cc.includes(p));   // {K,P}
      const BC = B.filter(p => Cc.includes(p));   // {L,Q}
      const AB = A.filter(p => B.includes(p));    // {…,D}
      if (AC.length !== 2 || BC.length !== 2 || AB.length < 1) continue;
      const [K, P] = AC, [L, Q] = BC;

      // Z on line KP (= rad(ωA,ωC)) and on some cited line MD whose endpoints
      // {M,D} are equal-power for ωA,ωB. Find Z via a cited coll(K,P,Z).
      for (const Z of thirdOnLine(colls, K, P)) {
        // find an MD axis: a cited coll(M,D,Z) with D ∈ AB and M equal-power.
        const md = findEqualPowerAxisThroughZ(colls, Z, A, B, Cc, coords);
        if (!md) continue;

        const cZ = coords[Z], cL = coords[L], cQ = coords[Q];
        if (!cZ || !cL || !cQ) continue;
        const wA = circle3(A, coords), wB = circle3(B, coords), wC = circle3(Cc, coords);
        if (!wA || !wB || !wC) continue;
        // GUARD — Z is the radical centre: equal power wrt all three.
        if (!equalPower(cZ, wA, wC) || !equalPower(cZ, wA, wB)) continue;
        // GUARD — conclusion holds numerically.
        if (!isCollinear(cL, cQ, cZ)) continue;
        if (new Set([L,Q,Z]).size !== 3) continue;

        push(rel("coll", [L, Q, Z]));
      }
    }
    return out;
  },
};
```

(`circle3` = `circleOf` over a cyclic's three non‑collinear points;
`thirdOnLine`, `findEqualPowerAxisThroughZ` are small cited‑`coll` helpers. The
`MD` axis is certified by: `D ∈ ω_A∩ω_B` and `equalPower(M, ω_A, ω_B)` — so line
`MD` is genuinely `rad(ω_A,ω_B)` and `coll(M,D,Z)` places `Z` on it.)

## 3.6 The nested sub‑gap: deriving `cyclic(K,L,P,Q)`

**Important.** The radical‑centre rule needs **three** established circles, but
the puzzle's current verified chain produces only `cyclic(D,E,K,P)` and
`cyclic(C,D,Q,L)`. The third, `cyclic(K,L,P,Q)`, is **true** (3000/3000) and is
essential (it is the circle whose common chords with `ω_A`, `ω_B` are `KP` and
`LQ`), but is **not yet derived**. Closing G3 end‑to‑end therefore needs
`cyclic(K,L,P,Q)` established first. Options, in order of preference:

1. **Derive it with the shipped `concyclic_from_directed_angles`** (the directed
   converse‑inscribed, already promoted). The established `KP∥MC`, `LQ∥ME`, the
   `EC` collinearity of `P,Q`, and the two auxiliary circles give directed‑angle
   relations among `K,L,P,Q`; this is the natural feeder. **Must be confirmed in
   the lab** (a one‑step `researchVerify` check on the canonical coords) — if it
   fires, G3 closes with this one extra angle step + the radical‑centre rule.
2. If (1) does not fire, `cyclic(K,L,P,Q)` is a **secondary documented gap** and
   the radical‑centre rule alone does not close G3 end‑to‑end. (It still closes
   the radical‑centre *step* given the three circles, and is independently useful.)
3. **Alternative finish — homothety.** The official part (a) facts `KP∥MC`,
   `LQ∥ME` (both already derived) support the homothety/parallel finish, which may
   avoid `ω_C`. The task asks specifically for the radical‑centre rule, so this is
   noted as a fallback, not the spec.

This is the single biggest risk in the family and the reason G3 is ranked
hardest.

## 3.7 Soundness guard

Emit `coll(L,Q,Z)` only when: the three circles exist (each from a cited
`cyclic`); `ω_A∩ω_C ⊇ {K,P}`, `ω_B∩ω_C ⊇ {L,Q}` (the common‑chord axes), and the
`MD` axis is genuinely `rad(ω_A,ω_B)` (`D` common, `M` equal‑power); `Z` lies on
`KP` and `MD` (cited colls); `Z` has **equal power** w.r.t. all three circles
(the radical‑centre certificate); and `L,Q,Z` are numerically collinear and
distinct. The radical‑centre theorem makes the conclusion follow from the
premises; the equal‑power guard is the load‑bearing certificate (never read the
conclusion off the figure without the three circles).

## 3.8 Interaction with DD / AngleAR / LengthAR

- Output is a `coll` produced from circle‑power equality — AngleAR consumes but
  never **emits** `coll` (and this is not an angle‑chase collinearity); LengthAR
  emits only length facts. So a DD rule in `rules/`. No `eqratio` → no
  `citedRatios` dependency. Exercised by `verifyWith`/`researchVerify`.
- **No interference:** fires only on the three‑circle / two‑axis shape with the
  equal‑power certificate; cost `O(#cyclic³)` over the (tiny) cited set.

## 3.9 How it closes G3

```
[prereq] cyclic(K,L,P,Q)      via concyclic_from_directed_angles (to confirm, §3.6)
coll(L,Q,Z)
  rule:     three-circle radical centre
  premises: cyclic(D,E,K,P), cyclic(C,D,Q,L), cyclic(K,L,P,Q),
            coll(K,P,Z), coll(M,D,Z)
  reading:  KP, LQ, MD are the pairwise radical axes of circles (D,E,K,P),
            (C,D,Q,L), (K,L,P,Q); they concur at the radical centre Z = MD∩KP,
            so LQ passes through Z, i.e. L,Q,Z are collinear.
```

This reaches the puzzle `goal = coll(L,Q,Z)` (KP, LQ, MD concurrent).

## 3.10 Redundancy check

No shipped rule produces a radical‑centre `coll`: `pappus`/`pascal` are
conic/line projective incidences (not power‑based); `coincident_direction_collinear`
turns `para(X,A,X,B)` into `coll(X,A,B)` (a shared‑direction packaging, not a
radical centre). Confirmed by the G3 gap test returning
`{valid:false, reason:"unjustified"}` for `coll(L,Q,Z)` even with the full chain
and the strongest natural premises cited.

## 3.11 Test plan — `research/freeplay-rules/rules/__tests__/three_circle_radical_center.test.ts`

Port the puzzle `build(CANON)` (`{d:0.9,k:1.9,phiC:70,phiE:-82}`).

1. **Faithfulness** — `factHolds` true for the three `cyclic`s, the two `coll`s,
   and the goal; `Z` equal‑power w.r.t. all three circles; `false` for a decoy
   (`coll(K,Q,Z)`).
2. **Fires in isolation** — `verifyWith([...RULES, three_circle_radical_center],
   {candidate: coll(L,Q,Z), citedPremises: [cycDEKP, cycCDQL, cyc(K,L,P,Q),
   collKPZ, collMDZ]})` → `{valid:true, rule:"three-circle radical centre"}`.
3. **Minimality** — drop each of the **three `cyclic`s** ⇒ `valid:false`.
4. **Soundness‑negative** — perturb `Q→Q'` (off `EC`): `cyclic(K,L,P,Q')` false,
   `coll(L,Q',Z)` false ⇒ no emit / step rejected. Also a "three unrelated
   circles whose axes don't concur at the cited `Z`" → no emit.
5. **Shipped engine can't already do it** — `verifyWith(RULES, …)` for
   `coll(L,Q,Z)` → `valid:false` (mirrors the puzzle gap test).
6. **Sub‑gap probe (§3.6)** — assert `researchVerify` derives `cyclic(K,L,P,Q)`
   in one step from the established part‑(a) facts (documents whether the nested
   gap is closed by an existing rule); if not, mark `cyclic(K,L,P,Q)` a secondary
   gap in the test name.
7. **G3 extension** — `[…established chain…, cyclic(K,L,P,Q)] ⇒ coll(L,Q,Z)`
   verifies with the rule and not without it.

## 3.12 Risks / promotability

- **Risk: the `cyclic(K,L,P,Q)` prerequisite** (§3.6) — the dominant risk; must
  be confirmed derivable (likely via `concyclic_from_directed_angles`) or flagged
  as a secondary gap.
- **Risk: circle/axis matching combinatorics** — guard with the equal‑power
  certificate and require the two cited colls to anchor `Z` and the `MD` axis, so
  only the genuine radical centre fires.
- **Promotable: yes** → `src/lib/freeplay/rules/three_circle_radical_center.ts`
  + `PROMOTED_RULES`, sharing the promoted `_radical.ts` helper with G4. Radical
  centre is a broadly recurring olympiad tool (it sits in the discovery corpus's
  conjecture bucket — see the research README), so promotion is well motivated.

---

# 4. Family summary

## 4.1 The three rules

| Rule | Layer / file | Consumes (general) | Produces | Output reachable by AR/LengthAR? |
|---|---|---|---|---|
| `converse_power_of_a_point` | `lengths/rules/` | `eqratio(K,A,K,Y,K,Z,K,P)` + `coll(K,A,P)` + `coll(K,Y,Z)` (ratio via `ctx.citedRatios`) | `cyclic(A,Y,P,Z)` | No (length→circle) |
| `two_circle_radical_axis` | `rules/` | `cyclic(A,B,C,X)`,`cyclic(A,B,D,Y)`,`cong(P,C,P,X)`,`cong(P,D,P,Y)`,`para(A,B,C,D)`,`coll(A,X,Q)`,`coll(B,Y,Q)` | `cyclic(P,C,X,Q)` | No (radical axis) |
| `three_circle_radical_center` | `rules/` | `cyclic(D,E,K,P)`,`cyclic(C,D,Q,L)`,`cyclic(K,L,P,Q)`,`coll(K,P,Z)`,`coll(M,D,Z)` | `coll(L,Q,Z)` | No (radical centre) |

## 4.2 Shared infrastructure

- `_radical.ts` (G4, G3): `circleOf`, `power`, `onCircle`, `equalPower` — the
  coordinate power‑of‑a‑point / radical‑axis primitive (§0.2). Promote alongside
  the first of G4/G3 (e.g. `src/lib/freeplay/radical.ts`).
- `ctx.citedRatios` (G5): already in shipped `RuleCtx` + `verify.ts`; the only
  cross‑cutting harness fact (research lab needs the §1.7 one‑liner for end‑to‑end
  `verifyL`).
- Conceptual: all three are the power‑of‑a‑point idea; G5 is the converse of the
  shipped forward `lengths/rules/power_of_a_point.ts`.

## 4.3 Tractability (easiest → hardest): **G5 < G4 < G3**

- **G5** — smallest rule, mirrors a shipped rule; only the `citedRatios` lab
  wrinkle.
- **G4** — medium; new helper + multi‑premise configuration matcher, all ordinary
  facts; soundness clean, role‑matching is the work.
- **G3** — hardest; helper + three‑circle matching **and** the nested
  `cyclic(K,L,P,Q)` prerequisite the current chain doesn't derive.

## 4.4 Blockers / open items

1. **G5 lab harness**: `research/freeplay-rules/lengths/verify.ts` doesn't pass
   `citedRatios`. Mitigate via derive‑level tests + the additive one‑liner
   (shared‑file change → orchestrator sign‑off). Shipped path already works.
2. **G3 prerequisite**: `cyclic(K,L,P,Q)` (true, 3000/3000) is not yet derived;
   confirm `concyclic_from_directed_angles` produces it, else it is a secondary
   gap. This is the only thing standing between the radical‑centre rule and an
   end‑to‑end G3 close.
3. **No shared `src/` engine changes** are required to promote any of the three
   (the `citedRatios` plumbing already shipped); each promotes by adding its file
   + registry entry (`RATIO_RULES` for G5, `PROMOTED_RULES` for G4/G3) plus the
   `_radical.ts` helper.

---

## Appendix — numeric experiments (run in `/tmp`, deleted)

All reconstruct the puzzles' canonical `build()` with copies of
`src/lib/freeplay/geom.ts` helpers (no aliases).

| probe | setup | result |
|---|---|---|
| **G5 theorem** | canonical G5 coords | `cyclic(A,Y,P,Z)` true; `KA·KP = KY·KZ = 10.2895`; `K` between `A,P` **and** `Y,Z` (intersecting chords); mirror `cyclic(A,W,P,X)` true |
| **G5 mixed‑config negative** | synthetic: `K=(0,0)`, `A=(−2,0)`, `P=(3,0)` (chord, `KA·KP=6`), `Y=(√2,√2)`, `Z=(1.5√2,1.5√2)` (secant ray, `KY·KZ=6`) | equal **unsigned** products, mixed position ⇒ `cyclic(A,Y,P,Z)` **false** (the sign guard's reason to exist) |
| **G4 theorem** | canonical G4 coords | `cyclic(P,C,X,Q)` & `cyclic(P,D,Y,Q)` true; `Q` = 2nd intersection of `ω₁,ω₂` (`3e‑14`); `power(Q,ω₁)=power(Q,ω₂)=0`; `PQ∥AB` |
| **G4 `cong` load‑bearing** | slide `X`→`X'` (break `PC=PX`), and keep `PX'=PC` but off `Γ₁` | both make `cyclic(P,C,X',Q')` **false** ⇒ `cong(P,C,P,X)` and `cyclic(A,B,C,X)` load‑bearing |
| **G4 `para` load‑bearing** | place `A,B` at different ratios (`AB∦CD`) | `cyclic(P,C,X,Q)` **false** |
| **G4 soundness** | 2000 random valid G4 figures | `cyclic(P,C,X,Q)` held 2000/2000 |
| **G3 theorem** | canonical G3 coords | three circles concyclic; axes `KP,LQ,MD`; `power(Z,ω_A)=ω_B=ω_C=−0.468` (radical centre); `KP∩MD=LQ∩MD=Z`; `power(M,ω_A)=power(M,ω_B)=2.0895` so `MD=rad(ω_A,ω_B)` |
| **G3 robustness** | 3000 random valid G3 figures | `coll(L,Q,Z)` 3000/3000; `cyclic(K,L,P,Q)` 3000/3000; `Z` radical centre 3000/3000 |
| **G3 soundness‑negative** | perturb `Q→Q'` | `coll(L,Q',Z)` **false** |
