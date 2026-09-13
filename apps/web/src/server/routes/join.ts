import { JoinOut, JoinPreviewOut, OkOut } from "@lymi/core";
import { Hono } from "hono";
import { ctxOf, describe } from "../http";
import type { AppEnv } from "../index";
import { joinCookie } from "../join-cookie";
import { canonicalOrigins } from "../origin-routing";
import { joinLinkAdmits, joinThroughLink, previewJoin, ServiceError } from "../services";

/** The join page's calls. Mounted above `authenticate`: a classmate arrives signed out. */
export const joinOpen = new Hono<AppEnv>();

joinOpen.get(
  "/:token",
  describe({
    hide: true,
    open: true,
    summary: "Preview a join link",
    ok: { schema: JoinPreviewOut, description: "What the join page may show" },
  }),
  async (c) => {
    const session = await c.get("auth").api.getSession({ headers: c.req.raw.headers });
    const preview = await previewJoin(c.get("db"), c.req.param("token"), session?.user.id ?? null);
    c.header("cache-control", "no-store");
    return c.json(preview);
  },
);

joinOpen.post(
  "/:token/sign-in",
  describe({
    hide: true,
    open: true,
    summary: "Carry a join link through sign-in",
    ok: { schema: OkOut, description: "The link is held for the next sign-in on this browser" },
    errors: [404],
  }),
  async (c) => {
    // Only the join page may set this, or another site could make a later sign-in join a deck.
    if (c.req.header("origin") !== canonicalOrigins(c.env).product) {
      throw new ServiceError("forbidden", "Open the join link on Lymi");
    }
    const token = c.req.param("token");
    if (!(await joinLinkAdmits(c.get("db"), token))) {
      throw new ServiceError("not_found", "This join link does not work");
    }
    c.header("set-cookie", joinCookie(c.env.PRODUCT_URL, token));
    c.header("cache-control", "no-store");
    return c.json({ ok: true as const });
  },
);

/** Joining needs the learner's own session: a key or token never joins a deck. */
export const join = new Hono<AppEnv>();

join.post(
  "/:token",
  describe({
    hide: true,
    learnerOnly: true,
    summary: "Join a deck through its join link",
    ok: { schema: JoinOut, description: "The deck, now in Library" },
    errors: [404],
  }),
  async (c) => c.json(await joinThroughLink(ctxOf(c), c.req.param("token"))),
);
