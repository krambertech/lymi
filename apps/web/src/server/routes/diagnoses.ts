import { FixInput, FixOut, OkOut } from "@lymi/core";
import { Hono } from "hono";
import { body, ctxOf, describe } from "../http";
import type { AppEnv } from "../index";
import {
  acceptFix,
  dismissDiagnosis,
  enrichmentQueue,
  markOffered,
  undoDismissal,
  undoFix,
} from "../services";

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
      "a confused pair adds two cards to the card's deck and section, two things on one card changes the card to the first and adds the second, more than one right answer changes the cue, and nothing to connect it to sets the card's hook. " +
      "A hook is a short phrase that leads back to the answer without giving any of it away; review shows it under the cue. A diagnosis with no clear reason accepts `no_anchor` with a hook you wrote. " +
      "Text sent as drafted keeps the AI as its source; text you changed is yours. A drafted card that duplicates one in your decks is skipped and listed in `skipped`. Only the card's owner can accept, and anyone else gets 403. Once the card no longer reads as it did when diagnosed, the answer is 409. Undo with `POST /api/diagnoses/{id}/undo`.",
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
      "Needs the write scope. Reverses an accepted fix: archives the cards it added and puts back the text it changed. Undoing a fix that is not in place changes nothing. When a field the fix changed, or a card it added, was edited since, nothing is undone and the answer is 409.",
    ok: { schema: OkOut, description: "Undone" },
    errors: [404, 409],
  }),
  async (c) => {
    await undoFix(ctxOf(c), c.req.param("id"));
    return c.json({ ok: true as const });
  },
);

diagnoses.post(
  "/:id/dismiss",
  describe({
    tags: ["Cards"],
    summary: "Dismiss a diagnosis",
    description:
      "Needs the write scope. Says the cause the diagnosis names is not why you keep forgetting the card. Its fix is not offered again, and the card is not diagnosed again, until an edit changes the card. A diagnosis with no clear reason has nothing to dismiss (400); one whose fix is on the card, or that is still being made, is a conflict (409). Dismissing twice changes nothing. Undo with `POST /api/diagnoses/{id}/dismiss/undo`.",
    ok: { schema: OkOut, description: "Dismissed" },
    errors: [400, 404, 409],
  }),
  async (c) => {
    await dismissDiagnosis(ctxOf(c), c.req.param("id"));
    return c.json({ ok: true as const });
  },
);

diagnoses.post(
  "/:id/dismiss/undo",
  describe({
    tags: ["Cards"],
    summary: "Undo a dismissal",
    description:
      "Needs the write scope. Takes back a dismissal, so the fix can be accepted again. Review does not offer it a second time. Undoing a diagnosis that is not dismissed changes nothing.",
    ok: { schema: OkOut, description: "Undone" },
    errors: [404],
  }),
  async (c) => {
    await undoDismissal(ctxOf(c), c.req.param("id"));
    return c.json({ ok: true as const });
  },
);
