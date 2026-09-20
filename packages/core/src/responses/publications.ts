import { z } from "zod";
import { EditionCardField, EditionStatus, PublicationCategory } from "../types";
import { Timestamp } from "./common";

export const PublicationOut = z
  .object({
    publication: z
      .object({
        slug: z.string(),
        status: z.enum(["published", "withdrawn"]),
        summary: z.string(),
        level: z.string().nullable(),
        category: PublicationCategory.nullable(),
        meaningLanguage: z.string().meta({
          description: "The original edition, which the deck's own fields are written in",
        }),
        editionFields: z
          .array(EditionCardField)
          .meta({ description: "Card fields every other edition must carry" }),
        publisher: z.string(),
        sources: z.array(z.object({ title: z.string(), url: z.string().optional() })),
        reviewedAt: Timestamp.nullable(),
        revision: z.number().int(),
        publishedAt: Timestamp,
        withdrawnAt: Timestamp.nullable(),
        addUrl: z.string().meta({ description: "Where anyone can add the deck" }),
      })
      .nullable()
      .meta({ description: "Null while the deck has never been published" }),
  })
  .meta({ id: "Publication" });
export type PublicationOut = z.infer<typeof PublicationOut>;

/** How complete one edition is, and what is holding it back. Owner only. */
export const EditionOut = z
  .object({
    language: z.string(),
    status: EditionStatus,
    revision: z.number().int(),
    publishedAt: Timestamp.nullable(),
    withdrawnAt: Timestamp.nullable(),
    total: z.number().int().meta({ description: "The deck, plus each active section and card" }),
    ready: z.number().int().meta({ description: "Signed off and written from the current text" }),
    stale: z.number().int().meta({ description: "Signed off before the text changed" }),
    missing: z.number().int().meta({ description: "Not signed off, or a required field is empty" }),
    blockers: z
      .array(z.string())
      .meta({ description: "Why it cannot be published, in plain words. Empty while it can." }),
  })
  .meta({ id: "Edition" });
export type EditionOut = z.infer<typeof EditionOut>;

export const EditionsOut = z
  .object({
    originalMeaningLanguage: z.string(),
    editionFields: z.array(EditionCardField),
    editions: z.array(EditionOut),
  })
  .meta({ id: "Editions" });
export type EditionsOut = z.infer<typeof EditionsOut>;
