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
    correct: "border-correct bg-correct/8 text-ink",
    wrong: "border-vermilion bg-vermilion/8 text-ink",
    revealed: "border-ultramarine bg-ultramarine/8 text-ink",
  };
  const labelColor: Record<Variant, string> = {
    correct: "text-correct",
    wrong: "text-vermilion",
    revealed: "text-ultramarine",
  };
  const label: Record<Variant, string> = {
    correct: "Correct",
    wrong: "Not quite",
    revealed: "Answer revealed",
  };
  return (
    <div
      className={`animate-[fadein_180ms_ease-out] border-l-2 px-4 py-3 text-[0.95rem] leading-relaxed ${styles[variant]}`}
    >
      <div
        className={`mb-1 font-mono text-xs uppercase tracking-[0.16em] ${labelColor[variant]}`}
      >
        {label[variant]}
      </div>
      <MathText>{text}</MathText>
    </div>
  );
}
