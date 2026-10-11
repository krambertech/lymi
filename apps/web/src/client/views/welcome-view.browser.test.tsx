import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import type { PublicDeckSummary } from "@lymi/core/catalog";
import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { ShellChrome } from "../components/layout/shell-chrome";
import { StaticNavProvider } from "../components/nav-link";
import { designChrome } from "../design/chrome";
import { type WelcomeAnswers, WelcomeView } from "./welcome-view";

i18n.load("en", messages);
i18n.activate("en");

const deck = (slug: string, category: string, language: string | null): PublicDeckSummary => ({
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

const catalog = [
  deck("core-spanish", "languages", "es"),
  deck("spanish-verbs", "languages", "es"),
  deck("core-german", "languages", "de"),
  deck("road-signs", "driving", "et"),
  deck("constellations", "science", null),
];

async function renderWelcome(onFinish: (a: WelcomeAnswers) => void, onSkip = () => {}) {
  await render(
    <I18nProvider i18n={i18n}>
      <ShellChrome value={designChrome()}>
        <StaticNavProvider path="/welcome">
          <div className="@container/shell" style={{ width: 800 }}>
            <WelcomeView
              catalog={catalog}
              meaningLanguage="en"
              onFinish={onFinish}
              onSkip={onSkip}
            />
          </div>
        </StaticNavProvider>
      </ShellChrome>
    </I18nProvider>,
  );
}

const next = () => page.getByRole("button", { name: "Continue" }).click();

test("a language asks which one, then offers that language's decks beside the learner's own", async () => {
  const onFinish = vi.fn();
  await renderWelcome(onFinish);
  await next();
  await expect.element(page.getByRole("alert")).toHaveTextContent("Choose one to continue.");

  await page.getByRole("radio", { name: /A language/ }).click();
  await next();
  await expect.element(page.getByRole("heading", { name: "Which language?" })).toBeVisible();
  await page.getByRole("radio", { name: "Spanish" }).click();
  await next();

  await expect.element(page.getByRole("radio", { name: /Steady/ })).toBeChecked();
  await next();

  await expect
    .element(page.getByRole("heading", { name: "Ready-made decks in Spanish" }))
    .toBeVisible();
  expect(
    page.getByRole("radiogroup", { name: "Ready-made decks" }).getByRole("radio").elements(),
  ).toHaveLength(2);
  await expect
    .element(page.getByRole("radio", { name: /Import from Anki or Mochi/ }))
    .toBeVisible();

  await page.getByRole("radio", { name: /spanish-verbs/ }).click();
  await page.getByRole("button", { name: "Add and review" }).click();
  expect(onFinish).toHaveBeenCalledWith(
    expect.objectContaining({
      learningKind: "language",
      learningLanguage: "es",
      dailyGoal: 25,
      start: { kind: "deck", deck: catalog[1] },
    }),
  );
});

test("something else skips the language and leads with the learner's own material", async () => {
  const onFinish = vi.fn();
  await renderWelcome(onFinish);
  await page.getByRole("radio", { name: /Something else/ }).click();
  await next();
  await page.getByRole("radio", { name: /Light/ }).click();
  await next();

  await expect.element(page.getByRole("heading", { name: "Bring your own" })).toBeVisible();
  const sections = page.getByRole("heading", { level: 2 }).elements();
  expect(sections.map((h) => h.textContent)).toEqual(["Bring your own", "Ready-made decks"]);
  await page.getByRole("radio", { name: /Type your own cards/ }).click();
  await page.getByRole("button", { name: "New deck" }).click();
  expect(onFinish).toHaveBeenCalledWith({
    learningKind: "other",
    learningLanguage: null,
    dailyGoal: 10,
    start: { kind: "own", own: "type" },
  });
});

test("skip leaves at any question", async () => {
  const onSkip = vi.fn();
  await renderWelcome(() => {}, onSkip);
  await page.getByRole("button", { name: "Skip for now" }).click();
  expect(onSkip).toHaveBeenCalledOnce();
});
