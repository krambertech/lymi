import { describe, expect, it, vi } from "vitest";
import worker from "./worker";

function setup() {
  const fetch = vi.fn(async (_request: Request) => new Response("design asset"));
  const env = {
    ASSETS: { fetch },
    CF_VERSION_METADATA: { id: "version-id", tag: "commit-sha", timestamp: "2026-10-17T00:00:00Z" },
  };
  return { env, fetch };
}

describe("design deployment", () => {
  it("identifies the active version without caching health", async () => {
    const { env, fetch } = setup();
    const response = await worker.fetch(new Request("https://design.lymi.app/api/health"), env);
    expect(await response.json()).toEqual({
      ok: true,
      name: "lymi-design",
      version: { id: "version-id", tag: "commit-sha", deployedAt: "2026-10-17T00:00:00Z" },
    });
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("opens the overview from the root", async () => {
    const { env } = setup();
    const response = await worker.fetch(new Request("https://design.lymi.app/"), env);
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/design");
  });
  it.each([
    "/design",
    "/design/",
    "/design/brand",
    "/design/components/overlays",
    "/design/frame/menu",
  ])("serves the design shell for a direct visit to %s", async (path) => {
    const { env, fetch } = setup();
    const response = await worker.fetch(new Request(`https://design.lymi.app${path}`), env);
    expect(response.status).toBe(200);
    expect(new URL(fetch.mock.calls[0]?.[0]?.url ?? "").pathname).toBe("/index.html");
  });
  it.each([
    "/api/me",
    "/api/dev/sign-in",
    "/today",
    "/sw.js",
    "/manifest.webmanifest",
    "/design/not-a-file.js",
  ])("does not serve product routes or PWA assets at %s", async (path) => {
    const { env, fetch } = setup();
    const response = await worker.fetch(new Request(`https://design.lymi.app${path}`), env);
    expect(response.status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("serves built assets and disallows search crawlers", async () => {
    const { env, fetch } = setup();
    await worker.fetch(new Request("https://design.lymi.app/assets/icon.svg"), env);
    expect(fetch).toHaveBeenCalledOnce();
    const robots = await worker.fetch(new Request("https://design.lymi.app/robots.txt"), env);
    expect(await robots.text()).toBe("User-agent: *\nDisallow: /\n");
  });
});
