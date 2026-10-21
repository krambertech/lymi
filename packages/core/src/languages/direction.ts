/**
 * Which way a language's text runs, from its tag alone. A literal list, because Firefox lacks
 * `Intl.Locale#getTextInfo` and Hermes cannot be relied on for it. docs/proposals/right-to-left.md.
 */

/** "rtl" for a right-to-left script; "auto" lets the text's first strong letter decide. */
export type TextDirection = "rtl" | "auto";

/** ISO 15924 scripts written right to left, in lower case. */
const RTL_SCRIPTS: ReadonlySet<string> = new Set(["arab", "hebr", "thaa", "syrc", "nkoo", "adlm"]);

/** Primary subtags whose default script runs right to left: Arabic and its dialects, Hebrew, Persian and others. */
const RTL_LANGUAGES: ReadonlySet<string> = new Set([
  "ar",
  "he",
  "iw",
  "fa",
  "ur",
  "ps",
  "sd",
  "ks",
  "ug",
  "ckb",
  "yi",
  "dv",
  "arz",
  "apc",
  "ajp",
  "acm",
  "afb",
  "ary",
  "aeb",
  "arq",
  "ayl",
  "apd",
]);

/** The direction a tag's text runs: its script subtag decides when it has one, so sd-Deva runs left to right. */
export function textDirection(language: string | null | undefined): TextDirection {
  const [primary = "", ...rest] = (language ?? "").trim().toLowerCase().split(/[-_]/);
  const script = rest.find((part) => /^[a-z]{4}$/.test(part));
  if (script !== undefined) return RTL_SCRIPTS.has(script) ? "rtl" : "auto";
  return RTL_LANGUAGES.has(primary) ? "rtl" : "auto";
}
