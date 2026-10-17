import { describe, expect, it } from "vitest";
import {
  analyticsPath,
  backlogOf,
  carryFirstTouch,
  eventProperties,
  firstTouch,
  parseFirstTouch,
  textCallCost,
  withoutCarriedFirstTouch,
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
    expect(eventProperties("origin_badge_shown", { badge: "estonia" }, "browser")).toEqual({
      badge: "estonia",
    });
    expect(eventProperties("origin_badge_shown", { badge: "estonia" }, "worker")).toBeNull();
    // The phone sends its own openings, screens and review legs; outcomes stay the server's.
    expect(eventProperties("app_opened", { backlog: "1-20" }, "phone")).toEqual({
      backlog: "1-20",
    });
    expect(
      eventProperties("review_graded", { mode: "term_to_meaning", grade: 4 }, "phone"),
    ).toBeNull();
    expect(eventProperties("origin_badge_shown", { badge: "estonia" }, "phone")).toBeNull();
    expect(eventProperties("origin_badge_shown", { badge: "Europe/Tallinn" })).toBeNull();
    // A tag's name is the learner's own text, so only how it was added leaves the browser.
    expect(
      eventProperties("tag_added", { via: "suggestion", in_use: true, name: "food" }, "browser"),
    ).toEqual({ via: "suggestion", in_use: true });
    expect(eventProperties("tag_added", { via: "typed", in_use: false }, "worker")).toBeNull();
    // A play is the learner's own press, so the server never sends one, and the card stays behind.
    expect(
      eventProperties(
        "pronunciation_played",
        { outcome: "played", revealed: false, term: "farcela" },
        "phone",
      ),
    ).toEqual({ outcome: "played", revealed: false });
    expect(
      eventProperties("pronunciation_played", { outcome: "failed", revealed: true }, "worker"),
    ).toBeNull();
    expect(
      eventProperties(
        "cards_tagged",
        { cards: "1-20", added: 1, removed: 0, tags: ["food"] },
        "browser",
      ),
    ).toEqual({ cards: "1-20", added: 1, removed: 0 });
    expect(
      eventProperties(
        "deck_tag_changed",
        { action: "merge", channel: "app", cards: "1-20", from: "food" },
        "worker",
      ),
    ).toEqual({ action: "merge", channel: "app", cards: "1-20" });
    expect(
      eventProperties(
        "deck_tag_changed",
        { action: "archive", channel: "app", cards: "0" },
        "browser",
      ),
    ).toBeNull();
    expect(eventProperties("deck_filter_added", { kind: "tag", name: "food" }, "browser")).toEqual({
      kind: "tag",
    });
  });
  it("bands a backlog and sends an AI call's size without its text", () => {
    expect([0, 1, 20, 21, 100, 101].map(backlogOf)).toEqual([
      "0",
      "1-20",
      "1-20",
      "21-100",
      "21-100",
      "100+",
    ]);
    const call = {
      $ai_trace_id: "0b9d5d8e-4c1f-4d43-9a5b-3f0c2b6f1e11",
      $ai_session_id: null,
      $ai_span_name: "enrich",
      $ai_provider: "openai",
      $ai_model: "gpt-6-luna",
      $ai_input_tokens: 900,
      $ai_output_tokens: 120,
      $ai_latency: 2.5,
      $ai_is_error: false,
    };
    expect(
      eventProperties(
        "$ai_generation",
        { ...call, $ai_input: [{ content: "private" }], $ai_output_choices: ["private"] },
        "worker",
      ),
    ).toEqual(call);
    expect(eventProperties("$ai_generation", call, "browser")).toBeNull();
    const cost = textCallCost("gpt-6-luna", { input: 1_000_000, cached: 500_000, output: 200_000 });
    expect(cost?.input).toBeCloseTo(0.055);
    expect(cost?.output).toBeCloseTo(0.1);
    expect(textCallCost("unpriced-model", { input: 10, output: 10 })).toBeUndefined();
    const short = textCallCost("claude-haiku-5-5", { input: 100_000, output: 10_000 });
    expect(short?.input).toBeCloseTo(0.01);
    expect(short?.output).toBeCloseTo(0.005);
    const long = textCallCost("claude-haiku-5-5", { input: 200_000, output: 10_000 });
    expect(long?.input).toBeCloseTo(0.1);
    expect(long?.output).toBeCloseTo(0.025);
    expect(
      eventProperties("cards_archived", { origin: "ai_mcp", count: 3, ai_written: 2, term: "x" }),
    ).toEqual({ origin: "ai_mcp", count: 3, ai_written: 2 });
  });
  it("keeps public slugs and replaces private route identifiers", () => {
    expect(analyticsPath("/library/private-deck", "product")).toBe("/library/:item");
    expect(analyticsPath("/share", "product")).toBe("/share");
    expect(analyticsPath("/series-order", "product")).toBe("/series-order");
    expect(analyticsPath("/api-keys", "product")).toBe("/api-keys");
    expect(analyticsPath("/connected-apps", "product")).toBe("/connected-apps");
    expect(analyticsPath("/reset-password/token", "product")).toBe("/other");
    expect(analyticsPath("/you", "product")).toBe("/you");
    expect(analyticsPath("/uk/explore/eesti-a1", "public")).toBe("/uk/explore/eesti-a1");
    expect(analyticsPath("/ru/explore/languages/german", "public")).toBe(
      "/ru/explore/languages/german",
    );
    expect(analyticsPath("/uk/medicine", "public")).toBe("/uk/medicine");
    expect(analyticsPath("/certifications", "public")).toBe("/certifications");
    expect(analyticsPath("/tutor-lessons", "public")).toBe("/tutor-lessons");
    expect(analyticsPath("/notes-to-flashcards", "public")).toBe("/notes-to-flashcards");
    expect(analyticsPath("/ru/exams/einbuergerungstest", "public")).toBe(
      "/ru/exams/einbuergerungstest",
    );
    expect(analyticsPath("/uk/changelog/rest-days", "public")).toBe("/uk/changelog/rest-days");
    expect(analyticsPath("/changelog/rss.xml", "public")).toBe("/other");
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
      firstTouch("https://lymi.app/explore/languages/german", "", "public"),
    );
    expect(Object.fromEntries(direct.searchParams)).toEqual({ lp: "/explore/languages/german" });
    const tagged = new URL("https://my.lymi.app/?utm_source=newsletter");
    expect(carryFirstTouch(tagged, touch).search).toBe("?utm_source=newsletter");
  });
  it("keeps a deck door's source across the reload to sign-up", () => {
    const door = firstTouch(
      "https://my.lymi.app/add/everyday-estonian?lp=%2Fuk%2Fexplore%2Feveryday-estonian&ref=www.google.com",
      "https://lymi.app/uk/explore/everyday-estonian",
      "product",
    );
    const login = carryFirstTouch(new URL("https://my.lymi.app/login?mode=sign-up"), door);
    expect(
      firstTouch(login.toString(), "https://my.lymi.app/add/everyday-estonian", "product"),
    ).toEqual({ first_landing_page: "/uk/explore/everyday-estonian", referrer: "www.google.com" });

    const shared = firstTouch("https://my.lymi.app/join/secret-token", "", "product");
    const signUp = carryFirstTouch(new URL("https://my.lymi.app/login?mode=sign-up"), shared);
    expect(signUp.searchParams.get("lp")).toBe("/join/:item");
    expect(firstTouch(signUp.toString(), "", "product").first_landing_page).toBe("/join/:item");
    expect(firstTouch("https://my.lymi.app/login?lp=%2Freset-password%2Ft", "", "product")).toEqual(
      {
        first_landing_page: "/other",
      },
    );
  });
  it("drops only the carried source from the visible address", () => {
    expect(
      withoutCarriedFirstTouch(
        "https://lymi.app/teachers?lp=%2F&ref=www.google.com&utm_source=x#faq",
      ),
    ).toBe("/teachers?utm_source=x#faq");
    expect(withoutCarriedFirstTouch("https://lymi.app/teachers?utm_source=x")).toBeUndefined();
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
