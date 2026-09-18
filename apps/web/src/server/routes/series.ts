import {
  OkOut,
  SeriesDecksInput,
  SeriesDeleteInput,
  SeriesInput,
  SeriesOrderInput,
  SeriesOut,
  SeriesPatch,
} from "@lymi/core";
import { Hono } from "hono";
import { z } from "zod";
import { body, ctxOf, describe, query } from "../http";
import type { AppEnv } from "../index";
import {
  createSeries,
  deleteSeries,
  getSeries,
  listSeries,
  renameSeries,
  reorderSeries,
  setSeriesDecks,
} from "../services";

export const series = new Hono<AppEnv>();

series.get(
  "/",
  describe({
    tags: ["Series"],
    summary: "List series",
    description:
      "Your series in order, each with its active decks in order and their total and due counts. Only your own: a deck you joined shows no series.",
    ok: { schema: z.array(SeriesOut), description: "Series" },
    errors: [400],
  }),
  async (c) => c.json(await listSeries(ctxOf(c))),
);

series.post(
  "/",
  describe({
    tags: ["Series"],
    summary: "Create a series",
    description:
      "Needs the write scope. It goes last. `deckIds` moves your decks into it in that order, out of any series they were in.",
    ok: { status: 201, schema: SeriesOut, description: "The new series" },
    errors: [400, 404],
  }),
  body(SeriesInput, "series"),
  async (c) => c.json(await createSeries(ctxOf(c), c.req.valid("json")), 201),
);

series.put(
  "/order",
  describe({
    tags: ["Series"],
    summary: "Reorder series",
    description:
      "Needs the write scope. Send every active series once, in the new order. A list that no longer matches your series is 409, so a stale device cannot drop one. Sending the same order again changes nothing.",
    ok: { schema: z.array(SeriesOut), description: "Series in their new order" },
    errors: [400, 409],
  }),
  body(SeriesOrderInput, "order"),
  async (c) => c.json(await reorderSeries(ctxOf(c), c.req.valid("json"))),
);

series.get(
  "/:id",
  describe({
    tags: ["Series"],
    summary: "Get a series",
    ok: { schema: SeriesOut, description: "The series" },
    errors: [404],
  }),
  async (c) => c.json(await getSeries(ctxOf(c), c.req.param("id"))),
);

series.patch(
  "/:id",
  describe({
    tags: ["Series"],
    summary: "Rename a series",
    description: "Needs the write scope.",
    ok: { schema: SeriesOut, description: "The renamed series" },
    errors: [400, 404],
  }),
  body(SeriesPatch, "series"),
  async (c) => c.json(await renameSeries(ctxOf(c), c.req.param("id"), c.req.valid("json").name)),
);

series.put(
  "/:id/decks",
  describe({
    tags: ["Series"],
    summary: "Set a series' decks",
    description:
      "Needs the write scope. Send every active deck the series should hold, in order. A deck listed from Library or another series moves in; one left out goes to the end of Library. Sending the same list again changes nothing. To move one deck, `PATCH /api/decks/{id}` with `seriesId` is simpler.",
    ok: { schema: SeriesOut, description: "The series with its decks in order" },
    errors: [400, 404],
  }),
  body(SeriesDecksInput, "decks"),
  async (c) => c.json(await setSeriesDecks(ctxOf(c), c.req.param("id"), c.req.valid("json"))),
);

series.delete(
  "/:id",
  describe({
    tags: ["Series"],
    summary: "Delete a series",
    description:
      "Needs the write scope. The series is gone for good; make a new one to group the decks again. `decks=archive` archives its decks with it, and restoring them is a separate write; `decks=keep` leaves them in Library without a series. Deleting twice is harmless.",
    ok: { schema: OkOut, description: "Deleted" },
    errors: [400, 404],
  }),
  query(SeriesDeleteInput, "decks"),
  async (c) => c.json(await deleteSeries(ctxOf(c), c.req.param("id"), c.req.valid("query"))),
);
