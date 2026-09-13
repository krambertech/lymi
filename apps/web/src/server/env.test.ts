import { describe, expect, it } from "vitest";
import { appPreviewEnabled, devToolsEnabled, isLoopbackUrl, withServedOrigin } from "./env";

describe("developer tools gate", () => {
  it("opens only for a loopback product origin", () => {
    expect(devToolsEnabled({ PRODUCT_URL: "http://localhost:5241" })).toBe(true);
    expect(devToolsEnabled({ PRODUCT_URL: "http://127.0.0.1:4173" })).toBe(true);
    expect(devToolsEnabled({ PRODUCT_URL: "https://my.lymi.app" })).toBe(false);
    expect(devToolsEnabled({ PRODUCT_URL: "https://localhost.lymi.app" })).toBe(false);
    expect(devToolsEnabled({ PRODUCT_URL: "not a url" })).toBe(false);
  });

  it("opens for a fully configured isolated app preview", () => {
    const preview = {
      PRODUCT_URL: "https://preview-lymi-app-pr-105.example.workers.dev",
      APP_PREVIEW: "true",
      APP_PREVIEW_KEY: "a-preview-capability-that-is-long-enough",
    };
    expect(appPreviewEnabled(preview)).toBe(true);
    expect(devToolsEnabled(preview)).toBe(true);
  });

  it("fails closed for non-preview remote configuration", () => {
    expect(
      appPreviewEnabled({
        PRODUCT_URL: "https://my.lymi.app",
        APP_PREVIEW: "true",
      }),
    ).toBe(false);
    expect(appPreviewEnabled({ PRODUCT_URL: "https://my.lymi.app", APP_PREVIEW: "true" })).toBe(
      false,
    );
  });

  it("lets the access middleware validate the preview capability", () => {
    expect(
      appPreviewEnabled({
        PRODUCT_URL: "https://preview-lymi-app-pr-105.example.workers.dev",
        APP_PREVIEW: "true",
      }),
    ).toBe(true);
  });

  it("treats every loopback spelling the same", () => {
    expect(isLoopbackUrl("http://[::1]:5241")).toBe(true);
    expect(isLoopbackUrl("http://localhost")).toBe(true);
    expect(isLoopbackUrl("http://lymi.local")).toBe(false);
  });
});

describe("served origin", () => {
  const local = { PRODUCT_URL: "http://localhost:5241", PUBLIC_SITE_URL: "http://localhost:4321" };

  it("follows the port a local request arrived on", () => {
    expect(withServedOrigin("http://localhost:56320/today", local)).toEqual({
      PRODUCT_URL: "http://localhost:56320",
      PUBLIC_SITE_URL: "http://localhost:4321",
    });
  });

  it("moves the site with the product when they share an origin", () => {
    const shared = {
      PRODUCT_URL: "http://localhost:5241",
      PUBLIC_SITE_URL: "http://localhost:5241",
    };
    expect(withServedOrigin("http://127.0.0.1:5300/", shared)).toEqual({
      PRODUCT_URL: "http://127.0.0.1:5300",
      PUBLIC_SITE_URL: "http://127.0.0.1:5300",
    });
  });

  it("never rewrites a non-loopback product or follows a non-loopback request", () => {
    const production = { PRODUCT_URL: "https://my.lymi.app" };
    expect(withServedOrigin("http://localhost:5241/", production)).toBe(production);
    expect(withServedOrigin("https://attacker.example/", local)).toBe(local);
    expect(withServedOrigin("http://localhost:5241/today", local)).toBe(local);
  });
});
