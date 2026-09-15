import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";
import { ImportFailure as Failures, type ImportFailure } from "@lymi/core";
import { createDb } from "../db";
import type { Bindings } from "../env";
import {
  attachImportPictures,
  failImport,
  failureOf,
  finishImport,
  type ImportRunParams,
  inspectImport,
  ownedImport,
  prepareImportDecks,
  runContext,
  writeImportChunk,
} from "../services";
import { ImportFileError } from "./files";

const STEP = {
  retries: { limit: 3, delay: "10 seconds", backoff: "exponential" },
  timeout: "10 minutes",
} as const;
const PICTURES_PER_STEP = 20;

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
      const decks = await step.do("decks", STEP, () => prepareImportDecks(ctx, id, uploads));
      const chunks = await step.do("chunks", STEP, async () => (await ownedImport(ctx, id)).chunks);
      const pictures = { stored: 0, skipped: 0 };
      for (let chunk = 0; chunk < chunks; chunk++) {
        const { pictures: pending } = await step.do(`cards ${chunk}`, STEP, () =>
          writeImportChunk(ctx, id, chunk, decks, uploads),
        );
        for (let i = 0; i < pending.length; i += PICTURES_PER_STEP) {
          const done = await step.do(`pictures ${chunk} ${i}`, STEP, () =>
            attachImportPictures(ctx, id, pending.slice(i, i + PICTURES_PER_STEP), uploads, {
              bucket: this.env.PRIVATE_IMAGES,
              images: this.env.IMAGES,
            }),
          );
          pictures.stored += done.stored;
          pictures.skipped += done.skipped;
        }
      }
      await step.do("finish", STEP, () => finishImport(ctx, id, pictures, uploads));
    } catch (err) {
      const failure: ImportFailure =
        err instanceof Error && Failures.safeParse(err.message).success
          ? (err.message as ImportFailure)
          : failureOf(err);
      await step.do("fail", STEP, () => failImport(db, id, failure, uploads));
    }
  }
}
