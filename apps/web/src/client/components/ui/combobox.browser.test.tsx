import { useState } from "react";
import { describe, expect, inject, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { DESKTOP_QUERY } from "../../lib/device";
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemHint,
  ComboboxLabel,
  ComboboxList,
  ComboboxSeparator,
  ComboboxTrigger,
  ComboboxValue,
} from "./combobox";
import { Dialog, DialogContent, DialogTitle } from "./dialog";
import { Field, FieldError, FieldLabel } from "./field";

const desktop = inject("machine") === "desktop";

interface Language {
  value: string;
  label: string;
}

const LANGUAGES: Language[] = [
  { value: "ar", label: "Arabic" },
  { value: "bg", label: "Bulgarian" },
  { value: "cs", label: "Czech" },
  { value: "da", label: "Danish" },
  { value: "nl", label: "Dutch" },
  { value: "et", label: "Estonian" },
  { value: "fi", label: "Finnish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "el", label: "Greek" },
  { value: "he", label: "Hebrew" },
  { value: "hi", label: "Hindi" },
  { value: "it", label: "Italian" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "lv", label: "Latvian" },
  { value: "pl", label: "Polish" },
  { value: "pt", label: "Portuguese" },
  { value: "ro", label: "Romanian" },
  { value: "sv", label: "Swedish" },
  { value: "tr", label: "Turkish" },
  { value: "uk", label: "Ukrainian" },
];

const byValue = (value: string | null) => LANGUAGES.find((l) => l.value === value) ?? null;

const box = (name = "Language") => page.getByRole("combobox", { name, exact: true });
const search = () => page.getByRole("combobox", { name: "Search languages" });
/** A row is named by its label and then its tag, so match the label at the start. */
const option = (label: string) => page.getByRole("option", { name: new RegExp(`^${label}`) });
const listbox = () => page.getByRole("listbox");
const highlighted = () =>
  page
    .getByRole("option")
    .elements()
    .find((el) => el.hasAttribute("data-highlighted"))?.textContent;

/** A tap as a phone sends it, all in one task, which is quicker than any pointer the driver moves. */
function tap(el: Element) {
  const init = { bubbles: true, cancelable: true, composed: true, pointerId: 1, isPrimary: true };
  el.dispatchEvent(new PointerEvent("pointerdown", { ...init, pointerType: "touch" }));
  el.dispatchEvent(new PointerEvent("pointerup", { ...init, pointerType: "touch" }));
  el.dispatchEvent(new MouseEvent("mousedown", init));
  el.dispatchEvent(new MouseEvent("mouseup", init));
  el.dispatchEvent(new MouseEvent("click", init));
}

/** Opens from the keyboard, so focus has somewhere to return to: WebKit never focuses a tapped button. */
async function openWithKeyboard() {
  (box().element() as HTMLElement).focus();
  await userEvent.keyboard("{Enter}");
  await expect.element(search()).toHaveFocus();
}

function Harness({
  initial = "it",
  onValueChange,
  disabled = false,
  error,
}: {
  initial?: string | null;
  onValueChange?: ((value: string | null) => void) | undefined;
  disabled?: boolean;
  error?: string | undefined;
}) {
  const [value, setValue] = useState<string | null>(initial);
  // Room around the box, so a press "outside" lands on the page and not on the label.
  return (
    <>
      <Field className="m-12 w-80">
        <FieldLabel>Language</FieldLabel>
        <Combobox
          items={LANGUAGES}
          value={byValue(value)}
          onValueChange={(next) => {
            setValue(next?.value ?? null);
            onValueChange?.(next?.value ?? null);
          }}
          isItemEqualToValue={(a, b) => a.value === b.value}
          disabled={disabled}
        >
          <ComboboxTrigger>
            <ComboboxValue placeholder="Choose a language" />
          </ComboboxTrigger>
          <ComboboxContent aria-label="Language">
            <ComboboxInput placeholder="Search languages" />
            <ComboboxEmpty>No language by that name.</ComboboxEmpty>
            <ComboboxList>
              {(language: Language) => (
                <ComboboxItem key={language.value} value={language}>
                  <span className="flex-1 truncate">{language.label}</span>
                  <ComboboxItemHint>{language.value}</ComboboxItemHint>
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
        <FieldError>{error}</FieldError>
      </Field>
      <button type="button">Next field</button>
    </>
  );
}

describe("Combobox", () => {
  test("a quick tap opens it, and it stays open", async () => {
    await render(<Harness />);
    const trigger = box().element();
    tap(trigger);
    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    await expect.element(listbox()).toBeVisible();
    const controls = trigger.getAttribute("aria-controls");
    if (controls) expect(document.getElementById(controls)).not.toBeNull();
  });

  test("the Field's label names the box, and the box shows the chosen label", async () => {
    await render(<Harness />);
    await expect.element(box()).toHaveTextContent("Italian");
    await expect.element(box()).toHaveAttribute("aria-expanded", "false");
  });

  test("shows the placeholder when nothing is chosen", async () => {
    await render(<Harness initial={null} />);
    await expect.element(box()).toHaveTextContent("Choose a language");
    expect(box().element().querySelector("[data-placeholder]")).not.toBeNull();
  });

  test(
    desktop
      ? "anchors a panel under the box, with the search field focused"
      : "rises as a drawer titled by its label, with the search field focused",
    async () => {
      await render(<Harness />);
      // Held before opening: a modal drawer hides the rest of the page from the ARIA tree.
      const trigger = box().element();
      await openWithKeyboard();

      await expect.element(listbox()).toBeVisible();
      await expect.poll(() => trigger.getAttribute("aria-expanded")).toBe("true");
      if (desktop) {
        expect(document.querySelector('[data-slot="drawer-popup"]')).toBeNull();
        const rect = trigger.getBoundingClientRect();
        const panel = () =>
          document.querySelector('[data-slot="combobox-content"]')?.getBoundingClientRect();
        // Polled: the panel is still scaling up from 0.98 in its first frames.
        await expect.poll(() => panel()?.width).toBeCloseTo(rect.width, 0);
        expect(panel()?.top).toBeGreaterThanOrEqual(rect.bottom);
      } else {
        const drawer = page.getByRole("dialog", { name: "Language" });
        await expect.element(drawer).toBeVisible();
        await expect.element(drawer.getByText("Language", { exact: true })).toBeVisible();
      }
      await expect.element(option("Italian")).toHaveAttribute("aria-selected", "true");
      expect(option("Italian").element().querySelector("svg")).not.toBeNull();
      expect(option("Polish").element().querySelector("svg")).toBeNull();
    },
  );

  test("keeps the list one height while it filters, so the drawer does not jump", async () => {
    await render(<Harness />);
    await openWithKeyboard();
    const content = () =>
      document.querySelector('[data-slot="combobox-content"]')?.getBoundingClientRect().height;
    await expect.poll(() => page.getByRole("option").elements().length).toBe(LANGUAGES.length);
    const before = content();
    await userEvent.keyboard("fin");
    await expect.poll(() => page.getByRole("option").elements().length).toBe(1);

    if (desktop) expect(content()).toBeLessThan(before as number);
    else expect(content()).toBeCloseTo(before as number, 0);
  });

  test("takes the machine's shape at the moment it opens, even if no media event arrived", async () => {
    await render(<Harness />);
    const other = !desktop;
    const real = window.matchMedia.bind(window);
    const spy = vi
      .spyOn(window, "matchMedia")
      .mockImplementation((query) =>
        query === DESKTOP_QUERY
          ? ({ ...real(query), matches: other } as MediaQueryList)
          : real(query),
      );
    try {
      await box().click();
      await expect.element(listbox()).toBeInTheDocument();
      expect(document.querySelector('[data-slot="drawer-popup"]') === null).toBe(other);
    } finally {
      spy.mockRestore();
    }
  });

  test("renders groups, their labels and a separator", async () => {
    await render(
      <Combobox defaultValue="Estonian">
        <ComboboxTrigger>
          <ComboboxValue placeholder="Choose a language" />
        </ComboboxTrigger>
        <ComboboxContent aria-label="Language">
          <ComboboxInput placeholder="Search languages" />
          <ComboboxList>
            <ComboboxGroup>
              <ComboboxLabel>Your decks</ComboboxLabel>
              <ComboboxItem value="Estonian">Estonian</ComboboxItem>
            </ComboboxGroup>
            <ComboboxSeparator />
            <ComboboxGroup>
              <ComboboxLabel>Everything else</ComboboxLabel>
              <ComboboxItem value="Finnish">Finnish</ComboboxItem>
            </ComboboxGroup>
          </ComboboxList>
        </ComboboxContent>
      </Combobox>,
    );
    await page.getByRole("combobox").first().click();

    await expect.element(page.getByRole("group", { name: "Your decks" })).toBeInTheDocument();
    await expect.element(page.getByRole("group", { name: "Everything else" })).toBeInTheDocument();
    expect(document.querySelector('[data-slot="combobox-separator"]')).not.toBeNull();
  });

  test("filters grouped items, and a group with no match leaves with its label", async () => {
    const own = [{ value: "et", label: "Estonian" }];
    const rest = [
      { value: "fi", label: "Finnish" },
      { value: "fr", label: "French" },
    ];
    const groups = [
      { value: "Your decks", items: own },
      { value: "Everything else", items: rest },
    ];
    await render(
      <Combobox items={groups} defaultValue={own[0]}>
        <ComboboxTrigger>
          <ComboboxValue placeholder="Choose a language" />
        </ComboboxTrigger>
        <ComboboxContent aria-label="Language">
          <ComboboxInput placeholder="Search languages" />
          <ComboboxList>
            {(group: (typeof groups)[number]) => (
              <ComboboxGroup key={group.value} items={group.items}>
                <ComboboxLabel>{group.value}</ComboboxLabel>
                <ComboboxCollection>
                  {(language: Language) => (
                    <ComboboxItem key={language.value} value={language}>
                      {language.label}
                    </ComboboxItem>
                  )}
                </ComboboxCollection>
              </ComboboxGroup>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>,
    );
    (page.getByRole("combobox").first().element() as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    await expect.element(search()).toHaveFocus();
    await userEvent.keyboard("fr");

    await expect.poll(() => page.getByRole("option").elements().length).toBe(1);
    expect(page.getByRole("group", { name: "Your decks" }).elements()).toHaveLength(0);
    await expect.element(page.getByRole("group", { name: "Everything else" })).toBeInTheDocument();
  });

  test("filters as you type, highlights the first match, and Enter takes it", async () => {
    const onValueChange = vi.fn();
    await render(<Harness onValueChange={onValueChange} />);
    await openWithKeyboard();
    await userEvent.keyboard("fin");

    await expect.poll(() => page.getByRole("option").elements().length).toBe(1);
    await expect.poll(highlighted).toContain("Finnish");
    await userEvent.keyboard("{Enter}");

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("fi");
    await expect.element(listbox()).not.toBeInTheDocument();
    await expect.element(box()).toHaveTextContent("Finnish");
    await expect.element(box()).toHaveFocus();
  });

  test("typing on the closed box highlights the first match, not the chosen row's place", async () => {
    const onValueChange = vi.fn();
    await render(<Harness onValueChange={onValueChange} />);
    (box().element() as HTMLElement).focus();
    await userEvent.keyboard("po");

    await expect.element(search()).toHaveValue("po");
    await expect.poll(() => page.getByRole("option").elements().length).toBeGreaterThan(1);
    await expect.poll(highlighted).toContain("Polish");
    await userEvent.keyboard("{Enter}");
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("pl");
  });

  test("typing on the closed box opens it and searches for what was typed", async () => {
    const onValueChange = vi.fn();
    await render(<Harness onValueChange={onValueChange} />);
    (box().element() as HTMLElement).focus();
    await userEvent.keyboard("ukr");

    await expect.element(search()).toHaveFocus();
    await expect.element(search()).toHaveValue("ukr");
    await expect.poll(highlighted).toContain("Ukrainian");
    await userEvent.keyboard("{Enter}");
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("uk");
  });

  test("opens with the chosen row in view", async () => {
    await render(<Harness initial="uk" />);
    await openWithKeyboard();

    await expect.element(option("Ukrainian")).toBeInViewport({ ratio: 1 });
    await expect.element(option("Ukrainian")).toHaveAttribute("aria-selected", "true");
  });

  test("the arrows walk the rows, keeping the highlighted one in view", async () => {
    await render(<Harness />);
    await openWithKeyboard();
    if (desktop) await expect.poll(highlighted).toContain("Italian");
    await userEvent.keyboard("{End}");
    await expect.poll(highlighted).toContain("Ukrainian");
    await expect.element(option("Ukrainian")).toBeInViewport({ ratio: 1 });
    await userEvent.keyboard("{ArrowUp}{ArrowUp}");
    await expect.poll(highlighted).toContain("Swedish");
    await userEvent.keyboard("{Home}");
    await expect.poll(highlighted).toContain("Arabic");
    await expect.element(option("Arabic")).toBeInViewport({ ratio: 1 });
  });

  test("picks a row with the pointer, closes, and shows it in the box", async () => {
    const onValueChange = vi.fn();
    await render(<Harness onValueChange={onValueChange} />);
    await openWithKeyboard();
    await option("Czech").click();

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("cs");
    await expect.element(listbox()).not.toBeInTheDocument();
    await expect.element(box()).toHaveTextContent("Czech");
  });

  test("says so when nothing matches, and Enter takes nothing", async () => {
    const onValueChange = vi.fn();
    await render(<Harness onValueChange={onValueChange} />);
    // Held before opening: a modal drawer hides the rest of the page from the ARIA tree.
    const trigger = box().element();
    await openWithKeyboard();
    await userEvent.keyboard("klingon");

    await expect.element(page.getByText("No language by that name.")).toBeVisible();
    expect(page.getByRole("option").elements()).toHaveLength(0);
    await userEvent.keyboard("{Enter}");
    expect(onValueChange).not.toHaveBeenCalled();
    // Nothing to take, so the search stays open with what was typed.
    await expect.element(search()).toHaveValue("klingon");
    await expect.element(listbox()).toBeInTheDocument();
    expect(trigger.textContent).toBe("Italian");
  });

  test("closes on Escape, keeps the choice, and hands focus back to the box", async () => {
    const onValueChange = vi.fn();
    await render(<Harness onValueChange={onValueChange} />);
    await openWithKeyboard();
    await userEvent.keyboard("po");
    await userEvent.keyboard("{Escape}");

    await expect.element(listbox()).not.toBeInTheDocument();
    await expect.element(box()).toHaveFocus();
    await expect.element(box()).toHaveTextContent("Italian");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  test("Tab closes the panel without choosing and moves on to the next field", async () => {
    const onValueChange = vi.fn();
    await render(<Harness onValueChange={onValueChange} />);
    await openWithKeyboard();
    await userEvent.keyboard("po");
    await userEvent.keyboard("{Tab}");

    await expect.element(listbox()).not.toBeInTheDocument();
    expect(onValueChange).not.toHaveBeenCalled();
    await expect.poll(() => document.activeElement?.textContent).toBe("Next field");

    // A later close that was not a Tab hands focus back to the box as usual.
    await openWithKeyboard();
    await userEvent.keyboard("{Escape}");
    await expect.element(listbox()).not.toBeInTheDocument();
    await expect.element(box()).toHaveFocus();
  });

  test("opens again with an empty search", async () => {
    await render(<Harness />);
    await openWithKeyboard();
    await userEvent.keyboard("po");
    await userEvent.keyboard("{Escape}");
    await expect.element(listbox()).not.toBeInTheDocument();
    await openWithKeyboard();

    await expect.element(search()).toHaveValue("");
    expect(page.getByRole("option").elements()).toHaveLength(LANGUAGES.length);
  });

  test("closes on a press outside it", async () => {
    await render(<Harness />);
    await box().click();
    await expect.element(listbox()).toBeVisible();
    await userEvent.click(document.body, { position: { x: 10, y: 10 } });

    await expect.element(listbox()).not.toBeInTheDocument();
  });

  test("a disabled box does not open", async () => {
    await render(<Harness disabled />);
    await expect.element(box()).toBeDisabled();
    await box().click({ force: true });

    expect(listbox().elements()).toHaveLength(0);
  });

  test("a Field error marks the box invalid and describes it with the message", async () => {
    await render(<Harness initial={null} error="Choose the language this deck’s cards are in." />);
    await expect.element(box()).toHaveAttribute("aria-invalid", "true");
    const described = box().element().getAttribute("aria-describedby");
    expect(described).toBeTruthy();
    expect(document.getElementById(described as string)?.textContent).toContain(
      "Choose the language this deck’s cards are in.",
    );
  });

  test("picks inside an open Dialog without closing it", async () => {
    const onValueChange = vi.fn();
    await render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogTitle>New deck</DialogTitle>
          <Harness onValueChange={onValueChange} />
        </DialogContent>
      </Dialog>,
    );
    const dialog = page.getByRole("dialog", { name: "New deck" });
    await expect.element(dialog).toBeVisible();
    await openWithKeyboard();
    if (!desktop) {
      // The list is a second drawer stacked over the form's.
      expect(document.querySelectorAll('[data-slot="drawer-popup"]')).toHaveLength(2);
    }
    await userEvent.keyboard("port");
    await option("Portuguese").click();

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("pt");
    await expect.element(listbox()).not.toBeInTheDocument();
    await expect.element(dialog).toBeVisible();
    await expect.element(box()).toHaveTextContent("Portuguese");
  });
});
