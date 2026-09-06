import {
  DEFAULT_PRODUCT_ORIGIN,
  DEFAULT_PUBLIC_SITE_ORIGIN,
  isProductBrowserPath,
} from "../shared/origins";
import type { Bindings } from "./env";

export type Surface = "public" | "product";

export interface CanonicalOrigins {
  publicSite: string;
  product: string;
}

interface OriginConfiguration {
  PUBLIC_SITE_URL?: string;
  PRODUCT_URL?: string;
}

export type OriginRouteDecision =
  | { kind: "continue"; surface: Surface }
  | { kind: "redirect"; location: string; status: 308 }
  | { kind: "not-found"; status: 404 }
  | { kind: "misdirected"; status: 421 }
  | { kind: "retire-service-worker"; surface: "public" };

const PUBLIC_ASSETS = ["/assets/", "/brand/", "/icons/"] as const;
const PUBLIC_ASSET_FILES = new Set(["/favicon.ico", "/icon.svg", "/icon-ios.svg"]);
const PRODUCT_ASSETS = ["/assets/", "/brand/", "/icons/", "/workbox-"] as const;
const PRODUCT_ASSET_FILES = new Set([
  "/favicon.ico",
  "/icon.svg",
  "/icon-ios.svg",
  "/index.html",
  "/manifest.webmanifest",
  "/push-sw.js",
  "/registerSW.js",
  "/sw.js",
]);

function canonicalOrigin(value: string | undefined, fallback: string): string {
  try {
    const url = new URL(value ?? fallback);
    return url.protocol === "http:" || url.protocol === "https:" ? url.origin : fallback;
  } catch {
    return fallback;
  }
}

export function canonicalOrigins(env: OriginConfiguration): CanonicalOrigins {
  return {
    publicSite: canonicalOrigin(env.PUBLIC_SITE_URL, DEFAULT_PUBLIC_SITE_ORIGIN),
    product: canonicalOrigin(env.PRODUCT_URL, DEFAULT_PRODUCT_ORIGIN),
  };
}

function atOrBelow(pathname: string, root: string): boolean {
  return pathname === root || pathname.startsWith(`${root}/`);
}

function isPublicPage(pathname: string): boolean {
  return pathname === "/" || pathname === "/join" || atOrBelow(pathname, "/docs");
}

function isPublicAsset(pathname: string): boolean {
  return (
    PUBLIC_ASSET_FILES.has(pathname) || PUBLIC_ASSETS.some((root) => pathname.startsWith(root))
  );
}

function isProductAsset(pathname: string): boolean {
  return (
    PRODUCT_ASSET_FILES.has(pathname) || PRODUCT_ASSETS.some((root) => pathname.startsWith(root))
  );
}

function isLoopback(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function localSurface(pathname: string): Surface {
  return isPublicPage(pathname) || pathname === "/api/beta" ? "public" : "product";
}

function redirectTo(origin: string, url: URL): OriginRouteDecision {
  return {
    kind: "redirect",
    location: new URL(`${url.pathname}${url.search}`, origin).toString(),
    status: 308,
  };
}

/**
 * Make the hostname authoritative before Hono routes or the static-asset SPA fallback run.
 * The returned decision is pure so the complete production route matrix can be unit tested.
 */
export function decideOriginRoute(
  requestUrl: string,
  configured: CanonicalOrigins,
): OriginRouteDecision {
  const url = new URL(requestUrl);
  const publicUrl = new URL(configured.publicSite);
  const productUrl = new URL(configured.product);

  // Local development keeps both surfaces on one origin. Only a loopback-configured build may
  // accept another loopback spelling, so production never turns this into a host-header bypass.
  if (
    isLoopback(publicUrl.hostname) &&
    isLoopback(productUrl.hostname) &&
    isLoopback(url.hostname)
  ) {
    return { kind: "continue", surface: localSurface(url.pathname) };
  }

  if (url.hostname === publicUrl.hostname) {
    if (isProductBrowserPath(url.pathname)) return redirectTo(configured.product, url);
    if (url.pathname === "/sw.js") return { kind: "retire-service-worker", surface: "public" };
    if (
      isPublicPage(url.pathname) ||
      url.pathname === "/api/beta" ||
      url.pathname === "/robots.txt" ||
      url.pathname === "/sitemap.xml" ||
      isPublicAsset(url.pathname)
    ) {
      return { kind: "continue", surface: "public" };
    }
    return { kind: "not-found", status: 404 };
  }

  if (url.hostname === productUrl.hostname) {
    if (atOrBelow(url.pathname, "/docs") || url.pathname === "/join") {
      return redirectTo(configured.publicSite, url);
    }
    if (
      url.pathname === "/" ||
      isProductBrowserPath(url.pathname) ||
      atOrBelow(url.pathname, "/api") ||
      atOrBelow(url.pathname, "/mcp") ||
      atOrBelow(url.pathname, "/.well-known") ||
      url.pathname === "/robots.txt" ||
      isProductAsset(url.pathname)
    ) {
      return { kind: "continue", surface: "product" };
    }
    return { kind: "not-found", status: 404 };
  }

  return { kind: "misdirected", status: 421 };
}

export function surfaceFor(requestUrl: string, env: Bindings): Surface {
  const decision = decideOriginRoute(requestUrl, canonicalOrigins(env));
  return decision.kind === "continue" ? decision.surface : "product";
}

const RETIRE_SERVICE_WORKER = `/* Lymi moved its product service worker to my.lymi.app. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.map((name) => caches.delete(name)));
    await self.registration.unregister();
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    await Promise.all(windows.map((client) => client.navigate(client.url)));
  })());
});
`;

export function responseForOriginDecision(decision: OriginRouteDecision): Response | null {
  if (decision.kind === "continue") return null;
  if (decision.kind === "redirect") return Response.redirect(decision.location, decision.status);
  if (decision.kind === "retire-service-worker") {
    return new Response(RETIRE_SERVICE_WORKER, {
      headers: {
        "cache-control": "no-store",
        "content-type": "text/javascript; charset=utf-8",
        "service-worker-allowed": "/",
      },
    });
  }
  return new Response(decision.kind === "misdirected" ? "Misdirected request" : "Not found", {
    status: decision.status,
    headers: { "cache-control": "no-store", "content-type": "text/plain; charset=utf-8" },
  });
}
