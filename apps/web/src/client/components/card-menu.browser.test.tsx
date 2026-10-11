import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { useState } from "react";
import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { CardMenu } from "./card-menu";

i18n.load("en", messages);
i18n.activate("en");

function Menu({
  canEdit,
  onArchive = () => undefined,
  onImportantChange = () => undefined,
}: {
  canEdit: boolean;
  onArchive?: () => void;
  onImportantChange?: (important: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [important, setImportant] = useState(false);
  return (
    <I18nProvider i18n={i18n}>
      <CardMenu
        open={open}
        onOpenChange={setOpen}
        visible
        hasHook={false}
        important={important}
        onImportantChange={(on) => {
          setImportant(on);
          onImportantChange(on);
        }}
        canEdit={canEdit}
        onHook={() => undefined}
        onEdit={() => undefined}
        onView={() => undefined}
        onArchive={onArchive}
      />
    </I18nProvider>
  );
}

test("the owner can write a hook, edit, view and archive the card", async () => {
  const archived = vi.fn();
  await render(<Menu canEdit onArchive={archived} />);
  await page.getByRole("button", { name: "Card options" }).click();
  await expect.element(page.getByRole("menuitem", { name: "Add hook" })).toBeVisible();
  await expect.element(page.getByRole("menuitem", { name: "Edit card" })).toBeVisible();
  await expect.element(page.getByRole("menuitem", { name: "View card" })).toBeVisible();
  await page.getByRole("menuitem", { name: "Archive card" }).click();
  expect(archived).toHaveBeenCalledOnce();
});

test("a member of a shared deck can only view the card and mark it important", async () => {
  const marked = vi.fn();
  await render(<Menu canEdit={false} onImportantChange={marked} />);
  await page.getByRole("button", { name: "Card options" }).click();
  await expect.element(page.getByRole("menuitem", { name: "View card" })).toBeVisible();
  await page.getByRole("menuitem", { name: "Mark important" }).click();
  expect(marked).toHaveBeenCalledWith(true);
  await page.getByRole("button", { name: "Card options" }).click();
  await page.getByRole("menuitem", { name: "Unmark important" }).click();
  expect(marked).toHaveBeenLastCalledWith(false);
  expect(page.getByRole("menuitem", { name: "Archive card" }).elements()).toHaveLength(0);
  expect(page.getByRole("menuitem", { name: "Add hook" }).elements()).toHaveLength(0);
});
