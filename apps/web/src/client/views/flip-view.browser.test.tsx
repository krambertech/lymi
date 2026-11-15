import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { ApiError, api } from "../lib/api";
import { FlipView } from "./flip-view";

i18n.load("en", messages);
i18n.activate("en");

const show = () =>
  render(
    <I18nProvider i18n={i18n}>
      <QueryClientProvider client={new QueryClient()}>
        <FlipView token="t" />
      </QueryClientProvider>
    </I18nProvider>,
  );

test("a failed request offers a retry rather than calling the card expired", async () => {
  const flip = vi.spyOn(api, "flip").mockRejectedValueOnce(new ApiError(0, "Offline"));
  flip.mockResolvedValueOnce({ status: "expired", language: "en" });
  await show();
  await expect
    .element(page.getByRole("heading", { name: "Couldn’t load this card" }))
    .toBeVisible();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect.element(page.getByRole("heading", { name: "This card has expired" })).toBeVisible();
  flip.mockRestore();
});

test("a forged link reads as expired", async () => {
  const flip = vi.spyOn(api, "flip").mockRejectedValueOnce(new ApiError(404, "Not found"));
  await show();
  await expect.element(page.getByRole("heading", { name: "This card has expired" })).toBeVisible();
  flip.mockRestore();
});
