import { handleFetch } from "./app";
import { createDb } from "./db";
import type { Bindings } from "./env";
import { dispatchReviewReminders } from "./push-delivery";
import { expireExports } from "./services/exports";
import { expireImports } from "./services/imports";

export type { AppEnv } from "./app";

// The app lives in app.ts so route tests can import it in Node: the Workflows exported below
// need `cloudflare:workers`, which only the Worker runtime provides. docs/testing.md.
export default {
  fetch: handleFetch,
  scheduled(controller: ScheduledController, env: Bindings, executionCtx: ExecutionContext) {
    executionCtx.waitUntil(
      dispatchReviewReminders(env, new Date(controller.scheduledTime)).then((result) => {
        if (result.failed > 0) throw new Error(`${result.failed} review reminder sends failed`);
      }),
    );
    executionCtx.waitUntil(
      expireImports(createDb(env.DB), env.IMPORTS, new Date(controller.scheduledTime)),
    );
    executionCtx.waitUntil(
      expireExports(createDb(env.DB), env.EXPORTS, new Date(controller.scheduledTime)),
    );
  },
} satisfies ExportedHandler<Bindings>;

export { EnrichWorkflow } from "./enrichment/workflow";
export { ExportWorkflow } from "./exports/workflow";
export { ImportWorkflow } from "./imports/workflow";
