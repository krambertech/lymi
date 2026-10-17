import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { decks as mockDecks } from "../design/mock";
import type { CardHit, DeckSummary } from "../lib/api";
import { CommandMenu } from "./command-menu";

i18n.load("en", messages);
i18n.activate("en");

const { navigate, server } = vi.hoisted(() => ({
  navigate: vi.fn(),
  server: {
    term: vi.fn<(deckId: string, term: string) => Promise<CardHit | null>>(),
  },
}));

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => navigate }));
vi.mock("../lib/telemetry", () => ({ captureAnalytics: vi.fn(() => true) }));
vi.mock("../lib/queries", async () => {
  const { infiniteQueryOptions, queryOptions } = await import("@tanstack/react-query");
  return {
    cardSearchQuery: (query: string) =>
      infiniteQueryOptions({
        queryKey: ["cards", "search", "", query],
        queryFn: async () => ({ cards: [], nextCursor: null, total: 0 }),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: () => undefined,
      }),
    cardTermQuery: (deckId: string, term: string) =>
      queryOptions({
        queryKey: ["cards", "search", "term", deckId, term],
        queryFn: () => server.term(deckId, term),
      }),
  };
});

const [first, second] = mockDecks as [DeckSummary, DeckSummary];
const own: DeckSummary = { ...first, id: "own", name: "Spanish", role: "owner" };
const shared: DeckSummary = { ...second, id: "shared", name: "Shared", role: "learner" };

function renderMenu(activeDeckId: string | undefined, onAddCard = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <I18nProvider i18n={i18n}>
        <CommandMenu
          open
          onOpenChange={() => {}}
          decks={[own, shared]}
          activeDeckId={activeDeckId}
          onAddCard={onAddCard}
          onCreateDeck={() => {}}
        />
      </I18nProvider>
    </QueryClientProvider>,
  );
  return onAddCard;
}

const field = () => page.getByRole("combobox", { name: "Search cards, decks and commands" });

beforeEach(() => {
  navigate.mockReset();
  server.term.mockReset();
  localStorage.clear();
});

test("Enter before the check lands waits, then opens the card the deck already has", async () => {
  const answer = Promise.withResolvers<CardHit | null>();
  server.term.mockReturnValue(answer.promise);
  const onAddCard = renderMenu("own");
  await userEvent.type(field(), "casa");
  await userEvent.keyboard("{Enter}");
  await expect.element(page.getByText("Checking…")).toBeVisible();
  expect(onAddCard).not.toHaveBeenCalled();

  answer.resolve({ id: "c1", deckId: "own", term: "casa", deckName: "Spanish" } as CardHit);
  await vi.waitFor(() =>
    expect(navigate).toHaveBeenCalledWith({
      to: "/library/$deckId",
      params: { deckId: "own" },
      search: { card: "c1" },
    }),
  );
  expect(onAddCard).not.toHaveBeenCalled();
});

test("a new term goes to a deck the learner owns, never a shared one on screen", async () => {
  server.term.mockResolvedValue(null);
  const onAddCard = renderMenu("shared");
  await userEvent.type(field(), "gato");
  await expect.element(page.getByText("→ Spanish")).toBeVisible();
  await userEvent.keyboard("{Enter}");
  await vi.waitFor(() => expect(onAddCard).toHaveBeenCalledWith("own", "gato"));
  expect(server.term).toHaveBeenCalledWith("own", "gato");
});

test("two letters offer no add, and one Hangul character does", async () => {
  server.term.mockResolvedValue(null);
  renderMenu("own");
  await userEvent.type(field(), "ga");
  await expect.element(page.getByText("Nothing matches “ga”")).toBeVisible();
  expect(page.getByText("→ Spanish").query()).toBeNull();

  await userEvent.clear(field());
  await userEvent.type(field(), "물");
  await expect.element(page.getByText("→ Spanish")).toBeVisible();
});
