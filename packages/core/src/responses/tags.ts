import { z } from "zod";

export const TagOut = z
  .object({
    name: z.string().meta({
      description: "Your spelling when one of your cards carries it, else the deck owner's",
    }),
    cards: z
      .number()
      .int()
      .meta({ description: "Active cards carrying it across every deck you study" }),
    own: z.boolean().meta({ description: "Whether one of your own cards carries it" }),
  })
  .meta({ id: "Tag" });
export type TagOut = z.infer<typeof TagOut>;
