import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { writes } from "@lymi/client/writes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { cards, decks } from "../design/mock";
import type { Card } from "../lib/api";
import { EditCardSheet } from "./edit-card-sheet";
import { Toaster } from "./ui/toast";

i18n.load("en", messages);
i18n.activate("en");

const card = cards[0] as Card;

function Sheet() {
  const [open, setOpen] = useState<Card | null>(card);
  return (
    <EditCardSheet
      card={open}
      decks={decks}
      onOpenChange={(next) => !next && setOpen(null)}
      onReopen={setOpen}
    />
  );
}

afterEach(() => vi.restoreAllMocks());

test("a sheet dismissed while its changes save stays until they land, with nothing to undo", async () => {
  let land = () => {};
  vi.spyOn(writes, "updateCard").mockImplementation(
    (_card, patch) =>
      new Promise((resolve) => {
        land = () => resolve({ card: { ...card, ...patch } as Card, queued: true });
      }),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(["tags"], []);
  await render(
    <QueryClientProvider client={client}>
      <I18nProvider i18n={i18n}>
        <Toaster aria-label="Notifications" closeLabel="Dismiss" timeout={0} />
        <Sheet />
      </I18nProvider>
    </QueryClientProvider>,
  );
  const sheet = page.getByRole("dialog", { name: "Edit card" });
  await userEvent.fill(sheet.getByRole("textbox", { name: "Meaning", exact: true }), "the mist");
  await sheet.getByRole("button", { name: "Save" }).click();
  await userEvent.keyboard("{Escape}");

  await expect.element(sheet).toBeInTheDocument();
  const notifications = page.getByRole("region", { name: "Notifications" });
  expect(notifications.element().textContent).not.toContain("Changes discarded");

  land();
  await expect.element(sheet).not.toBeInTheDocument();
  expect(notifications.element().textContent).not.toContain("Changes discarded");
});
