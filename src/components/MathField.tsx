import { useEffect, useRef } from "react";
import "mathlive";
import type { MathfieldElement } from "mathlive";

interface MathFieldProps {
  value: string;
  onChange: (latex: string) => void;
  onEnter?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

/** Thin React wrapper around the MathLive `<math-field>` web component. */
export function MathField({
  value,
  onChange,
  onEnter,
  disabled,
  placeholder,
}: MathFieldProps) {
  const ref = useRef<MathfieldElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.mathVirtualKeyboardPolicy = "auto";
    if (placeholder) el.setAttribute("placeholder", placeholder);

    const onInput = () => onChange(el.value);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onEnter?.();
      }
    };
    el.addEventListener("input", onInput);
    el.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("input", onInput);
      el.removeEventListener("keydown", onKey);
    };
  }, [onChange, onEnter, placeholder]);

  useEffect(() => {
    const el = ref.current;
    if (el && el.value !== value) el.value = value;
  }, [value]);

  useEffect(() => {
    const el = ref.current;
    if (el) el.readOnly = Boolean(disabled);
  }, [disabled]);

  return (
    <math-field
      ref={ref}
      className="w-full rounded-lg border border-ink-600 bg-ink-900 text-ink-50"
      style={{ minHeight: "3rem" }}
    />
  );
}
