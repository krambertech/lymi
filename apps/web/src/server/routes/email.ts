import { OkOut } from "@lymi/core";
import { Hono } from "hono";
import { z } from "zod";
import { allowedEmails } from "../env";
import { body, describe } from "../http";
import type { AppEnv } from "../index";
import { ServiceError, sendTransactionalEmail } from "../services";

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
    if (!allowedEmails(c.env).has(c.get("user").email.toLowerCase())) {
      throw new ServiceError("forbidden", "Only a Lymi operator can send a test email.");
    }
    const input = c.req.valid("json");
    await sendTransactionalEmail(c.env, {
      kind: "test",
      to: input.to,
      language: input.language,
    });
    return c.json({ ok: true });
  },
);
