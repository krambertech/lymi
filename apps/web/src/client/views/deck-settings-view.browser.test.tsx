import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import type { FrontPronunciation } from "@lymi/core";
import { expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { ShellChrome } from "../components/layout/shell-chrome";
import { StaticNavProvider } from "../components/nav-link";
import { designChrome } from "../design/chrome";
import { decks } from "../design/mock";
import type { DeckSummary } from "../lib/api";
import { type DeckSettingsPatch, DeckSettingsView } from "./deck-settings-view";

i18n.load("en", messages);
i18n.activate("en");

const deck = (over: Partial<DeckSummary> = {}): DeckSummary => ({
  ...(decks[0] as DeckSummary),
  enrichInstructions: "Lessons with Giulia.",
  ...over,
});

const renderSettings = (
  value: DeckSummary,
  onSave: (patch: DeckSettingsPatch) => void,
  onFrontPronunciation: (value: FrontPronunciation) => void = vi.fn(),
) =>
  render(
    <I18nProvider i18n={i18n}>
      <ShellChrome value={designChrome()}>
        <StaticNavProvider path={`/library/${value.id}/settings`}>
          <div className="@container/shell" style={{ width: 1000 }}>
            <DeckSettingsView
              deck={value}
              onSave={onSave}
              onFrontPronunciation={onFrontPronunciation}
            />
          </div>
        </StaticNavProvider>
      </ShellChrome>
    </I18nProvider>,
  );

test("saves a field the owner turns on at once", async () => {
  const onSave = vi.fn();
  await renderSettings(deck(), onSave);
  await expect.element(page.getByRole("checkbox", { name: "Meaning" })).toBeChecked();
  const notes = page.getByRole("checkbox", { name: "Notes" });
  await expect.element(notes).not.toBeChecked();
  await notes.click();
  expect(onSave).toHaveBeenCalledWith({ enrichFields: ["meaning", "example", "notes"] });
});

test("saves the purpose the owner picks", async () => {
  const onSave = vi.fn();
  await renderSettings(deck(), onSave);
  await expect.element(page.getByRole("radio", { name: /A language/ })).toBeChecked();
  await page.getByRole("radio", { name: /A subject or exam/ }).click();
  expect(onSave).toHaveBeenCalledWith({ purpose: "subject" });
});

test("saves the instructions when the field is left, and blank as none", async () => {
  const onSave = vi.fn();
  await renderSettings(deck(), onSave);
  const box = page.getByRole("textbox", { name: "Instructions" });
  await expect.element(box).toHaveValue("Lessons with Giulia.");
  await userEvent.clear(box);
  await userEvent.type(box, "  ");
  expect(onSave).not.toHaveBeenCalled();
  await userEvent.tab();
  expect(onSave).toHaveBeenCalledWith({ enrichInstructions: null });
});

test("shows a member no AI settings and none of the owner's instructions", async () => {
  await renderSettings(
    deck({
      role: "learner",
      enrichInstructions: null,
      owner: { id: "u2", name: "Giulia", avatarUrl: null },
    }),
    vi.fn(),
  );
  await expect.element(page.getByText("About this deck").first()).toBeVisible();
  expect(page.getByRole("heading", { name: "AI" }).elements()).toHaveLength(0);
});

test("keeps what the AI learned closed until the owner opens it, marked as the AI's", async () => {
  await renderSettings(
    deck({
      enrichStyle: "- Kitchen words from a cooking course.\n- Meanings usually give the article.",
    }),
    vi.fn(),
  );
  const about = page.getByText("Kitchen words from a cooking course.");
  await expect.element(page.getByText("AI wrote this")).toBeInTheDocument();
  await expect.element(about).not.toBeVisible();
  await page.getByText("Learned from your cards").click();
  await expect.element(about).toBeVisible();
  const box = page.getByRole("region", { name: "Learned from your cards" });
  expect(box.getByRole("listitem").elements()).toHaveLength(2);
});

test("says what the AI will learn while a deck has nothing learned yet", async () => {
  await renderSettings(deck({ enrichStyle: null }), vi.fn());
  await expect
    .element(page.getByText("AI learns how you write this deck’s cards as you add them."))
    .toBeVisible();
  expect(page.getByText("AI wrote this").elements()).toHaveLength(0);
  expect(page.getByText("Learned from your cards").elements()).toHaveLength(0);
});

test("offers adaptive pronunciation on a language that draws it, and turns it off", async () => {
  const onFrontPronunciation = vi.fn();
  await renderSettings(deck({ defaultLanguage: "zh-CN" }), vi.fn(), onFrontPronunciation);
  const toggle = page.getByRole("switch", { name: "Adaptive pronunciation" });
  await expect.element(toggle).toBeChecked();
  await expect.element(page.getByText(/Pinyin shows over the term/)).toBeVisible();
  await toggle.click();
  expect(onFrontPronunciation).toHaveBeenCalledWith("hidden");
});

test("shows a member their own pronunciation choice", async () => {
  await renderSettings(
    deck({
      role: "learner",
      defaultLanguage: "ja",
      frontPronunciation: "hidden",
      owner: { id: "u2", name: "Haruka", avatarUrl: null },
    }),
    vi.fn(),
  );
  await expect
    .element(page.getByRole("switch", { name: "Adaptive pronunciation" }))
    .not.toBeChecked();
  await expect.element(page.getByText(/Furigana shows only with the answer/)).toBeVisible();
  await expect.element(page.getByText(/Only for you/)).toBeVisible();
});

test("offers no pronunciation choice on a language that draws none", async () => {
  await renderSettings(deck({ defaultLanguage: "it" }), vi.fn());
  await expect
    .element(page.getByText("About this deck").or(page.getByText("Deck settings")).first())
    .toBeVisible();
  expect(page.getByRole("switch", { name: "Adaptive pronunciation" }).elements()).toHaveLength(0);
});
