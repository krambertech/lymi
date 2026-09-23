import { z } from "zod";
import { Timestamp } from "./common";

export const SectionStatusOut = z.enum(["open", "ready", "locked"]).meta({
  description:
    "For the caller. open: its cards are reviewed. ready: the next section, which Start opens. locked: waits, though a card the caller already started stays in review.",
});

export const SectionOut = z
  .object({
    id: z.string(),
    deckId: z.string(),
    name: z.string(),
    position: z.number().int(),
    total: z.number().int().meta({ description: "Active cards in the section" }),
    known: z.number().int().meta({ description: "Cards the caller knows" }),
    notStarted: z.number().int().meta({ description: "Cards the caller has not reviewed yet" }),
    due: z.number().int().meta({
      description: "Cards the caller can review today, counted as the deck's `due` counts them",
    }),
    knownNeeded: z.number().int().meta({
      description: "Known cards this section needs before the next one is ready: 80%, rounded up",
    }),
    status: SectionStatusOut,
    archivedCards: z.number().int().meta({
      description: "Cards archived with the section, which Restore brings back. 0 while active.",
    }),
    archivedAt: Timestamp.nullable(),
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
  .meta({ id: "Section" });
export type SectionOut = z.infer<typeof SectionOut>;

export const SectionsOut = z
  .object({
    sections: z.array(SectionOut),
    progress: z
      .object({
        currentId: z.string().nullable().meta({ description: "The section the caller is on" }),
        nextId: z
          .string()
          .nullable()
          .meta({ description: "The section after the open ones. Null when all are open." }),
        ready: z.boolean().meta({ description: "The next section can be started now" }),
      })
      .nullable()
      .meta({ description: "Null when the deck has no sections with cards or does not gate" }),
  })
  .meta({ id: "Sections" });
export type SectionsOut = z.infer<typeof SectionsOut>;
