import { SKETCH_TOOLS } from "@/lib/sketch/toolMeta";
import type { ToolMode } from "@/lib/sketch/types";

interface SketchToolbarProps {
  mode: ToolMode;
  onSelect: (mode: ToolMode) => void;
}

export function SketchToolbar({ mode, onSelect }: SketchToolbarProps) {
  return (
    <div className="flex flex-wrap gap-1.5" role="toolbar" aria-label="Construction tools">
      {SKETCH_TOOLS.map((t) => {
        const active = t.mode === mode;
        return (
          <button
            key={t.mode}
            type="button"
            title={t.hint}
            aria-pressed={active}
            onClick={() => onSelect(t.mode)}
            className={
              active
                ? "rounded-sm bg-ultramarine px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-paper"
                : "rounded-sm border border-rule px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-ink-soft transition hover:border-ink-faint hover:text-ink"
            }
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
