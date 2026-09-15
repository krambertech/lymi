import { EXPORT_WINDOW_MS, ExportOut, ExportStartInput } from "@lymi/core";
import type { Context } from "hono";
import { Hono } from "hono";
import { z } from "zod";
import { body, ctxOf, describe } from "../http";
import type { AppEnv } from "../index";
import { exportFile, getExport, listExports, type StartExportRun, startExport } from "../services";

/** Taking a deck or the whole library out. A Workflow writes the file; this route hands it over. */
export const exports = new Hono<AppEnv>();

const start =
  (c: Context<AppEnv>): StartExportRun =>
  async (params) => {
    try {
      await c.env.EXPORT_WORKFLOW.create({ id: params.exportId, params });
    } catch (err) {
      // A second request for the same run finds it already started.
      if (!(err instanceof Error && /already exists/i.test(err.message))) throw err;
    }
  };

const HOURS = EXPORT_WINDOW_MS / 3_600_000;

exports.get(
  "/",
  describe({
    tags: ["Exports"],
    summary: "List exports",
    description: "The learner's exports, newest first.",
    ok: { schema: z.array(ExportOut), description: "Exports" },
  }),
  async (c) => c.json(await listExports(ctxOf(c))),
);

exports.post(
  "/",
  describe({
    tags: ["Exports"],
    summary: "Start an export",
    description:
      "The read scope is enough. `lymi` writes a zip Lymi imports back without loss; `anki` writes a legacy .apkg that Anki, Mochi, RemNote and Noji read with scheduling and media. " +
      `Poll the export until \`status\` is \`done\`, then download \`downloadUrl\` with the same key. The file is deleted ${HOURS} hours after it is written. ` +
      "A shared deck exports with its cards and the caller's own schedule and history.",
    ok: { status: 201, schema: ExportOut, description: "The export, being written" },
    readScope: true,
    errors: [400, 404],
  }),
  body(ExportStartInput, "export"),
  async (c) => c.json(await startExport(ctxOf(c), c.req.valid("json"), start(c)), 201),
);

exports.get(
  "/:id",
  describe({
    tags: ["Exports"],
    summary: "Get an export",
    description: "Its status, what it holds and, once written, where to download it.",
    ok: { schema: ExportOut, description: "The export" },
    errors: [404],
  }),
  async (c) => c.json(await getExport(ctxOf(c), c.req.param("id"))),
);

exports.get(
  "/:id/file",
  describe({
    tags: ["Exports"],
    summary: "Download an export",
    description:
      "The finished file as application/zip or application/octet-stream, for the learner who asked for it, until it is deleted. Responses are private and never cached.",
    errors: [404, 503],
  }),
  async (c) => {
    const file = await exportFile(ctxOf(c), c.req.param("id"), c.env.EXPORTS);
    const { readable, writable } = new FixedLengthStream(file.byteSize);
    const pipe = (async () => {
      try {
        for await (const segment of file.streams()) {
          await segment.pipeTo(writable, { preventClose: true });
        }
        await writable.close();
      } catch (err) {
        await writable.abort(err).catch(() => {});
      }
    })();
    c.executionCtx.waitUntil(pipe);
    const ascii = file.fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
    return new Response(readable, {
      headers: {
        "content-type": file.format === "lymi" ? "application/zip" : "application/octet-stream",
        "content-length": String(file.byteSize),
        "content-disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  },
);
