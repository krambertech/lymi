import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import type { ReactNode } from "react";
import { expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { MergeTagDialog, RenameTagDialog } from "./tag-dialogs";

i18n.load("en", messages);
i18n.activate("en");

const wrap = (node: ReactNode) => <I18nProvider i18n={i18n}>{node}</I18nProvider>;
const food = { name: "food", cards: 3 };

test("renaming onto a tag already in use says the two merge, and sends the new name", async () => {
  const onSubmit = vi.fn(async () => {});
  await render(
    wrap(
      <RenameTagDialog
        tag={food}
        inUse={[{ name: "food" }, { name: "meals" }]}
        onOpenChange={() => {}}
        onSubmit={onSubmit}
      />,
    ),
  );
  const field = page.getByRole("textbox", { name: "Name" });
  await expect.element(field).toHaveValue("food");
  await expect.element(page.getByRole("button", { name: "Rename", exact: true })).toBeVisible();

  await userEvent.clear(field);
  await userEvent.type(field, "Meals");
  await expect
    .element(
      page.getByText("You already have “meals”, so the two merge into one tag on these cards."),
    )
    .toBeVisible();
  await page.getByRole("button", { name: "Merge", exact: true }).click();
  expect(onSubmit).toHaveBeenCalledWith("Meals");
});

test("an empty name is refused and the same name closes without a write", async () => {
  const onSubmit = vi.fn(async () => {});
  const onOpenChange = vi.fn();
  await render(
    wrap(<RenameTagDialog tag={food} inUse={[]} onOpenChange={onOpenChange} onSubmit={onSubmit} />),
  );
  await page.getByRole("button", { name: "Rename", exact: true }).click();
  expect(onOpenChange).toHaveBeenCalledWith(false);

  await userEvent.clear(page.getByRole("textbox", { name: "Name" }));
  await page.getByRole("button", { name: "Rename", exact: true }).click();
  await expect.element(page.getByText("Give the tag a name.")).toBeVisible();
  expect(onSubmit).not.toHaveBeenCalled();
});

test("merging offers the deck's other tags and picks one", async () => {
  const onMerge = vi.fn();
  await render(
    wrap(
      <MergeTagDialog
        tag={food}
        tags={[food, { name: "meals", cards: 2 }, { name: "noun", cards: 5 }]}
        onOpenChange={() => {}}
        onMerge={onMerge}
      />,
    ),
  );
  await expect.element(page.getByRole("heading", { name: "Merge “food” into" })).toBeVisible();
  await expect.element(page.getByRole("button", { name: /^food/ })).not.toBeInTheDocument();
  await page.getByRole("button", { name: /^meals/ }).click();
  expect(onMerge).toHaveBeenCalledWith({ name: "meals", cards: 2 });
});
