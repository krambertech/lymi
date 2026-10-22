import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import type { ReactNode } from "react";
import { describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages as en } from "../../locales/en.po";
import { messages as uk } from "../../locales/uk.po";
import { decks, streak } from "../design/mock";
import { TodayView } from "../views/today-view";
import { DueCount } from "./due-count";
import { StaticNavProvider } from "./nav-link";

i18n.load({ en, uk });

const withI18n = (node: ReactNode) => render(<I18nProvider i18n={i18n}>{node}</I18nProvider>);

/** What the locale itself writes for the number, so uk is checked against its own separator. */
const grouped = (locale: string, n: number) => new Intl.NumberFormat(locale).format(n);

describe.each(["en", "uk"])("counts in %s", (locale) => {
  test("a due badge groups its digits for the locale", async () => {
    i18n.activate(locale);
    await withI18n(<DueCount count={1234} data-testid="badge" />);
    const badge = page.getByTestId("badge").element();
    expect(badge.textContent).toBe(grouped(locale, 1234));
    expect(badge.textContent).not.toBe("1234");
  });

  test("a labelled badge shows the grouped number and reads the label", async () => {
    i18n.activate(locale);
    await withI18n(<DueCount count={1234} label="1234 due today" data-testid="badge" />);
    const badge = page.getByTestId("badge").element();
    expect(badge.querySelector("[aria-hidden='true']")?.textContent).toBe(grouped(locale, 1234));
    expect(badge.querySelector(".sr-only")?.textContent).toBe("1234 due today");
  });

  test("Today's round tiles and deck rows group their counts", async () => {
    i18n.activate(locale);
    // Two decks, since Today folds a lone deck into the hero instead of listing it.
    const [first, second] = decks;
    if (!first || !second) throw new Error("no mock decks");
    await withI18n(
      <StaticNavProvider path="/today">
        <TodayView
          decks={[{ ...first, due: 1234, total: 2000 }, second]}
          streak={streak}
          rounds={{ forgotten: 0, new: 1234, slipping: 0 }}
        />
      </StaticNavProvider>,
    );
    const shown = grouped(locale, 1234);
    // Only the New cards round has cards, so its tile is the one round that is a link.
    const tile = document.querySelector("section[aria-labelledby='today-more'] a");
    if (!tile) throw new Error("no New cards tile");
    expect(tile.textContent).toContain(shown);
    expect(tile.textContent).not.toContain("1234");
    const row = page.getByRole("link", { name: /Italian with Giulia/ }).element();
    expect(row.textContent).toContain(shown);
    expect(row.textContent).not.toContain("1234");
  });
});
