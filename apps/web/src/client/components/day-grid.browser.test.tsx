import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { DayGrid } from "./day-grid";

i18n.load("en", messages);
i18n.activate("en");

const TODAY = "2026-09-20";

const grid = (props: Partial<Parameters<typeof DayGrid>[0]> = {}) => (
  <I18nProvider i18n={i18n}>
    <div style={{ width: 600 }}>
      <DayGrid
        days={[{ date: "2026-09-14", attempts: 25, goal: 50, satisfied: false, outcome: "open" }]}
        today={TODAY}
        firstDay="2026-09-14"
        goal={50}
        {...props}
      />
    </div>
  </I18nProvider>
);

const scrollerIn = (root: Element) => {
  const el = root.querySelector<HTMLElement>(".snap-x");
  if (!el) throw new Error("the grid has no scroller");
  return el;
};

const atToday = (el: HTMLElement) =>
  Math.abs(el.scrollLeft) >= el.scrollWidth - el.clientWidth - 1 && el.scrollWidth > el.clientWidth;

test("a week of history is drawn inside a year, named by weekday, and opens on today", async () => {
  const view = await render(grid());

  // Every weekday row is named, so a cell can be placed without counting down from the top.
  const names = [...view.container.querySelectorAll("span.h-7")].map((s) => s.textContent);
  expect(names).toEqual(["M", "T", "W", "T", "F", "S", "S"]);

  // A constant frame: one week of history still fills a year of columns, every day of it drawn.
  expect(view.container.querySelectorAll("tbody tr")).toHaveLength(7);
  expect(view.container.querySelectorAll("tbody tr:first-child td")).toHaveLength(52);

  await expect
    .element(view.getByLabelText("Today, September 20: no reviews yet"))
    .toBeInTheDocument();
  await expect
    .element(view.getByLabelText("September 14: 25 reviews, goal missed"))
    .toBeInTheDocument();

  expect(atToday(scrollerIn(view.container))).toBe(true);
});

test("a day still to come reads as not yet, never as a day that was missed", async () => {
  // Today is a Monday, so the rest of its week is drawn ahead of it.
  const view = await render(grid({ today: "2026-09-14", firstDay: "2026-09-14" }));
  await expect.element(view.getByLabelText("September 20: not yet")).toBeInTheDocument();
});
