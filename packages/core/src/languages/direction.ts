export type TextDirection = "rtl" | "auto";

const RTL_SCRIPTS: ReadonlySet<string> = new Set(["arab", "hebr", "thaa", "syrc", "nkoo", "adlm"]);

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

export function textDirection(language: string | null | undefined): TextDirection {
  const [primary = "", ...rest] = (language ?? "").trim().toLowerCase().split(/[-_]/);
  const script = rest.find((part) => /^[a-z]{4}$/.test(part));
  if (script !== undefined) return RTL_SCRIPTS.has(script) ? "rtl" : "auto";
  return RTL_LANGUAGES.has(primary) ? "rtl" : "auto";
}
