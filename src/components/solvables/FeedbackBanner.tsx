import { MathText } from "@/components/MathText";

type Variant = "correct" | "wrong" | "revealed";

export function FeedbackBanner({
  variant,
  text,
}: {
  variant: Variant;
  text: string;
}) {
  const styles: Record<Variant, string> = {
    correct: "border-correct/40 bg-correct/10 text-emerald-200",
    wrong: "border-wrong/40 bg-wrong/10 text-rose-200",
    revealed: "border-brand-400/40 bg-brand-500/10 text-brand-100",
  };
  const label: Record<Variant, string> = {
    correct: "Correct!",
    wrong: "Not quite",
    revealed: "Answer revealed",
  };
  return (
    <div
      className={`animate-[fadein_180ms_ease-out] rounded-xl border px-4 py-3 text-sm leading-relaxed ${styles[variant]}`}
    >
      <div className="mb-1 font-semibold">{label[variant]}</div>
      <MathText>{text}</MathText>
    </div>
  );
}
