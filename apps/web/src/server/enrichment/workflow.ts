import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { createTextProvider } from "../ai";
import { createDb } from "../db";
import type { Bindings } from "../env";
import { productAnalytics, reportServerException } from "../posthog";
import {
  type EnrichRunParams,
  enrichCards,
  enrichmentContext,
  failEnrichment,
  failTranslations,
  type LearnStyleOptions,
  learnDeckStyles,
  settleEnrichment,
  settleTranslations,
  translateExamples,
} from "../services";
import { textCallReporter, track } from "../services/analytics";
import { analyticsContextFor } from "../services/analytics-context";
import { CARDS_PER_CALL, chunked } from "./prompt";

const STEP = {
  retries: { limit: 3, delay: "5 seconds", backoff: "exponential" },
  timeout: "5 minutes",
} as const;

/** The last word on a run. It only marks cards still waiting, so it is safe to always run. */
const SETTLE_STEP = {
  retries: { limit: 5, delay: "10 seconds", backoff: "exponential" },
  timeout: "1 minute",
} as const;

/** Learning a deck's style is extra: one retry, and a failure leaves the cards as they landed. */
const STYLE_STEP = {
  retries: { limit: 1, delay: "10 seconds", backoff: "constant" },
  timeout: "2 minutes",
} as const;

/**
 * Fills the empty fields on the cards one add left behind, ten per model call so a lesson
 * lands in waves rather than all at once. Each run is its own step: a run that gives up
 * leaves its cards at `failed` and the rest of the batch still fills. However the instance
 * ends, a final step settles anything still at `working`, so nothing shimmers forever. A deck
 * with no style yet learns one before its cards are filled, so the first fill already uses it;
 * after the fill, the rest learn again if enough has changed. ADR 0037.
 */
export class EnrichWorkflow extends WorkflowEntrypoint<Bindings, EnrichRunParams> {
  async run(event: WorkflowEvent<EnrichRunParams>, step: WorkflowStep) {
    const params = event.payload;
    const db = createDb(this.env.DB);
    try {
      const analytics = productAnalytics(
        this.env,
        params.userId,
        undefined,
        analyticsContextFor(db, params.userId),
      );
      const provider = createTextProvider(this.env, textCallReporter(analytics, "enrich"));
      // The key went away between the add and this run, so nothing was ever asked.
      if (!provider) {
        await step.do("unconfigured", STEP, async () => {
          await settleEnrichment(db, params.userId, params.cardIds);
          await settleTranslations(db, params.userId, params.cardIds);
        });
        return;
      }
      const ctx = enrichmentContext(db, params, analytics);
      const styles = createTextProvider(this.env, textCallReporter(analytics, "deck_style"));
      // A style is extra: a failure is reported once and the cards fill without it.
      const learn = async (name: string, options: LearnStyleOptions): Promise<string[]> => {
        if (!styles) return [];
        try {
          const { deckIds } = await step.do(name, STYLE_STEP, () =>
            analytics.run(() => learnDeckStyles(ctx, params.cardIds, styles, options)),
          );
          return deckIds;
        } catch (err) {
          await step
            .do(`${name} failed`, STEP, () =>
              reportServerException(this.env, err, {
                route: "deck-style",
                method: "WORKFLOW",
                userId: params.userId,
              }),
            )
            .catch(() => {});
          return [];
        }
      };
      const translator = createTextProvider(
        this.env,
        textCallReporter(analytics, "example_translation"),
      );
      const trigger = params.trigger ?? "add";
      // A translation reads the example a fill just wrote, so each wave is translated once it lands.
      const translate = async (index: number, ids: string[]) => {
        if (!translator) return;
        try {
          await step.do(`translate ${index}`, STEP, () =>
            analytics.run(() => translateExamples(ctx, ids, translator, trigger)),
          );
        } catch (err) {
          await step.do(`translate fail ${index}`, STEP, async () => {
            const failed = await failTranslations(db, params.userId, ids);
            track(analytics, {
              name: "example_translated",
              outcome: "failed",
              count: failed,
              trigger,
            });
            await analytics.flush();
            await reportServerException(this.env, err, {
              route: "example-translation",
              method: "WORKFLOW",
              userId: params.userId,
            });
          });
        }
      };
      // An edit only ever leaves an example to translate, so its run neither fills nor learns a style.
      if (params.trigger === "edit") {
        for (const [index, ids] of chunked(params.cardIds, CARDS_PER_CALL).entries()) {
          await translate(index, ids);
        }
        return;
      }
      const fillTrigger = params.trigger;
      const first = await learn("style first", { firstOnly: true });
      for (const [index, ids] of chunked(params.cardIds, CARDS_PER_CALL).entries()) {
        try {
          await step.do(`cards ${index}`, STEP, () =>
            analytics.run(() => enrichCards(ctx, ids, provider, fillTrigger)),
          );
        } catch (err) {
          // Inside the step, because code outside one runs again when the engine replays.
          await step.do(`fail ${index}`, STEP, async () => {
            await failEnrichment(db, params.userId, ids);
            track(analytics, {
              name: "enrichment_finished",
              outcome: "failed",
              count: ids.length,
            });
            await analytics.flush();
            await reportServerException(this.env, err, {
              route: "enrichment",
              method: "WORKFLOW",
              userId: params.userId,
            });
          });
        }
        await translate(index, ids);
      }
      await learn("style", { skip: first });
    } finally {
      // Nothing may stay at `working` once this instance stops, whatever stopped it: a step that
      // exhausted its retries ends the run, and a card left shimmering would shimmer forever.
      await step
        .do("settle", SETTLE_STEP, async () => {
          await failEnrichment(db, params.userId, params.cardIds);
          await failTranslations(db, params.userId, params.cardIds);
        })
        .catch(() => {});
    }
  }
}
