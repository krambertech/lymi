import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { createRef, type Ref, useState } from "react";
import { expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { TagsInput } from "./tags-input";

i18n.load("en", messages);
i18n.activate("en");

function Tags({
  initial = [],
  disabled,
  onBlur,
  inputRef,
}: {
  initial?: string[];
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
  expect(ref.current).toBe(page.getByRole("textbox").element());

  await page.getByRole("textbox").fill("signs, shops");
  await expect.element(page.getByText("shops")).toBeVisible();
  expect(posted()).toEqual(["streets", "signs", "shops"]);

  await page.getByRole("button", { name: "Remove the tag signs" }).click();
  expect(posted()).toEqual(["streets", "shops"]);

  await userEvent.click(page.getByRole("textbox"));
  await userEvent.tab();
  expect(onBlur).toHaveBeenCalled();
});

test("a disabled box takes no typing and posts nothing", async () => {
  await render(<Tags initial={["streets"]} disabled />);
  await expect.element(page.getByRole("textbox")).toBeDisabled();
  await expect.element(page.getByRole("button", { name: "Remove the tag streets" })).toBeDisabled();
  expect(posted()).toEqual([]);
});
