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

const DeckTagOut = z
  .object({
    name: z.string(),
    cards: z.number().int().meta({ description: "Active cards of the deck it is on" }),
  })
  .meta({ id: "DeckTag" });

export const DeckTagsOut = z
  .object({
    tags: z.array(DeckTagOut).meta({ description: "Tags on the deck's cards, most used first" }),
    archived: z.array(DeckTagOut).meta({
      description: "Tags archived from this deck, with the cards Restore puts them back on",
    }),
  })
  .meta({ id: "DeckTags" });
export type DeckTagsOut = z.infer<typeof DeckTagsOut>;
