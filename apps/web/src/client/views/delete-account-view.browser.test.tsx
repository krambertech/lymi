import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import type { AccountDeletionOut } from "@lymi/core";
import { expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { ShellChrome } from "../components/layout/shell-chrome";
import { StaticNavProvider } from "../components/nav-link";
import { designChrome } from "../design/chrome";
import { type DeleteAccountProps, DeleteAccountView } from "./delete-account-view";

i18n.load("en", messages);
i18n.activate("en");

const summary = (over: Partial<AccountDeletionOut> = {}): AccountDeletionOut => ({
  blocked: null,
  confirmWith: "email",
  decks: 4,
  cards: 47,
  reviews: 180,
  sharedDecks: [{ id: "d1", name: "Estonian A2", members: 3, published: false }],
  ...over,
});

const renderView = (over: Partial<DeleteAccountProps> = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <ShellChrome value={designChrome()}>
        <StaticNavProvider path="/settings/delete-account">
          <div className="@container/shell" style={{ width: 1000 }}>
            <DeleteAccountView
              summary={summary()}
              sentTo={null}
              onSendCode={vi.fn()}
              sending={false}
              sendError={null}
              onDelete={vi.fn()}
              deleting={false}
              deleteError={null}
              {...over}
            />
          </div>
        </StaticNavProvider>
      </ShellChrome>
    </I18nProvider>,
  );

test("says what goes and which decks stay for the people studying them", async () => {
  await renderView();
  await expect.element(page.getByText("47")).toBeVisible();
  await expect.element(page.getByText("Estonian A2")).toBeVisible();
  await expect.element(page.getByText("3 people")).toBeVisible();
});

test("asks for a code before it offers the delete", async () => {
  const onSendCode = vi.fn();
  await renderView({ onSendCode });
  await expect
    .element(page.getByRole("button", { name: "Delete account" }))
    .not.toBeInTheDocument();
  await page.getByRole("button", { name: "Send code" }).click();
  expect(onSendCode).toHaveBeenCalled();
});

test("deletes only with a six-digit code", async () => {
  const onDelete = vi.fn();
  await renderView({ sentTo: "learner@example.com", onDelete });
  const box = page.getByRole("textbox", { name: "Code from the email" });
  await userEvent.type(box, "123");
  await page.getByRole("button", { name: "Delete account" }).click();
  await expect.element(page.getByText("Enter the 6-digit code from the email.")).toBeVisible();
  expect(onDelete).not.toHaveBeenCalled();
  await userEvent.type(box, "456");
  await page.getByRole("button", { name: "Delete account" }).click();
  expect(onDelete).toHaveBeenCalledWith("123456");
});

test("offers no delete to a Lymi publisher account", async () => {
  await renderView({ summary: summary({ blocked: "publisher" }) });
  await expect.element(page.getByText("This is a Lymi publisher account")).toBeVisible();
  await expect.element(page.getByRole("link", { name: "hello@lymi.app" })).toBeVisible();
  await expect.element(page.getByRole("button", { name: "Send code" })).not.toBeInTheDocument();
});

test("says members keep a copy of a shared deck and how to take it away", async () => {
  await renderView({
    summary: summary({
      sharedDecks: [{ id: "d1", name: "Verbs", members: 3, published: true }],
    }),
  });
  await expect.element(page.getByText(/keeps their own copy/)).toBeVisible();
  await expect.element(page.getByText(/archive it first/)).toBeVisible();
  await expect.element(page.getByText(/leave Explore/)).toBeVisible();
  await expect.element(page.getByRole("button", { name: "Send code" })).toBeVisible();
});

test("tells an Apple account to remove the Apple grant afterwards", async () => {
  await renderView({ summary: summary({ confirmWith: "apple" }) });
  await expect.element(page.getByText(/in your Apple Account settings/)).toBeVisible();
  await expect.element(page.getByRole("button", { name: "Send code" })).toBeVisible();
});
