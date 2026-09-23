import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { useState } from "react";
import { expect, inject, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { deckCards } from "../design/mock";
import type { Section } from "../lib/api";
import { type FilterContext, type FilterSet, filterRows } from "../lib/card-filters";
import { FilterChips, FilterMenu } from "./deck-filter";

i18n.load("en", messages);
i18n.activate("en");

const desktop = inject("machine") === "desktop";

const sections = [
  { id: "s1", name: "Lesson 13", status: "open", total: 3, known: 1 },
  { id: "s2", name: "Lesson 14", status: "open", total: 4, known: 0 },
] as Section[];

const rows = deckCards.map((row, i) => ({
  ...row,
  card: { ...row.card, sectionId: i < 3 ? "s1" : i < 6 ? "s2" : null },
}));

/** The filter beside the count of rows it leaves, as the deck page wires it. */
function Harness() {
  const [filters, setFilters] = useState<FilterSet>([]);
  const ctx: FilterContext = { now: Date.now(), sections, rows, i18n };
  const shown = filterRows(rows, filters, "", ctx);
  return (
    <I18nProvider i18n={i18n}>
      <FilterMenu filters={filters} setFilters={setFilters} ctx={ctx} />
      <FilterChips filters={filters} setFilters={setFilters} ctx={ctx} />
      <output data-testid="count">{shown.length}</output>
    </I18nProvider>
  );
}

/** Opens from the keyboard, so focus has somewhere to return to: WebKit never focuses a tapped button. */
async function open(name: string) {
  const trigger = page.getByRole("button", { name, exact: true });
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

test("a field opens its values, several stay on, and the chip names them", async () => {
  await render(<Harness />);
  expect(count()).toBe("7");

  await open("Filter");
  await expect.element(menu()).toBeVisible();
  // Only fields the deck can be narrowed by: these cards share one language, so Language is out.
  const fields = menu()
    .getByRole("menuitem")
    .elements()
    .map((el) => el.textContent?.trim());
  expect(fields).toEqual([
    "State",
    "Due",
    "Section",
    "Tags",
    "Source",
    "Written by",
    "Missing",
    "Added",
    "Added by",
    "Last reviewed",
    "Forgotten",
  ]);

  await menu().getByRole("menuitem", { name: "State" }).click();
  const values = menu();
  await values.getByRole("menuitemcheckbox", { name: "New" }).click();
  await values.getByRole("menuitemcheckbox", { name: "Known" }).click();
  // The menu stays open while choosing, and the checks stay put.
  await expect
    .element(values.getByRole("menuitemcheckbox", { name: "Known" }))
    .toHaveAttribute("aria-checked", "true");
  expect(count()).toBe("5");

  // Back to the fields, where the field now says what is on.
  await values.getByRole("menuitem", { name: /^State/ }).click();
  expect(
    menu()
      .getByRole("menuitem", { name: /^State/ })
      .element().textContent,
  ).toContain("New, Known");
  await close();

  const chip = page.getByRole("button", { name: "State: New, Known", exact: true });
  await expect.element(chip).toBeVisible();
  // One field is one chip; Clear filters waits for a second.
  expect(page.getByRole("button", { name: "Clear filters" }).elements()).toHaveLength(0);
});

test("a radio field replaces its value, the chip reopens it, and ✕ takes the field off", async () => {
  await render(<Harness />);

  await open("Filter");
  await page.getByRole("menuitem", { name: "Section" }).click();
  await page.getByRole("menuitemcheckbox", { name: "Lesson 14" }).click();
  await close();
  expect(count()).toBe("3");

  await open("Filter");
  await page.getByRole("menuitem", { name: "Forgotten" }).click();
  await page.getByRole("menuitemradio", { name: "At least once" }).click();
  await page.getByRole("menuitemradio", { name: "Never" }).click();
  await expect
    .element(page.getByRole("menuitemradio", { name: "At least once" }))
    .toHaveAttribute("aria-checked", "false");
  await close();
  // No card of Lesson 14 has been forgotten, so the radio field narrows nothing here.
  expect(count()).toBe("3");

  // Two fields on: two chips in the order they were added, and Clear filters.
  const chips = page.getByRole("button", { name: /^(Section|Forgotten): / }).elements();
  expect(chips.map((el) => el.textContent)).toEqual(["Section: Lesson 14", "Forgotten: Never"]);

  // The chip reopens its own values without the field list in between.
  await open("Section: Lesson 14");
  const values = menu();
  await expect.element(values.getByRole("menuitemcheckbox", { name: "Lesson 13" })).toBeVisible();
  expect(values.getByRole("menuitem").elements()).toHaveLength(0);
  await values.getByRole("menuitemcheckbox", { name: "Lesson 13" }).click();
  await close();
  await expect
    .element(page.getByRole("button", { name: "Section: Lesson 13, Lesson 14", exact: true }))
    .toBeVisible();

  await page.getByRole("button", { name: "Remove Forgotten filter", exact: true }).click();
  expect(page.getByRole("button", { name: /^Forgotten: / }).elements()).toHaveLength(0);
  expect(count()).toBe("6");

  await open("Filter");
  await page.getByRole("menuitem", { name: "Missing" }).click();
  await page.getByRole("menuitemcheckbox", { name: "Picture" }).click();
  await close();
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  expect(count()).toBe("7");
  expect(page.getByRole("button", { name: /: / }).elements()).toHaveLength(0);
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
