import { Link } from "react-router-dom";
import { MathText } from "@/components/MathText";
import { factLabel } from "@/lib/freeplay/dsl";
import { FREEPLAY_PUZZLES } from "@/lib/freeplay/puzzles";
import type { Difficulty } from "@/lib/freeplay/types";

const DIFFICULTY_STYLE: Record<Difficulty, string> = {
  intro: "border-correct/40 bg-correct/10 text-correct",
  core: "border-ultramarine/40 bg-ultramarine/10 text-ultramarine",
  challenge: "border-vermilion/40 bg-vermilion/10 text-vermilion",
};

export function FreeplayList() {
  return (
    <div className="flex flex-col gap-9">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-vermilion">
          Freeplay
        </p>
        <h1 className="mt-2 font-display text-4xl tracking-tight text-ink">
          Prove it yourself
        </h1>
        <p className="mt-3 max-w-2xl font-serif text-lg leading-relaxed text-ink-soft">
          Build a proof one justified step at a time. Assert a new fact, cite the
          established facts it relies on, and a symbolic engine checks whether your
          step holds — and names the theorem you used.
        </p>
      </header>

      <ul className="flex flex-col">
        {FREEPLAY_PUZZLES.map((p) => (
          <li key={p.id}>
            <Link
              to={`/freeplay/${p.id}`}
              className="group flex flex-col gap-2 border-b border-rule py-5 transition hover:bg-panel-soft"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-sm border px-2 py-0.5 font-mono text-[0.62rem] uppercase tracking-wide ${DIFFICULTY_STYLE[p.difficulty]}`}
                >
                  {p.difficulty}
                </span>
                <h2 className="font-display text-xl tracking-tight text-ink">
                  {p.title}
                </h2>
              </div>
              <p className="font-serif text-ink-soft">{p.blurb}</p>
              <p className="font-serif text-sm text-ink-faint">
                Goal: <MathText>{factLabel(p.goal)}</MathText>
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
