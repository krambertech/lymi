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

describe("product origin routing", () => {
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
    "/join/AbCdEfGhIjKlMnOpQrStUvWxYz012345",
  ])("keeps the product contract on my.lymi.app: %s", (path) => {
    expect(decision(`https://my.lymi.app${path}`)).toEqual({
      kind: "continue",
      surface: "product",
    });
  });

  it.each(["/docs", "/docs/api?operation=cards", "/join?source=login"])(
    "redirects public routes to the site Worker: %s",
    (path) => {
      expect(decision(`https://my.lymi.app${path}`)).toEqual({
        kind: "redirect",
        location: `https://lymi.app${path}`,
        status: 308,
      });
    },
  );

  it.each(["/public-landing", "/sitemap.xml", "/apiish", "/unknown"])(
    "does not turn unknown public-looking paths into the product shell: %s",
    (path) => {
      expect(decision(`https://my.lymi.app${path}`)).toEqual({ kind: "not-found", status: 404 });
    },
  );

  it("rejects every hostname outside the explicit product allowlist", () => {
    expect(decision("https://lymi.app/")).toEqual({ kind: "misdirected", status: 421 });
    expect(decision("https://attacker.example/api/health")).toEqual({
      kind: "misdirected",
      status: 421,
    });
  });

  it("preserves the path and query when redirecting public routes", () => {
    const response = responseForOriginDecision(
      decision("https://my.lymi.app/docs/api?operation=cards"),
    );
    expect(response?.status).toBe(308);
    expect(response?.headers.get("location")).toBe("https://lymi.app/docs/api?operation=cards");
  });
});

describe("local product routing", () => {
  const local = {
    publicSite: "http://localhost:4174",
    product: "http://localhost:4173",
  } satisfies CanonicalOrigins;

  it("accepts another loopback spelling for the configured product port", () => {
    expect(decideOriginRoute("http://127.0.0.1:4173/review", local)).toEqual({
      kind: "continue",
      surface: "product",
    });
  });

  it.each([
    "/@vite/client",
    "/@vite-plugin-pwa/virtual:pwa-register",
    "/@react-refresh",
    "/src/client/main.tsx",
  ])("allows Vite development assets only on the configured loopback port: %s", (path) => {
    expect(decideOriginRoute(`http://127.0.0.1:4173${path}`, local)).toEqual({
      kind: "continue",
      surface: "product",
    });
    expect(decideOriginRoute(`https://my.lymi.app${path}`, origins)).toEqual({
      kind: "not-found",
      status: 404,
    });
  });

  it("redirects local documentation to the independently running public site", () => {
    expect(decideOriginRoute("http://127.0.0.1:4173/docs", local)).toEqual({
      kind: "redirect",
      location: "http://localhost:4174/docs",
      status: 308,
    });
  });
});
