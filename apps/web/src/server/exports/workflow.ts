import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";
import { ExportFailure } from "@lymi/core";
import { createDb } from "../db";
import type { Bindings } from "../env";
import { announce } from "../live/announce";
import {
  type ExportRunParams,
  ExportTooLarge,
  exportFailureOf,
  exportRunContext,
  failExport,
  finishExport,
  type MediaStep,
  writeExportData,
  writeExportMedia,
} from "../services";

const STEP = {
  retries: { limit: 3, delay: "10 seconds", backoff: "exponential" },
  timeout: "10 minutes",
} as const;

/** A file too large for one zip stays too large, so retrying cannot help. */
async function tooLargeStops<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (err) {
    if (err instanceof ExportTooLarge) throw new NonRetryableError("too_large");
    throw err;
  }
}

/**
 * Writes an export: every card and review in the first step, pictures and sounds fifty per step,
 * then the zip's directory. Each step writes one segment of the file, so a retry rewrites only it.
 */
export class ExportWorkflow extends WorkflowEntrypoint<Bindings, ExportRunParams> {
  async run(event: WorkflowEvent<ExportRunParams>, step: WorkflowStep) {
    const params = event.payload;
    const db = createDb(this.env.DB);
    const ctx = exportRunContext(db, params);
    const id = params.exportId;
    const storage = {
      bucket: this.env.EXPORTS,
      pictures: this.env.PRIVATE_IMAGES,
      audio: this.env.AUDIO,
    };
    try {
      const data = await step.do("data", STEP, () =>
        tooLargeStops(() => writeExportData(ctx, id, storage)),
      );
      let media: MediaStep = { segment: 1, offset: data.offset, after: null, number: 0 };
      let missing = 0;
      for (let done = data.media === 0; !done; ) {
        const written = await step.do(`media ${media.segment}`, STEP, () =>
          tooLargeStops(() => writeExportMedia(ctx, id, media, storage)),
        );
        media = {
          segment: written.segment,
          offset: written.offset,
          after: written.after,
          number: written.number,
        };
        missing += written.missing;
        done = written.done;
      }
      await step.do("finish", STEP, () =>
        tooLargeStops(() =>
          finishExport(
            ctx,
            id,
            { segment: media.segment, offset: media.offset, missing },
            storage.bucket,
          ),
        ),
      );
      await announce(this.env, params.userId);
    } catch (err) {
      const failure =
        err instanceof Error && ExportFailure.safeParse(err.message).success
          ? (err.message as ExportFailure)
          : exportFailureOf(err);
      await step.do("fail", STEP, () => failExport(db, id, failure, storage.bucket));
      await announce(this.env, params.userId);
    }
  }
}
