import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../../locales/en.po";
import { designChrome } from "../../design/chrome";
import { Screen } from "./screen";
import { ShellChrome } from "./shell-chrome";

i18n.load("en", messages);
i18n.activate("en");

function Deck({ width }: { width: number }) {
  return (
    <I18nProvider i18n={i18n}>
      <ShellChrome value={designChrome()}>
        <div className="@container/shell" style={{ width }}>
          <Screen
            title="Lesson 14"
            back={{
              label: "Library",
              to: "/library/$deckId",
              params: { deckId: "d1" },
              hash: "top",
            }}
            actions={<button type="button">Deck options</button>}
          >
            <p>Cards</p>
          </Screen>
        </div>
      </ShellChrome>
    </I18nProvider>
  );
}

for (const [shell, width] of [
  ["a phone", 390],
  ["a desktop", 1000],
] as const) {
  test(`mounts a page's controls once in ${shell}'s shell`, async () => {
    await render(<Deck width={width} />);
    await expect.element(page.getByRole("heading", { level: 1, name: "Lesson 14" })).toBeVisible();
    expect(document.querySelectorAll("button").length).toBe(1);
    const inBar = !!document.querySelector("header button")?.closest("header")?.querySelector("a");
    expect(inBar).toBe(width < 768);
  });
}

test("a static way back fills its params and keeps its hash", async () => {
  await render(<Deck width={390} />);
  const back = page.getByRole("link", { name: "Library" });
  await expect.element(back).toHaveAttribute("href", "/library/d1#top");
});

test("a way back with nowhere to go yet is not a link", async () => {
  await render(
    <I18nProvider i18n={i18n}>
      <ShellChrome value={designChrome()}>
        <div className="@container/shell" style={{ width: 390 }}>
          <Screen title="Deck settings" back={{ label: "Deck" }}>
            <p>Loading</p>
          </Screen>
        </div>
      </ShellChrome>
    </I18nProvider>,
  );
  await expect.element(page.getByText("Deck", { exact: true })).toBeVisible();
  expect(document.querySelector("header a")).toBeNull();
});
