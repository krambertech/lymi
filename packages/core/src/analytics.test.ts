import { describe, expect, it } from "vitest";
import {
  ATTRIBUTION_COOKIE,
  analyticsPath,
  CONSENT_COOKIE,
  CONSENT_MAX_AGE,
  eventProperties,
  firstTouch,
  readConsent,
  signupAttribution,
} from "./analytics";

const cookie = (name: string, value: unknown) =>
  `${name}=${encodeURIComponent(JSON.stringify(value))}`;
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
      signupAttribution(
        cookie(ATTRIBUTION_COOKIE, {
          first_landing_page: "/private?email=secret",
          referrer: "email@example.com",
        }),
      ),
    ).toEqual({ first_landing_page: "/other" });
  });
  it("fails closed on malformed, future, obsolete and expired choices", () => {
    const now = 1_800_000_000_000;
    const choice = { allowed: true, version: 1, updated_at: now };
    expect(readConsent(cookie(CONSENT_COOKIE, choice), now)).toEqual(choice);
    for (const invalid of [
      { ...choice, version: 2 },
      { ...choice, updated_at: now + 60_001 },
      { ...choice, updated_at: now - CONSENT_MAX_AGE * 1000 - 1 },
    ])
      expect(readConsent(cookie(CONSENT_COOKIE, invalid), now)).toBeNull();
    expect(readConsent(`${CONSENT_COOKIE}=%invalid`, now)).toBeNull();
  });
});
