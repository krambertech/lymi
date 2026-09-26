import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { type ReactNode, useState } from "react";
import { describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import type { Member, Section } from "../lib/api";
import { RemoveMemberDialog } from "./member-dialogs";
import { ArchiveSectionDialog } from "./section-dialogs";

i18n.load("en", messages);
i18n.activate("en");

const withI18n = (node: ReactNode) => <I18nProvider i18n={i18n}>{node}</I18nProvider>;

const lesson: Section = {
  id: "s1",
  deckId: "d1",
  name: "Lesson 14",
  position: 0,
  total: 12,
  known: 0,
  notStarted: 12,
  due: 0,
  knownNeeded: 10,
  status: "open",
  archivedCards: 0,
  archivedAt: null,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

describe("a confirm dialog", () => {
  function ArchiveHarness({ onArchive }: { onArchive: (cards: "archive" | "keep") => void }) {
    const [section, setSection] = useState<Section | null>(null);
    return (
      <>
        <button type="button" onClick={() => setSection(lesson)}>
          Open
        </button>
        <ArchiveSectionDialog
          section={section}
          onOpenChange={(next) => !next && setSection(null)}
          onArchive={(cards) => {
            onArchive(cards);
            setSection(null);
          }}
        />
      </>
    );
  }

  test("starts its choice over on the next opening after confirming", async () => {
    const onArchive = vi.fn();
    await render(withI18n(<ArchiveHarness onArchive={onArchive} />));
    await page.getByRole("button", { name: "Open" }).click();
    await page.getByRole("radio", { name: "Archive its 12 cards too" }).click();
    await page.getByRole("button", { name: "Archive section" }).click();
    expect(onArchive).toHaveBeenCalledWith("archive");
    await expect.element(page.getByRole("dialog")).not.toBeInTheDocument();

    await page.getByRole("button", { name: "Open" }).click();
    await expect.element(page.getByRole("radio", { name: "Keep the cards" })).toBeChecked();
  });

  test("keeps its subject named while it closes", async () => {
    const anna: Member = {
      userId: "u1",
      name: "Anna",
      role: "learner",
      joinedAt: "2026-09-01T00:00:00.000Z",
    };
    const dialog = (member: Member | null) =>
      withI18n(<RemoveMemberDialog member={member} onOpenChange={() => {}} onRemove={() => {}} />);
    const screen = await render(dialog(anna));
    await expect.element(page.getByRole("dialog", { name: "Remove Anna?" })).toBeVisible();

    await screen.rerender(dialog(null));
    const seen = new Set<string>();
    await expect
      .poll(() => {
        const title = document.querySelector('[data-slot="dialog-title"]');
        if (title) seen.add(title.textContent ?? "");
        return title;
      })
      .toBeNull();
    expect(seen).toEqual(new Set(["Remove Anna?"]));
  });
});
