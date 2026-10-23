import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";
import { createTextProvider } from "../ai";
import { createDb } from "../db";
import type { Bindings } from "../env";
import { productAnalytics, reportServerException } from "../posthog";
import {
  attachImportPictures,
  failRun,
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
import { textCallReporter } from "../services/analytics";
import { analyticsContextFor } from "../services/analytics-context";
import { CallBudget, CallBudgetSpent, isCallBudgetSpent } from "./call-budget";
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
    // Every call this invocation makes counts against one cap, so the run stops short of it and
    // keeps enough to record the failure. A replay in a new invocation starts from zero.
    const budget = new CallBudget();
    const db = createDb(budget.wrap(this.env.DB));
    const analytics = productAnalytics(
      this.env,
      params.userId,
      undefined,
      analyticsContextFor(db, params.userId),
    );
    const ctx = runContext(db, params, analytics);
    const uploads = budget.wrap(this.env.IMPORTS);
    const id = params.importId;
    try {
      if (params.phase === "inspect") {
        await step.do("inspect", STEP, () =>
          analytics.run(() =>
            fileErrorsStop(() =>
              inspectImport(
                ctx,
                id,
                uploads,
                createTextProvider(this.env, textCallReporter(analytics, "import_languages")),
              ),
            ),
          ),
        );
        return;
      }
      let steps = 0;
      const counted = <T>(name: string, work: () => Promise<T>) => {
        steps++;
        return step.do(name, STEP, () =>
          (analytics.run(work) as Promise<never>).catch((err: unknown) => {
            // Another attempt in this invocation has no more calls to spend.
            if (err instanceof CallBudgetSpent) throw new NonRetryableError(err.message);
            throw err;
          }),
        ) as Promise<T>;
      };
      const decks = await counted("decks", () => prepareImportDecks(ctx, id, uploads));
      const chunks = await counted("chunks", async () => (await ownedImport(ctx, id)).chunks);
      const resumed = params.resume?.pictures;
      const pictures = {
        stored: resumed?.stored ?? 0,
        skipped: resumed?.skipped ?? 0,
        recordings: { ...(resumed?.recordings ?? { stored: 0, skipped: 0 }) },
      };
      let chunk = params.resume?.chunk ?? 0;
      let pending = params.resume?.pending ?? [];
      let handled = params.resume?.handled ?? 0;
      // A preview Worker has no pictures bucket; its imports keep their cards and skip pictures.
      const storage = {
        bucket: this.env.PRIVATE_IMAGES && budget.wrap(this.env.PRIVATE_IMAGES),
        images: this.env.IMAGES && budget.wrap(this.env.IMAGES),
        audio: this.env.AUDIO && budget.wrap(this.env.AUDIO),
      };

      for (;;) {
        const next = nextWriteStep({ chunk, chunks, pending: pending.length, steps });
        if (next === "finish") break;
        if (next === "hand over") {
          const resume = { chunk, pending, pictures, handled };
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
          const batch = pending.slice(0, PICTURES_PER_STEP);
          const after = handled + batch.length;
          const done = await counted(`pictures ${chunk} ${pending.length}`, () =>
            attachImportPictures(ctx, id, batch, uploads, storage, after),
          );
          handled = after;
          pictures.stored += done.stored;
          pictures.skipped += done.skipped;
          pictures.recordings.stored += done.recordings.stored;
          pictures.recordings.skipped += done.recordings.skipped;
          pending = pending.slice(PICTURES_PER_STEP);
          continue;
        }
        const written = await counted(`cards ${chunk}`, () =>
          writeImportChunk(ctx, id, chunk, decks, uploads),
        );
        pending = written.pictures;
        chunk++;
      }
      await step.do("finish", STEP, () =>
        analytics.run(() => finishImport(ctx, id, pictures, uploads)),
      );
    } catch (err) {
      // Recording the failure may use the calls the budget kept back.
      await step.do("fail", STEP, () =>
        analytics.run(() =>
          failRun(db, id, err, uploads, budget, analytics, (error) =>
            reportServerException(this.env, error, {
              route: "import",
              method: isCallBudgetSpent(error) ? "WORKFLOW budget" : "WORKFLOW",
              userId: params.userId,
            }),
          ),
        ),
      );
    }
  }
}
