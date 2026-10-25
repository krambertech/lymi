import { describe, expect, it } from "vitest";
import { evalEnv, requireKeys } from "./eval-env";

describe("evalEnv", () => {
  it("reads the gateway URL from wrangler.jsonc, which .dev.vars does not carry", () => {
    const env = evalEnv({ AI_GATEWAY_TOKEN: "token" });
    expect(env.AI_GATEWAY_URL).toMatch(/^https:\/\/gateway\.ai\.cloudflare\.com\/v1\//);
    expect(env.AI_GATEWAY_TOKEN).toBe("token");
  });

  it("keeps a configured value over an empty .dev.vars line", () => {
    const env = evalEnv({ AI_GATEWAY_URL: "", AI_GATEWAY_ID: "other" });
    expect(env.AI_GATEWAY_URL).toMatch(/^https:/);
    expect(env.AI_GATEWAY_ID).toBe("other");
  });
});

describe("requireKeys", () => {
  it("names every missing key in one message", () => {
    expect(() =>
      requireKeys({ OPENAI_API_KEY: " " }, ["OPENAI_API_KEY", "AI_GATEWAY_TOKEN"], "record a run"),
    ).toThrow(
      "Set OPENAI_API_KEY and AI_GATEWAY_TOKEN in apps/web/.dev.vars to record a run. docs/local-dev.md says where each comes from.",
    );
  });

  it("passes when every key holds a value", () => {
    expect(() => requireKeys({ GEMINI_API_KEY: "key" }, ["GEMINI_API_KEY"], "write")).not.toThrow();
  });
});
