import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { useState } from "react";
import { describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { LanguageField } from "./DeckFields";

i18n.load("en", messages);
i18n.activate("en");

const box = () => page.getByRole("combobox", { name: "Language", exact: true });
const search = () => page.getByRole("combobox", { name: "Search languages" });
const options = () =>
  page
    .getByRole("option")
    .elements()
    .map((el) => el.textContent);

function Harness({
  initial = null,
  onChange,
}: {
  initial?: string | null;
  onChange?: ((value: string | null) => void) | undefined;
}) {
  const [value, setValue] = useState<string | null>(initial);
  return (
    <I18nProvider i18n={i18n}>
      <div className="m-12 w-80">
        <LanguageField
          value={value}
          onChange={(next) => {
            setValue(next);
            onChange?.(next);
          }}
        />
      </div>
    </I18nProvider>
  );
}

/** Opens from the keyboard, so focus has somewhere to return to: WebKit never focuses a tapped button. */
async function open() {
  (box().element() as HTMLElement).focus();
  await userEvent.keyboard("{Enter}");
  await expect.element(search()).toHaveFocus();
}

describe("LanguageField", () => {
  test("reads No language when none is set, and leads the list with it", async () => {
    await render(<Harness />);
    await expect.element(box()).toHaveTextContent("No language");
    await open();

    await expect.poll(() => options()[0]).toBe("No language");
    await expect
      .element(page.getByRole("option", { name: "No language" }))
      .toHaveAttribute("aria-selected", "true");
  });

  test("finds a language by its tag as well as its name", async () => {
    const onChange = vi.fn();
    await render(<Harness onChange={onChange} />);
    await open();
    await userEvent.keyboard("pt-BR");

    await expect.poll(options).toEqual(["Brazilian Portuguesept-BR"]);
    await userEvent.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledExactlyOnceWith("pt-BR");
    await expect.element(box()).toHaveTextContent("Brazilian Portuguese");
  });

  test("hides No language while searching", async () => {
    await render(<Harness initial="it" />);
    await open();
    await userEvent.keyboard("no");

    await expect.poll(options).not.toContain("No language");
    expect(options().length).toBeGreaterThan(0);
  });

  test("a valid tag the list does not know becomes the row, and Enter takes it", async () => {
    const onChange = vi.fn();
    await render(<Harness onChange={onChange} />);
    await open();
    await userEvent.keyboard("eu");

    await expect.poll(options).toEqual(["Use “eu” as the tag"]);
    await userEvent.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledExactlyOnceWith("eu");
    await expect.element(box()).toHaveTextContent("Basque");

    await open();
    await expect
      .element(page.getByRole("option", { name: /^Basque/ }))
      .toHaveAttribute("aria-selected", "true");
  });

  test("free text that is not a tag is not accepted", async () => {
    const onChange = vi.fn();
    await render(<Harness initial="it" onChange={onChange} />);
    // Held before opening: a modal drawer hides the rest of the page from the ARIA tree.
    const trigger = box().element();
    await open();
    await userEvent.keyboard("not a language");

    await expect
      .element(page.getByText("No language by that name. Type its tag to use it anyway."))
      .toBeVisible();
    expect(options()).toEqual([]);
    await userEvent.keyboard("{Enter}");
    expect(onChange).not.toHaveBeenCalled();
    expect(trigger.textContent).toBe("Italian");
  });

  test("No language clears the choice", async () => {
    const onChange = vi.fn();
    await render(<Harness initial="it" onChange={onChange} />);
    await open();
    await page.getByRole("option", { name: "No language" }).click();

    expect(onChange).toHaveBeenCalledExactlyOnceWith(null);
    await expect.element(box()).toHaveTextContent("No language");
  });

  test("the search is empty again when it reopens", async () => {
    await render(<Harness />);
    await open();
    await userEvent.keyboard("eu");
    await userEvent.keyboard("{Escape}");
    await open();

    await expect.element(search()).toHaveValue("");
    await expect.poll(() => options()[0]).toBe("No language");
  });
});
