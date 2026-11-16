import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  forgetOpenedReviewSessions,
  rememberReviewSessionOpened,
  reviewSessionAlreadyOpened,
} from "./opened";

const stored = new Map<string, string>();

beforeEach(() => {
  stored.clear();
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value),
    removeItem: (key: string) => stored.delete(key),
  });
  forgetOpenedReviewSessions();
});

afterEach(() => {
  forgetOpenedReviewSessions();
  vi.unstubAllGlobals();
});

it("remembers a review across a remount that forgets in-memory state", async () => {
  rememberReviewSessionOpened("2026-10-12:draw:0");
  expect(reviewSessionAlreadyOpened("2026-10-12:draw:0")).toBe(true);

  vi.resetModules();
  const remounted = await import("./opened");
  expect(remounted.reviewSessionAlreadyOpened("2026-10-12:draw:0")).toBe(true);
  expect(remounted.reviewSessionAlreadyOpened("2026-10-12:draw:5")).toBe(false);
});
