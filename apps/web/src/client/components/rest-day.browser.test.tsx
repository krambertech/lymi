import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import type { ReactNode } from "react";
import { useState } from "react";
import { describe, expect, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { decks, streak } from "../design/mock";
import { TodayView } from "../views/today-view";
import { StaticNavProvider } from "./nav-link";
import { SevenLights } from "./seven-lights";
import type { StreakSummary } from "./streak";
import { StreakCalendar } from "./streak-calendar";

i18n.load("en", messages);
i18n.activate("en");

const withI18n = (node: ReactNode) => render(<I18nProvider i18n={i18n}>{node}</I18nProvider>);

const met = () => ({ attempts: 50, satisfied: true, outcome: "goal_met" as const });

/** 6 to 23 September met, with rest on Monday 14, Sunday 20 and Wednesday 23; today is Thursday 24. */
function month() {
  const rest = new Set(["2026-09-14", "2026-09-20", "2026-09-23"]);
  const days = new Map<string, ReturnType<typeof met>>();
  for (let d = 6; d <= 22; d++) {
    const date = `2026-09-${String(d).padStart(2, "0")}`;
    if (!rest.has(date)) days.set(date, met());
  }
  return { rest, days };
}

/** The band drawn in a day's cell, found through the cell's spoken label. */
function bandOf(label: string) {
  const cell = [...document.querySelectorAll("td")].find((td) => td.textContent?.includes(label));
  const band = cell?.querySelector("i");
  if (!band) throw new Error(`no band for ${label}`);
  return getComputedStyle(band);
}

describe("a rest day in the month", () => {
  test("bridges the run with dashed edges and rounds off an end with nothing beside it", async () => {
    const { rest, days } = month();
    await withI18n(
      <StreakCalendar
        days={days}
        today="2026-09-24"
        month="2026-09"
        onMonth={() => {}}
        firstMonth="2026-09"
        rest={rest}
      />,
    );
    await expect.element(page.getByText("September 14: rest day")).toBeInTheDocument();
    await expect
      .element(page.getByText("A rest day keeps the streak through one missed day a week."))
      .toBeVisible();

    // Monday starts a week, so the band opens in a rounded dashed cap and carries on to Tuesday.
    const monday = bandOf("September 14: rest day");
    expect(monday.borderTopStyle).toBe("dashed");
    expect(monday.borderTopWidth).toBe("2px");
    expect(monday.borderLeftStyle).toBe("dashed");
    expect(Number.parseFloat(monday.borderTopLeftRadius)).toBeGreaterThan(0);
    expect(Number.parseFloat(monday.borderTopRightRadius)).toBe(0);

    // Sunday ends a week, so the cap is on the other side.
    const sunday = bandOf("September 20: rest day");
    expect(Number.parseFloat(sunday.borderTopLeftRadius)).toBe(0);
    expect(Number.parseFloat(sunday.borderTopRightRadius)).toBeGreaterThan(0);

    // Yesterday, with today still open, rounds off before today's ring.
    const yesterday = bandOf("September 23: rest day");
    expect(yesterday.borderRightStyle).toBe("dashed");
    expect(Number.parseFloat(yesterday.borderTopRightRadius)).toBeGreaterThan(0);

    // A counted day beside a rest day carries the dashes up to its ring.
    const tuesday = bandOf("September 15: goal reached");
    expect(tuesday.borderTopStyle).toBe("dashed");
  });

  test("shows no key in a month without a rest day", async () => {
    const { days } = month();
    await withI18n(
      <StreakCalendar
        days={days}
        today="2026-09-24"
        month="2026-09"
        onMonth={() => {}}
        firstMonth="2026-09"
        rest={new Set(["2026-08-30"])}
      />,
    );
    await expect.element(page.getByRole("heading", { name: "September 2026" })).toBeVisible();
    await expect
      .element(page.getByText("A rest day keeps the streak through one missed day a week."))
      .not.toBeInTheDocument();
  });
});

test("a rest day's glass has a dashed edge and still shows its progress", async () => {
  await withI18n(
    <SevenLights
      days={[50, 50, 50, 50, 50, 42, 0]}
      satisfied={[true, true, true, true, true, false, false]}
      rest={[false, false, false, false, false, true, false]}
      goals={[50, 50, 50, 50, 50, 50, 50]}
      dates={[
        "2026-09-18",
        "2026-09-19",
        "2026-09-20",
        "2026-09-21",
        "2026-09-22",
        "2026-09-23",
        "2026-09-24",
      ]}
      size="lg"
    />,
  );
  const lights = page.getByRole("img");
  await expect.element(lights).toHaveAccessibleName(/Wed 42, rest day/);
  const glasses = [...(lights.element() as HTMLElement).children].map(
    (day) => day.firstElementChild as HTMLElement,
  );
  const rest = getComputedStyle(glasses[5] as HTMLElement);
  expect(rest.borderTopStyle).toBe("dashed");
  expect(rest.borderTopWidth).toBe("2px");
  // 42 of 50 is past half the goal, so the light reaches the middle step.
  const light = glasses[5]?.firstElementChild as HTMLElement;
  expect(light.getBoundingClientRect().height).toBeGreaterThan(0);
  expect(getComputedStyle(glasses[4] as HTMLElement).borderTopStyle).not.toBe("dashed");
});

test("Today mentions yesterday's rest day until it is dismissed", async () => {
  const today = streak.today.date;
  const [y, m, d] = today.split("-").map(Number);
  const yesterday = new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, (d ?? 1) - 1))
    .toISOString()
    .slice(0, 10);
  const summary: StreakSummary = { ...streak, restDays: [yesterday] };

  function Harness() {
    const [dismissed, setDismissed] = useState(false);
    return (
      <StaticNavProvider path="/today">
        <TodayView
          decks={decks}
          streak={summary}
          restDismissed={dismissed}
          onDismissRest={() => setDismissed(true)}
        />
      </StaticNavProvider>
    );
  }
  await withI18n(<Harness />);

  await expect.element(page.getByText("Yesterday was a rest day")).toBeVisible();
  await expect
    .element(page.getByText(`Your ${summary.current}-day streak carries on.`))
    .toBeVisible();
  (page.getByRole("button", { name: "Dismiss" }).element() as HTMLElement).focus();
  await userEvent.keyboard("{Enter}");
  await expect.element(page.getByText("Yesterday was a rest day")).not.toBeInTheDocument();
  // Focus moves on to the next control rather than falling to the page.
  expect(document.activeElement?.tagName).toBe("A");
});
