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
    /** Always null since publishers delete in the app too; phone 0.0.3 still reads it. */
    blocked: z
      .enum(["publisher"])
      .nullable()
      .meta({
        ...OPEN,
        description:
          "Always null: every account can be deleted here. Kept for phone releases that show `publisher` as a reason to write to Lymi.",
      }),
    confirmWith: z.enum(["email", "apple"]).meta({
      ...OPEN,
      description:
        "How the phone confirms the delete. `apple`: the account signs in with Apple, so the phone uses Apple's sheet, whose code lets Lymi revoke its Apple grant. The emailed code works for every account, so the web always uses it; for an Apple account Lymi then revokes the token web sign-in stored, if there is one.",
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
          published: z
            .boolean()
            .meta({ description: "Live in Explore; its public page closes with the account" }),
        }),
      )
      .meta({
        description:
          "Owned decks other people study now, unarchived, which each of them keeps as a private copy without the owner's name. Archived decks go for everyone.",
      }),
  })
  .meta({ id: "AccountDeletion" });
export type AccountDeletionOut = z.infer<typeof AccountDeletionOut>;

/** Where the confirmation code went. */
export const DeletionCodeOut = z.object({ sentTo: z.string() }).meta({ id: "DeletionCode" });
export type DeletionCodeOut = z.infer<typeof DeletionCodeOut>;
