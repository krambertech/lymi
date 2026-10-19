import { z } from "zod";
import { OPEN } from "./common";

export const LanguageOut = z
  .object({
    tag: z.string().meta({
      description:
        "The primary BCP 47 subtag, such as `ja`, or a language and region written apart, such as `pt-BR`",
    }),
    name: z.string().meta({ description: "The language's English name" }),
    scripts: z.array(z.string()).meta({
      description:
        "ISO 15924 codes of the scripts its terms are written in, such as `Jpan`; for Chinese a tag's script subtag or region picks `Hans` or `Hant`",
    }),
    pronunciation: z
      .object({
        label: z.enum(["reading", "stress", "pronunciation"]).meta({
          ...OPEN,
          description:
            "What the app calls the field: `reading` for a script that does not show its sound, `stress` where it holds the term with its stress marked",
        }),
        format: z.string().meta({ description: "What the field holds" }),
        sample: z.object({ term: z.string(), pronunciation: z.string() }),
      })
      .meta({ description: "How the card's `pronunciation` is written" }),
    example: z
      .object({
        format: z.string().meta({ description: "How a reading is written inside the sentence" }),
        pattern: z.string().meta({
          description:
            "A regular expression, used with the `u` flag, that matches one inline reading, with the reading in group 1",
        }),
        sample: z.string(),
      })
      .nullable()
      .meta({
        description:
          "The notation an `example` carries its readings in, or null when the example is a plain sentence",
      }),
    duplicates: z.enum(["term", "term-and-reading"]).meta({
      ...OPEN,
      description:
        "What makes a second card a duplicate: the term alone, or the term unless both cards have readings and they differ",
    }),
  })
  .meta({ id: "Language" });
export type LanguageOut = z.infer<typeof LanguageOut>;

export const LanguagesOut = z
  .object({
    languages: z.array(LanguageOut).meta({
      description:
        "Every language Lymi writes in its own format. A card in any other language holds IPA or a plain respelling, and its example is a plain sentence.",
    }),
  })
  .meta({ id: "Languages" });
export type LanguagesOut = z.infer<typeof LanguagesOut>;
