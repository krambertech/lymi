import { FixInput, FixOut, OkOut } from "@lymi/core";
import { Hono } from "hono";
import { body, ctxOf, describe } from "../http";
import type { AppEnv } from "../index";
import { acceptFix, enrichmentQueue, markOffered, undoFix } from "../services";

export const diagnoses = new Hono<AppEnv>();

diagnoses.post(
  "/:id/offered",
  describe({
    tags: ["Review"],
    summary: "Mark a fix offered",
    description:
      "Review showed the diagnosis's fix after a reveal. It is not offered in review again for this revision of the card. Marking it twice changes nothing.",
    ok: { schema: OkOut, description: "Marked" },
    errors: [404],
    learnerOnly: true,
  }),
  async (c) => {
    await markOffered(ctxOf(c), c.req.param("id"));
    return c.json({ ok: true as const });
  },
);

diagnoses.post(
  "/:id/accept",
  describe({
    tags: ["Cards"],
    summary: "Accept a fix",
    description:
      "Needs the write scope. Applies the fix the diagnosis drafted, as sent, to the card it is about, through the ordinary card writes: " +
      "a confused pair adds two cards to the card's deck and section, two things on one card changes the card to the first and adds the second, and more than one right answer changes the cue. " +
      "Text sent as drafted keeps the AI as its source; text you changed is yours. A drafted card that duplicates one in your decks is skipped and listed in `skipped`. Only the card's owner can accept, and only while the card still reads as it did when diagnosed; otherwise 409. Undo with `POST /api/diagnoses/{id}/undo`.",
    ok: { schema: FixOut, description: "What the fix wrote" },
    errors: [400, 404, 409],
  }),
  body(FixInput, "fix"),
  async (c) =>
    c.json(
      await acceptFix(ctxOf(c), c.req.param("id"), c.req.valid("json"), enrichmentQueue(c.env)),
    ),
);

diagnoses.post(
  "/:id/undo",
  describe({
    tags: ["Cards"],
    summary: "Undo a fix",
    description:
      "Needs the write scope. Reverses an accepted fix: archives the cards it added and puts back the text it changed. Undoing a fix that is not in place changes nothing.",
    ok: { schema: OkOut, description: "Undone" },
    errors: [404],
  }),
  async (c) => {
    await undoFix(ctxOf(c), c.req.param("id"));
    return c.json({ ok: true as const });
  },
);
