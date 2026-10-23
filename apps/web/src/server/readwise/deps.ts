import { createTextProvider } from "../ai";
import type { HealthEnv } from "../dependency-health";
import { type Bindings, devToolsEnabled } from "../env";
import { type AnalyticsWriter, textCallReporter } from "../services/analytics";
import { enrichmentQueue } from "../services/enrichment";
import type { ReadwiseDeps } from "../services/readwise";
import { createReadwiseApi, type ReadwiseApi } from "./api";
import { createFakeReadwiseApi, DEV_READWISE_TOKEN } from "./dev-fake";

/** The real API, except that local development and previews answer the dev token themselves. */
function readwiseApi(env: Bindings): ReadwiseApi {
  const real = createReadwiseApi();
  if (!devToolsEnabled(env)) return real;
  const fake = createFakeReadwiseApi();
  const pick = (token: string) => (token === DEV_READWISE_TOKEN ? fake : real);
  return {
    accepts: (token) => pick(token).accepts(token),
    books: (token) => pick(token).books(token),
    recentHighlights: (token) => pick(token).recentHighlights(token),
    exportPage: (token, input) => pick(token).exportPage(token, input),
  };
}

export function readwiseDeps(
  env: Bindings & HealthEnv,
  analytics: AnalyticsWriter | undefined,
): ReadwiseDeps {
  return {
    api: readwiseApi(env),
    secret: env.BETTER_AUTH_SECRET,
    languages: createTextProvider(env, textCallReporter(analytics, "readwise_languages")),
    enrichment: enrichmentQueue(env),
  };
}
