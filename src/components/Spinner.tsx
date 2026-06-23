export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-ink-400">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-600 border-t-brand-400" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}
