import { z } from "zod";
import { OPEN } from "./common";

export const MeOut = z
  .object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
  })
  .meta({ id: "Me" });

/** The learner's photo, for the app only. `version` is null when the initial shows instead. */
export const AvatarOut = z
  .object({
    source: z.enum(["custom", "google"]).nullable(),
    version: z.string().nullable(),
    revision: z.number().int(),
    /** A Google photo is stored, so removing the learner's own photo brings it back. */
    hasGoogle: z.boolean(),
  })
  .meta({ id: "Avatar" });
export type AvatarOut = z.infer<typeof AvatarOut>;

/** What deleting the account takes, read before the learner asks for a code. */
export const AccountDeletionOut = z
  .object({
    /** An account that owns a published deck cannot be deleted from the app. */
    blocked: z
      .enum(["publisher"])
      .nullable()
      .meta({
        ...OPEN,
        description:
          "Why the account cannot be deleted here, or null. `publisher`: it owns a published deck.",
      }),
    confirmWith: z.enum(["email", "apple"]).meta({
      ...OPEN,
      description:
        "How the delete is confirmed: a code sent to the account's email, or Sign in with Apple on the phone.",
    }),
    decks: z.number().int().meta({ description: "Decks the learner owns, archived ones included" }),
    cards: z.number().int().meta({ description: "Cards in those decks, archived ones included" }),
    reviews: z.number().int().meta({ description: "Reviews the learner has made in any deck" }),
    sharedDecks: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          members: z.number().int().meta({ description: "People studying it besides the owner" }),
        }),
      )
      .meta({ description: "Owned decks other people study now, which stay for them" }),
  })
  .meta({ id: "AccountDeletion" });
export type AccountDeletionOut = z.infer<typeof AccountDeletionOut>;

/** Where the confirmation code went. */
export const DeletionCodeOut = z.object({ sentTo: z.string() }).meta({ id: "DeletionCode" });
export type DeletionCodeOut = z.infer<typeof DeletionCodeOut>;
