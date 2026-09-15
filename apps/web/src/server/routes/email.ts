import { OkOut } from "@lymi/core";
import { Hono } from "hono";
import { z } from "zod";
import { operatorEmails } from "../env";
import { body, ctxOf, describe } from "../http";
import type { AppEnv } from "../index";
import { sendOperatorTestEmail } from "../services";

export const email = new Hono<AppEnv>();

const TestEmailBody = z.object({
  to: z.string().trim().toLowerCase().email().max(254),
  language: z.enum(["en", "uk", "ru"]),
});

/** Learner-only smoke test for checking the configured production sender and inbox delivery. */
email.post(
  "/test",
  describe({
    hide: true,
    learnerOnly: true,
    ok: { schema: OkOut, description: "Test email accepted" },
    errors: [400, 503],
  }),
  body(TestEmailBody, "test email"),
  async (c) => {
    const input = c.req.valid("json");
    await sendOperatorTestEmail(ctxOf(c), c.env, input, operatorEmails(c.env));
    return c.json({ ok: true });
  },
);
