import { describe, expect, it } from "vitest";
import {
  analyticsPath,
  carryFirstTouch,
  eventProperties,
  firstTouch,
  parseFirstTouch,
} from "./analytics";

describe("analytics privacy contract", () => {
  it("rejects unknown events and strips private fields", () => {
    expect(
      eventProperties("cards_added", {
        source: "typed",
        count: 2,
        email: "private@example.com",
        term: "private",
      }),
    ).toEqual({ source: "typed", count: 2 });
    expect(eventProperties("made_up", {})).toBeNull();
    expect(eventProperties("welcome_step_viewed", { step_name: "hello", skipped: false })).toEqual({
      step_name: "hello",
      skipped: false,
    });
    expect(eventProperties("onboarding_finished", { kind: "joined" })).toEqual({ kind: "joined" });
    expect(eventProperties("cards_added", { source: "typed", count: 1 }, "browser")).toBeNull();
    expect(eventProperties("$pageview", { pathname: "/today" }, "worker")).toBeNull();
    expect(eventProperties("review_graded", { mode: "term_to_meaning", grade: 4 })).toEqual({
      mode: "term_to_meaning",
      grade: 4,
    });
    expect(eventProperties("cards_added", { source: "private", count: -1 })).toBeNull();
  });
  it("keeps public slugs and replaces private route identifiers", () => {
    expect(analyticsPath("/library/private-deck", "product")).toBe("/library/:item");
    expect(analyticsPath("/reset-password/token", "product")).toBe("/other");
    expect(analyticsPath("/uk/explore/eesti-a1", "public")).toBe("/uk/explore/eesti-a1");
    expect(analyticsPath("/unknown/private", "public")).toBe("/other");
  });
  it("keeps only bounded campaign labels and the referrer hostname", () => {
    expect(
      firstTouch(
        "https://lymi.app/?utm_source=lenny&utm_term=private&token=secret&utm_campaign=email@example.com",
        "https://example.com/private?q=secret",
        "public",
      ),
    ).toEqual({ first_landing_page: "/", referrer: "example.com", utm_source: "lenny" });
    expect(
      firstTouch("https://lymi.app/", "https://my.lymi.app/private", "public"),
    ).not.toHaveProperty("referrer");
    expect(firstTouch("https://lymi.app/", "https://notlymi.app/private", "public").referrer).toBe(
      "notlymi.app",
    );
    expect(
      parseFirstTouch(
        JSON.stringify({
          first_landing_page: "/private?email=secret",
          referrer: "email@example.com",
        }),
      ),
    ).toEqual({ first_landing_page: "/other" });
    expect(parseFirstTouch("{not json")).toEqual({ first_landing_page: "/other" });
  });
  it("carries a public visit's source through a link and reads it back in the product", () => {
    const touch = firstTouch(
      "https://lymi.app/teachers?utm_source=reddit",
      "https://www.google.com/search?q=private",
      "public",
    );
    const link = carryFirstTouch(new URL("https://my.lymi.app/?mode=sign-up"), touch);
    expect(Object.fromEntries(link.searchParams)).toEqual({
      mode: "sign-up",
      lp: "/teachers",
      ref: "www.google.com",
      utm_source: "reddit",
    });
    expect(firstTouch(link.toString(), "https://lymi.app/teachers", "product")).toEqual({
      first_landing_page: "/teachers",
      referrer: "www.google.com",
      utm_source: "reddit",
    });
    const direct = carryFirstTouch(
      new URL("https://my.lymi.app/"),
      firstTouch("https://lymi.app/", "", "public"),
    );
    expect(direct.search).toBe("");
    const tagged = new URL("https://my.lymi.app/?utm_source=newsletter");
    expect(carryFirstTouch(tagged, touch).search).toBe("?utm_source=newsletter");
  });
  it("adds only a bounded referrer host and campaign labels to page views", () => {
    expect(
      eventProperties(
        "$pageview",
        { pathname: "/", referrer: "https://evil/?q=1", utm_source: "a b", utm_medium: "social" },
        "browser",
      ),
    ).toEqual({ pathname: "/", utm_medium: "social" });
  });
});
