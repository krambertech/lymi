import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { TagCardsDialog } from "./tag-cards-dialog";

i18n.load("en", messages);
i18n.activate("en");

function Dialog(props: { cards: string[][]; suggestions?: string[]; onApply: () => void }) {
  return (
    <I18nProvider i18n={i18n}>
      <TagCardsDialog
        open
        onOpenChange={() => {}}
        cards={props.cards}
        suggestions={props.suggestions?.map((name) => ({ name }))}
        onApply={props.onApply}
      />
    </I18nProvider>
  );
}

const box = (name: string) => page.getByRole("checkbox", { name, exact: true });

test("a tag on some cards goes on all of them, a new one is created ticked, and Save sends both", async () => {
  const onApply = vi.fn();
  await render(
    <Dialog cards={[["idiom"], ["Idiom", "food"], []]} suggestions={["money"]} onApply={onApply} />,
  );

  await expect.element(page.getByRole("heading", { name: "Tags for 3 cards" })).toBeVisible();
  await expect.element(box("idiom")).toHaveAttribute("aria-checked", "mixed");
  await expect.element(page.getByText("2 of 3")).toBeVisible();
  await expect.element(box("money")).toHaveAttribute("aria-checked", "false");

  await box("idiom").click();
  await expect.element(box("idiom")).toHaveAttribute("aria-checked", "true");
  await userEvent.type(page.getByRole("textbox", { name: "Find or create a tag" }), "slang{Enter}");
  await expect.element(box("slang")).toHaveAttribute("aria-checked", "true");

  await page.getByRole("button", { name: "Save", exact: true }).click();
  expect(onApply).toHaveBeenCalledWith({ add: ["idiom", "slang"], remove: [] });
});

test("unticking a tag every card carries takes it off, and nothing changed saves nothing", async () => {
  const onApply = vi.fn();
  await render(<Dialog cards={[["food"], ["food"]]} onApply={onApply} />);

  await expect
    .element(page.getByRole("button", { name: "Save", exact: true }))
    .toHaveAttribute("aria-disabled", "true");

  await box("food").click();
  await expect.element(box("food")).toHaveAttribute("aria-checked", "false");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  expect(onApply).toHaveBeenCalledWith({ add: [], remove: ["food"] });
});

test("typing finds a tag in any case, and only a new name offers Create", async () => {
  await render(<Dialog cards={[["Verbs"]]} suggestions={["travel"]} onApply={() => {}} />);
  const field = page.getByRole("textbox", { name: "Find or create a tag" });

  await userEvent.type(field, "VERBS");
  await expect.element(box("Verbs")).toBeVisible();
  await expect.element(box("travel")).not.toBeInTheDocument();
  await expect
    .element(page.getByRole("button", { name: "Create “VERBS”" }))
    .not.toBeInTheDocument();

  await userEvent.clear(field);
  await userEvent.type(field, "food");
  await expect.element(page.getByRole("button", { name: "Create “food”" })).toBeVisible();
});
