import {
  CardSectionInput,
  OkOut,
  SectionArchiveInput,
  SectionInput,
  SectionOrderInput,
  SectionOut,
  SectionPatch,
  SectionsOut,
} from "@lymi/core";
import { Hono } from "hono";
import { z } from "zod";
import { body, ctxOf, describe, query } from "../http";
import type { AppEnv } from "../index";
import {
  archiveSection,
  createSection,
  listSections,
  renameSection,
  reorderSections,
  restoreSection,
  setCardsSection,
  startSection,
} from "../services";

/** Routes under a deck: `/api/decks/:id/sections` and moving its cards between them. */
export const deckSections = new Hono<AppEnv>();

const ListQuery = z.object({
  archived: z
    .stringbool()
    .optional()
    .meta({ description: "Archived sections instead of active ones. Off by default." }),
});

deckSections.get(
  "/:id/sections",
  describe({
    tags: ["Sections"],
    summary: "List a deck's sections",
    description:
      "The deck's sections in order, each with the caller's standing in it, and where the caller is. Members see the same sections with their own standing. While the deck opens sections in order, a `ready` or `locked` section's cards wait, except any the caller already started.",
    ok: { schema: SectionsOut, description: "Sections and progress" },
    errors: [400, 404],
  }),
  query(ListQuery, "query"),
  async (c) =>
    c.json(await listSections(ctxOf(c), c.req.param("id"), c.req.valid("query"))),
);

deckSections.post(
  "/:id/sections",
  describe({
    tags: ["Sections"],
    summary: "Create a section",
    description:
      "Owner only; needs the write scope. It goes last. `cardIds` moves cards of the deck into it, out of any section they were in.",
    ok: { status: 201, schema: SectionOut, description: "The new section" },
    errors: [400, 404],
  }),
  body(SectionInput, "section"),
  async (c) =>
    c.json(await createSection(ctxOf(c), c.req.param("id"), c.req.valid("json")), 201),
);

deckSections.put(
  "/:id/sections/order",
  describe({
    tags: ["Sections"],
    summary: "Reorder a deck's sections",
    description:
      "Owner only; needs the write scope. Send every active section once, in the new order. A list that no longer matches is 409. Sending the same order again changes nothing. Reordering never locks a section a learner opened.",
    ok: { schema: SectionsOut, description: "Sections in their new order" },
    errors: [400, 404, 409],
  }),
  body(SectionOrderInput, "order"),
  async (c) =>
    c.json(await reorderSections(ctxOf(c), c.req.param("id"), c.req.valid("json"))),
);

deckSections.put(
  "/:id/cards/section",
  describe({
    tags: ["Sections"],
    summary: "Move cards to a section",
    description:
      "Owner only; needs the write scope. Puts up to 500 cards of the deck in one section, or takes them out of theirs with `sectionId: null`. Schedules and history stay. Sending the same move again changes nothing.",
    ok: { schema: SectionsOut, description: "The deck's sections after the move" },
    errors: [400, 404],
  }),
  body(CardSectionInput, "move"),
  async (c) =>
    c.json(await setCardsSection(ctxOf(c), c.req.param("id"), c.req.valid("json"))),
);

/** Routes on one section: `/api/sections/:id`. */
export const sections = new Hono<AppEnv>();

sections.patch(
  "/:id",
  describe({
    tags: ["Sections"],
    summary: "Rename a section",
    description: "Owner only; needs the write scope.",
    ok: { schema: SectionOut, description: "The renamed section" },
    errors: [400, 404],
  }),
  body(SectionPatch, "section"),
  async (c) =>
    c.json(await renameSection(ctxOf(c), c.req.param("id"), c.req.valid("json").name)),
);

sections.post(
  "/:id/archive",
  describe({
    tags: ["Sections"],
    summary: "Archive a section",
    description:
      "Owner only; needs the write scope. `cards: archive` takes its cards out of the deck and review with it; `cards: keep` leaves them in the deck without a section. Undo with restore. Archiving twice is harmless.",
    ok: { schema: OkOut, description: "Archived" },
    errors: [400, 404],
  }),
  body(SectionArchiveInput, "archive"),
  async (c) =>
    c.json(await archiveSection(ctxOf(c), c.req.param("id"), c.req.valid("json"))),
);

sections.post(
  "/:id/restore",
  describe({
    tags: ["Sections"],
    summary: "Restore a section",
    description:
      "Owner only; needs the write scope. Brings the section back in its place, with every card archived alongside it and every card kept out of it regrouped.",
    ok: { schema: OkOut, description: "Restored" },
    errors: [404],
  }),
  async (c) => c.json(await restoreSection(ctxOf(c), c.req.param("id"))),
);

sections.post(
  "/:id/start",
  describe({
    tags: ["Sections"],
    summary: "Start a section",
    learnerOnly: true,
    description:
      "Learner only, like reviews. Opens the section for the caller, with every section before it that was not open, whether or not it is ready. Starting an open section changes nothing, so retries and a second device are safe. A section never locks again.",
    ok: { schema: SectionsOut, description: "The deck's sections after the start" },
    errors: [404],
  }),
  async (c) => c.json(await startSection(ctxOf(c), c.req.param("id"))),
);
