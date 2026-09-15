import {
  IMPORT_PART_BYTES,
  ImportChoicesInput,
  ImportOut,
  ImportPreviewOut,
  ImportStartInput,
  MAX_IMPORT_BYTES,
} from "@lymi/core";
import type { Context } from "hono";
import { Hono } from "hono";
import { z } from "zod";
import { body, ctxOf, describe } from "../http";
import type { AppEnv } from "../index";
import {
  archiveImport,
  cancelImport,
  completeImportUpload,
  confirmImport,
  getImport,
  listImports,
  previewImportChoices,
  restoreImport,
  ServiceError,
  type StartRun,
  startImport,
  uploadImportPart,
} from "../services";

/** Bringing a file in from another app. The file lands in R2 in parts; a Workflow does the rest. */
export const imports = new Hono<AppEnv>();

const start =
  (c: Context<AppEnv>): StartRun =>
  async (params) => {
    const id = params.phase === "inspect" ? params.importId : `${params.importId}-write`;
    try {
      await c.env.IMPORT_WORKFLOW.create({ id, params });
    } catch (err) {
      // A second request for the same run finds it already started.
      if (!(err instanceof Error && /already exists/i.test(err.message))) throw err;
    }
  };

const FLOW =
  "Create the import with the file's name and size, send the file in parts, then call complete. " +
  "Poll the import until `status` is `ready`, preview choices, and confirm. Writing continues on the server; poll until `done`.";

imports.get(
  "/",
  describe({
    tags: ["Imports"],
    summary: "List imports",
    description: "The learner's imports, newest first.",
    ok: { schema: z.array(ImportOut), description: "Imports" },
  }),
  async (c) => c.json(await listImports(ctxOf(c))),
);

imports.post(
  "/",
  describe({
    tags: ["Imports"],
    summary: "Start an import",
    description: `Needs the write scope. Accepts the .apkg or .colpkg file Anki exports or the .mochi file Mochi exports, up to ${MAX_IMPORT_BYTES / 1024 / 1024} MB. ${FLOW}`,
    ok: { status: 201, schema: ImportOut, description: "The import, waiting for its file" },
    errors: [400],
  }),
  body(ImportStartInput, "import"),
  async (c) => c.json(await startImport(ctxOf(c), c.req.valid("json"), c.env.IMPORTS), 201),
);

imports.get(
  "/:id",
  describe({
    tags: ["Imports"],
    summary: "Get an import",
    description: "Its status, what the file holds once read, and what was written.",
    ok: { schema: ImportOut, description: "The import" },
    errors: [404],
  }),
  async (c) => c.json(await getImport(ctxOf(c), c.req.param("id"))),
);

imports.put(
  "/:id/parts/:part",
  describe({
    tags: ["Imports"],
    summary: "Send part of the file",
    description:
      `Needs the write scope. Parts are numbered from 1. Every part but the last is exactly ${IMPORT_PART_BYTES} bytes; ` +
      "send `content-length`. Sending a part again replaces it.",
    requestBody: {
      required: true,
      content: { "application/octet-stream": { schema: { type: "string", format: "binary" } } },
    },
    ok: { schema: ImportOut, description: "The import with the part received" },
    errors: [400, 404, 409, 503],
  }),
  async (c) => {
    const length = Number(c.req.header("content-length"));
    const body = c.req.raw.body;
    if (!body || !Number.isInteger(length) || length <= 0) {
      throw new ServiceError("invalid", "Send the part's bytes with a content-length.");
    }
    const part = Number(c.req.param("part"));
    return c.json(
      await uploadImportPart(ctxOf(c), c.req.param("id"), part, body, length, c.env.IMPORTS),
    );
  },
);

imports.post(
  "/:id/complete",
  describe({
    tags: ["Imports"],
    summary: "Finish sending the file",
    description: "Needs the write scope. Joins the parts and starts reading the file.",
    ok: { schema: ImportOut, description: "The import, being read" },
    errors: [400, 404, 409],
  }),
  async (c) =>
    c.json(await completeImportUpload(ctxOf(c), c.req.param("id"), c.env.IMPORTS, start(c))),
);

imports.post(
  "/:id/preview",
  describe({
    tags: ["Imports"],
    summary: "Preview an import",
    description:
      "Needs the write scope. What confirming with these choices would write, counted against the cards the learner has now. Writes nothing.",
    ok: { schema: ImportPreviewOut, description: "The counts" },
    errors: [400, 404, 409],
  }),
  body(ImportChoicesInput, "choices"),
  async (c) =>
    c.json(
      await previewImportChoices(ctxOf(c), c.req.param("id"), c.req.valid("json"), c.env.IMPORTS),
    ),
);

imports.post(
  "/:id/confirm",
  describe({
    tags: ["Imports"],
    summary: "Confirm an import",
    description:
      "Needs the write scope. Saves the choices and writes the cards on the server. Imported reviews count in Insights and never toward today's goal.",
    ok: { schema: ImportOut, description: "The import, writing" },
    errors: [400, 404, 409],
  }),
  body(ImportChoicesInput, "choices"),
  async (c) =>
    c.json(
      await confirmImport(
        ctxOf(c),
        c.req.param("id"),
        c.req.valid("json"),
        c.env.IMPORTS,
        start(c),
      ),
    ),
);

imports.post(
  "/:id/cancel",
  describe({
    tags: ["Imports"],
    summary: "Cancel an import",
    description:
      "Needs the write scope. Stops an import before it writes anything and deletes its file.",
    ok: { schema: ImportOut, description: "The import, cancelled" },
    errors: [404, 409],
  }),
  async (c) => c.json(await cancelImport(ctxOf(c), c.req.param("id"), c.env.IMPORTS)),
);

imports.post(
  "/:id/archive",
  describe({
    tags: ["Imports"],
    summary: "Archive an import",
    description:
      "Needs the write scope. Archives every card the import added that is still active, and each deck it made that is left empty. Undo with restore.",
    ok: { schema: ImportOut, description: "The import, archived" },
    errors: [404, 409],
  }),
  async (c) =>
    c.json(
      await archiveImport(ctxOf(c), c.req.param("id")).then(() =>
        getImport(ctxOf(c), c.req.param("id")),
      ),
    ),
);

imports.post(
  "/:id/restore",
  describe({
    tags: ["Imports"],
    summary: "Restore an import",
    description: "Needs the write scope. Brings back the cards and decks archiving the import hid.",
    ok: { schema: ImportOut, description: "The import, restored" },
    errors: [404],
  }),
  async (c) =>
    c.json(
      await restoreImport(ctxOf(c), c.req.param("id")).then(() =>
        getImport(ctxOf(c), c.req.param("id")),
      ),
    ),
);
