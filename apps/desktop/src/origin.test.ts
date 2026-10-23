import { describe, expect, it } from "vitest";
import { isLoopback, isProduct, leaving, productOrigin, productUrl } from "./origin.js";

const PRODUCT = "https://my.lymi.app";

describe("which product the app shows", () => {
  it("is production when packaged, whatever the environment says", () => {
    expect(productOrigin(true, "http://localhost:5263")).toBe(PRODUCT);
    expect(productOrigin(false, "http://localhost:5263/today")).toBe("http://localhost:5263");
    expect(productOrigin(false, undefined)).toBe(PRODUCT);
  });

  it("treats only a loopback origin as development", () => {
    expect(isLoopback("http://localhost:5263")).toBe(true);
    expect(isLoopback("http://127.0.0.1")).toBe(true);
    expect(isLoopback(PRODUCT)).toBe(false);
    expect(isLoopback("http://localhost.evil.example")).toBe(false);
  });
});

describe("the window's origin boundary", () => {
  it("accepts the product's own pages only", () => {
    expect(isProduct("https://my.lymi.app/desktop/add", PRODUCT)).toBe(true);
    expect(isProduct("https://lymi.app/explore", PRODUCT)).toBe(false);
    expect(isProduct("https://my.lymi.app.evil.example/", PRODUCT)).toBe(false);
    expect(isProduct(undefined, PRODUCT)).toBe(false);
    expect(isProduct("not a url", PRODUCT)).toBe(false);
  });

  it("resolves a path only when it stays in the product", () => {
    expect(productUrl("/library?card=1", PRODUCT)).toBe("https://my.lymi.app/library?card=1");
    expect(productUrl("//evil.example/today", PRODUCT)).toBeNull();
    expect(productUrl("https://evil.example/", PRODUCT)).toBeNull();
  });

  it("sends a sign-in to the browser, other web and mail links out, and drops the rest", () => {
    expect(leaving("https://my.lymi.app/today", PRODUCT)).toBe("stay");
    expect(leaving("https://accounts.google.com/o/oauth2", PRODUCT)).toBe("sign-in");
    expect(leaving("https://appleid.apple.com/auth", PRODUCT)).toBe("sign-in");
    expect(leaving("https://lymi.app/docs", PRODUCT)).toBe("browser");
    expect(leaving("mailto:hello@lymi.app", PRODUCT)).toBe("browser");
    expect(leaving("file:///etc/passwd", PRODUCT)).toBe("drop");
    expect(leaving("x-apple.systempreferences:com.apple.preference", PRODUCT)).toBe("drop");
  });
});
