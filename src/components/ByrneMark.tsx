/*
 * Drawn geometric glyphs in the Byrne triad. These replace every emoji in the
 * UI so the iconography reads as part of the figure language, not decoration.
 */

type SvgProps = React.SVGProps<SVGSVGElement>;

const VERMILION = "#c0392b";
const ULTRAMARINE = "#27418c";
const OCHRE = "#e0a526";
const INK = "#1b1714";

/** Three Byrne primaries, cycled for proposition marks and shape accents. */
export const TRIAD = [
  { fill: VERMILION, shape: "triangle" as const },
  { fill: ULTRAMARINE, shape: "square" as const },
  { fill: OCHRE, shape: "circle" as const },
];

/**
 * Brand mark: a small Euclidean figure — a triangle inscribed against a circle
 * with the right-angle tick — built from the three primaries.
 */
export function ByrneLogo({ size = 32, ...props }: SvgProps & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <circle cx="20" cy="20" r="16.5" stroke={INK} strokeWidth="1.5" />
      <polygon points="20,5 34,28 6,28" fill={VERMILION} />
      <polygon points="20,5 34,28 6,28" fill={ULTRAMARINE} fillOpacity="0.0" />
      <circle cx="20" cy="20" r="3.4" fill={OCHRE} stroke={INK} strokeWidth="1.2" />
    </svg>
  );
}

/**
 * A number set inside one of the three Byrne shapes, cycled by `index`.
 * Used as the proposition / lesson marker.
 */
export function PropMark({
  n,
  index,
  size = 44,
  muted = false,
}: {
  n: number | string;
  index: number;
  size?: number;
  muted?: boolean;
}) {
  const t = TRIAD[index % TRIAD.length];
  const fill = muted ? INK : t.fill;
  const s = size;
  return (
    <span
      className="relative inline-grid shrink-0 place-items-center"
      style={{ width: s, height: s }}
    >
      <svg
        width={s}
        height={s}
        viewBox="0 0 44 44"
        fill="none"
        aria-hidden="true"
        style={{ opacity: muted ? 0.4 : 1 }}
      >
        {t.shape === "triangle" && (
          <polygon points="22,3 41,38 3,38" fill={fill} />
        )}
        {t.shape === "square" && (
          <rect x="5" y="5" width="34" height="34" rx="2" fill={fill} />
        )}
        {t.shape === "circle" && <circle cx="22" cy="22" r="19" fill={fill} />}
      </svg>
      <span
        className="absolute font-mono font-semibold text-paper"
        style={{
          fontSize: s * 0.34,
          // Nudge down inside the triangle so the numeral sits at the optical center.
          transform: t.shape === "triangle" ? "translateY(20%)" : undefined,
        }}
      >
        {n}
      </span>
    </span>
  );
}

/** Small solid Byrne shape, e.g. for stat plates and achievements. */
export function ByrneShape({
  index,
  size = 18,
  muted = false,
}: {
  index: number;
  size?: number;
  muted?: boolean;
}) {
  const t = TRIAD[index % TRIAD.length];
  const fill = muted ? INK : t.fill;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ opacity: muted ? 0.35 : 1 }}
    >
      {t.shape === "triangle" && <polygon points="12,2 22,21 2,21" fill={fill} />}
      {t.shape === "square" && <rect x="3" y="3" width="18" height="18" rx="1.5" fill={fill} />}
      {t.shape === "circle" && <circle cx="12" cy="12" r="10" fill={fill} />}
    </svg>
  );
}

export function IconCheck({ size = 16, color = "#3b6b4a", ...props }: SvgProps & { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M4 12.5 9.5 18 20 6" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconLock({ size = 16, color = INK, ...props }: SvgProps & { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="1.5" stroke={color} strokeWidth="1.8" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke={color} strokeWidth="1.8" />
    </svg>
  );
}

/** A compass-rose star for the XP tally. */
export function IconXP({ size = 16, color = OCHRE, ...props }: SvgProps & { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M12 2 14 10 22 12 14 14 12 22 10 14 2 12 10 10Z" fill={color} stroke={INK} strokeWidth="0.8" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Lesson-complete figure: a compass scribing an arc over a baseline — the
 * gesture of a finished construction, ending in a QED tombstone.
 */
export function CompletionFigure({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <line x1="14" y1="96" x2="106" y2="96" stroke={INK} strokeWidth="2" />
      <path d="M20 96 A40 40 0 0 1 100 96" stroke={ULTRAMARINE} strokeWidth="2" strokeDasharray="3 5" />
      <line x1="60" y1="22" x2="20" y2="96" stroke={INK} strokeWidth="1.5" />
      <line x1="60" y1="22" x2="100" y2="96" stroke={INK} strokeWidth="1.5" />
      <polygon points="60,22 100,96 20,96" fill={VERMILION} fillOpacity="0.12" />
      <circle cx="60" cy="22" r="3.4" fill={OCHRE} stroke={INK} strokeWidth="1.2" />
      <circle cx="20" cy="96" r="3" fill={VERMILION} stroke={INK} strokeWidth="1.2" />
      <circle cx="100" cy="96" r="3" fill={ULTRAMARINE} stroke={INK} strokeWidth="1.2" />
      <rect x="98" y="86" width="8" height="8" fill={INK} />
    </svg>
  );
}

/**
 * Progress rendered as a point traveling a construction segment, with end
 * ticks. `pct` is 0-100.
 */
export function ConstructionProgress({
  pct,
  color = ULTRAMARINE,
  className = "",
}: {
  pct: number;
  color?: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div
      className={`relative h-4 ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {/* baseline */}
      <span className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-rule" />
      {/* traced portion */}
      <span
        className="absolute left-0 top-1/2 h-[2px] -translate-y-1/2 transition-all duration-500"
        style={{ width: `${clamped}%`, backgroundColor: color }}
      />
      {/* end ticks */}
      <span className="absolute left-0 top-1/2 h-2.5 w-px -translate-y-1/2 bg-ink-faint" />
      <span className="absolute right-0 top-1/2 h-2.5 w-px -translate-y-1/2 bg-ink-faint" />
      {/* traveling construction point */}
      <span
        className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-paper transition-all duration-500"
        style={{ left: `${clamped}%`, borderColor: color }}
      />
    </div>
  );
}
