/** The most of a learner's own text that a sentence quotes. */
export const QUOTE_MAX = 60;

/** Text to quote inside a sentence: whole when short, cut at a word with an ellipsis when not. */
export function shortQuote(text: string, max = QUOTE_MAX): string {
  const chars = Array.from(text.replace(/\s+/g, " ").trim());
  if (chars.length <= max) return chars.join("");
  const cut = chars.slice(0, max - 1).join("");
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}
