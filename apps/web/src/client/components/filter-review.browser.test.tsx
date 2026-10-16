import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { FilterReview, type FilterReviewProps } from "./filter-review";

i18n.load("en", messages);
i18n.activate("en");

async function renderRow(props: Partial<FilterReviewProps> = {}) {
  const onReview = vi.fn();
  const screen = await render(
    <I18nProvider i18n={i18n}>
      <FilterReview shown={6} started={5} due={2} onReview={onReview} {...props} />
    </I18nProvider>,
  );
  return { screen, onReview };
}

test("counts the cards shown, then how many are due", async () => {
  const { onReview } = await renderRow();
  await expect.element(page.getByText("6 cards")).toBeVisible();
  await expect.element(page.getByText("2 due today")).toBeVisible();
  await page.getByRole("button", { name: "Review 2 due" }).click();
  expect(onReview).toHaveBeenLastCalledWith("due");
  await page.getByRole("button", { name: "Review all" }).click();
  expect(onReview).toHaveBeenLastCalledWith("all");
});

test("offers only the early review when none are due", async () => {
  const { onReview } = await renderRow({ shown: 3, started: 3, due: 0 });
  await expect.element(page.getByText("None due today")).toBeVisible();
  await expect.element(page.getByRole("button", { name: /due/ })).not.toBeInTheDocument();
  await page.getByRole("button", { name: "Review all" }).click();
  expect(onReview).toHaveBeenCalledWith("all");
});

test("offers only the due review when every one is due", async () => {
  await renderRow({ shown: 1, started: 1, due: 1 });
  await expect.element(page.getByText("1 due today")).toBeVisible();
  await expect.element(page.getByRole("button", { name: "Review 1 due" })).toBeVisible();
  await expect.element(page.getByRole("button", { name: /all|started/ })).not.toBeInTheDocument();
});

test("shows only the count when the list holds only new cards", async () => {
  await renderRow({ shown: 3, started: 0, due: 0 });
  await expect.element(page.getByText("3 cards")).toBeVisible();
  await expect.element(page.getByRole("button")).not.toBeInTheDocument();
});

test("is never amber, so the plate's Review stays the one primary", async () => {
  await renderRow();
  await expect
    .element(page.getByRole("button", { name: "Review 2 due" }))
    .not.toHaveClass(/\bbg-amber\b/);
});
