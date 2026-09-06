import {
  DEFAULT_PRODUCT_ORIGIN,
  DEFAULT_PUBLIC_SITE_ORIGIN,
  isProductBrowserPath,
} from "../shared/origins";

export interface CanonicalOrigins {
  publicSite: string;
  product: string;
}

interface OriginConfiguration {
  PUBLIC_SITE_URL?: string;
  PRODUCT_URL?: string;
}

export type OriginRouteDecision =
  | { kind: "continue"; surface: "product" }
  | { kind: "redirect"; location: string; status: 308 }
  | { kind: "not-found"; status: 404 }
  | { kind: "misdirected"; status: 421 };

const PRODUCT_ASSETS = ["/assets/", "/brand/", "/icons/", "/workbox-"] as const;
const VITE_DEV_ASSETS = [
  "/@fs/",
  "/@id/",
  "/@vite/",
  "/@vite-plugin-pwa/",
  "/node_modules/",
  "/src/",
] as const;
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

function isProductAsset(pathname: string): boolean {
  return (
    PRODUCT_ASSET_FILES.has(pathname) || PRODUCT_ASSETS.some((root) => pathname.startsWith(root))
  );
}

function isViteDevelopmentAsset(pathname: string): boolean {
  return (
    pathname === "/@react-refresh" || VITE_DEV_ASSETS.some((root) => pathname.startsWith(root))
  );
}

function isLoopback(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function redirectTo(origin: string, url: URL): OriginRouteDecision {
  return {
    kind: "redirect",
    location: new URL(`${url.pathname}${url.search}`, origin).toString(),
    status: 308,
  };
}

/**
 * Keep the product Worker structurally product-only before Hono or the SPA fallback runs.
 * Public routes redirect to apps/site; any hostname except the configured product is rejected.
 */
export function decideOriginRoute(
  requestUrl: string,
  configured: CanonicalOrigins,
): OriginRouteDecision {
  const url = new URL(requestUrl);
  const productUrl = new URL(configured.product);
  const equivalentLoopback =
    isLoopback(productUrl.hostname) && isLoopback(url.hostname) && url.port === productUrl.port;

  if (url.hostname !== productUrl.hostname && !equivalentLoopback) {
    return { kind: "misdirected", status: 421 };
  }

  if (atOrBelow(url.pathname, "/docs") || url.pathname === "/join") {
    return redirectTo(configured.publicSite, url);
  }

  if (equivalentLoopback && isViteDevelopmentAsset(url.pathname)) {
    return { kind: "continue", surface: "product" };
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

export function responseForOriginDecision(decision: OriginRouteDecision): Response | null {
  if (decision.kind === "continue") return null;
  if (decision.kind === "redirect") return Response.redirect(decision.location, decision.status);
  return new Response(decision.kind === "misdirected" ? "Misdirected request" : "Not found", {
    status: decision.status,
    headers: { "cache-control": "no-store", "content-type": "text/plain; charset=utf-8" },
  });
}
