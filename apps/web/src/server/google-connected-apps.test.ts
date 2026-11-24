import { describe, expect, it } from "vitest";
import { testApp } from "./test-app";

describe("the Google Connected Apps domain verification file", () => {
  it("is missing until a verification token is set", async () => {
    const app = await testApp();
    const response = await app.fetch("/.well-known/google-connected-apps");
    expect(response.status).toBe(404);
  });

  it("lists each token Google issued, without redirecting", async () => {
    const app = await testApp({
      env: { GOOGLE_CONNECTED_APPS_TOKENS: " first-token , second-token," },
    });
    const response = await app.fetch("/.well-known/google-connected-apps");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ verification_tokens: ["first-token", "second-token"] });
  });
});
