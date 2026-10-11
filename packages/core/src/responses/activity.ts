import { z } from "zod";
import { ExportOut } from "../export";
import { ImportOut } from "../import";
import { Actor } from "../types";
import { Timestamp } from "./common";

/**
 * What one Activity row says happened. Card and deck kinds are a write by an app, a key or the
 * AI; the member and link kinds are the people of a shared deck; `import` is a file brought in.
 */
export const ActivityKind = z.enum([
  "cards_added",
  "cards_enriched",
  "cards_edited",
  "cards_archived",
  "cards_restored",
  "deck_added",
  "deck_edited",
  "deck_archived",
  "deck_restored",
  "series_added",
  "series_edited",
  "series_deleted",
  "series_restored",
  "section_added",
  "section_edited",
  "section_archived",
  "section_restored",
  "import",
  "export",
  "member_joined",
  "member_left",
  "member_removed",
  "invitation_sent",
  "invitation_cancelled",
  "link_on",
  "link_off",
]);
export type ActivityKind = z.infer<typeof ActivityKind>;

/** A card an Activity row wrote, as its row shows it. */
export const ActivityCardOut = z
  .object({
    id: z.string(),
    term: z.string(),
    meaning: z.string().nullable(),
    archived: z.boolean(),
    deckId: z
      .string()
      .meta({ description: "Where the card is now, which may not be where it landed" }),
    deckArchived: z.boolean().meta({ description: "An archived deck has no screen to open" }),
  })
  .meta({ id: "ActivityCard" });
export type ActivityCardOut = z.infer<typeof ActivityCardOut>;

/** One row of Activity: writes of the same kind, by the same caller, in one deck on one day. */
export const ActivityEntryOut = z
  .object({
    id: z.string().meta({ description: "The newest audit row in the group" }),
    group: z.string().meta({
      description: "Day, caller, kind and deck. Two pages meeting on the same group are one row.",
    }),
    kind: ActivityKind,
    actor: Actor,
    app: z
      .string()
      .nullable()
      .meta({ description: "The connected app or API key that wrote, when it has a name" }),
    at: Timestamp.meta({ description: "The newest write in the group" }),
    day: z.string().meta({
      description: "The learner-local YYYY-MM-DD the group belongs to, which its heading names",
    }),
    count: z.number().int().meta({ description: "How many writes the group holds" }),
    deck: z
      .object({
        id: z.string(),
        name: z.string(),
        archived: z.boolean().meta({ description: "An archived deck has no screen to open" }),
      })
      .nullable(),
    person: z.string().nullable().meta({
      description: "Who or what the row names: the member, the series or the section",
    }),
    cards: z.array(ActivityCardOut).meta({ description: "Up to a page of the cards written" }),
    import: ImportOut.nullable(),
    export: ExportOut.nullable(),
  })
  .meta({ id: "ActivityEntry" });
export type ActivityEntryOut = z.infer<typeof ActivityEntryOut>;

/** A page of Activity, newest first. */
export const ActivityPageOut = z
  .object({
    entries: z.array(ActivityEntryOut),
    today: z.string().meta({
      description: "The learner-local YYYY-MM-DD now, so a heading can say Today without a clock",
    }),
    zone: z.string().meta({
      description:
        "The learner's review timezone, so a row's time is read on the day it is filed under",
    }),
    nextCursor: z
      .string()
      .nullable()
      .meta({ description: "Pass as `cursor` for the next page. Null at the end." }),
  })
  .meta({ id: "ActivityPage" });
export type ActivityPageOut = z.infer<typeof ActivityPageOut>;
