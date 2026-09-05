import { CardInput, CardPatch, CardsInput } from "@lymi/core";
import { Hono } from "hono";
import { ctxOf, parseBody } from "../http";
import type { AppEnv } from "../index";
import { addCard, addCards, archiveCard, getCard, restoreCard, updateCard } from "../services";

export const cards = new Hono<AppEnv>();

/** Add one card. 201 when added, 200 when it was a duplicate and got skipped. */
cards.post("/", async (c) => {
  const outcome = await addCard(ctxOf(c), await parseBody(c, CardInput, "card"));
  return c.json(outcome, outcome.status === "added" ? 201 : 200);
});
/** Add many. Always 200; each entry says whether it was added or skipped. */
cards.post("/batch", async (c) => {
  const { cards: inputs } = await parseBody(c, CardsInput, "cards");
  return c.json({ results: await addCards(ctxOf(c), inputs) });
});
cards.get("/:id", async (c) => c.json(await getCard(ctxOf(c), c.req.param("id"))));
cards.patch("/:id", async (c) =>
  c.json(await updateCard(ctxOf(c), c.req.param("id"), await parseBody(c, CardPatch, "patch"))),
);
cards.post("/:id/archive", async (c) => {
  await archiveCard(ctxOf(c), c.req.param("id"));
  return c.json({ ok: true });
});
cards.post("/:id/restore", async (c) => {
  await restoreCard(ctxOf(c), c.req.param("id"));
  return c.json({ ok: true });
});
