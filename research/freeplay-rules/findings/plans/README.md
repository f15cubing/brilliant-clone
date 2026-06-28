# Engine-gap implementation plans (IMO 2024 Shortlist G1–G5)

Implementation plans for the new DDAR deduction rules needed to close the engine
gaps surfaced while encoding the IMO 2024 Shortlist geometry problems G1–G5 as
shipped Freeplay puzzles (`src/lib/freeplay/puzzles/imo_shortlist_2024_g*.ts`).

Each puzzle ships a faithful, multi-case-verified *partial* proof
(`solutionReachesGoal: false`) that stops at one missing capability. These plans
spec the rule(s) that would close each gap — following
[`../../CONTEXT.md`](../../CONTEXT.md)'s "how to add a rule" contract (sound,
coordinate-guarded, one-step, with isolation + minimality + soundness-negative +
"shipped engine can't already do it" tests). Implementation is a separate pass.

| Plan | Closes | Produces |
|------|--------|----------|
| `spiral-similarity-center.md` | G1 | `cong` (Miquel point / spiral-similarity centre equidistance) |
| `power-of-a-point-radical-axis.md` | G3, G4, G5 | `cyclic` (converse power of a point, two-circle radical axis) + `coll` (three-circle radical centre / concurrency) |
| `central-angle-inscribed.md` | G5 | `aval` (central angle = 2 × inscribed angle) |

## Implementation status

Built, promoted to `src/`, and registered (each with research + shipped tests):

- **`spiral_similarity_center`** → **G1 fully closed** (`solutionReachesGoal: true`).
- **`two_circle_radical_axis`** → **G4 fully closed**.
- **`converse_power_of_a_point`** → **G5 gap #1 closed** (`cyclic(A,Y,P,Z)`); G5 stays partial (central-angle gap, out of reach).
- **`three_circle_radical_center`** → mechanizes G3's concurrency step `coll(L,Q,Z)`, but **G3 is NOT fully closed**: a deeper *secondary* gap was discovered — the prerequisite circle `cyclic(K,L,P,Q)` reduces to a "power of M" fact `ME·MK = MC·ML` (≡ `cyclic(C,E,K,L)` ≡ `KL ∥ AB`). The official proof obtains it via an **auxiliary tangent-intersection point** (Solution 2's `X`), i.e. an AlphaGeometry-style auxiliary construction the directed-angle/`LengthAR` engine cannot perform (LengthAR is multiplicative; this needs additive/radical reasoning). So G3 keeps `solutionReachesGoal: false` with this single prerequisite documented as the remaining gap.

Not implemented (genuinely out of reach for the current engine — need an auxiliary-construction facility): the **central-angle** capability for G5's `∠ZAK = ∠IAY`, and the **power-of-M / radical-axis-additive** capability for G3's `cyclic(K,L,P,Q)`.
