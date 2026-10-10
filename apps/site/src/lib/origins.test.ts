import { describe, expect, it } from "vitest";
import { openLymiUrl, productUrl, signUpRedirect } from "./origins";

describe("openLymiUrl", () => {
  it("asks the product root for sign-up, which a session skips for Today", () => {
    expect(openLymiUrl()).toBe(productUrl("/?mode=sign-up"));
    expect(openLymiUrl("https://preview.example")).toBe("https://preview.example/?mode=sign-up");
  });
});

describe("signUpRedirect", () => {
  it("goes through the product root, like Open Lymi, and keeps the link's campaign tags", () => {
    const url = new URL(signUpRedirect("?utm_source=newsletter&utm_campaign=autumn"));
    expect(url.origin + url.pathname).toBe(productUrl("/"));
    expect(url.searchParams.get("mode")).toBe("sign-up");
    expect(url.searchParams.get("utm_source")).toBe("newsletter");
    expect(url.searchParams.get("utm_campaign")).toBe("autumn");
  });

  it("never lets the query switch the form away from sign-up", () => {
    expect(new URL(signUpRedirect("?mode=sign-in")).searchParams.getAll("mode")).toEqual([
      "sign-up",
    ]);
  });
});
