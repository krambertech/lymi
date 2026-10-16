import { DeckTagRef, DeckTagRename, DeckTagsOut, TagOut } from "@lymi/core";
import { Hono } from "hono";
import { z } from "zod";
import { body, ctxOf, describe } from "../http";
import type { AppEnv } from "../index";
import { archiveDeckTag, listDeckTags, listTags, renameDeckTag, restoreDeckTag } from "../services";

export const tags = new Hono<AppEnv>();

tags.get(
  "/",
  describe({
    tags: ["Tags"],
    summary: "List tags",
    description:
      "Every tag on an active card in a deck you study, your own and joined ones alike, most used first. The same name is one tag across decks. A deck you read in another edition shows no tags until editions name them.",
    ok: { schema: z.array(TagOut), description: "Tags" },
    errors: [],
  }),
  async (c) => c.json(await listTags(ctxOf(c))),
);

/** A deck's tags, managed from its settings: `/api/decks/:id/tags`. */
export const deckTags = new Hono<AppEnv>();

deckTags.get(
  "/:id/tags",
  describe({
    tags: ["Tags"],
    summary: "List a deck's tags",
    description:
      "Owner only. The tags on the deck's active cards with how many carry each, most used first, and the tags archived from this deck with the cards Restore puts them back on.",
    ok: { schema: DeckTagsOut, description: "The deck's tags" },
    errors: [404],
  }),
  async (c) => c.json(await listDeckTags(ctxOf(c), c.req.param("id"))),
);

deckTags.post(
  "/:id/tags/rename",
  describe({
    tags: ["Tags"],
    summary: "Rename or merge a deck's tag",
    description:
      "Owner only; needs the write scope. Renames the tag on this deck's cards only; other decks keep it. A name you already use, in any case, merges the two, and a card that had both keeps one. A change of case alone respells the tag in every deck, since one name is one tag.",
    ok: { schema: DeckTagsOut, description: "The deck's tags after the rename" },
    errors: [400, 404],
  }),
  body(DeckTagRename, "rename"),
  async (c) => c.json(await renameDeckTag(ctxOf(c), c.req.param("id"), c.req.valid("json"))),
);

deckTags.post(
  "/:id/tags/archive",
  describe({
    tags: ["Tags"],
    summary: "Archive a deck's tag",
    description:
      "Owner only; needs the write scope. Takes the tag off every card of this deck and lists it as archived; other decks keep it. Restore puts it back on the same cards in the same place.",
    ok: { schema: DeckTagsOut, description: "The deck's tags after archiving" },
    errors: [400, 404],
  }),
  body(DeckTagRef, "tag"),
  async (c) => c.json(await archiveDeckTag(ctxOf(c), c.req.param("id"), c.req.valid("json"))),
);

deckTags.post(
  "/:id/tags/restore",
  describe({
    tags: ["Tags"],
    summary: "Restore a deck's archived tag",
    description:
      "Owner only; needs the write scope. Puts an archived tag back on the cards of this deck it came off, where it was. A card that has gained twenty tags since stays without it.",
    ok: { schema: DeckTagsOut, description: "The deck's tags after restoring" },
    errors: [400, 404],
  }),
  body(DeckTagRef, "tag"),
  async (c) => c.json(await restoreDeckTag(ctxOf(c), c.req.param("id"), c.req.valid("json"))),
);
