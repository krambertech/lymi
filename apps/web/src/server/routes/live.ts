import { LiveTab } from "@lymi/core";
import { Hono } from "hono";
import { describe } from "../http";
import type { AppEnv } from "../index";
import { connect } from "../live/announce";
import { requireLearner } from "../principal";

/** The learner's open tabs hear here that something changed elsewhere. ADR 0023. */
export const live = new Hono<AppEnv>();

live.get("/", describe({ hide: true, learnerOnly: true }), requireLearner, (c) => {
  if (c.req.header("upgrade")?.toLowerCase() !== "websocket") {
    return c.json({ error: "Open this as a WebSocket" }, 426);
  }
  // A handshake carries the session cookie from any same-site page, so only the product may open one.
  if (c.req.header("origin") !== new URL(c.env.PRODUCT_URL).origin) {
    return c.json({ error: "Not allowed from this origin" }, 403);
  }
  const tab = c.req.query("tab");
  if (tab !== undefined && !LiveTab.safeParse(tab).success) {
    return c.json({ error: "Invalid tab" }, 400);
  }
  if (!c.env.LIVE) return c.json({ error: "Live updates are not available" }, 503);
  return connect(c.env, c.get("user").id, c.req.raw);
});
