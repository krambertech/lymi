import { UpdateRequiredOut } from "@lymi/core";
import { Hono } from "hono";
import { beforeAll, describe, expect, it } from "vitest";
import type { Bindings } from "./env";
import type { AppEnv } from "./index";
import {
  clientSupports,
  EXAMPLE_PINYIN_SINCE,
  leaveOutExamplePinyin,
  requireSupportedPhone,
  withoutExamplePinyin,
} from "./phone-clients";
import { type Session, type TestApp, testApp } from "./test-app";

const phone = (version: string) => ({
  "x-lymi-client": `platform=ios; version=${version}; build=7; update=0b1c`,
});

let app: TestApp;
let learner: Session;

beforeAll(async () => {
  app = await testApp({
    env: { PHONE_MINIMUM_VERSION_IOS: "1.2.0", PHONE_UPDATE_URL_IOS: "itms-beta://" },
  });
  learner = await app.signUp("phone-gate");
}, 60_000);

describe("the minimum phone version", () => {
  it("answers a release below it with 426, before sign-in or the session is read", async () => {
    for (const [path, as] of [
      ["/api/decks", learner],
      ["/api/decks", undefined],
      ["/api/auth/get-session", learner],
    ] as const) {
      const response = await app.fetch(path, { as, headers: phone("1.1.9") });
      expect({ path, status: response.status }).toEqual({ path, status: 426 });
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(UpdateRequiredOut.parse(await response.json())).toMatchObject({
        code: "update_required",
        updateUrl: "itms-beta://",
      });
    }
  });

  it("serves a release at or above it, and every request without the header, as before", async () => {
    for (const headers of [phone("1.2.0"), phone("1.10.0"), {}]) {
      const response = await app.fetch("/api/decks", { as: learner, headers });
      expect(response.status).toBe(200);
    }
    expect((await app.fetch("/api/decks", {})).status).toBe(401);
  });

  it("passes a header it cannot read, and a platform with no minimum", async () => {
    for (const header of ["platform=ios; version=old", "platform=android; version=0.0.1"]) {
      const response = await app.fetch("/api/decks", {
        as: learner,
        headers: { "x-lymi-client": header },
      });
      expect(response.status).toBe(200);
    }
  });

  it("takes effect from configuration alone, with no new app build", async () => {
    const { env } = app;
    try {
      delete env.PHONE_MINIMUM_VERSION_IOS;
      const unset = await app.fetch("/api/decks", { as: learner, headers: phone("0.0.1") });
      expect(unset.status).toBe(200);
      env.PHONE_MINIMUM_VERSION_IOS = "2.0.0";
      delete env.PHONE_UPDATE_URL_IOS;
      const raised = await app.fetch("/api/decks", { as: learner, headers: phone("1.2.0") });
      expect(raised.status).toBe(426);
      expect(UpdateRequiredOut.parse(await raised.json()).updateUrl).toBeUndefined();
    } finally {
      env.PHONE_MINIMUM_VERSION_IOS = "1.2.0";
      env.PHONE_UPDATE_URL_IOS = "itms-beta://";
    }
  });
});

describe("clientSupports", () => {
  // A route that adds a web-first value only for callers that can show it.
  const route = new Hono<AppEnv>()
    .use("/api/*", requireSupportedPhone)
    .get("/api/thing", (c) =>
      c.json({ kind: clientSupports(c, { ios: "1.3.0" }) ? "new" : "old" }),
    );
  const env = { PHONE_MINIMUM_VERSION_IOS: "1.0.0" } as Bindings;
  const kind = async (headers: Record<string, string>) =>
    ((await (await route.request("/api/thing", { headers }, env)).json()) as { kind: string }).kind;

  it("leaves a value out for a phone release that predates it", async () => {
    expect(await kind(phone("1.2.0"))).toBe("old");
    expect(await kind(phone("1.3.0"))).toBe("new");
    expect(await kind({})).toBe("new");
    expect(await kind({ "x-lymi-client": "platform=android; version=9.0.0" })).toBe("old");
  });
});

describe("example pinyin for an older phone", () => {
  const cards = {
    card: { example: "我去银行[yínháng]。", language: "zh" },
    results: [
      { card: { example: "行长[hángzhǎng]来了。", language: "zh-TW" } },
      { card: { example: "食[た]べる", language: "ja" } },
    ],
  };
  const route = new Hono<AppEnv>()
    .use("/api/*", requireSupportedPhone)
    .use("/api/*", leaveOutExamplePinyin)
    .get("/api/cards", (c) => c.json(cards, 200, { "x-lymi-test": "kept" }));
  const env = { PHONE_MINIMUM_VERSION_IOS: "0.0.1" } as Bindings;
  const fetched = (headers: Record<string, string>) =>
    route.request("/api/cards", { headers }, env);

  it("takes the pinyin out of each Chinese example, and leaves furigana and the response's headers", async () => {
    const response = await fetched(phone("0.0.2"));
    expect(response.headers.get("x-lymi-test")).toBe("kept");
    expect(await response.json()).toEqual({
      card: { example: "我去银行。", language: "zh" },
      results: [
        { card: { example: "行长来了。", language: "zh-TW" } },
        { card: { example: "食[た]べる", language: "ja" } },
      ],
    });
  });

  it("sends it to a release that draws it, and to every caller without the header", async () => {
    for (const headers of [phone(EXAMPLE_PINYIN_SINCE.ios as string), {}]) {
      expect(await (await fetched(headers)).json()).toEqual(cards);
    }
  });

  it("leaves a value that is not a card's example alone", () => {
    expect(withoutExamplePinyin({ example: "你好[nǐ hǎo]", language: "ko" })).toEqual({
      example: "你好[nǐ hǎo]",
      language: "ko",
    });
    expect(withoutExamplePinyin({ notes: "你好[nǐ hǎo]", language: "zh" })).toEqual({
      notes: "你好[nǐ hǎo]",
      language: "zh",
    });
  });
});
