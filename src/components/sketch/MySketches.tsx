import type { Construction } from "@/lib/sketch/types";

interface MySketchesProps {
  sketches: Construction[];
  loading: boolean;
  currentId: string | null;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

function relativeTime(ms: number): string {
  if (!ms) return "";
  const d = Date.now() - ms;
  const min = Math.round(d / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.round(hr / 24)}d ago`;
}

export function MySketches({ sketches, loading, currentId, onOpen, onDelete }: MySketchesProps) {
  return (
    <aside className="flex flex-col gap-2">
      <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-ink-faint">
        My sketches
      </h2>
      {loading ? (
        <p className="font-serif text-sm text-ink-faint">Loading…</p>
      ) : sketches.length === 0 ? (
        <p className="font-serif text-sm text-ink-faint">
          No saved sketches yet — build one and hit Save.
        </p>
      ) : (
        <ul className="flex flex-col">
          {sketches.map((s) => (
            <li
              key={s.id}
              className={
                "flex items-center gap-2 border-b border-rule py-2 " +
                (s.id === currentId ? "bg-panel-soft" : "")
              }
            >
              <button
                type="button"
                onClick={() => onOpen(s.id)}
                className="flex min-w-0 flex-1 flex-col text-left transition hover:text-vermilion"
              >
                <span className="truncate font-display text-sm text-ink">{s.title}</span>
                <span className="font-mono text-[0.62rem] uppercase tracking-wide text-ink-faint">
                  {s.steps.length} object{s.steps.length === 1 ? "" : "s"} · {relativeTime(s.updatedAt)}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onDelete(s.id)}
                aria-label={`Delete ${s.title}`}
                title="Delete"
                className="rounded-sm border border-rule px-2 py-1 font-mono text-[0.62rem] uppercase tracking-wide text-ink-soft transition hover:border-vermilion hover:text-vermilion"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
