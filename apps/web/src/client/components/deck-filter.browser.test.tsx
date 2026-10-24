import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import type { FilterContext } from "@lymi/client/deck-filters";
import { type DeckFilters, filterRows, noFilters } from "@lymi/client/deck-list";
import { useState } from "react";
import { expect, inject, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { deckCards } from "../design/mock";
import type { Section } from "../lib/api";
import { FilterChips, FilterMenu } from "./deck-filter";

i18n.load("en", messages);
i18n.activate("en");

const desktop = inject("machine") === "desktop";

const sections = [
  { id: "s1", name: "Lesson 13", status: "open", total: 3, known: 1 },
  { id: "s2", name: "Lesson 14", status: "open", total: 4, known: 0 },
] as Section[];

// Three cards in Lesson 13, three in Lesson 14, one loose; the first two carry the mark.
const rows = deckCards.map((row, i) => ({
  ...row,
  card: { ...row.card, sectionId: i < 3 ? "s1" : i < 6 ? "s2" : null, important: i < 2 },
}));

/** The filter beside the count of rows it leaves, as the deck page wires it. */
function Harness() {
  const [filters, setFilters] = useState<DeckFilters>(noFilters);
  const now = Date.now();
  const ctx: FilterContext = { rows, sections, now };
  const shown = filterRows(rows, filters, "", now, sections);
  return (
    <I18nProvider i18n={i18n}>
      <FilterMenu filters={filters} setFilters={setFilters} ctx={ctx} />
      <FilterChips filters={filters} setFilters={setFilters} ctx={ctx} />
      <output data-testid="count">{shown.length}</output>
    </I18nProvider>
  );
}

/** Opens from the keyboard, so focus has somewhere to return to: WebKit never focuses a tapped button. */
async function open(name: string | RegExp) {
  const trigger = page.getByRole("button", { name, exact: typeof name === "string" });
  (trigger.element() as HTMLElement).focus();
  await userEvent.keyboard("{Enter}");
}

const count = () => page.getByTestId("count").element().textContent;
// One menu is open at a time. On a desktop Base UI names it after its trigger, not the label.
const menu = () => page.getByRole("menu");
/** Escape, then wait for the menu to be gone, since a closing popup still answers to its role. */
async function close() {
  await userEvent.keyboard("{Escape}");
  await expect.element(page.getByRole("menu")).not.toBeInTheDocument();
}

test("a field opens its values with what each keeps, several stay on, and the chip names them", async () => {
  await render(<Harness />);
  expect(count()).toBe("7");

  await open("Filter");
  await expect.element(menu()).toBeVisible();
  const fields = menu()
    .getByRole("menuitem")
    .elements()
    .map((el) => el.textContent?.trim());
  expect(fields).toEqual(["State", "Due", "Section", "Tags"]);
  // Important is a flag, so it ticks on the first level rather than opening a list of one.
  await expect.element(menu().getByRole("menuitemcheckbox", { name: /^Important/ })).toBeVisible();

  await menu().getByRole("menuitem", { name: "State" }).click();
  const values = menu();
  // Each value says how many cards it keeps: two new cards among the seven.
  expect(values.getByRole("menuitemcheckbox", { name: /^New/ }).element().textContent).toMatch(
    /2$/,
  );
  await values.getByRole("menuitemcheckbox", { name: /^New/ }).click();
  await values.getByRole("menuitemcheckbox", { name: /^Known/ }).click();
  // The menu stays open while choosing, and the checks stay put.
  await expect
    .element(values.getByRole("menuitemcheckbox", { name: /^Known/ }))
    .toHaveAttribute("aria-checked", "true");
  expect(count()).toBe("5");

  // Back to the fields, where the field now counts what is on.
  await values.getByRole("menuitem", { name: "Back to all filters" }).click();
  await expect
    .element(menu().getByRole("menuitem", { name: "State, 2 chosen", exact: true }))
    .toBeVisible();
  await close();

  await expect
    .element(page.getByRole("button", { name: "State: New, Known", exact: true }))
    .toBeVisible();
  // The button counts the fields that are on; one field is one chip, and Clear filters waits for a second.
  await expect
    .element(page.getByRole("button", { name: "Filter, 1 filter on", exact: true }))
    .toBeVisible();
  expect(page.getByRole("button", { name: "Clear filters" }).elements()).toHaveLength(0);
});

test("a one-of field offers Any first, a chip reopens its field, and ✕ takes it off", async () => {
  await render(<Harness />);

  await open("Filter");
  await page.getByRole("menuitem", { name: "Section" }).click();
  await page.getByRole("menuitemcheckbox", { name: /^Lesson 14/ }).click();
  await close();
  expect(count()).toBe("3");

  await open(/^Filter/);
  await page.getByRole("menuitem", { name: "Due" }).click();
  await expect
    .element(page.getByRole("menuitemradio", { name: /^Any time/ }))
    .toHaveAttribute("aria-checked", "true");
  await page.getByRole("menuitemradio", { name: /^Today/ }).click();
  await page.getByRole("menuitemradio", { name: /^This week/ }).click();
  await expect
    .element(page.getByRole("menuitemradio", { name: /^Today/ }))
    .toHaveAttribute("aria-checked", "false");
  await close();

  // Two fields on: two chips in the menu's order, and Clear filters.
  const chips = page.getByRole("button", { name: /^(Section|Due): / }).elements();
  expect(chips.map((el) => el.textContent)).toEqual(["Due: This week", "Section: Lesson 14"]);

  // The chip reopens its own values without the field list in between.
  await open("Section: Lesson 14");
  const values = menu();
  await expect.element(values.getByRole("menuitemcheckbox", { name: /^Lesson 13/ })).toBeVisible();
  expect(values.getByRole("menuitem").elements()).toHaveLength(0);
  await values.getByRole("menuitemcheckbox", { name: /^Lesson 13/ }).click();
  await close();
  await expect
    .element(page.getByRole("button", { name: "Section: Lesson 13, Lesson 14", exact: true }))
    .toBeVisible();

  await page.getByRole("button", { name: "Remove filter: Due: This week", exact: true }).click();
  expect(page.getByRole("button", { name: /^Due: / }).elements()).toHaveLength(0);
  expect(count()).toBe("6");

  await open(/^Filter/);
  await page.getByRole("menuitemcheckbox", { name: /^Important/ }).click();
  await close();
  await expect
    .element(page.getByRole("button", { name: "Remove filter: Important", exact: true }))
    .toBeVisible();
  expect(count()).toBe("2");
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  expect(count()).toBe("7");
  expect(page.getByRole("button", { name: /^Remove filter/ }).elements()).toHaveLength(0);
});

test("the arrow keys step into a field and back out to it", async () => {
  await render(<Harness />);
  await open("Filter");
  await expect.element(menu()).toBeVisible();
  const state = menu().getByRole("menuitem", { name: "State" });
  (state.element() as HTMLElement).focus();

  await userEvent.keyboard("{ArrowRight}");
  await expect.element(menu().getByRole("menuitemcheckbox", { name: /^New/ })).toHaveFocus();
  await userEvent.keyboard("{ArrowLeft}");
  await expect.element(menu().getByRole("menuitem", { name: "State" })).toHaveFocus();
  await close();
});

test("the menu takes the machine's shape", async () => {
  await render(<Harness />);
  await open("Filter");
  await expect.element(menu()).toBeVisible();
  if (desktop) {
    expect(page.getByRole("dialog").elements()).toHaveLength(0);
  } else {
    await expect.element(page.getByRole("dialog", { name: "Filter" })).toBeVisible();
  }
  await close();
});
