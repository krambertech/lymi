/** A number's words in parts; `ending` marks -teist, -kümmend, sada and tuhat, which a lesson lights. */
export type NumberPart = { text: string; ending?: true };

const ONES = ["null", "üks", "kaks", "kolm", "neli", "viis", "kuus", "seitse", "kaheksa", "üheksa"];

export const DIGIT_WORDS: readonly string[] = [...ONES, "kümme"];

export function numberParts(n: number): NumberPart[] {
  if (!Number.isInteger(n) || n < 0 || n > 999_999) throw new RangeError(`No words for ${n}`);
  if (n <= 10) return [{ text: DIGIT_WORDS[n] as string }];
  if (n < 20) return [{ text: ONES[n - 10] as string }, { text: "teist", ending: true }];
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    return [
      { text: ONES[tens] as string },
      { text: "kümmend", ending: true },
      ...(ones ? [{ text: ` ${ONES[ones]}` }] : []),
    ];
  }
  if (n < 1000) {
    const hundreds = Math.floor(n / 100);
    const rest = n % 100;
    // A hundred is "sada", never "üks sada"; hundreds join into one word.
    return [
      ...(hundreds === 1 ? [] : [{ text: ONES[hundreds] as string }]),
      { text: "sada", ending: true },
      ...(rest ? [{ text: " " }, ...numberParts(rest)] : []),
    ];
  }
  const thousands = Math.floor(n / 1000);
  const rest = n % 1000;
  // Thousands stand apart: "kaks tuhat".
  return [
    ...(thousands === 1 ? [] : [...numberParts(thousands), { text: " " }]),
    { text: "tuhat", ending: true },
    ...(rest ? [{ text: " " }, ...numberParts(rest)] : []),
  ];
}

export function numberWords(n: number): string {
  return numberParts(n)
    .map((part) => part.text)
    .join("");
}
