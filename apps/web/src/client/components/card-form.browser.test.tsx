import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { decks } from "../design/mock";
import { CardForm, type CardFormDraft, type CardFormOutcome, draftHasWork } from "./card-form";
import { TooltipProvider } from "./ui/tooltip";

i18n.load("en", messages);
i18n.activate("en");

const deck = decks.find((d) => d.role === "owner");
if (!deck) throw new Error("The mock decks need one the learner owns.");

const renderAdd = async (outcome: CardFormOutcome = { status: "added", term: "la mela" }) => {
  const onSubmit = vi.fn(() => outcome);
  const client = new QueryClient({ defaultOptions: { queries: { enabled: false } } });
  await page.viewport(1280, 900);
  await render(
    <QueryClientProvider client={client}>
      <I18nProvider i18n={i18n}>
        <TooltipProvider>
          <CardForm
            mode="add"
            decks={decks}
            deckId={deck.id}
            layout="whole"
            createMore
            onCreateMoreChange={() => undefined}
            onCancel={() => undefined}
            onSubmit={onSubmit}
          />
        </TooltipProvider>
      </I18nProvider>
    </QueryClientProvider>,
  );
  return onSubmit;
};

const hintChip = () => page.getByRole("button", { name: "Hint" });

test("adding offers the hint last in the row and sends it with the card", async () => {
  const onSubmit = await renderAdd();
  const row = page.getByRole("group", { name: "More about this card" });
  const chips = [...row.element().querySelectorAll("button")];
  expect(chips.at(-1)?.textContent).toBe("Hint");

  await userEvent.type(page.getByRole("textbox", { name: "Term" }), "la mela");
  await hintChip().click();
  await userEvent.type(page.getByRole("textbox", { name: "Hint" }), "Mellow apple");
  await page.getByRole("button", { name: /^Add to/ }).click();

  expect(onSubmit).toHaveBeenCalledWith(
    expect.objectContaining({ term: "la mela", hint: "Mellow apple" }),
  );
});

test("Create more clears the hint for the next card", async () => {
  await renderAdd();
  await userEvent.type(page.getByRole("textbox", { name: "Term" }), "la mela");
  await hintChip().click();
  await userEvent.type(page.getByRole("textbox", { name: "Hint" }), "Mellow apple");
  await page.getByRole("button", { name: /^Add to/ }).click();

  await expect.element(page.getByText("Added “la mela”")).toBeVisible();
  await expect.element(page.getByRole("textbox", { name: "Hint" })).not.toBeInTheDocument();
  await expect.element(hintChip()).toBeVisible();
});

test("a duplicate keeps the hint on the form", async () => {
  await renderAdd({ status: "skipped", term: "la mela", deckName: deck.name });
  await userEvent.type(page.getByRole("textbox", { name: "Term" }), "la mela");
  await hintChip().click();
  await userEvent.type(page.getByRole("textbox", { name: "Hint" }), "Mellow apple");
  await page.getByRole("button", { name: /^Add to/ }).click();

  await expect.element(page.getByText(/is already in/)).toBeVisible();
  await expect.element(page.getByRole("textbox", { name: "Hint" })).toHaveValue("Mellow apple");
});

test("a discarded draft holding only a hint counts as work to bring back", () => {
  const empty: CardFormDraft = {
    deckId: deck.id,
    term: "",
    meaning: "",
    pronunciation: "",
    example: "",
    exampleTranslation: "",
    notes: "",
    hint: "",
    source: "",
    tags: [],
    language: null,
    reviewModes: null,
    picture: { kind: "none" },
    description: "",
    sectionId: null,
    languageChosen: false,
  };
  expect(draftHasWork(empty)).toBe(false);
  expect(draftHasWork({ ...empty, hint: "Mellow apple" })).toBe(true);
});
