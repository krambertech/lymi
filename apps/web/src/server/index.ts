import { createSpeechProviders } from "./ai";
import { handleFetch } from "./app";
import { runCanary } from "./canary";
import { createDb } from "./db";
import type { Bindings } from "./env";
import { reportServerException } from "./posthog";
import { dispatchReviewReminders } from "./push-delivery";
import { dropUnstudiedFormerDecks } from "./services/account-deletion";
import { purgeCardAudio } from "./services/audio";
import { expireExports } from "./services/exports";
import { expireImports } from "./services/imports";
import { voicePublishedDecks } from "./services/published-audio";

export type { AppEnv } from "./app";

const PRODUCTION_URL = "https://my.lymi.app";

/** A failed job reaches Error Tracking and still fails the invocation in Workers Logs. */
function job(env: Bindings, name: string, work: Promise<unknown>): Promise<unknown> {
  return work.catch(async (error: unknown) => {
    await reportServerException(env, error, { route: `cron/${name}`, method: "CRON" });
    throw error;
  });
}

/** The canary spends real provider calls, so it runs only on the production Worker. */
function runsCanary(env: Bindings): boolean {
  return Boolean(env.HEALTH) && env.PRODUCT_URL === PRODUCTION_URL && env.APP_PREVIEW !== "true";
}

// The app lives in app.ts so route tests can import it in Node: the Workflows exported below
// need `cloudflare:workers`, which only the Worker runtime provides. docs/testing.md.
export default {
  fetch: handleFetch,
  scheduled(controller: ScheduledController, env: Bindings, executionCtx: ExecutionContext) {
    const at = new Date(controller.scheduledTime);
    const run = (name: string, work: Promise<unknown>) =>
      executionCtx.waitUntil(job(env, name, work));
    run(
      "review-reminders",
      dispatchReviewReminders(env, at).then((result) => {
        if (result.failed > 0) throw new Error(`${result.failed} review reminder sends failed`);
      }),
    );
    run("expire-imports", expireImports(createDb(env.DB), env.IMPORTS, at, env.EVENTS));
    run("expire-exports", expireExports(createDb(env.DB), env.EXPORTS, at));
    run("former-decks", dropUnstudiedFormerDecks(createDb(env.DB), env.PRIVATE_IMAGES));
    run("purge-card-audio", purgeCardAudio(createDb(env.DB), env.AUDIO));
    // Hourly, because each run reads every published deck to find the cards its page shows first. #759.
    if (at.getUTCMinutes() < 15) {
      run(
        "published-audio",
        voicePublishedDecks(createDb(env.DB), {
          bucket: env.AUDIO,
          providers: (language) => createSpeechProviders(env, language),
        }),
      );
    }
    if (runsCanary(env)) run("canary", runCanary(env, at));
  },
} satisfies ExportedHandler<Bindings>;

export { EnrichWorkflow } from "./enrichment/workflow";
export { ExportWorkflow } from "./exports/workflow";
export { ImportWorkflow } from "./imports/workflow";
