import type { LanguageSupport, Script } from "./types";

const TRADITIONAL = new Set(["tw", "hk", "mo"]);

function chineseScript(subtags: readonly string[]): Script {
  if (subtags.includes("hant")) return "Hant";
  if (subtags.includes("hans")) return "Hans";
  return subtags.some((subtag) => TRADITIONAL.has(subtag)) ? "Hant" : "Hans";
}

export const chinese = {
  tag: "zh",
  scripts: ["Hans", "Hant"],
  script: chineseScript,
  extlangs: ["cmn"],
  engine: "pinyin",
  pronunciation: "reading",
  format: {
    name: "Chinese",
    pronunciation:
      "Pinyin in tone marks and citation tones, as dictionaries write them: 不是 bù shì and 一起 yīqǐ, never the spoken bú or yì. A neutral tone has no mark (péngyou, dōngxi), an erhua r joins the syllable before it (yīdiǎnr), and letters stay as written (kǎlā OK). Where a character has two readings, as 行 háng and xíng do, the meaning decides.",
    empty: null,
    never: "Not IPA or tone numbers.",
    sample: { term: "学习", pronunciation: "xuéxí" },
    duplicates: "term-and-reading",
  },
  speech: { saysReading: false, leadIn: false, locales: { Hant: "cmn-TW" } },
} as const satisfies LanguageSupport;
