import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import {
  focusManager,
  onlineManager,
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { useState } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import type { Choices } from "../components/import-parts";
import { StaticNavProvider } from "../components/nav-link";
import { errorMessage, type Import, type ImportPreview } from "../lib/api";
import { importPreviewQuery, previewWaiting } from "../lib/queries";
import { ImportPreviewView } from "./import-view";

i18n.load("en", messages);
i18n.activate("en");

const summary: NonNullable<Import["summary"]> = {
  decks: [{ key: "d1", name: "Kaishi 1.5k", description: null, cards: 2 }],
  noteTypes: [
    {
      key: "basic",
      name: "Kaishi",
      kind: "basic",
      fields: ["Word", "Meaning"],
      roles: ["term", "meaning"],
      questions: [null, null],
      notes: 2,
      samples: [["猫", "cat"]],
    },
  ],
  notes: 2,
  reviews: 0,
  pictures: 0,
  audio: 0,
  unsupported: 0,
  languages: { d1: "ja" },
};

const item: Import = {
  id: "imp1",
  source: "anki",
  fileName: "Kaishi.apkg",
  byteSize: 1024,
  status: "ready",
  failure: null,
  summary,
  choices: null,
  counts: null,
  progress: { written: 0, chunks: 0 },
  upload: { partBytes: 1024, parts: 1, received: 1 },
  createdBy: "user",
  createdAt: "2026-10-19T00:00:00.000Z",
  updatedAt: "2026-10-19T00:00:00.000Z",
  finishedAt: null,
  archivedAt: null,
};

const preview: ImportPreview = {
  added: 2,
  existing: 0,
  duplicates: 0,
  duplicateExamples: [],
  skipped: 0,
  archived: 0,
  shortened: 0,
  reviews: 0,
  pictures: 0,
  picturesSkipped: 0,
  recordings: 0,
  recordingsSkipped: 0,
  soundsLeftOut: 0,
  pitchSkipped: 0,
  decks: [{ key: "d1", name: "Kaishi 1.5k", cards: 2, existingDeckId: null }],
  samples: {
    basic: [
      {
        term: "猫",
        meaning: "cat",
        pronunciation: null,
        example: null,
        notes: null,
        tags: [],
        modes: [],
        picture: false,
      },
    ],
  },
  known: 0,
  tags: 0,
  addedByNoteType: { basic: 2 },
  audio: 0,
  unsupported: 0,
};

/** The route's wiring of the preview query into the view. */
function Preview() {
  const [choices, setChoices] = useState<Choices>({
    languages: { ...summary.languages },
    roles: { basic: ["term", "meaning"] },
    skipDecks: [],
  });
  const query = useQuery(importPreviewQuery(item.id, choices));
  return (
    <ImportPreviewView
      item={item}
      summary={summary}
      choices={choices}
      onChoices={setChoices}
      preview={query.data}
      previewLoading={previewWaiting(query)}
      previewError={query.isError ? errorMessage(query.error) : undefined}
      onPreviewRetry={() => void query.refetch()}
      onConfirm={() => {}}
      onCancel={() => {}}
    />
  );
}

const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });

function renderPreview() {
  return render(
    <QueryClientProvider client={client}>
      <I18nProvider i18n={i18n}>
        <StaticNavProvider path={`/import/${item.id}`}>
          <Preview />
        </StaticNavProvider>
      </I18nProvider>
    </QueryClientProvider>,
  );
}

const fetchPreview = () => vi.spyOn(globalThis, "fetch");
const never = () => new Promise<Response>(() => {});
const noTerm = () => page.getByText("No card of this kind has a term.");
const gettingReady = () => page.getByText("Getting a card ready…");

afterEach(() => {
  client.clear();
  vi.restoreAllMocks();
  focusManager.setFocused(undefined);
  onlineManager.setOnline(true);
});

test("a preview that has not answered yet is getting a card ready", async () => {
  fetchPreview().mockImplementation(never);
  await renderPreview();
  await expect.element(gettingReady()).toBeVisible();
  await expect.element(noTerm()).not.toBeInTheDocument();
});

test("a retry paused for a hidden tab is still getting a card ready", async () => {
  focusManager.setFocused(false);
  const fetch = fetchPreview().mockRejectedValueOnce(new TypeError("Failed to fetch"));
  await renderPreview();
  await vi.waitFor(() =>
    expect(
      client.getQueryCache().findAll({ queryKey: ["imports", item.id, "preview"] })[0]?.state,
    ).toMatchObject({ fetchStatus: "paused", status: "pending" }),
  );
  expect(fetch).toHaveBeenCalledTimes(1);
  await expect.element(gettingReady()).toBeVisible();
  await expect.element(noTerm()).not.toBeInTheDocument();

  fetch.mockResolvedValue(Response.json(preview));
  focusManager.setFocused(true);
  await expect.element(page.getByText("猫")).toBeVisible();
});

test("a preview that failed says so and tries again", async () => {
  const fetch = fetchPreview().mockRejectedValue(new TypeError("Failed to fetch"));
  await renderPreview();
  await expect
    .element(page.getByRole("alert"))
    .toHaveTextContent("Couldn’t reach Lymi. Check your connection and try again.");
  await expect.element(noTerm()).not.toBeInTheDocument();

  fetch.mockResolvedValue(Response.json(preview));
  await userEvent.click(page.getByRole("button", { name: "Try again" }));
  await expect.element(page.getByText("猫")).toBeVisible();
});
