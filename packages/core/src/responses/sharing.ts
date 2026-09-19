import { z } from "zod";
import { MemberRole } from "../types";
import { Timestamp } from "./common";

export const JoinLinkOut = z
  .object({
    link: z
      .object({ url: z.string(), createdAt: Timestamp })
      .nullable()
      .meta({ description: "The deck's join link, or null while sharing is off" }),
    members: z.number().int().meta({ description: "People who joined and are still in the deck" }),
  })
  .meta({ id: "JoinLink" });
export type JoinLinkOut = z.infer<typeof JoinLinkOut>;

/**
 * One person studying someone else's deck. The owner is not a member row: they are the deck's
 * `owner`. Nothing here describes what a member has studied, which stays private to them.
 */
export const MemberOut = z
  .object({
    userId: z.string(),
    name: z.string(),
    role: MemberRole,
    joinedAt: Timestamp.meta({ description: "When they joined, or last rejoined" }),
  })
  .meta({ id: "Member" });
export type MemberOut = z.infer<typeof MemberOut>;

/** Somebody asked into the deck who has not joined. Owner only: it is an address they typed. */
export const InvitationOut = z
  .object({
    id: z.string(),
    email: z.string(),
    invitedAt: Timestamp.meta({ description: "When the invitation was sent" }),
  })
  .meta({ id: "Invitation" });
export type InvitationOut = z.infer<typeof InvitationOut>;

/** What a join page may show. Never cards, and nothing about the deck unless the link works. */
export const JoinPreviewOut = z
  .object({
    status: z.enum(["live", "off", "archived", "invalid"]),
    deck: z
      .object({
        name: z.string(),
        total: z.number().int(),
        owner: z.object({
          name: z.string(),
          /**
           * Where the publisher's photo is served, or null. A published deck only: publishing
           * is the deliberate act that makes it public, and a join link never carries one.
           */
          avatarUrl: z.string().nullable().default(null),
        }),
        language: z.string().nullable(),
        lastAddedAt: Timestamp.nullable(),
        samples: z.array(z.object({ term: z.string(), meaning: z.string().nullable() })).meta({
          description:
            "Up to ten cards drawn at random, shown on the page and never in its metadata",
        }),
      })
      .nullable()
      .meta({ description: "Present only while the link works" }),
    viewer: z
      .enum(["signed-out", "visitor", "member", "owner", "removed"])
      .meta({ description: "Who is looking: not signed in, not in the deck, in it, or removed" }),
    deckId: z
      .string()
      .nullable()
      .meta({ description: "Present only when the viewer can already open the deck" }),
    editions: z.array(z.string()).optional().meta({
      description:
        "Meaning languages a published deck can be added in, the original first. Absent on a join link.",
    }),
  })
  .meta({ id: "JoinPreview" });
export type JoinPreviewOut = z.infer<typeof JoinPreviewOut>;

export const JoinOut = z.object({ deckId: z.string(), role: MemberRole }).meta({ id: "Join" });
export type JoinOut = z.infer<typeof JoinOut>;
