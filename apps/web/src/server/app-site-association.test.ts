import { describe, expect, it } from "vitest";
import { testApp } from "./test-app";

describe("the apple-app-site-association file", () => {
  it("is missing until the phone app's ID is set", async () => {
    const app = await testApp();
    const response = await app.fetch("/.well-known/apple-app-site-association");
    expect(response.status).toBe(404);
  });

  it("opens join and add links in the phone app", async () => {
    const app = await testApp({ env: { APPLE_APP_ID: "TEAM123456.app.lymi.poc" } });
    const response = await app.fetch("/.well-known/apple-app-site-association");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toEqual({
      applinks: {
        details: [
          {
            appIDs: ["TEAM123456.app.lymi.poc"],
            components: [{ "/": "/join/*" }, { "/": "/add/*" }],
          },
        ],
      },
    });
  });
});
