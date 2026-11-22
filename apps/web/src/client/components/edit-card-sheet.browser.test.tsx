import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { writes } from "@lymi/client/writes";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { messages } from "../../locales/en.po";
import { cards, decks, queueItemPicture } from "../design/mock";
import { ApiError, api, type Card } from "../lib/api";
import { decksQuery } from "../lib/queries";
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

test("a sheet whose picture never answers can close once the card is written", async () => {
  const pictured = queueItemPicture.card as Card;
  vi.spyOn(writes, "updateCard").mockImplementation(async (_card, patch) => ({
    card: { ...pictured, ...patch } as Card,
    queued: false,
  }));
  vi.spyOn(api, "archiveCardImage").mockReturnValue(new Promise(() => {}));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(["tags"], []);
  function Pictured() {
    const [open, setOpen] = useState<Card | null>(pictured);
    return (
      <EditCardSheet
        card={open}
        decks={decks}
        onOpenChange={(next) => !next && setOpen(null)}
        onReopen={setOpen}
      />
    );
  }
  await render(
    <QueryClientProvider client={client}>
      <I18nProvider i18n={i18n}>
        <Toaster aria-label="Notifications" closeLabel="Dismiss" timeout={0} />
        <Pictured />
      </I18nProvider>
    </QueryClientProvider>,
  );
  const sheet = page.getByRole("dialog", { name: "Edit card" });
  await userEvent.fill(sheet.getByRole("textbox", { name: "Meaning", exact: true }), "Yield");
  await sheet.getByRole("button", { name: "Archive the picture" }).click();
  await sheet.getByRole("button", { name: "Save" }).click();
  await expect.poll(() => api.archiveCardImage).toHaveBeenCalled();

  await userEvent.keyboard("{Escape}");
  await expect.element(sheet).not.toBeInTheDocument();
  const notifications = page.getByRole("region", { name: "Notifications" });
  expect(notifications.element().textContent).not.toContain("Changes discarded");
  expect(writes.updateCard).toHaveBeenCalledTimes(1);
});

test("a refused save frees the sheet while the lists it refreshes never answer", async () => {
  vi.spyOn(writes, "updateCard").mockRejectedValue(new Error("Refused"));
  // The deck list answers once, then its refetch after the write stalls.
  vi.spyOn(api, "decks")
    .mockResolvedValueOnce(decks)
    .mockReturnValue(new Promise(() => {}));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(["tags"], []);
  function Watched() {
    useQuery(decksQuery);
    return <Sheet />;
  }
  await render(
    <QueryClientProvider client={client}>
      <I18nProvider i18n={i18n}>
        <Toaster aria-label="Notifications" closeLabel="Dismiss" timeout={0} />
        <Watched />
      </I18nProvider>
    </QueryClientProvider>,
  );
  await expect.poll(() => api.decks).toHaveBeenCalledTimes(1);
  const sheet = page.getByRole("dialog", { name: "Edit card" });
  await userEvent.fill(sheet.getByRole("textbox", { name: "Meaning", exact: true }), "the mist");
  await sheet.getByRole("button", { name: "Save" }).click();
  await expect.poll(() => api.decks).toHaveBeenCalledTimes(2);

  await userEvent.keyboard("{Escape}");
  await expect.element(sheet).not.toBeInTheDocument();
});

test("a closed save that answers late leaves a newer save holding the sheet", async () => {
  const pictured = queueItemPicture.card as Card;
  let refuse = () => {};
  vi.spyOn(api, "archiveCardImage").mockReturnValueOnce(
    new Promise((_resolve, reject) => (refuse = () => reject(new Error("Gone")))),
  );
  vi.spyOn(writes, "updateCard")
    .mockImplementationOnce(async (_card, patch) => ({
      card: { ...pictured, ...patch } as Card,
      queued: false,
    }))
    .mockReturnValue(new Promise(() => {}));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(["tags"], []);
  function Pictured() {
    const [open, setOpen] = useState<Card | null>(pictured);
    return (
      <>
        <button type="button" onClick={() => setOpen(pictured)}>
          Open again
        </button>
        <EditCardSheet
          card={open}
          decks={decks}
          onOpenChange={(next) => !next && setOpen(null)}
          onReopen={setOpen}
        />
      </>
    );
  }
  await render(
    <QueryClientProvider client={client}>
      <I18nProvider i18n={i18n}>
        <Toaster aria-label="Notifications" closeLabel="Dismiss" timeout={0} />
        <Pictured />
      </I18nProvider>
    </QueryClientProvider>,
  );
  const sheet = page.getByRole("dialog", { name: "Edit card" });
  await userEvent.fill(sheet.getByRole("textbox", { name: "Meaning", exact: true }), "Yield");
  await sheet.getByRole("button", { name: "Archive the picture" }).click();
  await sheet.getByRole("button", { name: "Save" }).click();
  await expect.poll(() => api.archiveCardImage).toHaveBeenCalled();
  await userEvent.keyboard("{Escape}");
  await expect.element(sheet).not.toBeInTheDocument();

  (page.getByRole("button", { name: "Open again" }).element() as HTMLElement).click();
  await userEvent.fill(sheet.getByRole("textbox", { name: "Meaning", exact: true }), "Give way!");
  await sheet.getByRole("button", { name: "Save" }).click();
  await expect.poll(() => writes.updateCard).toHaveBeenCalledTimes(2);
  refuse();
  await new Promise((resolve) => setTimeout(resolve, 100));

  await userEvent.keyboard("{Escape}");
  await expect.element(sheet).toBeInTheDocument();
  const notifications = page.getByRole("region", { name: "Notifications" });
  expect(notifications.element().textContent).not.toContain("Changes discarded");
});

test("a picture that fails after its sheet closed says so in a toast", async () => {
  const pictured = queueItemPicture.card as Card;
  let fail = () => {};
  vi.spyOn(api, "archiveCardImage").mockReturnValue(
    new Promise((_, reject) => {
      fail = () => reject(new ApiError(503, "Lymi couldn’t archive the picture."));
    }),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(["tags"], []);
  function Pictured() {
    const [open, setOpen] = useState<Card | null>(pictured);
    return (
      <EditCardSheet
        card={open}
        decks={decks}
        onOpenChange={(next) => !next && setOpen(null)}
        onReopen={setOpen}
      />
    );
  }
  await render(
    <QueryClientProvider client={client}>
      <I18nProvider i18n={i18n}>
        <Toaster aria-label="Notifications" closeLabel="Dismiss" timeout={0} />
        <Pictured />
      </I18nProvider>
    </QueryClientProvider>,
  );
  const sheet = page.getByRole("dialog", { name: "Edit card" });
  await sheet.getByRole("button", { name: "Archive the picture" }).click();
  await sheet.getByRole("button", { name: "Save" }).click();
  await expect.poll(() => api.archiveCardImage).toHaveBeenCalled();
  await userEvent.keyboard("{Escape}");
  await expect.element(sheet).not.toBeInTheDocument();

  fail();
  const notifications = page.getByRole("region", { name: "Notifications" });
  await expect
    .poll(() => notifications.element().textContent)
    .toContain("without the picture change. Lymi couldn’t archive the picture.");
  await notifications.getByRole("button", { name: "Edit card" }).click();
  await expect.element(sheet).toBeInTheDocument();
});
