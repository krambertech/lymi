import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";
import { ImportFailure as Failures, type ImportFailure } from "@lymi/core";
import { createDb } from "../db";
import type { Bindings } from "../env";
import { announce } from "../live/announce";
import {
  attachImportPictures,
  failImport,
  failureOf,
  finishImport,
  type ImportRunParams,
  inspectImport,
  nextWriteStep,
  ownedImport,
  PICTURES_PER_STEP,
  prepareImportDecks,
  runContext,
  writeImportChunk,
} from "../services";
import { ImportFileError } from "./files";

const STEP = {
  retries: { limit: 3, delay: "10 seconds", backoff: "exponential" },
  timeout: "10 minutes",
} as const;

/** A file error is the file's fault, so retrying cannot help. */
async function fileErrorsStop<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (err) {
    if (err instanceof ImportFileError) throw new NonRetryableError(err.failure);
    throw err;
  }
}

/**
 * Reads an uploaded file, then, once the learner confirms, writes it chunk by chunk. Each
 * chunk and each batch of pictures is its own step, so a phone can close the app and a
 * failure retries only the step that failed.
 */
export class ImportWorkflow extends WorkflowEntrypoint<Bindings, ImportRunParams> {
  async run(event: WorkflowEvent<ImportRunParams>, step: WorkflowStep) {
    const params = event.payload;
    const db = createDb(this.env.DB);
    const ctx = runContext(db, params);
    const uploads = this.env.IMPORTS;
    const id = params.importId;
    try {
      if (params.phase === "inspect") {
        await step.do("inspect", STEP, () => fileErrorsStop(() => inspectImport(ctx, id, uploads)));
        return;
      }
      let steps = 0;
      const counted = <T>(name: string, work: () => Promise<T>) => {
        steps++;
        return step.do(name, STEP, work as () => Promise<never>) as Promise<T>;
      };
      const decks = await counted("decks", () => prepareImportDecks(ctx, id, uploads));
      const chunks = await counted("chunks", async () => (await ownedImport(ctx, id)).chunks);
      const pictures = { ...(params.resume?.pictures ?? { stored: 0, skipped: 0 }) };
      let chunk = params.resume?.chunk ?? 0;
      let pending = params.resume?.pending ?? [];
      const storage =
        this.env.PRIVATE_IMAGES && this.env.IMAGES
          ? { bucket: this.env.PRIVATE_IMAGES, images: this.env.IMAGES }
          : null;

      for (;;) {
        const next = nextWriteStep({ chunk, chunks, pending: pending.length, steps });
        if (next === "finish") break;
        if (next === "hand over") {
          const resume = { chunk, pending, pictures };
          await counted("hand over", async () => {
            try {
              await this.env.IMPORT_WORKFLOW.create({
                id: `${id}-write-${chunk}-${pending.length}`,
                params: { ...params, resume },
              });
            } catch (err) {
              if (!(err instanceof Error && /already exists/i.test(err.message))) throw err;
            }
          });
          return;
        }
        if (next === "pictures") {
          // A preview Worker has no pictures bucket; its imports keep their cards and skip pictures.
          if (!storage) {
            pictures.skipped += pending.length;
            pending = [];
            continue;
          }
          const batch = pending.slice(0, PICTURES_PER_STEP);
          const done = await counted(`pictures ${chunk} ${pending.length}`, () =>
            attachImportPictures(ctx, id, batch, uploads, storage),
          );
          pictures.stored += done.stored;
          pictures.skipped += done.skipped;
          pending = pending.slice(PICTURES_PER_STEP);
          continue;
        }
        const written = await counted(`cards ${chunk}`, () =>
          writeImportChunk(ctx, id, chunk, decks, uploads),
        );
        pending = written.pictures;
        chunk++;
        await announce(this.env, params.userId);
      }
      await step.do("finish", STEP, () => finishImport(ctx, id, pictures, uploads));
      await announce(this.env, params.userId);
    } catch (err) {
      const failure: ImportFailure =
        err instanceof Error && Failures.safeParse(err.message).success
          ? (err.message as ImportFailure)
          : failureOf(err);
      await step.do("fail", STEP, () => failImport(db, id, failure, uploads));
      await announce(this.env, params.userId);
    }
  }
}
