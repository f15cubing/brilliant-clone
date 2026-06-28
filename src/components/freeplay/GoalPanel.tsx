import { MathText } from "@/components/MathText";
import { factLabel } from "@/lib/freeplay/dsl";
import type { Puzzle } from "@/lib/freeplay/types";

export function GoalPanel({
  puzzle,
  solved,
  className,
}: {
  puzzle: Puzzle;
  solved: boolean;
  className?: string;
}) {
  return (
    <section
      className={
        className ??
        "flex flex-col gap-3 rounded-sm border border-rule bg-panel-soft p-4"
      }
    >
      <h2 className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-vermilion">
        Goal
      </h2>
      <p
        className={[
          "font-serif text-lg leading-snug",
          solved ? "text-correct" : "text-ink",
        ].join(" ")}
      >
        <MathText>{factLabel(puzzle.goal)}</MathText>
        {solved && " ✓"}
      </p>

      {puzzle.equivalentGoals && puzzle.equivalentGoals.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t border-rule pt-3">
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-ink-faint">
            It suffices to show
          </span>
          {puzzle.equivalentGoals.map((g, i) => (
            <p key={i} className="font-serif text-ink-soft">
              <MathText>{factLabel(g)}</MathText>
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
