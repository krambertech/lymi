import { z } from "zod";
import { ReviewMode } from "../types";

/** What a Flip link shows, to anyone holding it: one card and nothing else of the account. */
export const FlipOut = z.discriminatedUnion("status", [
  z.object({ status: z.literal("invalid") }),
  z.object({ status: z.literal("expired"), language: z.string() }),
  z.object({
    status: z.literal("ok"),
    language: z.string(),
    kind: z.string(),
    mode: ReviewMode,
    deckName: z.string().nullable(),
    card: z.object({
      id: z.string(),
      term: z.string(),
      meaning: z.string().nullable(),
      language: z.string().nullable(),
      pronunciation: z.string().nullable(),
      example: z.string().nullable(),
      exampleTranslation: z.string().nullable(),
    }),
    canGrade: z.boolean(),
    graded: z.boolean(),
  }),
]);
export type FlipOut = z.infer<typeof FlipOut>;
