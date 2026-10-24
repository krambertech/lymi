import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import type { ReactNode } from "react";
import { expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { AccountGroup, NameDialog } from "./account-section";

i18n.load("en", messages);
i18n.activate("en");

const wrap = (node: ReactNode) => render(<I18nProvider i18n={i18n}>{node}</I18nProvider>);

const renderDialog = (
  over: { onSubmit?: (name: string) => void; onOpenChange?: (open: boolean) => void } = {},
  error?: string,
) =>
  wrap(
    <NameDialog
      open
      onOpenChange={over.onOpenChange ?? vi.fn()}
      name="Kateryna"
      onSubmit={over.onSubmit ?? vi.fn()}
      error={error}
    />,
  );

const field = () => page.getByRole("textbox", { name: "Name", exact: true });
const save = () => page.getByRole("button", { name: "Save", exact: true });

test("the name's edit button opens the dialog", async () => {
  const onEditName = vi.fn();
  await wrap(<AccountGroup name="Kateryna" email="learner@lymi.local" onEditName={onEditName} />);
  await page.getByRole("button", { name: "Edit name" }).click();
  expect(onEditName).toHaveBeenCalledOnce();
});

test("without a way to edit, the name is only shown", async () => {
  await wrap(<AccountGroup name="Kateryna" email="learner@lymi.local" />);
  await expect.element(page.getByText("Kateryna")).toBeVisible();
  await expect.element(page.getByRole("button", { name: "Edit name" })).not.toBeInTheDocument();
});

test("saves the trimmed name", async () => {
  const onSubmit = vi.fn();
  await renderDialog({ onSubmit });
  await expect.element(field()).toHaveValue("Kateryna");
  await userEvent.clear(field());
  await userEvent.type(field(), "  Olena Kovalenko  ");
  await save().click();
  expect(onSubmit).toHaveBeenCalledExactlyOnceWith("Olena Kovalenko");
});

test("an unchanged name closes the dialog without sending", async () => {
  const onSubmit = vi.fn();
  const onOpenChange = vi.fn();
  await renderDialog({ onSubmit, onOpenChange });
  await userEvent.click(field());
  await userEvent.keyboard("{Enter}");
  expect(onSubmit).not.toHaveBeenCalled();
  expect(onOpenChange).toHaveBeenCalledWith(false);
});

test("refuses an empty name under the field and sends nothing", async () => {
  const onSubmit = vi.fn();
  await renderDialog({ onSubmit });
  await userEvent.clear(field());
  await save().click();
  await expect.element(page.getByText("Write your name.")).toBeVisible();
  await expect.element(field()).toHaveAttribute("aria-invalid", "true");
  expect(onSubmit).not.toHaveBeenCalled();
});

test("stops at the schema's limit and says how much room is left", async () => {
  await renderDialog();
  await userEvent.clear(field());
  await userEvent.type(field(), "a".repeat(85));
  await expect.element(field()).toHaveValue("a".repeat(80));
  await expect.element(page.getByText("0 characters left")).toBeVisible();
});

test("shows why a save failed beside the buttons", async () => {
  await renderDialog({}, "Couldn’t save your name. Try again.");
  await expect
    .element(page.getByRole("dialog").getByText("Couldn’t save your name. Try again."))
    .toBeVisible();
});
