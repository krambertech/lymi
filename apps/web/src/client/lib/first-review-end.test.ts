import type { AnalyticsProperties } from "@lymi/core/analytics";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Reminder } from "../components/first-plan";

const captureAnalytics = vi.hoisted(() => vi.fn());
vi.mock("./telemetry", () => ({ captureAnalytics }));

const eventProperties = (await import("@lymi/core/analytics")).eventProperties;
const { firstReviewEndSent, reminderProperties, reportFirstReviewEndLeft } = await import(
  "./first-review-end"
);
const { FIRST_REVIEW_END_LEFT_KEY } = await import("./storage-keys");

const stored = new Map<string, string>();

beforeEach(() => {
  stored.clear();
  captureAnalytics.mockReset();
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value),
    removeItem: (key: string) => stored.delete(key),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const CASES: {
  state: Reminder;
  reminder: "on" | "off" | "blocked" | "unavailable";
  reminder_reason?: AnalyticsProperties<"first_review_end_left">["reminder_reason"];
}[] = [
  { state: "on", reminder: "on" },
  { state: "install", reminder: "unavailable", reminder_reason: "install_required" },
  { state: "unsupported", reminder: "unavailable", reminder_reason: "push_unsupported" },
  { state: "setup_failed", reminder: "unavailable", reminder_reason: "setup_failed" },
  { state: "denied", reminder: "blocked", reminder_reason: "denied" },
  { state: "loading", reminder: "off", reminder_reason: "loading" },
  { state: "error", reminder: "off", reminder_reason: "error" },
  { state: "off", reminder: "off", reminder_reason: "off" },
  { state: "dismissed", reminder: "off", reminder_reason: "off" },
];

it.each(CASES)(
  "maps $state to reminder $reminder and reason $reminder_reason",
  ({ state, reminder, reminder_reason }) => {
    const properties = reminderProperties(state);
    expect(properties).toEqual(
      reminder_reason ? { reminder, reminder_reason } : { reminder: "on" },
    );
    const event = {
      step: "bye" as const,
      left: "done" as const,
      goal: 25,
      goal_changed: false,
      ...properties,
      tips_skipped: false,
    };
    expect(eventProperties("first_review_end_left", event, "browser")).toEqual(event);
  },
);

const payload = {
  step: "bye" as const,
  left: "done" as const,
  goal: 25,
  goal_changed: false,
  reminder: "off" as const,
  reminder_reason: "off" as const,
  tips_skipped: false,
};

it("sends first_review_end_left only once, even after a remount", async () => {
  reportFirstReviewEndLeft(payload);
  reportFirstReviewEndLeft({ ...payload, left: "closed" });
  expect(captureAnalytics).toHaveBeenCalledTimes(1);
  expect(captureAnalytics).toHaveBeenCalledWith("first_review_end_left", payload);

  // A remount forgets in-memory guards but keeps the tab's sessionStorage.
  vi.resetModules();
  captureAnalytics.mockReset();
  const remounted = await import("./first-review-end");
  remounted.reportFirstReviewEndLeft(payload);
  expect(captureAnalytics).not.toHaveBeenCalled();
});

it("marks the tab's first review as over once its end is left", () => {
  expect(firstReviewEndSent()).toBe(false);
  reportFirstReviewEndLeft(payload);
  expect(firstReviewEndSent()).toBe(true);
});

it("sends again once the tab's key is cleared, as a change of learner does", () => {
  reportFirstReviewEndLeft(payload);
  // clearPersistedLearnerState removes the key; nothing in memory may outlive it.
  sessionStorage.removeItem(FIRST_REVIEW_END_LEFT_KEY);
  expect(firstReviewEndSent()).toBe(false);
  reportFirstReviewEndLeft(payload);
  expect(captureAnalytics).toHaveBeenCalledTimes(2);
});
