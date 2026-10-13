import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { NewDeckForm, type NewDeckFormProps } from "./new-deck-sheet";

i18n.load("en", messages);
i18n.activate("en");

const renderForm = async (props: Partial<NewDeckFormProps> = {}) => {
  const onSubmit = vi.fn();
  await render(
    <I18nProvider i18n={i18n}>
      <NewDeckForm onCancel={() => undefined} onSubmit={onSubmit} {...props} />
    </I18nProvider>,
  );
  return onSubmit;
};

describe.each([
  ["phone", 393],
  ["desktop", 1280],
])("on a %s", (_, width) => {
  test("asks what the deck is for before creating it", async () => {
    await page.viewport(width, 900);
    const onSubmit = await renderForm();
    await userEvent.type(page.getByRole("textbox", { name: "Name" }), "Biology exam");
    await page.getByRole("button", { name: "Create deck" }).click();
    await expect.element(page.getByText("Choose what the deck is for.")).toBeVisible();
    expect(onSubmit).not.toHaveBeenCalled();

    await page.getByRole("radio", { name: /A subject or exam/ }).click();
    await expect.element(page.getByText("Choose what the deck is for.")).not.toBeInTheDocument();
    // Only a language deck asks which language.
    await expect.element(page.getByText("No language")).not.toBeInTheDocument();
    await page.getByRole("button", { name: "Create deck" }).click();
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Biology exam", purpose: "subject", defaultLanguage: null }),
    );
  });

  test("needs a language for a language deck", async () => {
    await page.viewport(width, 900);
    const onSubmit = await renderForm();
    await userEvent.type(page.getByRole("textbox", { name: "Name" }), "Lezione 15");
    await page.getByRole("radio", { name: /A language/ }).click();
    await page.getByRole("button", { name: "Create deck" }).click();
    await expect.element(page.getByText("Choose the language you’re learning.")).toBeVisible();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

test("starts from Welcome's answer", async () => {
  const onSubmit = await renderForm({ seed: { purpose: "language", language: "it" } });
  await expect.element(page.getByRole("radio", { name: /A language/ })).toBeChecked();
  await userEvent.type(page.getByRole("textbox", { name: "Name" }), "Lezione 15");
  await page.getByRole("button", { name: "Create deck" }).click();
  expect(onSubmit).toHaveBeenCalledWith(
    expect.objectContaining({ purpose: "language", defaultLanguage: "it" }),
  );
});
