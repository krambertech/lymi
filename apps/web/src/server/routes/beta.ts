import { BetaSignupInput, BetaSignupOut } from "@lymi/core";
import { Hono } from "hono";
import { body, describe } from "../http";
import type { AppEnv } from "../index";
import { joinBeta } from "../services/beta";

/**
 * The waiting list behind the landing page. Public on purpose: a stranger has no session
 * and no key, so this is mounted before authentication. It is also the only route that
 * writes without a learner, which is why it never touches audit.ts.
 */
export const beta = new Hono<AppEnv>();

beta.post(
  "/",
  describe({
    tags: ["Account"],
    summary: "Join the private beta",
    open: true,
    errors: [400, 503],
    description:
      "Adds an address to the waiting list. This is not a sign-up: it creates no account " +
      "and grants no access. An address already on the list is reported, never rejected.",
    ok: { schema: BetaSignupOut, description: "On the list" },
  }),
  body(BetaSignupInput, "signup"),
  async (c) => c.json(await joinBeta(c.get("db"), c.req.valid("json"))),
);
