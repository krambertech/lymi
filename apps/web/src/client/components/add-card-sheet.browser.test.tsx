import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { writes } from "@lymi/client/writes";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { cards, decks } from "../design/mock";
import { api, type Card } from "../lib/api";
import { deckCardsQuery } from "../lib/queries";
import { AddCardSheet } from "./add-card-sheet";
import { Toaster } from "./ui/toast";

i18n.load("en", messages);
i18n.activate("en");

const [deck] = decks;
if (!deck) throw new Error("no mock deck");

const added: Card = {
  ...(cards[0] as Card),
  id: "new",
  deckId: deck.id,
  term: "la nebbia",
  meaning: "the fog",
  example: null,
  exampleSource: null,
  enrichmentStatus: "working",
  enrichmentFields: ["example"],
};
const enriched: Card = {
  ...added,
  example: "C’è la nebbia stamattina.",
  exampleSource: "ai",
  enrichmentStatus: null,
  enrichmentFields: null,
};

/** The deck's list behind the sheet, as the deck page reads it. */
function DeckList() {
  const rows = useQuery(deckCardsQuery(deck?.id ?? "")).data ?? [];
  return (
    <ul aria-label="Deck">
      {rows.map(({ card }) => (
        <li key={card.id}>
          {card.term}: {card.example ?? "…"}
        </li>
      ))}
    </ul>
  );
}

function Sheet() {
  const [open, setOpen] = useState(true);
  return <AddCardSheet open={open} onOpenChange={setOpen} deckId={deck?.id} />;
}

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(api, "decks").mockResolvedValue(decks);
  vi.spyOn(api, "sections").mockResolvedValue({ sections: [], progress: null });
  vi.spyOn(writes, "addCard").mockResolvedValue({
    outcome: { status: "added", card: added },
    queued: false,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("the sheet closes once the card is added, while the deck's list is still refetching", async () => {
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const deckCards = vi
    .spyOn(api, "deckCards")
    .mockResolvedValueOnce([])
    .mockImplementation(async () => {
      await held;
      return [{ card: enriched, state: null }];
    });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(["tags"], []);
  await render(
    <QueryClientProvider client={client}>
      <I18nProvider i18n={i18n}>
        <Toaster aria-label="Notifications" closeLabel="Dismiss" timeout={0} />
        <DeckList />
        <Sheet />
      </I18nProvider>
    </QueryClientProvider>,
  );
  const sheet = page.getByRole("dialog", { name: "Add a card" });
  await userEvent.fill(sheet.getByRole("textbox", { name: "Term", exact: true }), "la nebbia");
  await userEvent.fill(sheet.getByRole("textbox", { name: "Meaning", exact: true }), "the fog");
  await sheet.getByRole("button", { name: /^Add to / }).click();

  await expect.element(sheet).not.toBeInTheDocument();
  await expect
    .element(page.getByRole("region", { name: "Notifications" }))
    .toHaveTextContent("Added “la nebbia”");
  // The refetch the add started is still out.
  expect(deckCards).toHaveBeenCalledTimes(2);

  release();
  await expect
    .element(page.getByRole("list", { name: "Deck" }))
    .toHaveTextContent("la nebbia: C’è la nebbia stamattina.");
});
