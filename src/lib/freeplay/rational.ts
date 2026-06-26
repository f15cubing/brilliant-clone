/** Minimal exact rational arithmetic (for angle-value coefficients). */
export interface Rat {
  /** numerator (carries the sign) */
  n: number;
  /** denominator (always > 0) */
  d: number;
}

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a || 1;
}

export function rat(n: number, d = 1): Rat {
  if (d === 0) throw new Error("rational with zero denominator");
  if (!Number.isInteger(n) || !Number.isInteger(d)) {
    throw new Error(`rational requires integers, got ${n}/${d}`);
  }
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}

export const rzero: Rat = { n: 0, d: 1 };

export const radd = (a: Rat, b: Rat): Rat => rat(a.n * b.d + b.n * a.d, a.d * b.d);
export const rsub = (a: Rat, b: Rat): Rat => rat(a.n * b.d - b.n * a.d, a.d * b.d);
export const rmul = (a: Rat, b: Rat): Rat => rat(a.n * b.n, a.d * b.d);
export const rdiv = (a: Rat, b: Rat): Rat => {
  if (b.n === 0) throw new Error("division by zero");
  return rat(a.n * b.d, a.d * b.n);
};
export const rneg = (a: Rat): Rat => ({ n: -a.n, d: a.d });
export const req = (a: Rat, b: Rat): boolean => a.n === b.n && a.d === b.d;
export const risZero = (a: Rat): boolean => a.n === 0;
export const rnum = (a: Rat): number => a.n / a.d;

export function rstr(a: Rat): string {
  return a.d === 1 ? `${a.n}` : `${a.n}/${a.d}`;
}
