import type { DetailedHTMLProps, HTMLAttributes } from "react";
import type { MathfieldElement } from "mathlive";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "math-field": DetailedHTMLProps<
        HTMLAttributes<MathfieldElement>,
        MathfieldElement
      >;
    }
  }
}

export {};
