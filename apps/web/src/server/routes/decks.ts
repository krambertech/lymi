import {
  CardWithStateOut,
  DeckInput,
  DeckOut,
  DeckSummaryOut,
  EditionApprovalInput,
  EditionImportInput,
  EditionOut,
  EditionsOut,
  JoinLinkOut,
  LanguageTag,
  OkOut,
  PublicationInput,
  PublicationOut,
} from "@lymi/core";
import { Hono } from "hono";
import { z } from "zod";
import { publisherEmails } from "../env";
import { body, ctxOf, describe, query } from "../http";
import type { AppEnv } from "../index";
import {
  approveEdition,
  archiveDeck,
  createDeck,
  getDeck,
  getJoinLink,
  getPublication,
  importEdition,
  listDeckCards,
  listDecks,
  listEditions,
  publicationOut,
  publishDeck,
  publishEdition,
  restoreDeck,
  turnOffJoinLink,
  turnOnJoinLink,
  updateDeck,
  withdrawDeck,
  withdrawEdition,
} from "../services";
import { ServiceError } from "../services/context";

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

const EDITION =
  "A meaning-language edition of a published deck. The deck's own fields are the original edition; another edition is typed localizations of them, signed off by a person before anyone reads it. Only Lymi's publishers, and only decks they own. ADR 0015.";

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
    description: `${EDITION} A person signs it off against the text as it stands now; an empty body signs off the whole edition. An API key or an MCP client cannot.`,
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
