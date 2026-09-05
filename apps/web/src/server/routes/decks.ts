import { CardWithStateOut, DeckInput, DeckOut, DeckSummaryOut } from "@lymi/core";
import { Hono } from "hono";
import { z } from "zod";
import { body, ctxOf, describe } from "../http";
import type { AppEnv } from "../index";
import { createDeck, getDeck, listDeckCards, listDecks } from "../services";

export const decks = new Hono<AppEnv>();

decks.get(
  "/",
  describe({
    tags: ["Decks"],
    summary: "List decks",
    description: "Active decks in the learner's order, each with its total and due counts.",
    ok: { schema: z.array(DeckSummaryOut), description: "Decks" },
  }),
  async (c) => c.json(await listDecks(ctxOf(c))),
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

decks.get(
  "/:id/cards",
  describe({
    tags: ["Decks"],
    summary: "List a deck's cards",
    description:
      "Active cards, newest first, each with its recognition-direction scheduling state.",
    ok: { schema: z.array(CardWithStateOut), description: "Cards" },
  }),
  async (c) => c.json(await listDeckCards(ctxOf(c), c.req.param("id"))),
);
