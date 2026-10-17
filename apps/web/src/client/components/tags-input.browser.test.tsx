import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { createRef, type Ref, useState } from "react";
import { expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { type TagSuggestion, TagsInput } from "./tags-input";

i18n.load("en", messages);
i18n.activate("en");

const named = (...names: string[]) => names.map((name) => ({ name }));

function Tags({
  initial = [],
  suggestions,
  onTagAdded,
  disabled,
  onBlur,
  inputRef,
}: {
  initial?: string[];
  suggestions?: TagSuggestion[];
  onTagAdded?: (via: "suggestion" | "typed", inUse: boolean) => void;
  disabled?: boolean;
  onBlur?: () => void;
  inputRef?: Ref<HTMLInputElement>;
}) {
  const [tags, setTags] = useState(initial);
  return (
    <I18nProvider i18n={i18n}>
      <form data-testid="form">
        <TagsInput
          ref={inputRef}
          name="tags"
          value={tags}
          onValueChange={setTags}
          suggestions={suggestions}
          onTagAdded={onTagAdded}
          onBlur={onBlur}
          disabled={disabled}
          placeholder="Add a tag"
        />
      </form>
    </I18nProvider>
  );
}

const posted = () =>
  new FormData(page.getByTestId("form").element() as HTMLFormElement).getAll("tags");

test("with a name, the tags post with a native form", async () => {
  const onBlur = vi.fn();
  const ref = createRef<HTMLInputElement>();
  await render(<Tags initial={["streets"]} onBlur={onBlur} inputRef={ref} />);
  expect(ref.current).toBe(page.getByRole("combobox").element());

  await page.getByRole("combobox").fill("signs, shops");
  await expect.element(page.getByText("shops")).toBeVisible();
  expect(posted()).toEqual(["streets", "signs", "shops"]);

  await page.getByRole("button", { name: "Remove the tag signs" }).click();
  expect(posted()).toEqual(["streets", "shops"]);

  await userEvent.click(page.getByRole("combobox"));
  await userEvent.tab();
  expect(onBlur).toHaveBeenCalled();
});

test("a disabled box takes no typing and posts nothing", async () => {
  await render(<Tags initial={["streets"]} disabled />);
  await expect.element(page.getByRole("combobox")).toBeDisabled();
  await expect.element(page.getByRole("button", { name: "Remove the tag streets" })).toBeDisabled();
  expect(posted()).toEqual([]);
});

test("typing part of a tag in use offers it, and a press adds it", async () => {
  await render(<Tags suggestions={named("travel", "verbs", "adverbs")} />);
  await userEvent.type(page.getByRole("combobox"), "ver");

  const options = page.getByRole("option");
  await expect.element(options.first()).toHaveTextContent("verbs");
  expect(options.elements().map((option) => option.textContent)).toEqual([
    "verbs",
    "adverbs",
    "Create “ver”",
  ]);
  await options.first().click();
  expect(posted()).toEqual(["verbs"]);
  await expect.element(page.getByRole("combobox")).toHaveValue("");
});

test("Enter adds what was typed unless an arrow key picked a tag in use", async () => {
  const onTagAdded = vi.fn();
  await render(<Tags suggestions={named("verbs")} onTagAdded={onTagAdded} />);
  await userEvent.type(page.getByRole("combobox"), "verb{Enter}");
  expect(posted()).toEqual(["verb"]);

  const input = page.getByRole("combobox");
  const choice = page.getByRole("option", { name: "verbs", exact: true });
  await userEvent.type(input, "ver");
  await expect.element(choice).toBeVisible();
  await userEvent.keyboard("{ArrowDown}");
  await expect.element(input).toHaveAttribute("aria-activedescendant", choice.element().id);
  await userEvent.keyboard("{Enter}");
  expect(posted()).toEqual(["verb", "verbs"]);
  expect(onTagAdded.mock.calls).toEqual([
    ["typed", false],
    ["suggestion", true],
  ]);
});

test("a tag typed in another case takes the spelling in use, once", async () => {
  await render(<Tags initial={["food"]} suggestions={named("Verbs")} />);
  await page.getByRole("combobox").fill("verbs, FOOD");
  expect(posted()).toEqual(["food", "Verbs"]);
});

test("a tag in use shows its card count, and the last row creates a new one", async () => {
  const onTagAdded = vi.fn();
  await render(
    <Tags
      suggestions={[
        { name: "noun", cards: 3 },
        { name: "nominative", cards: 1 },
      ]}
      onTagAdded={onTagAdded}
    />,
  );
  await userEvent.type(page.getByRole("combobox"), "no");
  const options = page.getByRole("option");
  await expect.element(options.first()).toHaveTextContent("noun3 cards");
  expect(options.elements().map((option) => option.textContent)).toEqual([
    "noun3 cards",
    "nominative1 card",
    "Create “no”",
  ]);
  await page.getByRole("option", { name: "Create “no”" }).click();
  expect(posted()).toEqual(["no"]);
  expect(onTagAdded.mock.calls).toEqual([["typed", false]]);

  // A name already in use is offered, never created again.
  await userEvent.type(page.getByRole("combobox"), "NOUN");
  await expect.element(page.getByRole("option", { name: "noun 3 cards" })).toBeVisible();
  expect(page.getByRole("option", { name: /^Create/ }).elements()).toEqual([]);
});

test("a card holds at most twenty tags of forty characters, and Backspace still gives one back", async () => {
  const nineteen = Array.from({ length: 19 }, (_, i) => `tag${i}`);
  await render(<Tags initial={nineteen} />);
  await page.getByRole("combobox").fill(`${"a".repeat(45)}, extra`);
  expect(posted()).toEqual([...nineteen, "a".repeat(40)]);
  await expect
    .element(page.getByRole("combobox"))
    .toHaveAttribute("placeholder", "That’s the most tags a card can have");

  await userEvent.click(page.getByRole("combobox"));
  await userEvent.keyboard("{Backspace}");
  expect(posted()).toEqual(nineteen);
});
