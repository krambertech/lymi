import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { queueItem } from "../design/mock";
import { api, type QueueItem, type ReviewOffer } from "../lib/api";
import { type EditFocus, FixSheet } from "./fix-sheet";

i18n.load("en", messages);
i18n.activate("en");

afterEach(() => {
  vi.restoreAllMocks();
});

const production = { cue: "meaning", target: "term" } as const;

function itemWith(offer: ReviewOffer, card: Partial<QueueItem["card"]> = {}): QueueItem {
  return {
    ...queueItem,
    mode: production,
    card: { ...queueItem.card, term: "alustama", meaning: "to start", language: "et", ...card },
    offer,
  };
}

interface HarnessProps {
  item: QueueItem;
  onEdit?: (focus: EditFocus) => void;
  onDismiss?: () => void;
}

function Harness({ item, onEdit, onDismiss }: HarnessProps) {
  const [open, setOpen] = useState(true);
  return (
    <QueryClientProvider client={new QueryClient()}>
      <I18nProvider i18n={i18n}>
        <FixSheet
          item={item}
          open={open}
          onOpenChange={setOpen}
          onEdit={onEdit ?? (() => {})}
          onDismiss={() => {
            onDismiss?.();
            setOpen(false);
          }}
        />
      </I18nProvider>
    </QueryClientProvider>
  );
}

const accepted = () =>
  vi.spyOn(api, "acceptFix").mockResolvedValue({ added: [], edited: null, skipped: [] });

const pair: ReviewOffer = {
  diagnosisId: "d-pair",
  cause: "confused_pair",
  other: { id: "c2", term: "algama", meaning: "to begin by itself", language: "et" },
  draft: {
    otherCardId: "c2",
    cards: [
      { term: "Ma alustan tööd.", meaning: "I start work." },
      { term: "Töö algab.", meaning: "Work starts." },
    ],
  },
};

test("a confused pair shows both cards and adds the two drafted, as the learner edited them", async () => {
  const accept = accepted();
  await render(<Harness item={itemWith(pair)} />);
  const dialog = page.getByRole("dialog");
  await expect.element(dialog.getByRole("heading", { name: "alustama and algama" })).toBeVisible();
  await expect.element(dialog.getByText("to begin by itself")).toBeVisible();
  expect(dialog.getByText("AI wrote this").elements()).toHaveLength(2);

  await dialog.getByRole("button", { name: "Edit “Töö algab.”" }).click();
  const meaning = dialog.getByRole("textbox", { name: "Meaning" });
  await userEvent.clear(meaning);
  await userEvent.type(meaning, "Work begins.");
  // An edited card is the learner's, so only the untouched one keeps the badge.
  expect(dialog.getByText("AI wrote this").elements()).toHaveLength(1);

  await dialog.getByRole("button", { name: "Add 2 cards" }).click();
  expect(accept).toHaveBeenCalledWith("d-pair", {
    cause: "confused_pair",
    cards: [
      { term: "Ma alustan tööd.", meaning: "I start work." },
      { term: "Töö algab.", meaning: "Work begins." },
    ],
  });
  await expect.element(dialog).not.toBeInTheDocument();
});

test("terms written as principal parts are named by their first forms, and compared in full", async () => {
  const offer: ReviewOffer = {
    ...pair,
    other: { id: "c2", term: "pikk · pika · pikka", meaning: "long", language: "et" },
  };
  await render(
    <Harness item={itemWith(offer, { term: "lühike · lühikese · lühikest", meaning: "short" })} />,
  );
  const dialog = page.getByRole("dialog");
  await expect.element(dialog.getByRole("heading", { name: "lühike and pikk" })).toBeVisible();
  await expect
    .element(dialog.getByText("“lühike” keeps slipping, likely because the two get mixed up."))
    .toBeVisible();
  await expect.element(dialog.getByText("pikk · pika · pikka", { exact: true })).toBeVisible();
  await expect
    .element(dialog.getByText("lühike · lühikese · lühikest", { exact: true }))
    .toBeVisible();
});

test("“That’s not it” answers a named cause and closes the sheet without the fix", async () => {
  const accept = accepted();
  const onDismiss = vi.fn();
  await render(<Harness item={itemWith(pair)} onDismiss={onDismiss} />);
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "That’s not it" }).click();
  expect(onDismiss).toHaveBeenCalledOnce();
  await expect.element(dialog).not.toBeInTheDocument();
  expect(accept).not.toHaveBeenCalled();
});

test("two things split into numbered cards, and card 1 keeps the history", async () => {
  const accept = accepted();
  const offer: Extract<ReviewOffer, { cause: "two_things" }> = {
    diagnosisId: "d-split",
    cause: "two_things",
    draft: {
      cards: [
        { term: "Kus sa elad?", meaning: "Where do you live?" },
        { term: "Ma elan Tallinnas.", meaning: "I live in Tallinn." },
      ],
    },
  };
  await render(<Harness item={itemWith(offer)} />);
  const dialog = page.getByRole("dialog");
  await expect.element(dialog.getByRole("heading", { name: "Split into 2 cards" })).toBeVisible();
  await expect
    .element(dialog.getByText("Card 1 keeps this card’s history and notes. Card 2 starts as new."))
    .toBeVisible();
  await expect.element(dialog.getByRole("button", { name: "Edit card 2" })).toBeVisible();
  await expect.element(dialog.getByRole("button", { name: "That’s not it" })).toBeVisible();
  await dialog.getByRole("button", { name: "Split into 2 cards" }).click();
  expect(accept).toHaveBeenCalledWith("d-split", { cause: "two_things", cards: offer.draft.cards });
});

test("more than one right answer names the other and sends the rewritten question", async () => {
  const accept = accepted();
  const offer: ReviewOffer = {
    diagnosisId: "d-cue",
    cause: "several_answers",
    draft: { field: "meaning", text: "tall (of a person)", otherAnswer: "kõrge" },
  };
  await render(<Harness item={itemWith(offer, { term: "pikk", meaning: "tall" })} />);
  const dialog = page.getByRole("dialog");
  await expect.element(dialog.getByText("kõrge")).toBeVisible();
  const cue = dialog.getByRole("textbox", { name: "Meaning" });
  await expect.element(cue).toHaveValue("tall (of a person)");
  await expect.element(dialog.getByText("AI wrote this")).toBeInTheDocument();
  await expect.element(dialog.getByRole("button", { name: "That’s not it" })).toBeVisible();

  await userEvent.clear(cue);
  await dialog.getByRole("button", { name: "Change the question" }).click();
  await expect.element(dialog.getByText("Type the meaning.")).toBeVisible();
  await expect.element(cue).toHaveAttribute("aria-invalid", "true");
  await expect.element(cue).toHaveFocus();
  expect(accept).not.toHaveBeenCalled();

  await userEvent.type(cue, "tall (a person) ");
  await expect.element(dialog.getByText("AI wrote this")).not.toBeInTheDocument();
  await dialog.getByRole("button", { name: "Change the question" }).click();
  expect(accept).toHaveBeenCalledWith("d-cue", {
    cause: "several_answers",
    text: "tall (a person)",
  });
});

test("no clear reason offers ways to change the card, each opening the editor", async () => {
  const accept = accepted();
  const onEdit = vi.fn();
  const offer: ReviewOffer = {
    diagnosisId: "d-unclear",
    cause: "unclear",
    draft: null,
  };
  await render(<Harness item={itemWith(offer)} onEdit={onEdit} />);
  const dialog = page.getByRole("dialog");
  await expect.element(dialog.getByRole("heading", { name: "Ask it another way" })).toBeVisible();
  // There is no cause to disagree with.
  await expect
    .element(dialog.getByRole("button", { name: "That’s not it" }))
    .not.toBeInTheDocument();
  await dialog.getByRole("button", { name: /Make the question clearer/ }).click();
  expect(onEdit).toHaveBeenLastCalledWith("meaning");
  await dialog.getByRole("button", { name: /Add a picture/ }).click();
  expect(onEdit).toHaveBeenLastCalledWith("picture");
  await dialog.getByRole("button", { name: /Edit the card/ }).click();
  expect(onEdit).toHaveBeenLastCalledWith(null);

  await dialog.getByRole("button", { name: "Not now" }).click();
  await expect.element(dialog).not.toBeInTheDocument();
  expect(accept).not.toHaveBeenCalled();
});

test("a fix that no longer fits says so, and leads to the card instead", async () => {
  const { ApiError } = await import("../lib/api");
  vi.spyOn(api, "acceptFix").mockRejectedValue(new ApiError(409, "changed"));
  const onEdit = vi.fn();
  await render(<Harness item={itemWith(pair)} onEdit={onEdit} />);
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Add 2 cards" }).click();
  await expect
    .element(
      dialog.getByText("This card changed since Lymi looked at it, so the fix no longer fits."),
    )
    .toBeVisible();
  await expect.element(dialog.getByRole("button", { name: "Add 2 cards" })).not.toBeInTheDocument();
  await dialog.getByRole("button", { name: "Edit the card", exact: true }).click();
  expect(onEdit).toHaveBeenCalledWith(null);
});

test("an emptied drafted card is marked and focused, and nothing is sent", async () => {
  const accept = accepted();
  await render(<Harness item={itemWith(pair)} />);
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Edit “Ma alustan tööd.”" }).click();
  const term = dialog.getByRole("textbox", { name: "Term" });
  await expect.element(term).toHaveFocus();
  await userEvent.clear(term);
  await dialog.getByRole("button", { name: "Add 2 cards" }).click();
  await expect.element(dialog.getByText("Give each card a term and a meaning.")).toBeVisible();
  await expect.element(term).toHaveAttribute("aria-invalid", "true");
  await expect.element(term).toHaveFocus();
  expect(accept).not.toHaveBeenCalled();
});
