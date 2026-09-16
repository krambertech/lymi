import { AddQuery, JoinOut, JoinPreviewOut, OkOut } from "@lymi/core";
import { Hono } from "hono";
import { ctxOf, describe, query } from "../http";
import type { AppEnv } from "../index";
import { addCookie } from "../join-cookie";
import { canonicalOrigins } from "../origin-routing";
import { addPublishedDeck, previewPublication, publicationAdmits, ServiceError } from "../services";

/** The add page's calls. Mounted above `authenticate`: a visitor arrives from the public site. */
export const addOpen = new Hono<AppEnv>();

addOpen.get(
  "/:slug",
  describe({
    hide: true,
    open: true,
    summary: "Preview a published deck",
    ok: { schema: JoinPreviewOut, description: "What the add page may show" },
  }),
  async (c) => {
    const session = await c.get("auth").api.getSession({ headers: c.req.raw.headers });
    const preview = await previewPublication(
      c.get("db"),
      c.req.param("slug"),
      session?.user.id ?? null,
    );
    c.header("cache-control", "no-store");
    return c.json(preview);
  },
);

addOpen.post(
  "/:slug/sign-in",
  describe({
    hide: true,
    open: true,
    summary: "Carry a published deck through sign-in",
    ok: { schema: OkOut, description: "The deck is held for the next sign-in on this browser" },
    errors: [400, 404],
  }),
  query(AddQuery, "edition"),
  async (c) => {
    // Only the add page may set this, or another site could make a later sign-in add a deck.
    if (c.req.header("origin") !== canonicalOrigins(c.env).product) {
      throw new ServiceError("forbidden", "Open the deck on Lymi");
    }
    const slug = c.req.param("slug");
    if (!(await publicationAdmits(c.get("db"), slug))) {
      throw new ServiceError("not_found", "This deck is not published");
    }
    c.header(
      "set-cookie",
      addCookie(c.env.PRODUCT_URL, slug, c.req.valid("query").meaningLanguage),
    );
    c.header("cache-control", "no-store");
    return c.json({ ok: true as const });
  },
);

/** Adding needs the learner's own session: a key or token never adds a deck. */
export const add = new Hono<AppEnv>();

add.post(
  "/:slug",
  describe({
    hide: true,
    learnerOnly: true,
    summary: "Add a published deck to Library",
    ok: { schema: JoinOut, description: "The deck, now in Library" },
    errors: [400, 404],
  }),
  query(AddQuery, "edition"),
  async (c) =>
    c.json(
      await addPublishedDeck(ctxOf(c), c.req.param("slug"), c.req.valid("query").meaningLanguage),
    ),
);
