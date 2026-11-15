import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";
import { createTextProvider } from "../ai";
import { createDb } from "../db";
import type { Bindings } from "../env";
import { productAnalytics, reportServerException } from "../posthog";
import { failRun, type ImportRunParams, inspectImport, runContext } from "../services";
import { textCallReporter } from "../services/analytics";
import { analyticsContextFor } from "../services/analytics-context";
import { CallBudget, isCallBudgetSpent, stopOnSpent } from "./call-budget";
import { ImportFileError } from "./files";
import { writeImport } from "./write-run";

const STEP = {
  retries: { limit: 3, delay: "10 seconds", backoff: "exponential" },
  timeout: "10 minutes",
} as const;

/** Another attempt in this invocation would have no more calls to spend. */
function noRetryWhenSpent<T>(work: () => Promise<T>): Promise<never> {
  return stopOnSpent(work, (message) => new NonRetryableError(message)) as Promise<never>;
}

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
 * failure retries only the step that failed. A long write hands the rest to a fresh run.
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
      // A preview Worker has no pictures bucket; its imports keep their cards and skip pictures.
      const storage = {
        bucket: this.env.PRIVATE_IMAGES && budget.wrap(this.env.PRIVATE_IMAGES),
        images: this.env.IMAGES && budget.wrap(this.env.IMAGES),
        audio: this.env.AUDIO && budget.wrap(this.env.AUDIO),
      };
      await writeImport(params, {
        ctx,
        uploads,
        storage,
        budget,
        step: <T>(name: string, work: () => Promise<T>) =>
          step.do(name, STEP, () => noRetryWhenSpent(() => analytics.run(work))) as Promise<T>,
        handOver: async (resume) => {
          try {
            await this.env.IMPORT_WORKFLOW.create({
              id: `${id}-write-${resume.chunk}-${resume.pending.length}`,
              params: { ...params, resume },
            });
          } catch (err) {
            if (!(err instanceof Error && /already exists/i.test(err.message))) throw err;
          }
        },
      });
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
