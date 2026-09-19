/// <reference path="../worker-configuration.d.ts" />
/// <reference types="astro/client" />

import { handle } from "@astrojs/cloudflare/handler";
import { movedDeckPath, productAddPath } from "./lib/deck-page";
import { productUrl, signUpUrl } from "./lib/origins";

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

/** The waiting list the private beta ran on. Its links are shared, so they now open sign-up. */
const JOIN_PATHS = /^(?:\/(?:uk|ru))?\/join\/?$/;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
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

    if (url.pathname.startsWith("/api/")) return json({ error: "Not found" }, 404);

    if (JOIN_PATHS.test(url.pathname)) return Response.redirect(signUpUrl(), 301);

    // A deck used to live at /decks/<slug>. Those links are already shared, so they move rather
    // than break, and a search engine is told the address is permanent.
    const moved = movedDeckPath(url.pathname);
    if (moved) return Response.redirect(new URL(moved + url.search, url).toString(), 301);

    const add = productAddPath(url.pathname);
    if (add) return Response.redirect(productUrl(add + url.search), 301);

    return handle(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
