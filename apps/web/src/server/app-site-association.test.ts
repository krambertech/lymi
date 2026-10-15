import { describe, expect, it } from "vitest";
import { testApp } from "./test-app";

describe("the apple-app-site-association file", () => {
  it("is missing until the phone app's ID is set", async () => {
    const app = await testApp();
    const response = await app.fetch("/.well-known/apple-app-site-association");
    expect(response.status).toBe(404);
  });

  it("opens join and add links in the phone app", async () => {
    const app = await testApp({ env: { APPLE_APP_ID: "TEAM123456.app.lymi" } });
    const response = await app.fetch("/.well-known/apple-app-site-association");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toEqual({
      applinks: {
        details: [
          {
            appIDs: ["TEAM123456.app.lymi"],
            components: [{ "/": "/join/*" }, { "/": "/add/*" }],
          },
        ],
      },
    });
  });
});

describe("the Android asset links file", () => {
  it("is missing until a signing certificate is set", async () => {
    const app = await testApp();
    const response = await app.fetch("/.well-known/assetlinks.json");
    expect(response.status).toBe(404);
  });

  it("vouches for each signing certificate of the phone app", async () => {
    const app = await testApp({ env: { ANDROID_CERT_FINGERPRINTS: " AA:BB , CC:DD," } });
    const response = await app.fetch("/.well-known/assetlinks.json");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toEqual([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "app.lymi",
          sha256_cert_fingerprints: ["AA:BB", "CC:DD"],
        },
      },
    ]);
  });
});
