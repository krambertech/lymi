import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { ShellChrome } from "../components/layout/shell-chrome";
import { StaticNavProvider } from "../components/nav-link";
import { designChrome } from "../design/chrome";
import { QuizletImportView } from "./quizlet-import-view";

// Filling a textarea with a real 5,000-card set outlasts a test.
vi.mock("@lymi/core", async (original) => ({
  ...(await original<typeof import("@lymi/core")>()),
  MAX_TEXT_IMPORT_CARDS: 2,
}));

i18n.load("en", messages);
i18n.activate("en");

const renderView = (onContinue: () => void, error?: string) =>
  render(
    <I18nProvider i18n={i18n}>
      <ShellChrome value={designChrome()}>
        <StaticNavProvider path="/import/quizlet">
          <div className="@container/shell" style={{ width: 1000 }}>
            <QuizletImportView decks={[]} onContinue={onContinue} error={error} />
          </div>
        </StaticNavProvider>
      </ShellChrome>
    </I18nProvider>,
  );

const text = () => page.getByLabelText("Your set’s text");
const proceed = () => page.getByRole("button", { name: /^Continue/ });

test("Continue with nothing pasted asks for the set and moves the caret there", async () => {
  const onContinue = vi.fn();
  await renderView(onContinue);
  await expect.element(proceed()).not.toHaveAttribute("disabled");
  await userEvent.click(proceed());
  await expect
    .element(page.getByRole("alert"))
    .toHaveTextContent("Paste your set’s text or choose a .txt file first.");
  await expect.element(text()).toHaveFocus();
  expect(onContinue).not.toHaveBeenCalled();
});

test("Continue on text with no cards names the separators, until the text changes", async () => {
  const onContinue = vi.fn();
  await renderView(onContinue);
  await userEvent.fill(text(), "one side only");
  await expect.element(page.getByRole("heading", { name: "0 cards" })).toBeVisible();
  await userEvent.click(proceed());
  await expect
    .element(page.getByRole("alert"))
    .toHaveTextContent("No cards found in this text. Check the separators.");
  expect(onContinue).not.toHaveBeenCalled();

  await userEvent.fill(text(), "der Hund\tthe dog");
  await expect.element(page.getByRole("alert")).not.toBeInTheDocument();
  await userEvent.click(page.getByRole("button", { name: "Continue with 1 card" }));
  expect(onContinue).toHaveBeenCalledOnce();
});

test("what is missing replaces an upload error left from before", async () => {
  await renderView(vi.fn(), "That upload failed.");
  await expect.element(page.getByRole("alert")).toHaveTextContent("That upload failed.");
  await userEvent.click(proceed());
  await expect
    .element(page.getByRole("alert"))
    .toHaveTextContent("Paste your set’s text or choose a .txt file first.");
});

test("Too many cards keeps Continue focusable and swallows the press", async () => {
  const onContinue = vi.fn();
  await renderView(onContinue);
  await userEvent.fill(text(), "ein\tone\nzwei\ttwo\ndrei\tthree");
  await expect.element(page.getByText(/Split the set and import it in parts/)).toBeVisible();
  await expect.element(proceed()).toHaveAttribute("aria-disabled", "true");
  await expect.element(proceed()).not.toHaveAttribute("disabled");
  await userEvent.click(proceed(), { force: true });
  expect(onContinue).not.toHaveBeenCalled();
});
