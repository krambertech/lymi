import type { LanguageSupport, Script } from "./types";

/** The script subtag when there is one, else simplified for Guangdong, else traditional. */
function cantoneseScript(subtags: readonly string[]): Script {
  if (subtags.includes("hans")) return "Hans";
  if (subtags.includes("hant")) return "Hant";
  return subtags.includes("cn") ? "Hans" : "Hant";
}

/** Cantonese: Jyutping with tone numbers, one syllable over each character. Only yue and zh-yue tags. docs/proposals/cantonese.md. */
export const cantonese = {
  tag: "yue",
  scripts: ["Hant", "Hans"],
  script: cantoneseScript,
  engine: "jyutping",
  pronunciation: "reading",
  format: {
    name: "Cantonese",
    pronunciation:
      "Jyutping with a tone number from 1 to 6 after each syllable, as dictionaries write it: 你好 nei5 hou2, 唔該 m4 goi1. Write a changed tone as it is said (仔女 zai2 neoi2), letters as they are said or as written (T恤 ti1 seot1, 卡拉OK kaa1 laa1 OK), and where a character has two readings, as 行 hong4 and hang4 do, let the meaning decide.",
    empty: null,
    never: "Not Yale, pinyin or IPA, and never tone marks.",
    sample: { term: "學習", pronunciation: "hok6 zaap6" },
    duplicates: "term-and-reading",
  },
  // Voices read characters better than Jyutping text; every Cantonese tag, zh-yue too, speaks Hong Kong Cantonese.
  speech: { saysReading: false, leadIn: false, locales: { Hant: "yue-HK", Hans: "yue-HK" } },
} as const satisfies LanguageSupport;
