import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { AccountGroup } from "./account-section";

i18n.load("en", messages);
i18n.activate("en");

const renderGroup = (onRename: (name: string) => void) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <I18nProvider i18n={i18n}>
        <AccountGroup name="Kateryna" email="learner@lymi.local" onRename={onRename} />
      </I18nProvider>
    </QueryClientProvider>,
  );

const field = () => page.getByRole("textbox", { name: "Name", exact: true });

test("saves the trimmed name when the field is left", async () => {
  const onRename = vi.fn();
  await renderGroup(onRename);
  await expect.element(field()).toHaveValue("Kateryna");
  await userEvent.clear(field());
  await userEvent.type(field(), "  Olena Kovalenko  ");
  await userEvent.tab();
  expect(onRename).toHaveBeenCalledExactlyOnceWith("Olena Kovalenko");
});

test("Enter saves, and an unchanged name is not sent", async () => {
  const onRename = vi.fn();
  await renderGroup(onRename);
  await userEvent.click(field());
  await userEvent.keyboard("{Enter}");
  expect(onRename).not.toHaveBeenCalled();
  await userEvent.type(field(), " P.");
  await userEvent.keyboard("{Enter}");
  expect(onRename).toHaveBeenCalledExactlyOnceWith("Kateryna P.");
});

test("refuses an empty name under the field and sends nothing", async () => {
  const onRename = vi.fn();
  await renderGroup(onRename);
  await userEvent.clear(field());
  await userEvent.tab();
  await expect.element(page.getByText("Write your name.")).toBeVisible();
  await expect.element(field()).toHaveAttribute("aria-invalid", "true");
  expect(onRename).not.toHaveBeenCalled();
});

test("Escape puts the saved name back", async () => {
  const onRename = vi.fn();
  await renderGroup(onRename);
  await userEvent.clear(field());
  await userEvent.type(field(), "Someone else");
  await userEvent.keyboard("{Escape}");
  await expect.element(field()).toHaveValue("Kateryna");
  await userEvent.tab();
  expect(onRename).not.toHaveBeenCalled();
});

test("stops at the schema's limit and says how much room is left", async () => {
  await renderGroup(vi.fn());
  await userEvent.clear(field());
  await userEvent.type(field(), "a".repeat(85));
  await expect.element(field()).toHaveValue("a".repeat(80));
  await expect.element(page.getByText("0 characters left")).toBeVisible();
});

test("leaving the screen with a changed name saves it once", async () => {
  const onRename = vi.fn();
  function Toggle() {
    const [shown, setShown] = useState(true);
    return (
      <>
        <button type="button" onClick={() => setShown(false)}>
          Leave
        </button>
        {shown && <AccountGroup name="Kateryna" email="learner@lymi.local" onRename={onRename} />}
      </>
    );
  }
  await render(
    <QueryClientProvider client={new QueryClient()}>
      <I18nProvider i18n={i18n}>
        <Toggle />
      </I18nProvider>
    </QueryClientProvider>,
  );
  await userEvent.type(field(), " P.");
  await page.getByRole("button", { name: "Leave" }).click();
  expect(onRename).toHaveBeenCalledExactlyOnceWith("Kateryna P.");
});
