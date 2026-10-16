import { LessonAccessOut, LessonAnswerInput, LessonAnswerOut, LessonEventOut } from "@lymi/core";
import { Hono } from "hono";
import { operatorEmails } from "../env";
import { body, ctxOf, describe } from "../http";
import type { AppEnv } from "../index";
import { decisionModel, termsAgainstAnswer } from "../lessons/keep";
import type { LessonMaterial } from "../lessons/reader";
import { createLessonReader } from "../lessons/reader";
import {
  assertCanReadLessons,
  type LessonEvent,
  lessonAccess,
  prepareLesson,
  ServiceError,
  streamLesson,
} from "../services";
import { normalizeBoundedImage } from "../services/images";

/**
 * Smart add: reading a lesson into a pick list, at /api/lesson-reads. App only: an assistant already
 * has a model to read with.
 */
export const lessonReads = new Hono<AppEnv>();

/** A page wider than this costs more to read and reads no better. */
const PAGE_SIDE = 1536;
const MAX_PAGES = 10;
const MAX_PDFS = 3;
/** All PDFs together, so the request to the reader stays under Anthropic's 32 MB once encoded. */
const MAX_PDF_BYTES = 20_000_000;
const MAX_TEXT = 100_000;
const MAX_BODY = 60_000_000;

lessonReads.get(
  "/access",
  describe({
    hide: true,
    learnerOnly: true,
    summary: "Whether this account can read lessons, and its reads left today",
    ok: { schema: LessonAccessOut, description: "Access" },
  }),
  async (c) => c.json(await lessonAccess(ctxOf(c), operatorEmails(c.env))),
);

lessonReads.post(
  "/",
  describe({
    hide: true,
    learnerOnly: true,
    summary: "Read a lesson into a pick list",
    description:
      "Newline-delimited JSON: a term event per term as the model writes it, then questions, then done.",
    ok: { schema: LessonEventOut, description: "One line of the stream" },
    errors: [400, 404, 409, 503],
  }),
  async (c) => {
    const deps = {
      reader: createLessonReader(c.env),
      ai: decisionModel(c.env),
      operators: operatorEmails(c.env),
    };
    await assertCanReadLessons(ctxOf(c), deps);
    const declared = Number(c.req.header("content-length") ?? Number.NaN);
    if (!Number.isFinite(declared) || declared > MAX_BODY) {
      throw new ServiceError("invalid", "Send at most 10 photos and 3 PDFs under 20 MB in all.");
    }
    const form = await c.req.formData();
    let pdfBytes = 0;
    const material: LessonMaterial = { images: [], pdfs: [], text: "" };
    const text = form.get("text");
    if (typeof text === "string") material.text = text.slice(0, MAX_TEXT);
    for (const file of form.getAll("file")) {
      if (!(file instanceof File)) continue;
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (isPdf(bytes)) {
        pdfBytes += bytes.byteLength;
        if (material.pdfs.length >= MAX_PDFS || pdfBytes > MAX_PDF_BYTES)
          throw new ServiceError("invalid", "Send at most 3 PDFs under 20 MB in all.");
        material.pdfs.push(bytes);
        continue;
      }
      if (material.images.length >= MAX_PAGES)
        throw new ServiceError("invalid", "Send at most 10 photos at a time.");
      const page = await normalizeBoundedImage(c.env.IMAGES, bytes, PAGE_SIDE);
      material.images.push({ bytes: page.bytes, type: page.type });
    }
    if (!material.text.trim() && material.images.length === 0 && material.pdfs.length === 0) {
      throw new ServiceError("invalid", "Paste the lesson or add a photo or PDF of it.");
    }
    // Refusals happen here, before the stream opens, so they arrive as ordinary errors.
    const deckId = form.get("deckId");
    const hint = form.get("hint");
    const lesson = await prepareLesson(ctxOf(c), material, deps, {
      deckId: typeof deckId === "string" && deckId ? deckId : undefined,
      hint: typeof hint === "string" && hint ? hint : undefined,
    });
    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();
    const send = (event: LessonEvent) =>
      void writer.write(encoder.encode(`${JSON.stringify(event)}\n`));
    const reading = streamLesson(lesson, material, deps.ai, send)
      .catch((error: unknown) => {
        console.error("Lesson read failed", error);
        send({ type: "error", message: "The lesson could not be read. Try again." });
      })
      .finally(() => writer.close());
    c.executionCtx.waitUntil(reading);
    return new Response(readable, {
      headers: {
        "content-type": "application/x-ndjson; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  },
);

function isPdf(bytes: Uint8Array): boolean {
  return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}

lessonReads.post(
  "/answers",
  describe({
    hide: true,
    learnerOnly: true,
    summary: "Check the pick list against a learner's own answer",
    ok: { schema: LessonAnswerOut, description: "The terms the answer leaves off" },
    errors: [400],
  }),
  body(LessonAnswerInput, "answer"),
  async (c) => {
    const { question, answer, terms } = c.req.valid("json");
    return c.json({
      drop: await termsAgainstAnswer(decisionModel(c.env), question, answer, terms),
    });
  },
);
