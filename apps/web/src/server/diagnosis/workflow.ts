import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { createTextProvider } from "../ai";
import { createDb } from "../db";
import type { Bindings } from "../env";
import { type DiagnoseRunParams, diagnoseCard, diagnosisContext, failDiagnoses } from "../services";
import { track } from "../services/analytics";

const STEP = {
  retries: { limit: 3, delay: "5 seconds", backoff: "exponential" },
  timeout: "5 minutes",
} as const;

const SETTLE_STEP = {
  retries: { limit: 5, delay: "10 seconds", backoff: "exponential" },
  timeout: "1 minute",
} as const;

/**
 * Diagnoses the cards one draw found newly often forgotten, one model call and one step per
 * card, so a card that fails leaves the rest to finish. However the instance ends, a final step
 * marks anything still `working` as failed, so no row waits forever. ADR 0025.
 */
export class DiagnoseWorkflow extends WorkflowEntrypoint<Bindings, DiagnoseRunParams> {
  async run(event: WorkflowEvent<DiagnoseRunParams>, step: WorkflowStep) {
    const params = event.payload;
    const db = createDb(this.env.DB);
    try {
      const provider = createTextProvider(this.env);
      if (!provider) return;
      const ctx = diagnosisContext(db, params.userId, this.env.EVENTS);
      for (const [index, id] of params.diagnosisIds.entries()) {
        try {
          await step.do(`card ${index}`, STEP, async () => {
            await diagnoseCard(ctx, id, provider);
          });
        } catch {
          // Inside the step, because code outside one runs again when the engine replays.
          await step.do(`fail ${index}`, STEP, async () => {
            await failDiagnoses(db, params.userId, [id]);
            track(this.env.EVENTS, { name: "diagnosis_finished", outcome: "failed" });
          });
        }
      }
    } finally {
      await step
        .do("settle", SETTLE_STEP, () => failDiagnoses(db, params.userId, params.diagnosisIds))
        .catch(() => {});
    }
  }
}
