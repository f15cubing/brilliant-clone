export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-ink-soft">
      {/* A compass scribing an arc: the pivot stays, the arc sweeps. */}
      <svg
        width="40"
        height="40"
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden="true"
        className="animate-spin"
        style={{ animationDuration: "1.4s" }}
      >
        <circle cx="20" cy="20" r="15" stroke="#d8ccae" strokeWidth="2" />
        <path
          d="M20 5 A15 15 0 0 1 35 20"
          stroke="#27418c"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <circle cx="20" cy="20" r="2.2" fill="#c0392b" />
      </svg>
      {label && <span className="font-mono text-xs tracking-wide">{label}</span>}
    </div>
  );
}
