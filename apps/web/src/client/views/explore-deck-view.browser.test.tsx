import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import type { ExploreDeckOut, PublicDeckSummary } from "@lymi/core/catalog";
import { expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { ShellChrome } from "../components/layout/shell-chrome";
import { StaticNavProvider } from "../components/nav-link";
import { designChrome } from "../design/chrome";
import { ExploreDeckView } from "./explore-deck-view";

i18n.load("en", messages);
i18n.activate("en");

const related = (slug: string, name: string): PublicDeckSummary => ({
  slug,
  name,
  summary: "Words for the road.",
  level: null,
  category: "languages",
  tags: ["travel"],
  language: "es",
  meaningLanguage: "en",
  cardCount: 20,
  sectionCount: 0,
  card: null,
});

const data = (over: Partial<ExploreDeckOut> = {}): ExploreDeckOut => ({
  deck: {
    slug: "spanish-travel",
    name: "Spanish for travel",
    summary: "What you need at the station and the hotel.",
    level: null,
    tags: ["travel", "beginner"],
    language: "es",
    meaningLanguage: "en",
    originalMeaningLanguage: "en",
    editions: ["en"],
    publisher: "Lymi",
    publisherAvatar: null,
    sources: [],
    reviewedAt: null,
    revision: 1,
    publishedAt: "2026-09-20T12:00:00.000Z",
    cardCount: 1,
    sections: [
      { name: null, cards: [{ term: "billete", meaning: "ticket", modes: ["term_to_meaning"] }] },
    ],
  },
  deckId: null,
  related: [related("spanish-food", "Spanish food"), related("italian-travel", "Italian travel")],
  ...over,
});

const renderDeck = (value: ExploreDeckOut) =>
  render(
    <I18nProvider i18n={i18n}>
      <ShellChrome value={designChrome()}>
        <StaticNavProvider path="/explore/spanish-travel">
          <div className="@container/shell" style={{ width: 1000 }}>
            <ExploreDeckView data={value} onAdd={() => {}} />
          </div>
        </StaticNavProvider>
      </ShellChrome>
    </I18nProvider>,
  );

test("shows the deck's tags as plain chips, in the reader's language", async () => {
  await renderDeck(data());
  const tags = page.getByRole("list", { name: "Tags" });
  await expect.element(tags).toBeVisible();
  expect(
    tags
      .getByRole("listitem")
      .elements()
      .map((item) => item.textContent),
  ).toEqual(["Travel", "For beginners"]);
  expect(tags.getByRole("link").elements()).toHaveLength(0);
});

test("leads to each related deck's page and offers no Add of its own", async () => {
  await renderDeck(data());
  await expect
    .element(page.getByRole("heading", { level: 2, name: "More like this" }))
    .toBeVisible();
  await expect
    .element(page.getByRole("link", { name: /Spanish food/ }))
    .toHaveAttribute("href", "/explore/spanish-food");
  await expect
    .element(page.getByRole("link", { name: /Italian travel/ }))
    .toHaveAttribute("href", "/explore/italian-travel");
  expect(page.getByRole("button", { name: /Add “/ }).elements()).toHaveLength(0);
});

test("shows no row and no tags when there are none", async () => {
  await renderDeck(data({ related: [], deck: { ...data().deck, tags: [] } }));
  await expect.element(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(page.getByRole("heading", { name: "More like this" }).elements()).toHaveLength(0);
  expect(page.getByRole("list", { name: "Tags" }).elements()).toHaveLength(0);
});
