import { describe, expect, it } from "vitest";
import { cookiePrefix, devPersonaCookieName } from "./cookies";

describe("cookie names", () => {
  it.each(["https://my.lymi.app", "https://preview-lymi-app-pr-105.example.workers.dev"])(
    "keeps the production names on %s",
    (productUrl) => {
      expect(cookiePrefix(productUrl)).toBe("lymi");
      expect(devPersonaCookieName(productUrl)).toBe("lymi_dev_persona");
    },
  );

  it("names every cookie after the port on a loopback server", () => {
    expect(cookiePrefix("http://localhost:5241")).toBe("lymi-5241");
    expect(devPersonaCookieName("http://127.0.0.1:5300/")).toBe("lymi-5300_dev_persona");
  });

  it("gives two local servers different names", () => {
    expect(cookiePrefix("http://localhost:5241")).not.toBe(cookiePrefix("http://localhost:5242"));
    expect(cookiePrefix("http://localhost")).toBe("lymi-80");
  });
});
