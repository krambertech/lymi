import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { ShellChrome } from "../components/layout/shell-chrome";
import { StaticNavProvider } from "../components/nav-link";
import { designChrome } from "../design/chrome";
import { decks as mock } from "../design/mock";
import type { DeckSummary, Series } from "../lib/api";
import { BidiTrans } from "../lib/bidi";
import { type LibraryProps, LibraryView } from "./library-view";

i18n.load("en", messages);
i18n.activate("en");

const deck = (over: Partial<DeckSummary>): DeckSummary => ({
  ...(mock[0] as DeckSummary),
  ...over,
});

const decks = [
  deck({ id: "loose", name: "Coffee words", defaultLanguage: null, due: 0, total: 26 }),
  deck({ id: "w", name: "Eesti A1 · Words", defaultLanguage: "et", seriesId: "a1", due: 258 }),
  deck({ id: "p", name: "Eesti A1 · Phrases", defaultLanguage: "et", seriesId: "a1", due: 132 }),
];
const series: Series[] = [
  {
    id: "a1",
    name: "Eesti A1",
    position: 0,
    deckIds: ["w", "p"],
    total: 798,
    due: 390,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
  },
];

const renderLibrary = (props: Partial<LibraryProps> = {}) =>
  render(
    <I18nProvider i18n={i18n} defaultComponent={BidiTrans}>
      <ShellChrome value={designChrome()}>
        <StaticNavProvider path="/library">
          <div className="@container/shell" style={{ width: 1000 }}>
            <LibraryView decks={decks} series={series} onCreateDeck={() => {}} {...props} />
          </div>
        </StaticNavProvider>
      </ShellChrome>
    </I18nProvider>,
  );

test("a series names its decks without itself and reviews from a strip under its plate", async () => {
  await renderLibrary();
  const region = page.getByRole("region", { name: "Eesti A1" });
  await expect.element(region.getByRole("link", { name: /^Words/ })).toBeVisible();
  await expect.element(region.getByRole("link", { name: /^Phrases/ })).toBeVisible();

  const review = region.getByRole("link", { name: "Review Eesti A1, 390 cards due" });
  await expect.element(review).toBeVisible();
  // Review all comes after the decks, outside their list.
  const links = region.getByRole("link").elements();
  expect(links.at(-1)).toBe(review.element());
  expect(review.element().closest("ul")).toBeNull();

  // A deck with no language says only how big it is.
  await expect
    .element(page.getByRole("link", { name: /^Coffee words/ }))
    .toHaveTextContent("Coffee words26 cards");
});

test("search narrows Library by name, language or series, and says when nothing matches", async () => {
  await renderLibrary();
  await page.getByRole("button", { name: "Search decks" }).click();
  const field = page.getByRole("textbox", { name: "Search decks" });
  await expect.element(field).toHaveFocus();

  await userEvent.type(field, "phrases");
  await expect.element(page.getByRole("link", { name: /^Phrases/ })).toBeVisible();
  expect(page.getByRole("link", { name: /^Words/ }).elements()).toHaveLength(0);
  expect(page.getByRole("link", { name: /^Coffee words/ }).elements()).toHaveLength(0);
  // A screen reader hears how many decks are left.
  await expect.element(page.getByText("1 deck matches")).toBeInTheDocument();

  await userEvent.clear(field);
  await userEvent.type(field, "estonian");
  expect(page.getByRole("link", { name: /^(Words|Phrases)/ }).elements()).toHaveLength(2);

  await userEvent.clear(field);
  await userEvent.type(field, "sauna");
  await expect.element(page.getByText("No decks match “sauna”")).toBeVisible();
  await page.getByRole("button", { name: "Clear search" }).click();
  await expect.element(page.getByRole("link", { name: /^Coffee words/ })).toBeVisible();
});

test("the open search closes from its X and gives focus back to its button", async () => {
  await renderLibrary();
  await page.getByRole("button", { name: "Search decks" }).click();
  await userEvent.type(page.getByRole("textbox", { name: "Search decks" }), "eesti");
  await page.getByRole("button", { name: "Close search" }).click();

  expect(page.getByRole("textbox", { name: "Search decks" }).elements()).toHaveLength(0);
  await expect.element(page.getByRole("button", { name: "Search decks" })).toHaveFocus();
  await expect.element(page.getByRole("link", { name: /^Coffee words/ })).toBeVisible();
});

test("a series' menu makes a new deck inside that series", async () => {
  const onCreateDeckInSeries = vi.fn();
  await renderLibrary({ onCreateDeckInSeries });
  await page.getByRole("button", { name: "Options for Eesti A1" }).click();
  await page.getByRole("menuitem", { name: "New deck" }).click();
  expect(onCreateDeckInSeries).toHaveBeenCalledWith(series[0]);
});
