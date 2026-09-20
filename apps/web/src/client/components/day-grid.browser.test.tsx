import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { DayGrid } from "./day-grid";

i18n.load("en", messages);
i18n.activate("en");

const TODAY = "2026-09-20";
type Day = Parameters<typeof DayGrid>[0]["days"][number];

const MISSED: Day = {
  date: "2026-09-14",
  attempts: 25,
  goal: 50,
  satisfied: false,
  outcome: "open",
};

const grid = (props: Partial<Parameters<typeof DayGrid>[0]> = {}) => (
  <I18nProvider i18n={i18n}>
    <div style={{ width: 600 }}>
      <DayGrid days={[MISSED]} today={TODAY} firstDay={MISSED.date} goal={50} {...props} />
    </div>
  </I18nProvider>
);

const cell = (name: string) => page.getByRole("button", { name, exact: true });

test("a week of history is drawn inside a year, named by weekday, and opens on today", async () => {
  const view = await render(grid());

  // Every weekday row is named, so a cell can be placed without counting down from the top.
  // The column is hidden from assistive technology, since each cell's own label carries its day.
  const weekdays = [...view.container.querySelectorAll('[aria-hidden="true"] > span')];
  expect(weekdays.map((s) => s.textContent)).toEqual(["M", "T", "W", "T", "F", "S", "S"]);

  // A constant frame: one week of history still fills a year of columns, every day of it drawn.
  expect(view.container.querySelectorAll("tbody tr")).toHaveLength(7);
  expect(view.container.querySelectorAll("tbody tr:first-child td")).toHaveLength(52);

  await expect.element(cell("Today, September 20: no reviews yet")).toBeInTheDocument();
  await expect.element(cell("September 14: 25 reviews, goal missed")).toBeInTheDocument();

  // Opens on today, which is at the far end of a field wider than the space it has.
  const scroller = page.getByRole("table").element().closest("div");
  if (!scroller) throw new Error("the grid has no scroller");
  expect(Math.abs(scroller.scrollLeft)).toBeGreaterThanOrEqual(
    scroller.scrollWidth - scroller.clientWidth - 1,
  );
});

test("a day still to come reads as not yet, never as a day that was missed", async () => {
  // Today is a Monday, so the rest of its week is drawn ahead of it.
  await render(grid({ today: "2026-09-14", firstDay: "2026-09-14" }));
  await expect.element(cell("September 20: not yet")).toBeInTheDocument();
});

test("a day the streak kept without filling is ringed, whatever kept it", async () => {
  const view = await render(
    grid({
      days: [
        { date: "2026-09-15", attempts: 0, goal: 50, satisfied: false, outcome: "nothing_due" },
        { date: "2026-09-16", attempts: 12, goal: 50, satisfied: true, outcome: "exhausted" },
      ],
      firstDay: "2026-09-15",
    }),
  );

  await expect.element(cell("September 15: nothing due")).toBeInTheDocument();
  await expect
    .element(cell("September 16: all due cards reviewed, 12 reviews"))
    .toBeInTheDocument();
  const ringed = view.container.querySelectorAll('[class*="inset_0_0_0_1.5px"]');
  expect(ringed).toHaveLength(2);
});

test("an import that carries a day past its goal drops the verdict, not the count", async () => {
  await render(
    grid({
      // The row's own reviews fell short and it stayed open; imported recalls made up the rest.
      days: [{ date: "2026-09-15", attempts: 64, goal: 50, satisfied: false, outcome: "open" }],
      firstDay: "2026-09-15",
    }),
  );

  await expect.element(cell("September 15: 64 reviews")).toBeInTheDocument();
});
