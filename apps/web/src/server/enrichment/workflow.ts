import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { createTextProvider } from "../ai";
import { createDb } from "../db";
import type { Bindings } from "../env";
import {
  CARDS_PER_CALL,
  chunked,
  type EnrichRunParams,
  enrichCards,
  enrichmentContext,
  failEnrichment,
  settleEnrichment,
} from "../services";

const STEP = {
  retries: { limit: 3, delay: "5 seconds", backoff: "exponential" },
  timeout: "5 minutes",
} as const;

/**
 * Fills the empty fields on the cards one add left behind, ten per model call so a lesson
 * lands in waves rather than all at once. Each run is its own step: a run that gives up
 * leaves its cards at `failed` and the rest of the batch still fills.
 */
export class EnrichWorkflow extends WorkflowEntrypoint<Bindings, EnrichRunParams> {
  async run(event: WorkflowEvent<EnrichRunParams>, step: WorkflowStep) {
    const params = event.payload;
    const db = createDb(this.env.DB);
    const provider = createTextProvider(this.env);
    // The key went away between the add and this run, so nothing was ever asked.
    if (!provider) {
      await step.do("unconfigured", STEP, () =>
        settleEnrichment(db, params.userId, params.cardIds),
      );
      return;
    }
    const ctx = enrichmentContext(db, params);
    const runs = chunked(params.cardIds, CARDS_PER_CALL);
    for (const [index, ids] of runs.entries()) {
      try {
        await step.do(`cards ${index}`, STEP, () => enrichCards(ctx, ids, provider));
      } catch {
        await step.do(`fail ${index}`, STEP, () => failEnrichment(db, params.userId, ids));
      }
    }
  }
}
