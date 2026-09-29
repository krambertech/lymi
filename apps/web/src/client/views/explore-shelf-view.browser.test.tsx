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
import { ExploreShelfView } from "./explore-shelf-view";

i18n.load("en", messages);
i18n.activate("en");

const deck = (slug: string, language: string, cardCount = 10): PublicDeckSummary => ({
  slug,
  name: slug,
  summary: "",
  category: "languages",
  tags: [],
  language,
  meaningLanguage: "en",
  cardCount,
  sectionCount: 0,
  card: null,
});

const decks = [
  ...["a", "b", "c", "d", "e"].map((at) => deck(`german-${at}`, "de")),
  ...["a", "b", "c"].map((at) => deck(`spanish-${at}`, "es")),
  deck("estonian-a", "et"),
];

async function renderShelf(name: string) {
  await render(
    <I18nProvider i18n={i18n}>
      <ShellChrome value={designChrome()}>
        <StaticNavProvider path={`/explore/languages/${name}`}>
          <div className="@container/shell" style={{ width: 1000 }}>
            <ExploreShelfView
              route={{ kind: "languages", name }}
              data={{ decks, added: {} }}
              onAdd={() => {}}
            />
          </div>
        </StaticNavProvider>
      </ShellChrome>
    </I18nProvider>,
  );
}

test("a shelf's page holds every deck on it, its counts and the other languages with a page", async () => {
  await renderShelf("german");
  await expect.element(page.getByRole("heading", { level: 1, name: "German" })).toBeVisible();
  await expect.element(page.getByText(/5 decks\s*·\s*50 cards/)).toBeVisible();
  expect(
    page.getByRole("list", { name: "German decks" }).getByRole("listitem").elements(),
  ).toHaveLength(5);
  const more = page.getByRole("navigation", { name: "More languages" });
  expect(
    more
      .getByRole("link")
      .elements()
      .map((link) => link.textContent),
  ).toEqual(["Spanish3"]);
});

test("a shelf too small for a page says so and leads back to Explore", async () => {
  await renderShelf("estonian");
  await expect.element(page.getByRole("heading", { name: "This shelf has no page" })).toBeVisible();
  await expect.element(page.getByRole("link", { name: "Open Explore" })).toBeVisible();
});
