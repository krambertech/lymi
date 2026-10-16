import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import type { PublicDeckSummary } from "@lymi/core/catalog";
import { MotionConfig } from "motion/react";
import { beforeEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { ShellChrome } from "../components/layout/shell-chrome";
import { StaticNavProvider } from "../components/nav-link";
import { designChrome } from "../design/chrome";
import { captureAnalytics } from "../lib/telemetry";
import {
  clearWelcomeProgress,
  type JoinedDeck,
  type WelcomeAnswers,
  WelcomeView,
} from "./welcome-view";

vi.mock("../lib/telemetry", () => ({ captureAnalytics: vi.fn(() => true) }));

i18n.load("en", messages);
i18n.activate("en");

// Welcome keeps its answers in the tab across a reload; each test starts as a new tab would.
beforeEach(() => {
  sessionStorage.clear();
  clearWelcomeProgress();
  vi.mocked(captureAnalytics).mockClear();
});

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

async function renderWelcome(
  onFinish: (a: WelcomeAnswers) => void,
  onSkip = () => {},
  joined?: { deck: JoinedDeck; onChooseGoal: (goal: number) => void },
) {
  // Each question slides in and staggers its options, which a slow WebKit runner can still be moving at the click.
  await render(
    <MotionConfig reducedMotion="always">
      <I18nProvider i18n={i18n}>
        <ShellChrome value={designChrome()}>
          <StaticNavProvider path="/welcome">
            <div className="@container/shell" style={{ width: "min(800px, 100%)" }}>
              <WelcomeView
                catalog={catalog}
                meaningLanguage="en"
                onFinish={onFinish}
                joined={joined?.deck}
                onChooseGoal={joined?.onChooseGoal}
                onSkip={onSkip}
              />
            </div>
          </StaticNavProvider>
        </ShellChrome>
      </I18nProvider>
    </MotionConfig>,
  );
}

const next = () => page.getByRole("button", { name: "Continue" }).click();

/** Past the lit welcome every new account opens on. */
async function begin() {
  await expect.element(page.getByRole("heading", { name: "Welcome to Lymi" })).toBeVisible();
  await expect.element(page.getByRole("progressbar")).not.toBeInTheDocument();
  await next();
}

test("a language asks which one, then offers that language's decks beside the learner's own", async () => {
  const onFinish = vi.fn();
  await renderWelcome(onFinish);
  await expect
    .element(page.getByText("A few quick questions, then your first review."))
    .toBeVisible();
  await expect.element(page.getByRole("heading", { name: "How it works" })).toBeVisible();
  await expect
    .element(page.getByText("Lymi brings it back just before you’d forget it."))
    .toBeVisible();
  await begin();
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
  await expect.element(page.getByRole("radio", { name: /Import decks/ })).toBeVisible();

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
  await begin();
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

test("going back and on again reports each step once", async () => {
  await renderWelcome(() => {});
  await begin();
  await page.getByRole("radio", { name: /Something else/ }).click();
  await next();
  await expect.element(page.getByRole("heading", { name: "How much time a day?" })).toBeVisible();
  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Back" }).click();
  await next();
  await next();
  await expect.element(page.getByRole("heading", { name: "How much time a day?" })).toBeVisible();

  const reported = (name: string) =>
    vi
      .mocked(captureAnalytics)
      .mock.calls.filter(([event]) => event === name)
      .map(([, properties]) => (properties as { step_name: string }).step_name);
  expect(reported("welcome_step_viewed")).toEqual(["hello", "kind", "goal"]);
  expect(reported("welcome_step_finished")).toEqual(["hello", "kind"]);
});

test("skip leaves at any question", async () => {
  const onSkip = vi.fn();
  await renderWelcome(() => {}, onSkip);
  await page.getByRole("button", { name: "Skip for now" }).click();
  expect(onSkip).toHaveBeenCalledOnce();
});

test("a deck joined while signing up leads the welcome, then asks only for the daily goal", async () => {
  const onChooseGoal = vi.fn();
  const onFinish = vi.fn();
  sessionStorage.setItem(
    "lymi-welcome",
    JSON.stringify({ trail: ["kind", "goal", "start"], kind: "other", language: null, goal: 10 }),
  );
  const deck: JoinedDeck = {
    name: "Everyday Estonian",
    defaultLanguage: "et",
    total: 12,
    owner: { id: "oksana", name: "Oksana", avatarUrl: null },
    published: false,
  };
  await renderWelcome(onFinish, () => {}, { deck, onChooseGoal });

  await expect.element(page.getByRole("heading", { name: "Welcome to Lymi" })).toBeVisible();
  await expect.element(page.getByRole("heading", { name: "Everyday Estonian" })).toBeVisible();
  await expect.element(page.getByText(/Oksana shared a deck/)).toBeVisible();
  await expect.element(page.getByText("12 cards")).toBeVisible();
  // The deck anchors the screen on its own.
  await expect.element(page.getByRole("heading", { name: "How it works" })).not.toBeInTheDocument();
  await next();

  await expect.element(page.getByRole("heading", { name: "How much time a day?" })).toBeVisible();
  await expect.element(page.getByRole("progressbar")).not.toBeInTheDocument();
  await expect.element(page.getByRole("radio", { name: /Steady/ })).toBeChecked();
  await page.getByRole("button", { name: "Back" }).click();
  await expect.element(page.getByRole("heading", { name: "Everyday Estonian" })).toBeVisible();
  await next();

  await page.getByRole("radio", { name: /Keen/ }).click();
  await page.getByRole("button", { name: "Start review" }).click();
  expect(onChooseGoal).toHaveBeenCalledWith(50);
  expect(onFinish).not.toHaveBeenCalled();
});
