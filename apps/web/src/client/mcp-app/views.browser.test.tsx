import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import type { ReactNode } from "react";
import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import type { ViewCard, ViewDeckResult } from "../../shared/mcp-app";
import { DeepLink, deepLinkTarget } from "./deep-link";
import { type Host, HostContext } from "./host";
import { CardView } from "./views/card-view";
import { DeckView } from "./views/deck-view";

i18n.load("en", messages);
i18n.activate("en");

const card = (over: Partial<ViewCard> = {}): ViewCard => ({
  id: "card-1",
  deckId: "deck-1",
  term: "sbrigarsi",
  meaning: "to hurry up",
  pronunciation: null,
  example: null,
  exampleTranslation: null,
  exampleTranslationStale: false,
  notes: null,
  hook: null,
  language: "it",
  source: "Lesson 12",
  image: null,
  meaningSource: "lesson",
  exampleSource: null,
  exampleTranslationSource: null,
  pronunciationSource: null,
  notesSource: null,
  hookSource: null,
  enrichmentStatus: null,
  archivedAt: null,
  createdAt: "2026-10-01T09:00:00.000Z",
  ...over,
});

function fakeHost(calls: Record<string, (args: Record<string, unknown>) => unknown> = {}) {
  const host = {
    origin: "https://my.lymi.app",
    call: vi.fn(async (tool: string, args: Record<string, unknown>) => {
      const answer = calls[tool];
      if (!answer) return { ok: false as const, message: `no ${tool}` };
      const data = answer(args);
      return data instanceof Error
        ? { ok: false as const, message: data.message }
        : { ok: true as const, data };
    }),
    open: vi.fn(),
  };
  return host as typeof host & Host;
}

async function renderIn(host: Host, view: ReactNode) {
  await render(
    <I18nProvider i18n={i18n}>
      <HostContext value={host}>{view}</HostContext>
    </I18nProvider>,
  );
}

const deck = (over: Partial<ViewDeckResult> = {}): ViewDeckResult => ({
  deck: { id: "deck-1", name: "Lezione 12", description: null, defaultLanguage: "it" },
  total: 48,
  due: 12,
  stages: { new: 20, learning: 16, known: 12 },
  ...over,
});

test("a card shows its fields, marks what Lymi wrote, and offers no editing", async () => {
  await renderIn(
    fakeHost(),
    <CardView card={card({ example: "Sbrigati!", exampleSource: "ai" })} />,
  );
  await expect.element(page.getByRole("heading", { level: 1 })).toHaveTextContent("sbrigarsi");
  await expect.element(page.getByText("to hurry up")).toBeVisible();
  await expect.element(page.getByText("Sbrigati!")).toHaveAttribute("lang", "it");
  await expect.element(page.getByRole("button", { name: "Edit" })).not.toBeInTheDocument();
});

test("Open in Lymi opens the card in the app", async () => {
  const host = fakeHost();
  await renderIn(host, <CardView card={card()} />);
  await page.getByRole("button", { name: "Open in Lymi" }).click();
  expect(host.open).toHaveBeenCalledWith("https://my.lymi.app/library/deck-1?card=card-1");
});

test("a deck says its size, what is due and its cards by stage, and reviews in Lymi", async () => {
  const host = fakeHost();
  await renderIn(host, <DeckView result={deck()} />);
  await expect.element(page.getByRole("heading", { level: 1 })).toHaveTextContent("Lezione 12");
  await expect.element(page.getByText("48 cards")).toBeVisible();
  await expect.element(page.getByText("12 due now")).toBeVisible();
  const stages = page.getByRole("list", { name: "Cards by stage" });
  expect(stages.element().textContent).toBe("20New16Learning12Known");
  await page.getByRole("button", { name: "Review in Lymi" }).click();
  expect(host.open).toHaveBeenCalledWith("https://my.lymi.app/review?deck=deck-1");
});

test("a deck with nothing due offers no review, and an empty deck says so", async () => {
  await renderIn(fakeHost(), <DeckView result={deck({ due: 0 })} />);
  await expect.element(page.getByText("due now")).not.toBeInTheDocument();
  await expect
    .element(page.getByRole("button", { name: "Review in Lymi" }))
    .not.toBeInTheDocument();

  await renderIn(
    fakeHost(),
    <DeckView result={deck({ total: 0, due: 0, stages: { new: 0, learning: 0, known: 0 } })} />,
  );
  await expect.element(page.getByText("No cards yet.")).toBeVisible();
});

test("a deep link to a card opens that card, and any other path opens the home", async () => {
  expect(deepLinkTarget("/card/card-1")).toEqual({ kind: "card", id: "card-1" });
  expect(deepLinkTarget("/deck/deck-1?tab=words")).toEqual({ kind: "deck", id: "deck-1" });
  expect(deepLinkTarget("/settings")).toBeNull();
  expect(deepLinkTarget(undefined)).toBeNull();

  const host = fakeHost({ get_card: () => card() });
  await render(
    <I18nProvider i18n={i18n}>
      <HostContext value={host}>
        <DeepLink target={{ kind: "card", id: "card-1" }} />
      </HostContext>
    </I18nProvider>,
  );
  await expect.element(page.getByRole("heading", { level: 1 })).toHaveTextContent("sbrigarsi");
  expect(host.call).toHaveBeenCalledWith("get_card", { cardId: "card-1" });
});
