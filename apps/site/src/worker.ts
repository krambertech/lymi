/// <reference path="../worker-configuration.d.ts" />
/// <reference types="astro/client" />

import { handle } from "@astrojs/cloudflare/handler";
import { POSTHOG_PROXY_PATH, proxyPostHog } from "@lymi/core/posthog-proxy";
import { movedDeckPath, productAddPath } from "./lib/deck-page";
import {
  countsAsDownload,
  downloadCapture,
  downloadCaptureRequest,
  macDownload,
} from "./lib/mac-download";
import { productUrl, signUpRedirect, signUpUrl } from "./lib/origins";

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

/** The waiting list the private beta ran on. Its links are shared, so they now open sign-up. */
const JOIN_PATHS = /^(?:\/(?:uk|ru))?\/join\/?$/;

/** The address to share for signing up. It keeps its query, so a campaign's UTM tags arrive. */
const SIGN_UP_PATHS = /^(?:\/(?:uk|ru))?\/signup\/?$/;

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

    if (url.pathname.startsWith(`${POSTHOG_PROXY_PATH}/`)) {
      return proxyPostHog(request, {
        country: request.cf?.country,
        ip: request.headers.get("cf-connecting-ip"),
      });
    }

    if (url.pathname.startsWith("/api/")) return json({ error: "Not found" }, 404);

    const download = macDownload(url.pathname);
    if (download) {
      const capture =
        countsAsDownload(request) && downloadCapture(request, { timezone: request.cf?.timezone });
      if (capture) {
        const edge = { country: request.cf?.country, ip: request.headers.get("cf-connecting-ip") };
        ctx.waitUntil(proxyPostHog(downloadCaptureRequest(request, capture), edge));
      }
      return new Response(null, {
        status: 302,
        headers: { location: download.file, "cache-control": "no-store" },
      });
    }

    if (JOIN_PATHS.test(url.pathname)) return Response.redirect(signUpUrl(), 301);
    if (SIGN_UP_PATHS.test(url.pathname)) return Response.redirect(signUpRedirect(url.search), 302);

    // A deck used to live at /decks/<slug>. Those links are already shared, so they move rather
    // than break, and a search engine is told the address is permanent.
    const moved = movedDeckPath(url.pathname);
    if (moved) return Response.redirect(new URL(moved + url.search, url).toString(), 301);

    const add = productAddPath(url.pathname);
    if (add) return Response.redirect(productUrl(add + url.search), 301);

    return handle(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
