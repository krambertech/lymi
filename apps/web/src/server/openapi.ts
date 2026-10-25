import { API_RESOURCES } from "@lymi/core/api-resources";
import type { Hono } from "hono";
import { openAPIRouteHandler } from "hono-openapi";
import { DEFAULT_PUBLIC_SITE_ORIGIN } from "../shared/origins";
import { errorResponse } from "./http";
import type { AppEnv } from "./index";

// hono-openapi leaves a resolver in `defaultOptions` unconverted on validator-first routes, so
// the shared 403 points at the Error component the route descriptions register.
const writeForbidden = {
  description: errorResponse(403).description,
  content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
};

/**
 * The OpenAPI document is generated from the route descriptions and the Zod schemas in
 * packages/core, and served at /api/openapi.json. It is public: the document describes the
 * API, it does not expose data.
 *
 * The reference people read is https://lymi.app/docs/api, rendered by the public-site app.
 * /api/docs redirects there so links already sent still land.
 */
export function mountOpenApi(app: Hono<AppEnv>) {
  app.use("/api/openapi.json", async (c, next) => {
    await next();
    const allowedOrigin = openApiCorsOrigin(c.req.header("origin"), c.env.PUBLIC_SITE_URL);
    if (allowedOrigin) {
      c.header("access-control-allow-origin", allowedOrigin);
      c.header("vary", "Origin", { append: true });
    }
  });

  app.get(
    "/api/openapi.json",
    openAPIRouteHandler(app, {
      exclude: [/^\/api\/auth/, /^\/api\/audio/],
      // Every write needs the write scope, so every non-read method can answer 403.
      defaultOptions: {
        POST: { responses: { 403: writeForbidden } },
        PATCH: { responses: { 403: writeForbidden } },
        PUT: { responses: { 403: writeForbidden } },
        DELETE: { responses: { 403: writeForbidden } },
      },
      documentation: {
        info: {
          title: "Lymi API",
          version: "1",
          description: [
            "The same API the Lymi app uses. Cards added here are ordinary cards: they land in a deck at ",
            'once and carry `createdBy: "api"`, so the app can always tell them apart from typed ones.',
            "",
            "**Authentication.** Send a personal API key in the `x-api-key` header. Make one in Settings. ",
            "A key has one scope: `read` lists and searches, `write` also adds, edits and archives. ",
            "Nothing a key holds can grade a review or manage keys; those are the learner's alone, from the app.",
            "",
            "**Duplicates.** Adding a term that already exists in the same language, in any of the learner's decks, ",
            "is skipped and reported, never rejected. Re-running a call is safe.",
            "",
            "**Removal.** Nothing is deleted. Cards are archived and can be restored.",
            "",
            `The guides are at ${new URL("/docs", DEFAULT_PUBLIC_SITE_ORIGIN).toString()}.`,
          ].join("\n"),
        },
        components: {
          securitySchemes: {
            apiKey: {
              type: "apiKey",
              in: "header",
              name: "x-api-key",
              description: "A personal key from Settings. Prefix `lymi_`.",
            },
            session: {
              type: "apiKey",
              in: "cookie",
              name: "__Secure-lymi.session_token",
              description: "The app's own session. Learner-only routes need this.",
            },
          },
        },
        security: [{ apiKey: [] }, { session: [] }],
        tags: API_RESOURCES.map(({ name, description }) => ({ name, description })),
      },
    }),
  );

  app.get("/api/docs", (c) =>
    c.redirect(new URL("/docs/api", c.env.PUBLIC_SITE_URL).toString(), 301),
  );
}

/** The docs may read the public schema; no other cross-origin browser caller is trusted. */
export function openApiCorsOrigin(
  requestOrigin: string | undefined,
  publicSiteUrl: string,
): string | null {
  const publicOrigin = new URL(publicSiteUrl).origin;
  return requestOrigin === publicOrigin ? publicOrigin : null;
}
