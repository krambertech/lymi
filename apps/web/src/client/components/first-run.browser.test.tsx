import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import type { PublicDeckSummary } from "@lymi/core/catalog";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { decks } from "../design/mock";
import type { ConnectedApp } from "../lib/api";
import { connectedAppsQuery } from "../lib/queries";
import { captureAnalytics } from "../lib/telemetry";
import { CreateFirstDeck, FirstRunGuide, ReadyToStart } from "./first-run";
import { StaticNavProvider } from "./nav-link";

vi.mock("../lib/telemetry", () => ({ captureAnalytics: vi.fn(() => true) }));

i18n.load("en", messages);
i18n.activate("en");

function wrap(node: ReactNode) {
  return render(
    <I18nProvider i18n={i18n}>
      <StaticNavProvider path="/today">{node}</StaticNavProvider>
    </I18nProvider>,
  );
}

const ready = (slug: string, name: string, language: string): PublicDeckSummary => ({
  slug,
  name,
  summary: `${name} for the first weeks.`,
  category: "languages",
  tags: [],
  language,
  meaningLanguage: "en",
  cardCount: 12,
  sectionCount: 0,
  card: null,
});

test("a new learner is on the first step, and nothing is ticked", async () => {
  await wrap(
    <FirstRunGuide
      name="Kateryna Porshnieva"
      decks={[]}
      play={false}
      onAddCard={undefined}
      onSmartAdd={undefined}
    />,
  );
  await expect.element(page.getByRole("heading", { name: "Welcome, Kateryna" })).toBeVisible();
  await expect.element(page.getByText("0 of 3 done")).toBeInTheDocument();
  await expect
    .element(page.getByRole("listitem").filter({ hasText: "Create a deck" }))
    .toHaveAttribute("aria-current", "step");
});

test("an empty deck ticks the first step and asks for cards", async () => {
  const [deck] = decks;
  if (!deck) throw new Error("no mock deck");
  const onAddCard = vi.fn();
  await wrap(
    <FirstRunGuide
      name="Kateryna"
      decks={[{ ...deck, total: 0, due: 0 }]}
      play={false}
      onAddCard={onAddCard}
      onSmartAdd={undefined}
    />,
  );
  await expect.element(page.getByText("1 of 3 done")).toBeInTheDocument();
  await expect
    .element(page.getByRole("listitem").filter({ hasText: "Add cards" }))
    .toHaveAttribute("aria-current", "step");
  await page.getByRole("button", { name: /Add a card/ }).click();
  expect(onAddCard).toHaveBeenCalledOnce();
});

test("an empty deck someone shared leaves the first step to do", async () => {
  const [deck] = decks;
  if (!deck) throw new Error("no mock deck");
  await wrap(
    <FirstRunGuide
      name="Kateryna"
      decks={[{ ...deck, total: 0, due: 0, role: "learner" }]}
      play={false}
      onAddCard={undefined}
      onSmartAdd={undefined}
    />,
  );
  await expect.element(page.getByText("0 of 3 done")).toBeInTheDocument();
  await expect
    .element(page.getByRole("listitem").filter({ hasText: "Create a deck" }))
    .toHaveAttribute("aria-current", "step");
});

test("a deck with cards leads to the first review", async () => {
  const [deck] = decks;
  await wrap(
    <FirstRunGuide
      name="Kateryna"
      decks={decks.slice(0, 1)}
      play={false}
      onAddCard={undefined}
      onSmartAdd={undefined}
    />,
  );
  await expect.element(page.getByRole("heading", { name: "Welcome, Kateryna" })).toBeVisible();
  await expect.element(page.getByText(`${deck?.name} is ready.`, { exact: false })).toBeVisible();
  await expect.element(page.getByRole("link", { name: "Review" })).toBeVisible();
  await expect.element(page.getByText("2 of 3 done")).toBeInTheDocument();
});

test("the decks start on the language the learner came for, and adding one says so", async () => {
  const onAdd = vi.fn();
  await wrap(
    <ReadyToStart
      ready={[
        ready("everyday-estonian", "Everyday Estonian", "et"),
        ready("everyday-finnish", "Everyday Finnish", "fi"),
      ]}
      initialLanguage="et"
      play={false}
      onAdd={onAdd}
      adding={undefined}
    />,
  );
  // The choice is the heading's last words.
  await expect
    .element(page.getByRole("heading", { name: "Explore ready-made decks about Estonian" }))
    .toBeVisible();
  await expect.element(page.getByText("Everyday Estonian")).toBeVisible();
  await expect.element(page.getByText("Everyday Finnish")).not.toBeInTheDocument();

  await page.getByRole("button", { name: /Add/ }).click();
  expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ slug: "everyday-estonian" }));

  // The list is searched by the language's name.
  await page.getByRole("combobox", { name: /^What the decks are about/ }).click();
  await page.getByPlaceholder("Search languages").fill("fin");
  await expect.element(page.getByRole("option", { name: /Finnish/ })).toBeVisible();
  await expect.element(page.getByRole("option", { name: /Estonian/ })).not.toBeInTheDocument();
  await page.getByRole("option", { name: /Finnish/ }).click();
  await expect.element(page.getByText("Everyday Finnish")).toBeVisible();
  await expect
    .element(page.getByRole("heading", { name: "Explore ready-made decks about Finnish" }))
    .toBeVisible();
});

test("choosing a topic says which, and whether it was searched for, never what was typed", async () => {
  wrap(
    <ReadyToStart
      ready={[
        ready("everyday-estonian", "Everyday Estonian", "et"),
        ready("everyday-finnish", "Everyday Finnish", "fi"),
      ]}
      initialLanguage={null}
      play={false}
      onAdd={vi.fn()}
      adding={undefined}
    />,
  );
  expect(captureAnalytics).not.toHaveBeenCalledWith("ready_decks_narrowed", expect.anything());

  await page.getByRole("combobox", { name: /^What the decks are about/ }).click();
  await page.getByPlaceholder("Search languages").fill("est");
  await page.getByRole("option", { name: /Estonian/ }).click();
  expect(captureAnalytics).toHaveBeenCalledWith("ready_decks_narrowed", {
    topic: "language",
    language: "et",
    searched: true,
  });
});

test("an assistant already connected turns its card into what it can do", async () => {
  const qc = new QueryClient();
  qc.setQueryData(connectedAppsQuery.queryKey, [
    {
      id: "app_1",
      clientId: "https://claude.ai/oauth/mcp-oauth-client-metadata",
      name: "Claude",
      scope: "write",
      createdAt: "2026-10-19T09:00:00.000Z",
      updatedAt: "2026-10-19T09:00:00.000Z",
    },
  ] satisfies ConnectedApp[]);
  render(
    <QueryClientProvider client={qc}>
      <I18nProvider i18n={i18n}>
        <StaticNavProvider path="/today">
          <CreateFirstDeck started play={false} onSmartAdd={undefined} onCreateDeck={undefined} />
        </StaticNavProvider>
      </I18nProvider>
    </QueryClientProvider>,
  );
  await expect.element(page.getByRole("heading", { name: "Claude is connected" })).toBeVisible();
  await expect.element(page.getByRole("link", { name: "Connected apps" })).toBeVisible();
  await expect.element(page.getByText("Connect your AI assistant")).not.toBeInTheDocument();
});

test("a learner whose only deck was shared is offered a deck of their own", async () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <I18nProvider i18n={i18n}>
        <StaticNavProvider path="/today">
          <CreateFirstDeck
            started={false}
            joined
            play={false}
            onSmartAdd={undefined}
            onCreateDeck={undefined}
          />
        </StaticNavProvider>
      </I18nProvider>
    </QueryClientProvider>,
  );
  await expect.element(page.getByRole("heading", { name: "Make your own deck" })).toBeVisible();
});
