import { createSpeechProviders } from "./ai";
import { handleFetch } from "./app";
import { runCanary } from "./canary";
import { createDb } from "./db";
import type { Bindings } from "./env";
import { leadInDependencies } from "./lead-ins";
import { ownerAnalytics, reportServerException } from "./posthog";
import { dispatchReviewReminders } from "./push-delivery";
import { readwiseDeps } from "./readwise/deps";
import { dropUnstudiedFormerDecks } from "./services/account-deletion";
import { purgeCardAudio } from "./services/audio";
import { expireExports } from "./services/exports";
import { expireImports } from "./services/imports";
import { voicePublishedDecks } from "./services/published-audio";
import { pullDueReadwise } from "./services/readwise";
import { runStressBackfill } from "./services/stress-backfill";

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
    run(
      "expire-imports",
      expireImports(createDb(env.DB), env.IMPORTS, at, env.EVENTS).then(({ stalled }) => {
        if (stalled > 0) throw new Error(`${stalled} stalled imports were failed`);
      }),
    );
    run("expire-exports", expireExports(createDb(env.DB), env.EXPORTS, at));
    run("former-decks", dropUnstudiedFormerDecks(createDb(env.DB), env.PRIVATE_IMAGES));
    run("purge-card-audio", purgeCardAudio(createDb(env.DB), env.AUDIO));
    // Hourly: each run reads the next slice of published decks to find the cards their pages show first. #759.
    if (at.getUTCMinutes() < 15) {
      const db = createDb(env.DB);
      run(
        "published-audio",
        voicePublishedDecks(
          db,
          {
            bucket: env.AUDIO,
            leadIns: leadInDependencies(env),
            providers: (language) => createSpeechProviders(env, language),
            analytics: ownerAnalytics(env, db, (work) => executionCtx.waitUntil(work)),
          },
          { at },
        ),
      );
    }
    // Hourly until its log reports nothing written; remove it once production's has. docs/operations.md.
    if (at.getUTCMinutes() < 15) {
      run(
        "stress-backfill",
        runStressBackfill(createDb(env.DB), { dryRun: false }).then((counts) =>
          console.log(JSON.stringify({ job: "stress-backfill", ...counts })),
        ),
      );
    }
    {
      const db = createDb(env.DB);
      const analytics = ownerAnalytics(env, db, (work) => executionCtx.waitUntil(work));
      run(
        "readwise",
        pullDueReadwise(
          db,
          (userId) => {
            const writer = analytics(userId);
            return { deps: readwiseDeps(env, writer), analytics: writer };
          },
          at,
        ).then(({ failed }) => {
          if (failed > 0) throw new Error(`${failed} Readwise pulls failed`);
        }),
      );
    }
    if (runsCanary(env)) run("canary", runCanary(env, at));
  },
} satisfies ExportedHandler<Bindings>;

export { EnrichWorkflow } from "./enrichment/workflow";
export { ExportWorkflow } from "./exports/workflow";
export { ImportWorkflow } from "./imports/workflow";
