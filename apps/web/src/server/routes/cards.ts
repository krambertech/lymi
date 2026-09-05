import { CardInput, CardPatch } from "@lymi/core";
import { Hono } from "hono";
import { ctxOf, parseBody } from "../http";
import type { AppEnv } from "../index";
import { archiveCard, createCard, getCard, restoreCard, updateCard } from "../services";

export const cards = new Hono<AppEnv>();

cards.post("/", async (c) =>
  c.json(await createCard(ctxOf(c), await parseBody(c, CardInput, "card")), 201),
);
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
