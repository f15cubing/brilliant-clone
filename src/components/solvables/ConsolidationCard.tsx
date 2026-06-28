import { MathText } from "@/components/MathText";
import type { ConsolidationGate } from "@/lib/content/types";

export function ConsolidationCard({
  consolidation,
  acknowledged,
  onAcknowledge,
}: {
  consolidation: ConsolidationGate;
  acknowledged: boolean;
  onAcknowledge: () => void;
}) {
  return (
    <div className="border-l-2 border-ultramarine bg-ultramarine/5 px-4 py-4">
      <div className="font-mono text-xs uppercase tracking-[0.16em] text-ultramarine">
        Remember this
      </div>
      <p className="mt-2 font-serif text-lg leading-relaxed text-ink">
        <MathText>{consolidation.principle}</MathText>
      </p>
      {consolidation.selfExplainPrompt && (
        <div className="mt-3">
          <p className="text-sm text-ink-soft">
            <MathText>{consolidation.selfExplainPrompt}</MathText>
          </p>
          {!acknowledged && (
            <button
              onClick={onAcknowledge}
              className="mt-2 rounded-sm border border-ultramarine/50 px-4 py-1.5 font-mono text-xs uppercase tracking-wide text-ultramarine transition hover:bg-ultramarine/10"
            >
              I can explain it →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
