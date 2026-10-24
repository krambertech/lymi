import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { ApiError, api } from "../lib/api";
import { ReportDialog } from "./report-dialog";

i18n.load("en", messages);
i18n.activate("en");

afterEach(() => {
  vi.restoreAllMocks();
});

function Report({ onOpenChange = () => undefined }: { onOpenChange?: (open: boolean) => void }) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <I18nProvider i18n={i18n}>
        <ReportDialog
          open
          onOpenChange={onOpenChange}
          target={{ kind: "card", cardId: "c1" }}
          name="kurat"
        />
      </I18nProvider>
    </QueryClientProvider>
  );
}

test("asks for a reason, then sends it with the note and closes", async () => {
  const send = vi.spyOn(api, "reportContent").mockResolvedValue({ id: "r1" });
  const changed = vi.fn();
  await render(<Report onOpenChange={changed} />);
  await expect.element(page.getByRole("heading", { name: "Report “kurat”" })).toBeVisible();

  await page.getByRole("button", { name: "Send report" }).click();
  await expect.element(page.getByText("Choose what’s wrong with it.")).toBeVisible();
  expect(send).not.toHaveBeenCalled();

  await page.getByRole("radio", { name: "Harassment or bullying" }).click();
  await page.getByRole("textbox", { name: "Note" }).fill("  Mocks a classmate.  ");
  await page.getByRole("button", { name: "Send report" }).click();
  await vi.waitFor(() => expect(changed).toHaveBeenCalledWith(false));
  expect(send).toHaveBeenCalledWith({
    target: { kind: "card", cardId: "c1" },
    reason: "harassment",
    note: "Mocks a classmate.",
  });
});

test("keeps the form and says so at the daily limit", async () => {
  vi.spyOn(api, "reportContent").mockRejectedValue(new ApiError(409, "Too many"));
  await render(<Report />);
  await page.getByRole("radio", { name: "Spam or a scam" }).click();
  await page.getByRole("button", { name: "Send report" }).click();
  await expect.element(page.getByText("Couldn’t send your report")).toBeVisible();
  await expect.element(page.getByText(/You can send 10 reports a day/)).toBeVisible();
  await expect.element(page.getByRole("radio", { name: "Spam or a scam" })).toBeChecked();
});
