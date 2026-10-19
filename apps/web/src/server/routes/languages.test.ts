import { LANGUAGE_FORMATS, LanguagesOut } from "@lymi/core";
import { beforeAll, describe, expect, it } from "vitest";
import { type TestApp, testApp } from "../test-app";

let app: TestApp;

beforeAll(async () => {
  app = await testApp();
  // Signing up settles Better Auth's background seeding, which each request otherwise races.
  await app.signUp("learner");
}, 60_000);

describe("GET /api/languages", () => {
  it("answers without a key, from the records, and may be cached", async () => {
    const response = await app.fetch("/api/languages");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("public, max-age=3600");
    const body = LanguagesOut.parse(await response.json());
    expect(body.languages).toEqual(LANGUAGE_FORMATS);
  });

  it("gives Japanese's bracket pattern, which matches its own sample", async () => {
    const { languages } = LanguagesOut.parse(await (await app.fetch("/api/languages")).json());
    const japanese = languages.find((language) => language.tag === "ja");
    const pattern = new RegExp(japanese?.example?.pattern ?? "$^", "gu");
    expect([...(japanese?.example?.sample ?? "").matchAll(pattern)].map((m) => m[1])).toEqual([
      "まいあさ",
      "た",
    ]);
    expect(japanese?.duplicates).toBe("term-and-reading");
  });

  it("is in the OpenAPI document with no security", async () => {
    const document = (await (await app.fetch("/api/openapi.json")).json()) as {
      paths: Record<string, { get?: { security?: unknown[]; tags?: string[] } }>;
    };
    expect(document.paths["/api/languages"]?.get).toMatchObject({
      security: [],
      tags: ["Languages"],
    });
  });
});
