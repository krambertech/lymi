import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { useState } from "react";
import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { cards } from "../design/mock";
import { WordView } from "./word-view";

i18n.load("en", messages);
i18n.activate("en");

const card = cards[0] as (typeof cards)[number];

function Word({ onImportantChange }: { onImportantChange: (important: boolean) => void }) {
  const [important, setImportant] = useState(false);
  return (
    <I18nProvider i18n={i18n}>
      <WordView
        card={{ ...card, important }}
        state={null}
        deckName="Lezione"
        onImportantChange={(on) => {
          setImportant(on);
          onImportantChange(on);
        }}
      />
    </I18nProvider>
  );
}

test("a learner marks the card important from its menu, and the card says so in words", async () => {
  const changed = vi.fn();
  await render(<Word onImportantChange={changed} />);
  expect(page.getByText("Important", { exact: true }).elements()).toHaveLength(0);

  await page.getByRole("button", { name: "Card options" }).click();
  // A member has no other item here: every other one writes the card.
  expect(page.getByRole("menuitem").elements()).toHaveLength(1);
  await page.getByRole("menuitem", { name: "Mark important" }).click();
  expect(changed).toHaveBeenCalledWith(true);
  await expect.element(page.getByText("Important", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Card options" }).click();
  await page.getByRole("menuitem", { name: "Unmark important" }).click();
  expect(changed).toHaveBeenLastCalledWith(false);
});

test("a card that cannot be marked from here has no menu, and still shows its mark", async () => {
  await render(
    <I18nProvider i18n={i18n}>
      <WordView card={{ ...card, important: true }} state={null} deckName="Lezione" />
    </I18nProvider>,
  );
  expect(page.getByRole("button", { name: "Card options" }).elements()).toHaveLength(0);
  await expect.element(page.getByText("Important", { exact: true })).toBeVisible();
});
