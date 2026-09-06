import { describe, expect, it } from "vitest";
import {
  type CanonicalOrigins,
  canonicalOrigins,
  decideOriginRoute,
  responseForOriginDecision,
} from "./origin-routing";

const origins = {
  publicSite: "https://lymi.app",
  product: "https://my.lymi.app",
} satisfies CanonicalOrigins;

function decision(url: string) {
  return decideOriginRoute(url, origins);
}

describe("production origin routing", () => {
  it("falls back from malformed or non-HTTP origin configuration", () => {
    expect(
      canonicalOrigins({
        PUBLIC_SITE_URL: "data:text/plain,not-an-origin",
        PRODUCT_URL: "javascript:alert(1)",
      }),
    ).toEqual(origins);
  });

  it.each([
    "/",
    "/docs",
    "/docs/api?operation=cards",
    "/join",
    "/api/beta",
    "/robots.txt",
    "/sitemap.xml",
    "/assets/app.js",
  ])("keeps the public contract on lymi.app: %s", (path) => {
    expect(decision(`https://lymi.app${path}`)).toEqual({
      kind: "continue",
      surface: "public",
    });
  });

  it.each([
    "/",
    "/today",
    "/library/deck_1?card=card_2",
    "/login?returnTo=%2Flibrary",
    "/consent?client_id=https%3A%2F%2Fclient.example",
    "/api/health",
    "/api/openapi.json",
    "/mcp",
    "/.well-known/oauth-protected-resource/mcp",
    "/manifest.webmanifest",
    "/sw.js",
    "/robots.txt",
  ])("keeps the product contract on my.lymi.app: %s", (path) => {
    expect(decision(`https://my.lymi.app${path}`)).toEqual({
      kind: "continue",
      surface: "product",
    });
  });

  it.each([
    "/today?deck=italian",
    "/library/deck_1/settings?from=today",
    "/login?returnTo=%2Freview%3Fdeck%3Ddeck_1",
    "/consent?client_id=https%3A%2F%2Fclient.example",
  ])("permanently redirects old public product links with their query: %s", (path) => {
    expect(decision(`https://lymi.app${path}`)).toEqual({
      kind: "redirect",
      location: `https://my.lymi.app${path}`,
      status: 308,
    });
  });

  it.each(["/docs", "/docs/api?operation=cards", "/join?source=login"])(
    "redirects website routes away from the product origin: %s",
    (path) => {
      expect(decision(`https://my.lymi.app${path}`)).toEqual({
        kind: "redirect",
        location: `https://lymi.app${path}`,
        status: 308,
      });
    },
  );

  it.each([
    "/api/openapi.json",
    "/api/decks",
    "/mcp",
    "/.well-known/oauth-authorization-server",
    "/manifest.webmanifest",
    "/push-sw.js",
    "/unknown",
  ])("does not expose a legacy product contract on lymi.app: %s", (path) => {
    expect(decision(`https://lymi.app${path}`)).toEqual({ kind: "not-found", status: 404 });
  });

  it("rejects hosts outside the explicit allowlist", () => {
    expect(decision("https://attacker.example/api/health")).toEqual({
      kind: "misdirected",
      status: 421,
    });
  });

  it("serves a no-store self-retiring worker at the former public scope", async () => {
    const route = decision("https://lymi.app/sw.js");
    expect(route).toEqual({ kind: "retire-service-worker", surface: "public" });
    const response = responseForOriginDecision(route);
    expect(response?.headers.get("cache-control")).toBe("no-store");
    expect(response?.headers.get("service-worker-allowed")).toBe("/");
    await expect(response?.text()).resolves.toContain("registration.unregister");
  });
});

describe("local origin routing", () => {
  const local = {
    publicSite: "http://localhost:4173",
    product: "http://localhost:4173",
  } satisfies CanonicalOrigins;

  it("keeps website and product paths usable on one loopback origin", () => {
    expect(decideOriginRoute("http://127.0.0.1:4173/docs", local)).toEqual({
      kind: "continue",
      surface: "public",
    });
    expect(decideOriginRoute("http://127.0.0.1:4173/review", local)).toEqual({
      kind: "continue",
      surface: "product",
    });
  });
});
