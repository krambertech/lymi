import {
  AddCardOutcomeOut,
  AddCardsOut,
  CardHistoryOut,
  CardHitOut,
  CardInput,
  CardOut,
  CardPatch,
  CardSearchQuery,
  CardsInput,
  OkOut,
} from "@lymi/core";
import { Hono } from "hono";
import { z } from "zod";
import { body, ctxOf, describe, query } from "../http";
import type { AppEnv } from "../index";
import {
  addCard,
  addCards,
  archiveCard,
  cardHistory,
  enrichmentQueue,
  requestEnrichment,
  restoreCard,
  searchCards,
  showCard,
  updateCard,
} from "../services";

export const cards = new Hono<AppEnv>();

const DUPLICATE_RULE =
  "A duplicate is a card whose normalised term and language match an active card anywhere in the learner's decks. " +
  "It is skipped, never rejected, and the response names the existing card. A card with no language only matches cards with no language. " +
  "Re-running the same call is safe.";

cards.get(
  "/",
  describe({
    tags: ["Cards"],
    summary: "Search cards",
    description:
      "Cards matching text in the term, meaning, example or notes, newest first, each with its deck's name. " +
      "Leave `query` out to list the newest cards. `archived=true` looks through archived cards instead.",
    ok: { schema: z.array(CardHitOut), description: "Matching cards" },
    errors: [400],
  }),
  query(CardSearchQuery, "search"),
  async (c) => {
    const rows = await searchCards(ctxOf(c), c.req.valid("query"));
    return c.json(rows.map((row) => ({ ...row.card, deckName: row.deckName })));
  },
);

cards.post(
  "/",
  describe({
    tags: ["Cards"],
    summary: "Add a card",
    description: `Needs the write scope. 201 when added, 200 when skipped as a duplicate. ${DUPLICATE_RULE}`,
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
    description: `Needs the write scope. Up to 200 cards, across any decks, in one call. Outcomes come back in the same order. ${DUPLICATE_RULE}`,
    ok: { schema: AddCardsOut, description: "One outcome per card sent" },
    errors: [400, 404],
  }),
  body(CardsInput, "cards"),
  async (c) =>
    c.json({
      results: await addCards(ctxOf(c), c.req.valid("json").cards, enrichmentQueue(c.env)),
    }),
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
      "Needs the write scope. Asks the AI to fill the card's empty fields, the same way an add does: " +
      "only meaning, example, pronunciation and language, only where they hold no text, and meanings in the learner's meaning language. " +
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
    description: "Needs the write scope. Hides the card without destroying it. Undo with restore.",
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
    description: "Needs the write scope. Brings an archived card back with its schedule intact.",
    ok: { schema: OkOut, description: "Restored" },
    errors: [404],
  }),
  async (c) => {
    await restoreCard(ctxOf(c), c.req.param("id"));
    return c.json({ ok: true as const });
  },
);
