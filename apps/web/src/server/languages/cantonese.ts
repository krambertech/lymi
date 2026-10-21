import { missingReadings, stripReadings } from "@lymi/core";
import { jyutpingKey, stripJyutping } from "@lymi/core/jyutping";
import type { LanguagePrompts } from "./types";

/**
 * Standard Written Chinese where written Cantonese has its own word: 他 for 佢, 這 for 呢, 沒有 for
 * 冇, 什麼 for 乜嘢, 吃 for 食, and 們 for 哋. 其他 is Cantonese too.
 */
const STANDARD_WRITTEN = /(?<!其)他|她|們|这|這|沒有|没有|什麼|什么|吃/u;

/** Whether a sentence reads as written Cantonese rather than Standard Written Chinese. */
export function colloquial(text: string): boolean {
  return !STANDARD_WRITTEN.test(stripReadings(text, "yue"));
}

/** Cantonese: Jyutping with tone numbers, examples in written Cantonese with Jyutping after each word. docs/proposals/cantonese.md. */
export const cantonese = {
  tag: "yue",
  enrich: {
    guide: {
      notes:
        "Noun: its usual classifier (*一本書*: 本 for books; *一隻狗*: 隻 for most animals). A word that Standard Written Chinese writes differently: give that form (*佢*, written *他*).",
    },
    example: `Cantonese deck, no samples, meaningLanguage en. Card "行", meaning "to walk", mayFill: example, notes, pronunciation.
{"meaning": null, "example": "我哋[ngo5 dei6]行路[hang4 lou6]返[faan1]屋企[uk1 kei2]。", "notes": null, "pronunciation": "hang4", "language": null}
Why: the meaning says 行 is read hang4 here, not hong4 as in 銀行. Every example is written as Hong Kong people say it, with 佢, 哋, 咗, 嘅 and 唔 rather than 他, 們, 了, 的 and 不, and carries Jyutping with tone numbers after each word. A card with addReadings gets its own example back that way, with nothing else changed.`,
  },
  lesson:
    "Jyutping over, under or beside the characters, with tone numbers, sometimes raised (hok6 zaap6, hok⁶zaap⁶)",
  hook: "Many words join characters whose own meanings build the word's: 電腦 is electric + brain, 雪櫃 is snow + cupboard, a fridge. Try that route first. A sound-alike follows the Jyutping syllable by syllable, tone numbers included. Never write characters or Jyutping in the hook.",
  checks: [
    {
      field: "pronunciation",
      rule: "Jyutping with a tone on every syllable",
      pass: (text, card) => jyutpingKey(card.term, text) !== null,
    },
    {
      field: "example",
      rule: "every bracket is toned Jyutping",
      pass: (text) => !stripJyutping(text).includes("["),
    },
    {
      field: "example",
      rule: "Jyutping over characters",
      pass: (text) => !missingReadings(text, "yue"),
    },
    {
      field: "example",
      rule: "text unchanged under Jyutping",
      pass: (text, card) => !card.example || stripReadings(text, "yue") === card.example,
    },
    {
      field: "example",
      rule: "written Cantonese",
      // A learner's own example keeps its wording, whichever written form it uses.
      pass: (text, card) => !!card.example || colloquial(text),
    },
  ],
} as const satisfies LanguagePrompts;
