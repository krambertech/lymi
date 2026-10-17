import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { useState } from "react";
import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { TagsChip } from "./card-form-pickers";
import { TooltipProvider } from "./ui/tooltip";

i18n.load("en", messages);
i18n.activate("en");

function Tags({
  initial = [],
  onTagAdded,
}: {
  initial?: string[];
  onTagAdded?: (via: "suggestion" | "typed", inUse: boolean) => void;
}) {
  const [tags, setTags] = useState(initial);
  return (
    <I18nProvider i18n={i18n}>
      <TooltipProvider>
        <TagsChip
          value={tags}
          onChange={setTags}
          inUse={[{ name: "Streets", cards: 4 }]}
          onTagAdded={onTagAdded}
        />
      </TooltipProvider>
    </I18nProvider>
  );
}

const search = () => page.getByRole("combobox", { name: "Find or create a tag" });

test("a list typed with commas becomes one tag per name, in the spelling in use", async () => {
  const onTagAdded = vi.fn();
  await render(<Tags onTagAdded={onTagAdded} />);
  await page.getByLabelText("Tags", { exact: true }).click();
  await search().fill("streets, signs");
  await page.getByRole("option", { name: "Create “streets” and “signs”" }).click();

  await expect.element(page.getByLabelText("Tags: Streets and signs")).toBeInTheDocument();
  expect(onTagAdded.mock.calls).toEqual([
    ["typed", true],
    ["typed", false],
  ]);
});

test("a name over the limit is refused in the list, with the reason", async () => {
  await render(<Tags />);
  await page.getByLabelText("Tags", { exact: true }).click();
  await search().fill("x".repeat(41));

  const note = page.getByRole("option", { name: "Keep each tag to 40 characters or fewer." });
  await expect.element(note).toHaveAttribute("aria-disabled", "true");
  await expect.element(page.getByRole("option", { name: /^Create/ })).not.toBeInTheDocument();
});

test("a card with 20 tags is offered no more", async () => {
  await render(<Tags initial={Array.from({ length: 20 }, (_, i) => `tag ${i}`)} />);
  await page.getByLabelText(/^Tags: /).click();
  await search().fill("one more");

  await expect
    .element(page.getByRole("option", { name: "A card holds up to 20 tags." }))
    .toHaveAttribute("aria-disabled", "true");
});
