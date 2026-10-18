import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import type { PublicDeckSummary } from "@lymi/core/catalog";
import type { ReactNode } from "react";
import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { decks } from "../design/mock";
import { FirstRunGuide, ReadyToStart } from "./first-run";
import { StaticNavProvider } from "./nav-link";

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
  await expect
    .element(page.getByRole("combobox", { name: "I’m learning" }))
    .toHaveTextContent("Estonian");
  await expect.element(page.getByText("Everyday Estonian")).toBeVisible();
  await expect.element(page.getByText("Everyday Finnish")).not.toBeInTheDocument();

  await page.getByRole("button", { name: /Add/ }).click();
  expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ slug: "everyday-estonian" }));

  await page.getByRole("combobox", { name: "I’m learning" }).click();
  await page.getByRole("option", { name: "Anything" }).click();
  await expect.element(page.getByText("Everyday Finnish")).toBeVisible();
});
