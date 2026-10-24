import { z } from "zod";
import { Timestamp } from "./common";

export const ReadwiseOut = z
  .object({
    tokenHint: z.string().meta({ description: "The token's last four characters" }),
    status: z.enum(["active", "refused"]).meta({
      description: "refused once Readwise turns the token down; pulls stop until a new one is sent",
    }),
    lastPull: z
      .object({
        at: Timestamp,
        highlights: z.number().int(),
        cards: z.number().int(),
        skipped: z.number().int().meta({ description: "Passages with no term chosen yet" }),
      })
      .nullable(),
    languages: z.array(
      z.object({
        language: z
          .string()
          .meta({ description: "Primary subtag one of the learner's decks teaches" }),
        deckId: z.string().nullable().meta({ description: "Where that language's highlights go" }),
      }),
    ),
    books: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        author: z.string().nullable(),
        language: z.string().nullable(),
        followed: z.boolean(),
        highlights: z.number().int(),
      }),
    ),
  })
  .meta({ id: "Readwise" });

export const ReadwiseStateOut = z
  .object({ connection: ReadwiseOut.nullable() })
  .meta({ id: "ReadwiseState" });
