import { DeckOut, MeOut } from "@lymi/core";
import { beforeAll, describe, expect, it } from "vitest";
import { createDeck } from "./services/decks";
import { PRODUCT_URL, PUBLIC_SITE_URL, type Session, type TestApp, testApp } from "./test-app";

let app: TestApp;
let learner: Session;
let other: Session;

beforeAll(async () => {
  app = await testApp();
  learner = await app.signUp("learner");
  other = await app.signUp("other");
}, 60_000);

describe("the product origin", () => {
  it("disallows every crawler", async () => {
    const response = await app.fetch("/robots.txt");
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("User-agent: *\nDisallow: /\n");
    expect(response.headers.get("cache-control")).toBe("public, max-age=3600");
  });

  it("sends the root to sign-in, or to Today with a session", async () => {
    const signedOut = await app.fetch("/");
    expect(signedOut.status).toBe(302);
    expect(signedOut.headers.get("location")).toBe(`${PRODUCT_URL}/login`);

    const signedIn = await app.fetch("/", { as: learner });
    expect(signedIn.status).toBe(302);
    expect(signedIn.headers.get("location")).toBe(`${PRODUCT_URL}/today`);
  });

  it("refuses a path that belongs to no surface", async () => {
    const response = await app.fetch("/public-page-that-does-not-exist");
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("redirects the public pages to the site", async () => {
    for (const path of ["/docs/api", "/privacy", "/terms", "/support"]) {
      const response = await app.fetch(path);
      expect(response.status, path).toBe(308);
      expect(response.headers.get("location"), path).toBe(`${PUBLIC_SITE_URL}${path}`);
    }
  });

  it("rejects a request for another hostname", async () => {
    const response = await app.fetch("https://other.example/api/health");
    expect(response.status).toBe(421);
  });

  it("points the MCP resource metadata at the site's documents", async () => {
    const response = await app.fetch("/.well-known/oauth-protected-resource/mcp");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      resource_documentation: `${PUBLIC_SITE_URL}/docs/mcp`,
      resource_policy_uri: `${PUBLIC_SITE_URL}/privacy`,
      resource_tos_uri: `${PUBLIC_SITE_URL}/terms`,
    });
  });
});

describe("the API boundary", () => {
  it("needs a session or a key", async () => {
    const response = await app.fetch("/api/decks");
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Sign in required" });
  });

  it("answers an unknown API route as JSON", async () => {
    const response = await app.fetch("/api/nothing-here", { as: learner });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Not found" });
  });

  it("names the signed-in learner", async () => {
    const response = await app.fetch("/api/me", { as: learner });
    expect(response.status).toBe(200);
    expect(MeOut.parse(await response.json())).toMatchObject({
      id: learner.userId,
      email: learner.email,
    });
  });

  it("hides one learner's deck from another", async () => {
    const deck = await createDeck(
      { db: app.db, userId: learner.userId, actor: "user" },
      { name: "Italian" },
    );

    const own = await app.fetch(`/api/decks/${deck.id}`, { as: learner });
    expect(own.status).toBe(200);
    expect(DeckOut.parse(await own.json())).toMatchObject({ id: deck.id, name: "Italian" });

    const theirs = await app.fetch(`/api/decks/${deck.id}`, { as: other });
    expect(theirs.status).toBe(404);
  });
});
