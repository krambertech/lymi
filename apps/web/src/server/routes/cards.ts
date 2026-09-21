import {
  AddCardOutcomeOut,
  AddCardsOut,
  ArchiveCardsOut,
  CardArchiveInput,
  CardEditsInput,
  CardHistoryOut,
  CardInput,
  CardOut,
  CardPatch,
  CardSearchOut,
  CardSearchQuery,
  CardsInput,
  EditCardsOut,
  OkOut,
  ResponseShapeQuery,
  TerseCardsOut,
} from "@lymi/core";
import { Hono } from "hono";
import { body, ctxOf, describe, query } from "../http";
import type { AppEnv } from "../index";
import {
  addCard,
  addCards,
  archiveCard,
  archiveCards,
  cardHistory,
  enrichmentQueue,
  requestEnrichment,
  restoreCard,
  restoreCards,
  searchCards,
  showCard,
  terseOutcome,
  updateCard,
  updateCards,
} from "../services";

export const cards = new Hono<AppEnv>();

const TERSE =
  "`response=terse` returns only each card's id and status, an add's `enrichmentStatus`, and an error's code and message.";

const PARTIAL =
  "Each card succeeds or fails on its own. One that is missing, not yours or refused comes back as an error with the code a single write would answer; " +
  "one whose save failed comes back as `unavailable` with nothing on it changed, and can be sent again. " +
  "Every card that changes gets its own entry in Activity.";

const DUPLICATE_RULE =
  "A duplicate is a card whose normalised term and language match an active card anywhere in the learner's decks. " +
  "It is skipped, never rejected, and the response names the existing card. A card with no language only matches cards with no language. " +
  "Re-running the same call is safe.";

const ENRICH_RULE =
  "With an API key, fields left out stay empty unless the card sets `enrich: true`; the learner's own adds in the app enrich by default. A field sent as an empty string is never filled.";

cards.get(
  "/",
  describe({
    tags: ["Cards"],
    summary: "Search cards",
    description:
      "Cards matching text in the term, meaning, example or notes, newest first, each with its deck's name. " +
      "Leave `query` out to list the newest cards. `term` matches one term exactly, ignoring case. `archived=true` looks through archived cards instead. " +
      "Results come a page at a time: pass `next` as `after` until `next` is null. A text search can return a short page before the end.",
    ok: { schema: CardSearchOut, description: "One page of matching cards" },
    errors: [400],
  }),
  query(CardSearchQuery, "search"),
  async (c) => {
    const page = await searchCards(ctxOf(c), c.req.valid("query"));
    return c.json({
      cards: page.cards.map((row) => ({ ...row.card, deckName: row.deckName })),
      next: page.next,
      total: page.total,
    });
  },
);

cards.post(
  "/",
  describe({
    tags: ["Cards"],
    summary: "Add a card",
    description: `Needs the write scope. 201 when added, 200 when skipped as a duplicate. ${DUPLICATE_RULE} ${ENRICH_RULE}`,
    ok: [
      { status: 201, schema: AddCardOutcomeOut, description: "Added" },
      {
        status: 200,
        schema: AddCardOutcomeOut,
        description: "Skipped: a duplicate already exists",
      },
    ],
    errors: [400, 404],
  }),
  body(CardInput, "card"),
  async (c) => {
    const outcome = await addCard(ctxOf(c), c.req.valid("json"), enrichmentQueue(c.env));
    return c.json(outcome, outcome.status === "added" ? 201 : 200);
  },
);

cards.post(
  "/batch",
  describe({
    tags: ["Cards"],
    summary: "Add many cards",
    description: `Needs the write scope. Up to 200 cards, across any decks, in one call. Outcomes come back in the same order. ${DUPLICATE_RULE} ${ENRICH_RULE} ${TERSE}`,
    ok: { schema: z.union([AddCardsOut, TerseCardsOut]), description: "One outcome per card sent" },
    errors: [400, 404],
  }),
  query(ResponseShapeQuery, "query"),
  body(CardsInput, "cards"),
  async (c) => {
    const outcomes = await addCards(ctxOf(c), c.req.valid("json").cards, enrichmentQueue(c.env));
    const terse = c.req.valid("query").response === "terse";
    return c.json({ results: terse ? outcomes.map(terseOutcome) : outcomes });
  },
);

cards.patch(
  "/batch",
  describe({
    tags: ["Cards"],
    summary: "Edit many cards",
    description: `Needs the write scope. Up to 200 cards, each with its \`cardId\` and only the fields to change. Outcomes come back in the same order. ${PARTIAL} ${TERSE}`,
    ok: {
      schema: z.union([EditCardsOut, TerseCardsOut]),
      description: "One outcome per card sent",
    },
    errors: [400],
  }),
  query(ResponseShapeQuery, "query"),
  body(CardEditsInput, "edits"),
  async (c) => {
    const outcomes = await updateCards(ctxOf(c), c.req.valid("json").cards);
    const terse = c.req.valid("query").response === "terse";
    return c.json({ results: terse ? outcomes.map(terseOutcome) : outcomes });
  },
);

cards.post(
  "/archive",
  describe({
    tags: ["Cards"],
    summary: "Archive many cards",
    description: `Needs the write scope. Up to 200 card ids. Hides each card without destroying it. A card already archived is left as it is and still reported as archived. Outcomes come back in the same order. ${PARTIAL}`,
    ok: { schema: ArchiveCardsOut, description: "One outcome per card sent" },
    errors: [400],
  }),
  body(CardArchiveInput, "archive"),
  async (c) => c.json({ results: await archiveCards(ctxOf(c), c.req.valid("json").cardIds) }),
);

cards.post(
  "/restore",
  describe({
    tags: ["Cards"],
    summary: "Restore many cards",
    description: `Needs the write scope. Up to 200 card ids. Brings each archived card back with its schedule intact. A card that is already active is left as it is and still reported as restored. Outcomes come back in the same order. ${PARTIAL}`,
    ok: { schema: ArchiveCardsOut, description: "One outcome per card sent" },
    errors: [400],
  }),
  body(CardArchiveInput, "restore"),
  async (c) => c.json({ results: await restoreCards(ctxOf(c), c.req.valid("json").cardIds) }),
);

cards.get(
  "/:id",
  describe({
    tags: ["Cards"],
    summary: "Get a card",
    ok: { schema: CardOut, description: "The card" },
    errors: [404],
  }),
  async (c) => c.json(await showCard(ctxOf(c), c.req.param("id"))),
);

cards.get(
  "/:id/history",
  describe({
    tags: ["Cards"],
    summary: "A card's history",
    description:
      "Every review of the card and every write to it, newest first. Writes come from the audit log, so what an integration or the AI changed is visible here.",
    ok: { schema: CardHistoryOut, description: "Reviews and writes" },
    errors: [404],
  }),
  async (c) => c.json(await cardHistory(ctxOf(c), c.req.param("id"))),
);

cards.patch(
  "/:id",
  describe({
    tags: ["Cards"],
    summary: "Edit a card",
    description:
      "Needs the write scope. Send only the fields to change. Setting `deckId` moves the card.",
    ok: { schema: CardOut, description: "The card after the edit" },
    errors: [400, 404],
  }),
  body(CardPatch, "patch"),
  async (c) => c.json(await updateCard(ctxOf(c), c.req.param("id"), c.req.valid("json"))),
);

cards.post(
  "/:id/enrich",
  describe({
    tags: ["Cards"],
    summary: "Enrich a card",
    description:
      "Needs the write scope. Asks the AI to fill the card's empty fields: " +
      "only meaning, example, pronunciation and language, only where they hold no text, including fields cleared on purpose, and meanings in the learner's meaning language. " +
      'The card comes back at `enrichmentStatus: "working"`; poll it to watch the text land. ' +
      "Only the card's owner may ask, and a card with nothing left to fill is refused with 400.",
    ok: { schema: CardOut, description: "The card, now working" },
    errors: [400, 404, 503],
  }),
  async (c) => c.json(await requestEnrichment(ctxOf(c), c.req.param("id"), enrichmentQueue(c.env))),
);

cards.post(
  "/:id/archive",
  describe({
    tags: ["Cards"],
    summary: "Archive a card",
    description:
      "Needs the write scope. Hides the card without destroying it. Undo with restore. Archiving an archived card changes nothing.",
    ok: { schema: OkOut, description: "Archived" },
    errors: [404],
  }),
  async (c) => {
    await archiveCard(ctxOf(c), c.req.param("id"));
    return c.json({ ok: true as const });
  },
);

cards.post(
  "/:id/restore",
  describe({
    tags: ["Cards"],
    summary: "Restore a card",
    description:
      "Needs the write scope. Brings an archived card back with its schedule intact. Restoring an active card changes nothing.",
    ok: { schema: OkOut, description: "Restored" },
    errors: [404],
  }),
  async (c) => {
    await restoreCard(ctxOf(c), c.req.param("id"));
    return c.json({ ok: true as const });
  },
);
