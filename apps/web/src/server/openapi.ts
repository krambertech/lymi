import type { Hono } from "hono";
import { openAPIRouteHandler } from "hono-openapi";
import { DEFAULT_PUBLIC_SITE_ORIGIN } from "../shared/origins";
import { errorResponse } from "./http";
import type { AppEnv } from "./index";

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
        POST: { responses: { 403: errorResponse(403) } },
        PATCH: { responses: { 403: errorResponse(403) } },
        PUT: { responses: { 403: errorResponse(403) } },
        DELETE: { responses: { 403: errorResponse(403) } },
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
              name: "lymi.session_token",
              description: "The app's own session. Learner-only routes need this.",
            },
          },
        },
        security: [{ apiKey: [] }, { session: [] }],
        tags: [
          { name: "Decks", description: "A deck holds cards and sets their defaults." },
          {
            name: "Cards",
            description:
              "One term and what the learner knows about it. Adding a term that already exists is skipped, never rejected.",
          },
          {
            name: "Review",
            description:
              "What is due, and what it would be scheduled to. Grading is the learner's alone.",
          },
          {
            name: "Pictures",
            description:
              "A card's one private picture: set from bytes or a public link, described, archived and restored.",
          },
          { name: "Settings", description: "The learner's own preferences." },
          {
            name: "API keys",
            description: "Session only: no key can list, mint or revoke another key.",
          },
          { name: "Account", description: "Who the credential belongs to." },
        ],
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
