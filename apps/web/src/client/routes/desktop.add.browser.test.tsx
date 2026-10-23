import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import type { DesktopBridge, PanelShown } from "@lymi/client/desktop";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ComponentType } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { decks as mockDecks } from "../design/mock";
import type { DeckSummary } from "../lib/api";

i18n.load("en", messages);
i18n.activate("en");

/** The Mac app's quick-add panel against a stand-in for the app: what is unique to it, not the add itself. */
const { server, writes } = vi.hoisted(() => ({
  server: { me: vi.fn(), decks: vi.fn(), chooseDeck: vi.fn() },
  writes: { addCard: vi.fn(), archiveCard: vi.fn() },
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: { component: ComponentType }) => ({ options }),
}));
vi.mock("@lymi/client/writes", () => ({ writes }));
vi.mock("../lib/card-writes", () => ({
  addInput: (values: { deckId: string; term: string }) => values,
  refreshAfterCardWrite: vi.fn(async () => {}),
}));
vi.mock("../lib/queries", async () => {
  const { queryOptions } = await import("@tanstack/react-query");
  return {
    meQuery: queryOptions({ queryKey: ["me"], queryFn: () => server.me() }),
    decksQuery: queryOptions({ queryKey: ["decks"], queryFn: () => server.decks() }),
  };
});
vi.mock("../lib/api", async (original) => ({
  ...(await original<typeof import("../lib/api")>()),
  api: { chooseDeck: (body: unknown) => server.chooseDeck(body) },
}));

const [first, second] = mockDecks as [DeckSummary, DeckSummary];
const italian: DeckSummary = { ...first, id: "it", name: "Italian", role: "owner" };
const estonian: DeckSummary = { ...second, id: "et", name: "Estonian", role: "owner" };

let shown: ((value: PanelShown) => void) | undefined;
const app = {
  hidePanel: vi.fn(),
  openApp: vi.fn(),
  added: vi.fn(),
  resizePanel: vi.fn(),
  setPanelBackground: vi.fn(),
};

beforeEach(() => {
  localStorage.clear();
  server.me.mockResolvedValue({ id: "u1", email: "learner@lymi.local", name: "Learner" });
  server.decks.mockResolvedValue([italian, estonian]);
  server.chooseDeck.mockResolvedValue({ deckId: null, language: null });
  writes.addCard.mockImplementation(async (input: { term: string }) => ({
    outcome: { status: "added", card: { id: "card-1", term: input.term } },
    queued: false,
  }));
  writes.archiveCard.mockResolvedValue(undefined);
  window.lymiDesktop = {
    version: 1,
    ...app,
    onPanelShown: (listener) => {
      shown = listener;
      return () => {};
    },
  } as unknown as DesktopBridge;
});

afterEach(() => {
  vi.clearAllMocks();
  delete window.lymiDesktop;
});

async function renderPanel() {
  const { Route } = await import("./desktop.add");
  const Panel = (Route as unknown as { options: { component: ComponentType } }).options.component;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <I18nProvider i18n={i18n}>
        <Panel />
      </I18nProvider>
    </QueryClientProvider>,
  );
  const term = page.getByRole("textbox", { name: "Term" });
  await expect.element(page.getByRole("button", { name: "Deck: Italian" })).toBeVisible();
  return term;
}

test("Enter adds the term as a panel add, and ⌘Z archives it again", async () => {
  const term = await renderPanel();
  await userEvent.type(term, "la stazione");
  await userEvent.keyboard("{Enter}");
  await expect
    .element(page.getByRole("status"))
    .toHaveTextContent("Added “la stazione” to Italian");
  expect(writes.addCard).toHaveBeenCalledWith(
    { deckId: "it", term: "la stazione" },
    "desktop_panel",
  );
  expect(app.added).toHaveBeenCalled();

  await userEvent.keyboard("{Meta>}z{/Meta}");
  await expect.element(page.getByRole("status")).toHaveTextContent("Archived “la stazione”");
  expect(writes.archiveCard).toHaveBeenCalledWith("card-1");
});

test("the arrow keys choose the deck, and Esc closes the list before the panel", async () => {
  const term = await renderPanel();
  await userEvent.click(term);
  await userEvent.keyboard("{ArrowDown}");
  await expect.element(page.getByRole("listbox", { name: "Deck" })).toBeVisible();
  await userEvent.keyboard("{ArrowDown}{Enter}");
  await expect.element(page.getByRole("button", { name: "Deck: Estonian" })).toBeVisible();

  await userEvent.keyboard("{ArrowDown}");
  await userEvent.keyboard("{Escape}");
  await expect.element(page.getByRole("listbox")).not.toBeInTheDocument();
  expect(app.hidePanel).not.toHaveBeenCalled();
  await userEvent.keyboard("{Escape}");
  expect(app.hidePanel).toHaveBeenCalledOnce();
});

test("the text selected in the app in front starts the term", async () => {
  const term = await renderPanel();
  shown?.({ selection: "raamatukogu" });
  await expect.element(term).toHaveValue("raamatukogu");
});

test("with no deck of the learner's own, Enter opens Library", async () => {
  server.decks.mockResolvedValue([{ ...italian, role: "learner" }]);
  const { Route } = await import("./desktop.add");
  const Panel = (Route as unknown as { options: { component: ComponentType } }).options.component;
  render(
    <QueryClientProvider client={new QueryClient()}>
      <I18nProvider i18n={i18n}>
        <Panel />
      </I18nProvider>
    </QueryClientProvider>,
  );
  await expect
    .element(page.getByText("Make a deck in Lymi first. Enter opens Library."))
    .toBeVisible();
  await userEvent.type(page.getByRole("textbox", { name: "Term" }), "casa{Enter}");
  expect(app.openApp).toHaveBeenCalledWith("/library");
  expect(writes.addCard).not.toHaveBeenCalled();
});
