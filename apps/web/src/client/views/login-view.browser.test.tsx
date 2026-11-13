import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { LoginView } from "./login-view";

i18n.load("en", messages);
i18n.activate("en");

test("while one way in works the others stay focusable and swallow a press", async () => {
  const onApple = vi.fn();
  const onSubmit = vi.fn();
  await render(
    <I18nProvider i18n={i18n}>
      <LoginView pending="google" onApple={onApple} onSubmit={onSubmit} />
    </I18nProvider>,
  );
  for (const name of ["Continue with Apple", "Sign in"]) {
    const button = page.getByRole("button", { name, exact: true });
    await expect.element(button).toHaveAttribute("aria-disabled", "true");
    await expect.element(button).not.toHaveAttribute("disabled");
    await userEvent.click(button, { force: true });
  }
  expect(onApple).not.toHaveBeenCalled();
  expect(onSubmit).not.toHaveBeenCalled();
});
