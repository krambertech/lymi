import {
  CardWithStateOut,
  DeckInput,
  DeckOut,
  DeckSummaryOut,
  EditionApprovalInput,
  EditionImportInput,
  EditionOut,
  EditionsOut,
  InvitationOut,
  InviteInput,
  JoinLinkOut,
  LanguageTag,
  MemberOut,
  OkOut,
  PublicationInput,
  PublicationMediaOut,
  PublicationOut,
} from "@lymi/core";
import { Hono } from "hono";
import { z } from "zod";
import { publisherEmails } from "../env";
import { body, ctxOf, describe, query } from "../http";
import type { AppEnv } from "../index";
import { limitInvitationSends } from "../invitation-rate-limit";
import {
  approveEdition,
  approvePublicationMedia,
  archiveDeck,
  createDeck,
  getDeck,
  getJoinLink,
  getPublication,
  importEdition,
  inviteByEmail,
  leave,
  listDeckCards,
  listDecks,
  listEditions,
  listInvitations,
  listMembers,
  listPublicationMedia,
  publicationOut,
  publishDeck,
  publishEdition,
  removeMember,
  restoreDeck,
  revokePublicationMedia,
  turnOffJoinLink,
  turnOnJoinLink,
  updateDeck,
  withdrawDeck,
  withdrawEdition,
} from "../services";
import { ServiceError } from "../services/context";
import {
  accountEmailLanguage,
  addressEmailLanguage,
  sendTransactionalEmail,
} from "../services/email";
import { cancelInvitation } from "../services/invitations";

export const decks = new Hono<AppEnv>();

const ListQuery = z.object({
  archived: z
    .stringbool()
    .optional()
    .meta({ description: "Archived decks instead of active ones. Off by default." }),
});

decks.get(
  "/",
  describe({
    tags: ["Decks"],
    summary: "List decks",
    description:
      "Active decks in the learner's order, each with its total and due counts. " +
      "`archived=true` lists archived decks newest first instead, with no due count to act on.",
    ok: { schema: z.array(DeckSummaryOut), description: "Decks" },
    errors: [400],
  }),
  query(ListQuery, "query"),
  async (c) => c.json(await listDecks(ctxOf(c), c.req.valid("query"))),
);

decks.post(
  "/",
  describe({
    tags: ["Decks"],
    summary: "Create a deck",
    description: "Needs the write scope. `defaultLanguage` prefills the language on new cards.",
    ok: { status: 201, schema: DeckOut, description: "The new deck" },
    errors: [400],
  }),
  body(DeckInput, "deck"),
  async (c) => c.json(await createDeck(ctxOf(c), c.req.valid("json")), 201),
);

decks.get(
  "/:id",
  describe({
    tags: ["Decks"],
    summary: "Get a deck",
    ok: { schema: DeckOut, description: "The deck" },
    errors: [404],
  }),
  async (c) => c.json(await getDeck(ctxOf(c), c.req.param("id"))),
);

decks.patch(
  "/:id",
  describe({
    tags: ["Decks"],
    summary: "Update a deck",
    description: "Rename it, or change its language or review modes. Needs the write scope.",
    ok: { schema: DeckOut, description: "The updated deck" },
    errors: [400, 404],
  }),
  body(DeckInput.partial(), "deck"),
  async (c) => c.json(await updateDeck(ctxOf(c), c.req.param("id"), c.req.valid("json"))),
);

decks.post(
  "/:id/archive",
  describe({
    tags: ["Decks"],
    summary: "Archive a deck",
    description:
      "The deck leaves every list; its cards stay. Undo with restore. Needs the write scope.",
    ok: { schema: OkOut, description: "Archived" },
    errors: [404],
  }),
  async (c) => c.json(await archiveDeck(ctxOf(c), c.req.param("id"))),
);

decks.post(
  "/:id/restore",
  describe({
    tags: ["Decks"],
    summary: "Restore an archived deck",
    ok: { schema: OkOut, description: "Restored" },
    errors: [404],
  }),
  async (c) => c.json(await restoreDeck(ctxOf(c), c.req.param("id"))),
);

decks.post(
  "/:id/leave",
  describe({
    tags: ["Decks"],
    summary: "Leave a shared deck",
    learnerOnly: true,
    description:
      "The member's own way out, from the app: any API key or token gets 403. The deck leaves " +
      "Library; the cards stay with their owner and this learner's states and reviews are kept, " +
      "so joining again resumes. The owner's deck itself is archived, not left.",
    ok: { schema: OkOut, description: "Left" },
    errors: [404],
  }),
  async (c) => c.json(await leave(ctxOf(c), c.req.param("id"))),
);

const MEMBERS =
  "Owner only, from the app: any API key or token gets 403. A member sees the deck's owner " +
  "and never the other members. Nothing here says what anyone has studied.";

decks.get(
  "/:id/members",
  describe({
    tags: ["Decks"],
    summary: "List a deck's members",
    learnerOnly: true,
    description: `${MEMBERS} The owner is not in the list; the deck's \`owner\` names them.`,
    ok: { schema: z.array(MemberOut), description: "People studying the deck" },
    errors: [404],
  }),
  async (c) => c.json(await listMembers(ctxOf(c), c.req.param("id"))),
);

decks.delete(
  "/:id/members/:memberId",
  describe({
    tags: ["Decks"],
    summary: "Remove a member from a deck",
    learnerOnly: true,
    description:
      `${MEMBERS} Their states and reviews stay, but the join link never readmits them and ` +
      "there is no other way back yet.",
    ok: { schema: OkOut, description: "Removed" },
    errors: [404],
  }),
  async (c) => c.json(await removeMember(ctxOf(c), c.req.param("id"), c.req.param("memberId"))),
);

const INVITATIONS =
  "Owner only, from the app: any API key or token gets 403. An invitation is a join link " +
  "scoped to one address, so it admits that account and no other, once.";

decks.get(
  "/:id/invitations",
  describe({
    tags: ["Decks"],
    summary: "List a deck's open invitations",
    learnerOnly: true,
    description: `${INVITATIONS} Only invitations nobody has accepted or cancelled are listed.`,
    ok: { schema: z.array(InvitationOut), description: "People who have not joined yet" },
    errors: [404],
  }),
  async (c) => c.json(await listInvitations(ctxOf(c), c.req.param("id"))),
);

decks.post(
  "/:id/invitations",
  describe({
    tags: ["Decks"],
    summary: "Invite somebody to a deck",
    learnerOnly: true,
    description:
      `${INVITATIONS} Lymi sends them the message. Inviting somebody already studying the deck, ` +
      "or already invited, is a conflict rather than a second invitation.",
    ok: { status: 201, schema: InvitationOut, description: "The invitation" },
    errors: [400, 404, 409],
  }),
  limitInvitationSends,
  body(InviteInput, "invitation"),
  async (c) => {
    const ctx = ctxOf(c);
    const { email } = c.req.valid("json");
    const language =
      (await addressEmailLanguage(ctx.db, email)) ??
      (await accountEmailLanguage(ctx.db, ctx.userId, c.req.raw));
    const written = await inviteByEmail(ctx, c.req.param("id"), email, async (to, token, deck) => {
      await sendTransactionalEmail(ctx, c.env, {
        kind: "deck-invitation",
        to,
        language,
        url: new URL(`/join/${token}`, c.env.PRODUCT_URL).toString(),
        invitation: { deckName: deck.name, ownerName: deck.owner, cards: deck.cards },
      });
    });
    return c.json(written, 201);
  },
);

decks.delete(
  "/:id/invitations/:invitationId",
  describe({
    tags: ["Decks"],
    summary: "Cancel an invitation",
    learnerOnly: true,
    description: `${INVITATIONS} Its link stops working. An invitation already accepted is not found.`,
    ok: { schema: OkOut, description: "Cancelled" },
    errors: [404],
  }),
  async (c) =>
    c.json(await cancelInvitation(ctxOf(c), c.req.param("id"), c.req.param("invitationId"))),
);

const JOIN_LINK =
  "Owner only, from the app: any API key or token gets 403. Anyone with the link can join the deck.";

decks.get(
  "/:id/join-link",
  describe({
    tags: ["Decks"],
    summary: "Get a deck's join link",
    learnerOnly: true,
    description: JOIN_LINK,
    ok: { schema: JoinLinkOut, description: "The join link, or null while sharing is off" },
    errors: [404],
  }),
  async (c) => {
    const { link, members } = await getJoinLink(ctxOf(c), c.req.param("id"));
    return c.json({ link: link && joinLinkOut(c.env.PRODUCT_URL, link), members });
  },
);

decks.post(
  "/:id/join-link",
  describe({
    tags: ["Decks"],
    summary: "Turn on a deck's join link",
    learnerOnly: true,
    description: `${JOIN_LINK} Returns the link that is already on, if there is one.`,
    ok: { schema: JoinLinkOut, description: "The join link" },
    errors: [400, 404],
  }),
  async (c) => {
    await turnOnJoinLink(ctxOf(c), c.req.param("id"));
    const { link, members } = await getJoinLink(ctxOf(c), c.req.param("id"));
    return c.json({ link: link && joinLinkOut(c.env.PRODUCT_URL, link), members });
  },
);

decks.delete(
  "/:id/join-link",
  describe({
    tags: ["Decks"],
    summary: "Turn off a deck's join link",
    learnerOnly: true,
    description: `${JOIN_LINK} Members stay. The URL never works again; turning it on makes a new one.`,
    ok: { schema: OkOut, description: "Off" },
    errors: [404],
  }),
  async (c) => c.json(await turnOffJoinLink(ctxOf(c), c.req.param("id"))),
);

function joinLinkOut(productUrl: string, link: { token: string; createdAt: Date }) {
  return { url: new URL(`/join/${link.token}`, productUrl).toString(), createdAt: link.createdAt };
}

const PUBLICATION =
  "A published deck can be added by anyone from its public page. Only Lymi's publishers can publish, and only decks they own. Needs the write scope.";

decks.get(
  "/:id/publication",
  describe({
    tags: ["Decks"],
    summary: "Get a deck's publication",
    description: PUBLICATION,
    ok: { schema: PublicationOut, description: "The publication, or null" },
    errors: [404],
  }),
  async (c) =>
    c.json(publicationOut(c.env.PRODUCT_URL, await getPublication(ctxOf(c), c.req.param("id")))),
);

decks.put(
  "/:id/publication",
  describe({
    tags: ["Decks"],
    summary: "Publish a deck",
    description: `${PUBLICATION} Publishing again updates the public page and brings a withdrawn deck back.`,
    ok: { schema: PublicationOut, description: "The publication" },
    errors: [400, 404, 409],
  }),
  body(PublicationInput, "publication"),
  async (c) =>
    c.json(
      publicationOut(
        c.env.PRODUCT_URL,
        await publishDeck(ctxOf(c), c.req.param("id"), c.req.valid("json"), publisherEmails(c.env)),
      ),
    ),
);

decks.delete(
  "/:id/publication",
  describe({
    tags: ["Decks"],
    summary: "Withdraw a published deck",
    description: `${PUBLICATION} Members keep studying it; nobody new can add it.`,
    ok: { schema: PublicationOut, description: "The withdrawn publication" },
    errors: [404],
  }),
  async (c) =>
    c.json(publicationOut(c.env.PRODUCT_URL, await withdrawDeck(ctxOf(c), c.req.param("id")))),
);

const PUBLIC_MEDIA =
  "Only a signed-in Lymi publisher who owns this published deck may approve its current picture or stored pronunciation for public use. The approval applies to this exact asset; replacing it needs a new approval.";

const publicMediaKind = (value: string | undefined) => {
  if (value === "image" || value === "audio") return value;
  throw new ServiceError("invalid", "Choose image or audio");
};

decks.get(
  "/:id/public-media",
  describe({
    tags: ["Decks"],
    summary: "List approved public media",
    description: PUBLIC_MEDIA,
    learnerOnly: true,
    ok: { schema: z.array(PublicationMediaOut), description: "Current approvals" },
    errors: [404],
  }),
  async (c) =>
    c.json(await listPublicationMedia(ctxOf(c), c.req.param("id"), publisherEmails(c.env))),
);

decks.put(
  "/:id/cards/:cardId/public-media/:kind",
  describe({
    tags: ["Decks"],
    summary: "Approve public picture or pronunciation",
    description: `${PUBLIC_MEDIA} Play generated pronunciation once before approving it.`,
    learnerOnly: true,
    ok: { schema: PublicationMediaOut, description: "The approved asset" },
    errors: [400, 404, 409],
  }),
  async (c) =>
    c.json(
      await approvePublicationMedia(
        ctxOf(c),
        c.req.param("id"),
        c.req.param("cardId"),
        publicMediaKind(c.req.param("kind")),
        publisherEmails(c.env),
        { images: c.env.PRIVATE_IMAGES, audio: c.env.AUDIO },
      ),
    ),
);

decks.delete(
  "/:id/cards/:cardId/public-media/:kind",
  describe({
    tags: ["Decks"],
    summary: "Revoke public picture or pronunciation",
    description: PUBLIC_MEDIA,
    learnerOnly: true,
    ok: { schema: OkOut, description: "The approval was removed" },
    errors: [400, 404],
  }),
  async (c) =>
    c.json(
      await revokePublicationMedia(
        ctxOf(c),
        c.req.param("id"),
        c.req.param("cardId"),
        publicMediaKind(c.req.param("kind")),
        publisherEmails(c.env),
      ),
    ),
);

const EDITION =
  "A meaning-language edition of a published deck. The deck's own fields are the original edition; another edition is typed localizations of them, signed off before anyone reads it. Only Lymi's publishers, and only decks they own, from the app or with their own write-scoped key. ADR 0015.";

/** The language in the path, checked the same way a body field would be. */
function editionLanguage(value: string | undefined) {
  const parsed = LanguageTag.safeParse(value);
  if (!parsed.success) throw new ServiceError("invalid", "Invalid language", parsed.error);
  return parsed.data;
}

decks.get(
  "/:id/editions",
  describe({
    tags: ["Decks"],
    summary: "List a deck's editions",
    description: `${EDITION} Each says how much of it is signed off, how much has gone stale, and what is holding it back.`,
    ok: { schema: EditionsOut, description: "Every edition of the deck" },
    errors: [400, 404],
  }),
  async (c) => c.json(await listEditions(ctxOf(c), c.req.param("id"))),
);

decks.put(
  "/:id/editions/:language",
  describe({
    tags: ["Decks"],
    summary: "Write an edition's text",
    description: `${EDITION} Every row lands as a draft against the text it was written from, so text sent over a signed-off row is signed off again.`,
    ok: { schema: EditionOut, description: "Where the edition stands now" },
    errors: [400, 404],
  }),
  body(EditionImportInput, "edition"),
  async (c) =>
    c.json(
      await importEdition(
        ctxOf(c),
        c.req.param("id"),
        editionLanguage(c.req.param("language")),
        c.req.valid("json"),
        publisherEmails(c.env),
      ),
    ),
);

decks.post(
  "/:id/editions/:language/approval",
  describe({
    tags: ["Decks"],
    summary: "Sign off an edition's text",
    description: `${EDITION} It is signed off against the text as it stands now; an empty body signs off the whole edition. An MCP client cannot, and neither can a read-only key.`,
    ok: { schema: EditionOut, description: "Where the edition stands now" },
    errors: [400, 404],
  }),
  body(EditionApprovalInput, "approval"),
  async (c) =>
    c.json(
      await approveEdition(
        ctxOf(c),
        c.req.param("id"),
        editionLanguage(c.req.param("language")),
        c.req.valid("json"),
        publisherEmails(c.env),
      ),
    ),
);

decks.put(
  "/:id/editions/:language/publication",
  describe({
    tags: ["Decks"],
    summary: "Publish an edition",
    description: `${EDITION} An edition missing text, or written from text that has since changed, is refused with what is holding it back.`,
    ok: { schema: EditionOut, description: "The published edition" },
    errors: [400, 404],
  }),
  async (c) =>
    c.json(
      await publishEdition(
        ctxOf(c),
        c.req.param("id"),
        editionLanguage(c.req.param("language")),
        publisherEmails(c.env),
      ),
    ),
);

decks.delete(
  "/:id/editions/:language/publication",
  describe({
    tags: ["Decks"],
    summary: "Withdraw an edition",
    description: `${EDITION} Nobody new can add it; the learners who pinned it keep reading it.`,
    ok: { schema: EditionOut, description: "The withdrawn edition" },
    errors: [400, 404],
  }),
  async (c) =>
    c.json(
      await withdrawEdition(
        ctxOf(c),
        c.req.param("id"),
        editionLanguage(c.req.param("language")),
        publisherEmails(c.env),
      ),
    ),
);

decks.get(
  "/:id/cards",
  describe({
    tags: ["Decks"],
    summary: "List a deck's cards",
    description:
      "Active cards, newest first, each with the caller's scheduling state for the mode the card leads with: its picture mode when that is asked, otherwise recognition before production.",
    ok: { schema: z.array(CardWithStateOut), description: "Cards" },
  }),
  async (c) => c.json(await listDeckCards(ctxOf(c), c.req.param("id"))),
);
