import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import type { NextCards } from "@lymi/client/first-review";
import { useState } from "react";
import { beforeEach, expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { firstEndParts, type PlanStep, type Reminder, type ReminderControl } from "./first-plan";

i18n.load("en", messages);
i18n.activate("en");

const TOMORROW: NextCards = { days: 1, count: 25, date: "2026-11-02" };
const TUESDAY: NextCards = { days: 2, count: 6, date: "2026-11-03" };

function Flow({
  start = "goal",
  push = "off",
  answer = "on",
  next = TOMORROW,
  fresh = true,
  goalFailed = false,
}: {
  start?: PlanStep;
  push?: Reminder;
  answer?: Reminder;
  next?: NextCards | null;
  fresh?: boolean;
  goalFailed?: boolean;
}) {
  const [step, setStep] = useState(start);
  const [reminder, setReminder] = useState(push);
  const [goal, setGoal] = useState(25);
  const [turnedOn, setTurnedOn] = useState(false);
  const control: ReminderControl = {
    reminder,
    busy: false,
    turnedOn,
    turnOn: async () => {
      setReminder(answer);
      setTurnedOn(answer === "on");
      return answer;
    },
  };
  const parts = firstEndParts({
    step,
    onStep: setStep,
    cards: [{ term: "hola", language: "es", pronunciation: null }],
    next: next ?? undefined,
    fresh,
    goal,
    goalFailed,
    onGoal: setGoal,
    control,
    times: { morning: "08:00", lunch: "12:30", evening: "19:00" },
    part: "evening",
    onPart: () => {},
  });
  return (
    <I18nProvider i18n={i18n}>
      {parts.beat}
      {parts.foot}
    </I18nProvider>
  );
}

const next = () => page.getByRole("button", { name: "Next" }).click();
const heading = (name: string) => page.getByRole("heading", { name });

beforeEach(() => localStorage.clear());

test("walks time, reminder and goodbye, and repeats what was set", async () => {
  await render(<Flow />);
  await page.getByRole("radio", { name: /15 minutes/ }).click();
  await next();
  await expect.element(heading("When should we remind you?")).toBeVisible();
  await page.getByRole("button", { name: "Remind me at 19:00" }).click();
  await expect.element(heading("See you tomorrow")).toBeVisible();
  await expect.element(page.getByText("25 new cards will be ready.")).toBeVisible();
  await expect.element(page.getByText("15 minutes a day")).toBeVisible();
  await expect.element(page.getByText("Reminder at 19:00")).toBeVisible();
});

test.each(["on", "denied", "install", "none"] as const)(
  "skips the ask when push is %s",
  async (push) => {
    await render(<Flow push={push} />);
    await next();
    await expect.element(heading("See you tomorrow")).toBeVisible();
    await expect.element(page.getByText(/^Reminder at/)).not.toBeInTheDocument();
  },
);

test("a block at the browser's prompt is said, and Next moves on", async () => {
  await render(<Flow start="remind" answer="denied" />);
  await page.getByRole("button", { name: /Remind me/ }).click();
  await expect
    .element(page.getByText("Notifications are blocked.", { exact: false }))
    .toBeVisible();
  await next();
  await expect.element(heading("See you tomorrow")).toBeVisible();
});

test("Not now moves on without a reminder", async () => {
  await render(<Flow start="remind" />);
  await page.getByRole("button", { name: "Not now" }).click();
  await expect.element(heading("See you tomorrow")).toBeVisible();
  await expect.element(page.getByText(/^Reminder at/)).not.toBeInTheDocument();
});

test("a failed save stays on the ask, so it can be tried again", async () => {
  await render(<Flow start="remind" answer="error" />);
  await page.getByRole("button", { name: /Remind me/ }).click();
  await expect
    .element(page.getByText("Couldn’t turn the reminder on.", { exact: false }))
    .toBeVisible();
  await expect.element(page.getByRole("button", { name: /Remind me/ })).toBeVisible();
});

test("a goal that did not save says so", async () => {
  await render(<Flow goalFailed />);
  await expect.element(page.getByText("Couldn’t save that.", { exact: false })).toBeVisible();
});

test("a small deck names the day its cards come back, never tomorrow", async () => {
  await render(<Flow start="bye" next={TUESDAY} fresh={false} />);
  await expect.element(heading("See you on Tuesday")).toBeVisible();
  await expect.element(page.getByText("6 cards come back then.")).toBeVisible();
});

test("with no known next day it promises no day", async () => {
  await render(<Flow start="bye" next={null} fresh={false} />);
  await expect.element(heading("See you soon")).toBeVisible();
});
