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
import { track } from "../services/analytics";

const STEP = {
  retries: { limit: 3, delay: "5 seconds", backoff: "exponential" },
  timeout: "5 minutes",
} as const;

/** The last word on a run. It only marks cards still waiting, so it is safe to always run. */
const SETTLE_STEP = {
  retries: { limit: 5, delay: "10 seconds", backoff: "exponential" },
  timeout: "1 minute",
} as const;

/**
 * Fills the empty fields on the cards one add left behind, ten per model call so a lesson
 * lands in waves rather than all at once. Each run is its own step: a run that gives up
 * leaves its cards at `failed` and the rest of the batch still fills. However the instance
 * ends, a final step settles anything still at `working`, so nothing shimmers forever.
 */
export class EnrichWorkflow extends WorkflowEntrypoint<Bindings, EnrichRunParams> {
  async run(event: WorkflowEvent<EnrichRunParams>, step: WorkflowStep) {
    const params = event.payload;
    const db = createDb(this.env.DB);
    try {
      const provider = createTextProvider(this.env);
      // The key went away between the add and this run, so nothing was ever asked.
      if (!provider) {
        await step.do("unconfigured", STEP, () =>
          settleEnrichment(db, params.userId, params.cardIds),
        );
        return;
      }
      const ctx = enrichmentContext(db, params, this.env.EVENTS);
      for (const [index, ids] of chunked(params.cardIds, CARDS_PER_CALL).entries()) {
        try {
          await step.do(`cards ${index}`, STEP, () => enrichCards(ctx, ids, provider));
        } catch {
          await step.do(`fail ${index}`, STEP, () => failEnrichment(db, params.userId, ids));
          track(this.env.EVENTS, {
            name: "enrichment_finished",
            outcome: "failed",
            count: ids.length,
          });
        }
      }
    } finally {
      // Nothing may stay at `working` once this instance stops, whatever stopped it: a step that
      // exhausted its retries ends the run, and a card left shimmering would shimmer forever.
      await step
        .do("settle", SETTLE_STEP, () => failEnrichment(db, params.userId, params.cardIds))
        .catch(() => {});
    }
  }
}
