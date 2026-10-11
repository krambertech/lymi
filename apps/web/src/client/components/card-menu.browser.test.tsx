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
}: {
  canEdit: boolean;
  onArchive?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <I18nProvider i18n={i18n}>
      <CardMenu
        open={open}
        onOpenChange={setOpen}
        visible
        hasHook={false}
        canEdit={canEdit}
        onHook={() => undefined}
        onEdit={() => undefined}
        onStats={() => undefined}
        onArchive={onArchive}
      />
    </I18nProvider>
  );
}

test("the owner can write a hook, edit, see stats and archive", async () => {
  const archived = vi.fn();
  await render(<Menu canEdit onArchive={archived} />);
  await page.getByRole("button", { name: "Card options" }).click();
  await expect.element(page.getByRole("menuitem", { name: "Add hook" })).toBeVisible();
  await expect.element(page.getByRole("menuitem", { name: "Edit card" })).toBeVisible();
  await expect.element(page.getByRole("menuitem", { name: "See stats" })).toBeVisible();
  await page.getByRole("menuitem", { name: "Archive card" }).click();
  expect(archived).toHaveBeenCalledOnce();
});

test("a member of a shared deck only sees the stats", async () => {
  await render(<Menu canEdit={false} />);
  await page.getByRole("button", { name: "Card options" }).click();
  await expect.element(page.getByRole("menuitem", { name: "See stats" })).toBeVisible();
  expect(page.getByRole("menuitem", { name: "Archive card" }).elements()).toHaveLength(0);
  expect(page.getByRole("menuitem", { name: "Add hook" }).elements()).toHaveLength(0);
});
