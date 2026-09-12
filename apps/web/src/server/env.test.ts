import { describe, expect, it } from "vitest";
import { devToolsEnabled, isLoopbackUrl } from "./env";

describe("developer tools gate", () => {
  it("opens only for a loopback product origin", () => {
    expect(devToolsEnabled({ PRODUCT_URL: "http://localhost:5241" })).toBe(true);
    expect(devToolsEnabled({ PRODUCT_URL: "http://127.0.0.1:4173" })).toBe(true);
    expect(devToolsEnabled({ PRODUCT_URL: "https://my.lymi.app" })).toBe(false);
    expect(devToolsEnabled({ PRODUCT_URL: "https://localhost.lymi.app" })).toBe(false);
    expect(devToolsEnabled({ PRODUCT_URL: "not a url" })).toBe(false);
  });

  it("treats every loopback spelling the same", () => {
    expect(isLoopbackUrl("http://[::1]:5241")).toBe(true);
    expect(isLoopbackUrl("http://localhost")).toBe(true);
    expect(isLoopbackUrl("http://lymi.local")).toBe(false);
  });
});
