const DAY_MINUTES = 1440;

const number = (n: number, digits = 0) =>
  n.toLocaleString("en", { maximumFractionDigits: digits, minimumFractionDigits: 0 });

/**
 * An interval the way a person says it: minutes inside a step, days for the first two months,
 * months for the first two years, then years. Precise enough to compare rows, not to plan by,
 * since every real interval carries fuzz.
 */
export function duration(minutes: number): string {
  if (minutes < 60) return `${number(minutes)} min`;
  if (minutes < DAY_MINUTES) return `${number(minutes / 60)} h`;
  const days = minutes / DAY_MINUTES;
  if (days < 60) return days === 1 ? "1 day" : `${number(days)} days`;
  if (days < 730) return `${number(days / 30.44)} months`;
  return `${number(days / 365.25, 1)} years`;
}

export const days = (n: number) => duration(n * DAY_MINUTES);

export const percent = (fraction: number, digits = 0) => `${number(fraction * 100, digits)}%`;

export const count = (n: number) => number(n);

/** How much bigger `a` is than `b`, as a whole percentage. */
export const moreThan = (a: number, b: number) => percent(a / b - 1);

export const GRADE_NAMES = { 1: "Forgot", 2: "Hard", 3: "Good", 4: "Easy" } as const;

export const ordinal = (n: number) => {
  const words = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh"];
  return words[n - 1] ?? `${n}th`;
};

export const ordinalShort = (n: number) => {
  const tens = n % 100;
  const suffix =
    tens >= 11 && tens <= 13
      ? "th"
      : (({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th");
  return `${n}${suffix}`;
};
