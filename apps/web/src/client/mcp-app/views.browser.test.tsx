import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import type { ViewAddResult, ViewCard } from "../../shared/mcp-app";
import { type Host, HostContext } from "./host";
import { CaptureView } from "./views/capture-view";

i18n.load("en", messages);
i18n.activate("en");

const card = (over: Partial<ViewCard> = {}): ViewCard => ({
  id: "card-1",
  deckId: "deck-1",
  term: "sbrigarsi",
  meaning: "to hurry up",
  pronunciation: null,
  example: null,
  notes: null,
  hook: null,
  language: "it",
  source: "Lesson 12",
  image: null,
  meaningSource: "lesson",
  exampleSource: null,
  pronunciationSource: null,
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
    select: vi.fn(),
  };
  return host as typeof host & Host;
}

const added: ViewAddResult = {
  added: 1,
  skipped: 2,
  results: [
    { id: "card-1", status: "added", card: card() },
    {
      id: "card-9",
      status: "skipped",
      term: "magari",
      existing: { ...card({ id: "card-9", term: "magari", meaning: "maybe" }), deckName: "Verbi" },
    },
    {
      id: "card-9",
      status: "skipped",
      term: "Magari",
      existing: { ...card({ id: "card-9", term: "magari", meaning: "maybe" }), deckName: "Verbi" },
    },
  ],
};

async function renderCapture(host: Host) {
  await render(
    <I18nProvider i18n={i18n}>
      <HostContext value={host}>
        <CaptureView result={added} decks={{ "deck-1": "Lezione 12" }} />
      </HostContext>
    </I18nProvider>,
  );
}

test("an add names its deck, lists what landed, and lists an existing card once", async () => {
  await renderCapture(fakeHost());
  await expect
    .element(page.getByRole("heading", { level: 1 }))
    .toHaveTextContent("Added 1 card to Lezione 12");
  const landed = page.getByRole("list", { name: "Added", exact: true }).getByRole("listitem");
  await expect.element(landed).toBeVisible();
  expect(landed.element().textContent).toContain("sbrigarsi");
  const existing = page.getByRole("list", { name: "Already in your decks" }).getByRole("listitem");
  expect(existing.elements()).toHaveLength(1);
});

test("opening a card tells the assistant which card the learner means, and closing it clears that", async () => {
  const host = fakeHost();
  await renderCapture(host);
  const row = page.getByRole("button", { name: /sbrigarsi/ });
  await row.click();
  expect(host.select).toHaveBeenLastCalledWith(
    expect.objectContaining({ id: "card-1", deckName: "Lezione 12" }),
  );
  await row.click();
  expect(host.select).toHaveBeenLastCalledWith(null);
});

test("a save sends only the changed field and shows the saved card", async () => {
  const host = fakeHost({
    get_card: () => card(),
    update_card: (args) => card({ meaning: String(args.meaning), meaningSource: "manual" }),
  });
  await renderCapture(host);
  await page.getByRole("button", { name: /sbrigarsi/ }).click();
  await page.getByRole("button", { name: "Edit" }).click();
  const meaning = page.getByRole("textbox", { name: "Meaning" });
  await meaning.clear();
  await userEvent.type(meaning, "to get a move on");
  await page.getByRole("button", { name: "Save" }).click();

  await expect.element(page.getByText("to get a move on")).toBeVisible();
  expect(host.call).toHaveBeenLastCalledWith("update_card", {
    cardId: "card-1",
    meaning: "to get a move on",
  });
});

test("a field someone else changed while the learner edited keeps the draft and asks", async () => {
  const host = fakeHost({
    get_card: () => card({ meaning: "to rush" }),
    update_card: (args) => card({ meaning: String(args.meaning) }),
  });
  await renderCapture(host);
  await page.getByRole("button", { name: /sbrigarsi/ }).click();
  await page.getByRole("button", { name: "Edit" }).click();
  const meaning = page.getByRole("textbox", { name: "Meaning" });
  await meaning.clear();
  await userEvent.type(meaning, "to get a move on");
  await page.getByRole("button", { name: "Save" }).click();

  await expect
    .element(page.getByText("This card changed while you were editing it."))
    .toBeVisible();
  await expect.element(meaning).toHaveValue("to get a move on");
  expect(host.call).not.toHaveBeenCalledWith("update_card", expect.anything());

  await page.getByRole("button", { name: "Use the new version" }).click();
  await expect.element(meaning).toHaveValue("to rush");
});

test("a refused save keeps the draft and says why", async () => {
  const host = fakeHost({
    get_card: () => card(),
    update_card: () => new Error("This connection can only read."),
  });
  await renderCapture(host);
  await page.getByRole("button", { name: /sbrigarsi/ }).click();
  await page.getByRole("button", { name: "Edit" }).click();
  const meaning = page.getByRole("textbox", { name: "Meaning" });
  await meaning.clear();
  await userEvent.type(meaning, "to get a move on");
  await page.getByRole("button", { name: "Save" }).click();

  await expect.element(page.getByText("This connection can only read.")).toBeVisible();
  await expect.element(meaning).toHaveValue("to get a move on");
});
