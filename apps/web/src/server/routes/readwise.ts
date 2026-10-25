import { OkOut, ReadwisePatchInput, ReadwiseStateOut, ReadwiseTokenInput } from "@lymi/core";
import { Hono } from "hono";
import { body, ctxOf, describe } from "../http";
import type { AppEnv } from "../index";
import { readwiseDeps } from "../readwise/deps";
import {
  connectReadwise,
  disconnectReadwise,
  getReadwise,
  pullReadwiseNow,
  updateReadwise,
} from "../services/readwise";

/**
 * The learner's Readwise connection: Lymi holds their personal token and pulls new highlights
 * into cards every hour. Learner-only, like connected apps, since it holds another service's key.
 */
export const readwise = new Hono<AppEnv>();

const LEARNER_ONLY = "Session only. Any API key or token gets 403.";
const ok = { schema: ReadwiseStateOut, description: "The connection, or null" };

readwise.get(
  "/",
  describe({
    tags: ["Readwise"],
    summary: "Read the Readwise connection",
    learnerOnly: true,
    description: `${LEARNER_ONLY} Never returns the token itself.`,
    ok,
  }),
  async (c) => c.json({ connection: await getReadwise(ctxOf(c)) }),
);

readwise.post(
  "/",
  describe({
    tags: ["Readwise"],
    summary: "Connect Readwise, or replace its token",
    learnerOnly: true,
    description: `${LEARNER_ONLY} Checks the token with Readwise first. The first connection reads the learner's books and follows those in a language one of their decks teaches; a later one only replaces the token.`,
    ok,
    errors: [400, 503],
  }),
  body(ReadwiseTokenInput, "token"),
  async (c) => {
    const ctx = ctxOf(c);
    const connection = await connectReadwise(
      ctx,
      readwiseDeps(c.env, ctx.analytics),
      c.req.valid("json").token,
    );
    return c.json({ connection });
  },
);

readwise.patch(
  "/",
  describe({
    tags: ["Readwise"],
    summary: "Choose books and decks",
    learnerOnly: true,
    description: `${LEARNER_ONLY} Follows or unfollows books, sets a book's language when Lymi could not tell it, and picks the deck each language's highlights go to. A newly followed book's highlights since connecting are pulled at once.`,
    ok,
    errors: [400, 404],
  }),
  body(ReadwisePatchInput, "Readwise settings"),
  async (c) => {
    const ctx = ctxOf(c);
    const { view, followed } = await updateReadwise(ctx, c.req.valid("json"));
    if (!followed) return c.json({ connection: view });
    // The setting is saved; a Readwise outage leaves the book for the next pull.
    const connection = await pullReadwiseNow(ctx, readwiseDeps(c.env, ctx.analytics), {
      followed: true,
    }).catch(() => view);
    return c.json({ connection });
  },
);

readwise.post(
  "/pull",
  describe({
    tags: ["Readwise"],
    summary: "Pull new highlights now",
    learnerOnly: true,
    description: `${LEARNER_ONLY} Runs the hourly pull at once. A second call within 30 seconds returns the last result.`,
    ok,
    errors: [404, 503],
  }),
  async (c) => {
    const ctx = ctxOf(c);
    const connection = await pullReadwiseNow(ctx, readwiseDeps(c.env, ctx.analytics));
    return c.json({ connection });
  },
);

readwise.delete(
  "/",
  describe({
    tags: ["Readwise"],
    summary: "Disconnect Readwise",
    learnerOnly: true,
    description: `${LEARNER_ONLY} Lymi forgets the token and stops pulling. Cards already added stay.`,
    ok: { schema: OkOut, description: "Disconnected" },
  }),
  async (c) => {
    await disconnectReadwise(ctxOf(c));
    return c.json({ ok: true as const });
  },
);
