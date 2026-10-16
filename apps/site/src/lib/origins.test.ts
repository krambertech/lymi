import { describe, expect, it } from "vitest";
import { openLymiUrl, productUrl, signUpRedirect } from "./origins";

describe("openLymiUrl", () => {
  it("goes to the product root, which sends a session to Today and anyone else to sign-in", () => {
    expect(openLymiUrl()).toBe(productUrl("/"));
    expect(openLymiUrl("https://preview.example")).toBe("https://preview.example/");
  });
});

describe("signUpRedirect", () => {
  it("goes through the product root, so a session skips to Today, and keeps the link's campaign tags", () => {
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
