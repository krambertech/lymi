import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import type { PublicDeckSummary } from "@lymi/core/catalog";
import { expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { ShellChrome } from "../components/layout/shell-chrome";
import { StaticNavProvider } from "../components/nav-link";
import { designChrome } from "../design/chrome";
import { ExploreView } from "./explore-view";

i18n.load("en", messages);
i18n.activate("en");

const deck = (
  slug: string,
  category: string | null,
  language: string | null,
): PublicDeckSummary => ({
  slug,
  name: slug,
  summary: "",
  category,
  tags: [],
  language,
  meaningLanguage: "en",
  cardCount: 3,
  sectionCount: 0,
  card: null,
});

const decks = [
  deck("periodic-table", "science", null),
  deck("spanish-a1", "languages", "es"),
  deck("estonian-a1", "languages", "et"),
  deck("estonian-a2", "languages", "et"),
  deck("road-signs", "driving", "et"),
  deck("ielts", "exams", "en"),
];

async function renderExplore(shown: PublicDeckSummary[] = decks) {
  await render(
    <I18nProvider i18n={i18n}>
      <ShellChrome value={designChrome()}>
        <StaticNavProvider path="/explore">
          <div className="@container/shell" style={{ width: 1000 }}>
            <ExploreView data={{ decks: shown, added: {} }} onAdd={() => {}} />
          </div>
        </StaticNavProvider>
      </ShellChrome>
    </I18nProvider>,
  );
}

test("shelves a language deck under its language and a subject deck under its subject, in order", async () => {
  await renderExplore();
  const headings = page.getByRole("heading", { level: 2 }).elements();
  expect(headings.map((heading) => heading.textContent)).toEqual([
    "Estonian",
    "Spanish",
    "Science",
    "Driving",
    "More decks",
  ]);
  // Every deck is on exactly one shelf.
  expect(page.getByRole("heading", { level: 3 }).elements()).toHaveLength(decks.length);
});

test("a chip per shelf, in shelf order, jumps to its shelf and leaves the address alone", async () => {
  await renderExplore();
  const chips = page.getByRole("navigation", { name: "Shelves" }).getByRole("link");
  expect(chips.elements().map((chip) => chip.textContent)).toEqual([
    "Estonian2",
    "Spanish1",
    "Science1",
    "Driving1",
    "More decks1",
  ]);
  const before = window.location.href;
  await page.getByRole("link", { name: /^Driving/ }).click();
  await expect.element(page.getByRole("heading", { name: "Driving", level: 2 })).toHaveFocus();
  expect(window.location.href).toBe(before);
});

test("a shelf of three decks or more shows one row and leads to its own page", async () => {
  const german = ["a", "b", "c", "d", "e", "f"].map((at) =>
    deck(`german-${at}`, "languages", "de"),
  );
  await renderExplore([...german, ...decks]);
  const shelf = page.getByRole("list", { name: "German decks" });
  // As many decks as 216 px tracks 22 px apart fit the shelf's width, and no more.
  const width = shelf.element().clientWidth;
  const fits = Math.floor((width + 22) / 238);
  expect(fits).toBeLessThan(german.length);
  expect(shelf.getByRole("listitem").elements()).toHaveLength(fits);
  await expect
    .element(page.getByRole("link", { name: /^See all/ }))
    .toHaveAttribute("href", "/explore/languages/german");
  // A shelf too small for a page keeps every deck and its count.
  expect(
    page.getByRole("list", { name: "Estonian decks" }).getByRole("listitem").elements(),
  ).toHaveLength(2);
});

test("All shelves lists the languages A to Z, then the subjects, and a pick jumps to its shelf", async () => {
  await renderExplore();
  await page.getByRole("button", { name: "All shelves" }).click();
  const menu = page.getByRole("menu", { name: "All shelves" });
  await expect.element(menu).toBeVisible();
  expect(
    menu
      .getByRole("menuitem")
      .elements()
      .map((item) => item.textContent),
  ).toEqual(["Estonian2", "Spanish1", "Science1", "Driving1", "More decks1"]);
  await menu.getByRole("menuitem", { name: /^Science/ }).click();
  await expect.element(page.getByRole("heading", { name: "Science", level: 2 })).toHaveFocus();
});

test("the chip for the shelf under the bar is marked as the current location", async () => {
  window.scrollTo(0, 0);
  await renderExplore();
  const bar = page.getByRole("navigation", { name: "Shelves" });
  const marked = () =>
    bar
      .getByRole("link")
      .elements()
      .filter((link) => link.getAttribute("aria-current") === "location");
  expect(marked()).toHaveLength(0);
  await bar.getByRole("link", { name: /^Driving/ }).click();
  await expect
    .element(bar.getByRole("link", { name: /^Driving/ }))
    .toHaveAttribute("aria-current", "location");
});
