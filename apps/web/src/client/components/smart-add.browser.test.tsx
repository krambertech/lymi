import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { decks } from "../design/mock";
import { ApiError, api, type DeckSummary } from "../lib/api";
import { SmartAddDialog } from "./smart-add";

i18n.load("en", messages);
i18n.activate("en");

afterEach(() => {
  vi.restoreAllMocks();
});

const deck = decks[0] as DeckSummary;
const access = (used: number) => ({
  allowed: true,
  daily: { limit: 5, used, resetsAt: new Date(Date.now() + 3 * 3_600_000).toISOString() },
});

const open = async (used = 0) => {
  vi.spyOn(api, "lessonAccess").mockResolvedValue(access(used));
  await render(
    <I18nProvider i18n={i18n}>
      <QueryClientProvider client={new QueryClient()}>
        <SmartAddDialog open onOpenChange={() => {}} deckId={deck.id} decks={[deck]} />
      </QueryClientProvider>
    </I18nProvider>,
  );
};

const findTerms = () => page.getByRole("button", { name: "Find terms" });

test("Find terms on an empty lesson stays pressable and says what is missing", async () => {
  await open();
  await expect.element(page.getByRole("button", { name: /^Text/ })).toBeVisible();
  await expect.element(findTerms()).not.toHaveAttribute("disabled");
  await userEvent.click(findTerms());
  await expect
    .element(page.getByRole("alert"))
    .toHaveTextContent("Add a photo or PDF of the lesson, or paste its text.");
});

test("at the daily limit Find terms stays focusable and points at the notice", async () => {
  const read = vi.spyOn(api, "readLesson");
  await open(5);
  await expect.element(findTerms()).toHaveAttribute("aria-disabled", "true");
  await expect.element(findTerms()).not.toHaveAttribute("disabled");
  await expect.element(findTerms()).toHaveAccessibleDescription(/today’s 5 lessons/);
  await userEvent.click(findTerms(), { force: true });
  expect(read).not.toHaveBeenCalled();
});

/** Reads a pasted lesson up to its one question, answered in the learner's own words. */
const reachQuestions = async () => {
  vi.spyOn(api, "readLesson").mockImplementation(async (_form, onEvent) => {
    onEvent({
      type: "term",
      term: {
        id: "t1",
        term: "der Hund",
        gloss: "the dog",
        meaning: null,
        pronunciation: null,
        heading: null,
        existing: null,
        formOf: null,
        keep: null,
        ticked: true,
      },
    } as never);
    onEvent({
      type: "questions",
      questions: [
        { question: "Which words matter?", default: 0, options: [{ label: "All", drop: [] }] },
      ],
    } as never);
  });
  await open();
  await userEvent.click(page.getByRole("button", { name: /^Text/ }));
  await userEvent.fill(page.getByLabelText("Lesson text"), "der Hund, the dog");
  await userEvent.click(page.getByRole("button", { name: "Add text" }));
  await userEvent.click(findTerms());
  await userEvent.fill(page.getByRole("textbox", { name: "Something else" }), "Only nouns");
};

const showTerms = () => page.getByRole("button", { name: "Show terms" });

test("a failed answer check says so and lets the learner try again", async () => {
  const answer = vi
    .spyOn(api, "answerLesson")
    .mockRejectedValueOnce(new ApiError(500, "Lymi couldn’t check that answer."))
    .mockResolvedValueOnce({ drop: [] });
  await reachQuestions();
  await userEvent.click(showTerms());
  await expect
    .element(page.getByRole("alert"))
    .toHaveTextContent("Lymi couldn’t check that answer.");
  await expect.element(showTerms()).not.toHaveAttribute("aria-busy");

  await userEvent.click(showTerms());
  await expect.element(page.getByRole("button", { name: "Add 1 card" })).toBeVisible();
  expect(answer).toHaveBeenCalledTimes(2);
});

test("Show terms keeps focus and shows it is busy while the answer is checked", async () => {
  let finish = () => {};
  vi.spyOn(api, "answerLesson").mockImplementation(
    () => new Promise((resolve) => (finish = () => resolve({ drop: [] }))),
  );
  await reachQuestions();
  (showTerms().element() as HTMLElement).focus();
  await userEvent.keyboard("{Enter}");
  await expect.element(showTerms()).toHaveAttribute("aria-busy", "true");
  await expect.element(showTerms()).not.toHaveAttribute("disabled");
  expect(document.activeElement).toBe(showTerms().element());
  finish();
  await expect.element(page.getByRole("button", { name: "Add 1 card" })).toBeVisible();
});
