import { Scalar } from "@scalar/hono-api-reference";
import type { Hono } from "hono";
import { openAPIRouteHandler } from "hono-openapi";
import type { AppEnv } from "./index";

/**
 * The OpenAPI document is generated from the route descriptions and the Zod schemas in
 * packages/core. Served at /api/openapi.json, with a reference UI at /api/docs. Both are
 * public: the document describes the API, it does not expose data.
 */
export function mountOpenApi(app: Hono<AppEnv>) {
  app.get(
    "/api/openapi.json",
    openAPIRouteHandler(app, {
      exclude: [/^\/api\/auth/, /^\/api\/audio/],
      documentation: {
        info: {
          title: "Lymi API",
          version: "1",
          description: [
            "The same API the Lymi app uses. Cards from here are ordinary cards: they land in a deck at once, ",
            'carry `createdBy: "api"`, and show up in Activity in the app so nothing lands unseen.',
            "",
            "**Authentication.** Send a personal API key in the `x-api-key` header. Make one in Settings. ",
            "A key has one scope: `read` lists and searches, `write` also adds, edits and archives. ",
            "Nothing a key holds can grade a review or manage keys; those are the learner's alone, from the app.",
            "",
            "**Duplicates.** Adding a term that already exists in the same language, in any of the learner's decks, ",
            "is skipped and reported, never rejected. Re-running a call is safe.",
            "",
            "**Removal.** Nothing is deleted. Cards are archived and can be restored.",
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
          { name: "Decks" },
          { name: "Cards" },
          { name: "Review" },
          { name: "Settings" },
          { name: "API keys", description: "Session only." },
          { name: "Account" },
        ],
      },
    }),
  );

  app.get(
    "/api/docs",
    Scalar({
      url: "/api/openapi.json",
      pageTitle: "Lymi API",
      theme: "default",
      hideClientButton: true,
    }),
  );
}
