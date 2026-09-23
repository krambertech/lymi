import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import type { Card, Section } from "../lib/api";
import type { DeckGroup } from "../lib/deck-list";
import { Glossary, type SectionEditing } from "./deck-glossary";

i18n.load("en", messages);
i18n.activate("en");

const section = (id: string, status: Section["status"], due: number) =>
  ({ id, deckId: "d1", name: id, position: 0, total: 1, known: 0, due, status }) as Section;

const group = (s: Section): DeckGroup => ({
  kind: "section",
  key: s.id,
  section: s,
  rows: [
    { card: { id: `${s.id}-card`, term: `${s.id} term`, sectionId: s.id } as Card, state: null },
  ],
});

const groups = [
  group(section("Greetings", "open", 3)),
  group(section("Done", "open", 0)),
  group(section("Later", "locked", 1)),
];

const editing: SectionEditing = {
  onRename: vi.fn(),
  onAddCard: vi.fn(),
  onManage: vi.fn(),
  onDropCards: vi.fn(),
};

const renderGlossary = (props: { editing?: SectionEditing; onReview?: (s: Section) => void }) =>
  render(
    <I18nProvider i18n={i18n}>
      <Glossary groups={groups} sort="section" openId={null} onOpen={() => {}} now={0} {...props} />
    </I18nProvider>,
  );

const menuFor = (name: string) => page.getByRole("button", { name: `Options for ${name}` });

test("a member's section menu holds only Review this section, where cards are due", async () => {
  const onReview = vi.fn();
  await renderGlossary({ onReview });

  // Nothing due leaves a member no menu at all; a card started early counts in a locked section.
  expect(menuFor("Done").elements()).toHaveLength(0);
  expect(menuFor("Later").elements()).toHaveLength(1);

  await menuFor("Greetings").click();
  expect(page.getByRole("menuitem").elements()).toHaveLength(1);
  expect(page.getByRole("separator").elements()).toHaveLength(0);
  await page.getByRole("menuitem", { name: "Review this section" }).click();
  expect(onReview).toHaveBeenCalledWith(expect.objectContaining({ id: "Greetings" }));
});

test("the owner's menu leads with Review this section only while the section has cards due", async () => {
  await renderGlossary({ editing, onReview: vi.fn() });

  await menuFor("Greetings").click();
  expect(
    page
      .getByRole("menuitem")
      .elements()
      .map((e) => e.textContent),
  ).toEqual(["Review this section", "Add card here", "Rename", "Arrange sections"]);
  await page.getByRole("menuitem", { name: "Rename" }).click();

  await menuFor("Done").click();
  expect(page.getByRole("menuitem", { name: "Review this section" }).elements()).toHaveLength(0);
  expect(page.getByRole("menuitem").elements()).toHaveLength(3);
});
