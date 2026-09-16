import { FeedbackInput, OkOut } from "@lymi/core";
import { Hono } from "hono";
import { body, ctxOf, describe } from "../http";
import type { AppEnv } from "../index";
import { sendFeedback } from "../services";

export const feedback = new Hono<AppEnv>();

/** Enough of the header to recognise a browser; the rest is version noise. */
const BROWSER_MAX = 300;

feedback.post(
  "/",
  describe({
    hide: true,
    learnerOnly: true,
    ok: { schema: OkOut, description: "Feedback stored and sent" },
    errors: [400, 409, 503],
  }),
  body(FeedbackInput, "feedback"),
  async (c) => {
    const browser = (c.req.header("user-agent") ?? "").slice(0, BROWSER_MAX) || "unknown";
    await sendFeedback(ctxOf(c), c.env, { ...c.req.valid("json"), browser });
    return c.json({ ok: true });
  },
);
