import { DeckInput } from "@lymi/core";
import { Hono } from "hono";
import { ctxOf, parseBody } from "../http";
import type { AppEnv } from "../index";
import { createDeck, getDeck, listDeckCards, listDecks } from "../services";

export const decks = new Hono<AppEnv>();

decks.get("/", async (c) => c.json(await listDecks(ctxOf(c))));
decks.post("/", async (c) =>
  c.json(await createDeck(ctxOf(c), await parseBody(c, DeckInput, "deck")), 201),
);
decks.get("/:id", async (c) => c.json(await getDeck(ctxOf(c), c.req.param("id"))));
decks.get("/:id/cards", async (c) => c.json(await listDeckCards(ctxOf(c), c.req.param("id"))));
