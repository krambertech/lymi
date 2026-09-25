import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { useState } from "react";
import { expect, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { MoveToSectionDialog } from "./section-dialogs";

i18n.load("en", messages);
i18n.activate("en");

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <I18nProvider i18n={i18n}>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <MoveToSectionDialog
        open={open}
        onOpenChange={setOpen}
        count={2}
        current={null}
        sections={[]}
        onMove={() => setOpen(false)}
        onCreate={async () => setOpen(false)}
      />
    </I18nProvider>
  );
}

test("a half-typed new name is gone after Cancel", async () => {
  await render(<Harness />);
  await page.getByRole("button", { name: "Open" }).click();
  await page.getByRole("button", { name: "New section" }).click();
  await userEvent.type(page.getByPlaceholder("Lesson 15"), "Lesson 16");
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect.element(page.getByRole("dialog")).not.toBeInTheDocument();

  await page.getByRole("button", { name: "Open" }).click();
  await expect.element(page.getByRole("button", { name: "New section" })).toBeVisible();
  await expect.element(page.getByPlaceholder("Lesson 15")).not.toBeInTheDocument();
});
