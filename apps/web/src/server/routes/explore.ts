import { ExploreDeckOut, ExploreOut, isPublicDeckSlug } from "@lymi/core/catalog";
import { Hono } from "hono";
import { ctxOf, describe } from "../http";
import type { AppEnv } from "../index";
import { exploreCatalog, exploreDeck, ServiceError } from "../services";

/** Explore is the learner's own browsing, so a key or a token never reads it. */
export const explore = new Hono<AppEnv>();

explore.get(
  "/",
  describe({
    hide: true,
    learnerOnly: true,
    summary: "Every published deck, for Explore",
    ok: { schema: ExploreOut, description: "The catalogue, and the decks already in Library" },
  }),
  async (c) => c.json(await exploreCatalog(ctxOf(c))),
);

explore.get(
  "/:slug",
  describe({
    hide: true,
    learnerOnly: true,
    summary: "One published deck, in the app",
    ok: { schema: ExploreDeckOut, description: "What the public page shows, plus its deck id" },
    errors: [404],
  }),
  async (c) => {
    const slug = c.req.param("slug");
    if (!isPublicDeckSlug(slug)) throw new ServiceError("not_found", "This deck is not published");
    return c.json(await exploreDeck(ctxOf(c), slug));
  },
);
