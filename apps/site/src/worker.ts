/// <reference path="../worker-configuration.d.ts" />

import { BetaSignupInput } from "@lymi/core";
import { createDb } from "./db";
import { BetaSignupUnavailable, joinBeta } from "./services/beta";

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

async function joinBetaRequest(request: Request, env: Env): Promise<Response> {
  if (!/^application\/json\b/i.test(request.headers.get("content-type") ?? "")) {
    return json({ error: "Send a JSON body with content-type: application/json" }, 400);
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return json({ error: "The signup body is not valid JSON" }, 400);
  }

  const parsed = BetaSignupInput.safeParse(input);
  if (!parsed.success) {
    return json({ error: "Enter a valid email address", issues: parsed.error.issues }, 400);
  }

  try {
    return json(await joinBeta(createDb(env.DB), parsed.data));
  } catch (error) {
    if (error instanceof BetaSignupUnavailable) return json({ error: error.message }, 503);
    throw error;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health" && request.method === "GET") {
      return json({
        ok: true,
        name: "lymi-site",
        time: new Date().toISOString(),
        version: {
          id: env.CF_VERSION_METADATA.id,
          tag: env.CF_VERSION_METADATA.tag || null,
          deployedAt: env.CF_VERSION_METADATA.timestamp,
        },
      });
    }

    if (url.pathname === "/api/beta" && request.method === "POST") {
      return joinBetaRequest(request, env);
    }

    if (url.pathname.startsWith("/api/")) return json({ error: "Not found" }, 404);
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
