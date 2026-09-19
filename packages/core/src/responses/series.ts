import { z } from "zod";
import { Timestamp } from "./common";

export const SeriesOut = z
  .object({
    id: z.string(),
    name: z.string(),
    position: z.number().int(),
    deckIds: z.array(z.string()).meta({ description: "Its active decks in order" }),
    total: z.number().int().meta({ description: "Active cards across its active decks" }),
    due: z
      .number()
      .int()
      .meta({ description: "Cards that can be reviewed today across its active decks" }),
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
  .meta({ id: "Series" });
export type SeriesOut = z.infer<typeof SeriesOut>;
