import { useState } from "react";
import { describe, expect, inject, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { DESKTOP_QUERY } from "../../lib/device";
import { Field } from "../Field";
import { Dialog, DialogContent, DialogTitle } from "./dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./select";

const desktop = inject("machine") === "desktop";

const DECKS = [
  { value: "d1", label: "Lesson 14" },
  { value: "d2", label: "Portuguese" },
  { value: "d3", label: "Українська для Марко" },
];

/**
 * Opens from the keyboard, so focus has somewhere to return to: WebKit never focuses a tapped
 * button. Resolves once a row holds focus, so the next key lands in the list and not on the page.
 */
async function openWithKeyboard(trigger: { element: () => Element }) {
  (trigger.element() as HTMLElement).focus();
  await userEvent.keyboard("{Enter}");
  await expect.poll(() => document.activeElement?.getAttribute("role")).toBe("option");
}

const combobox = (name = "Deck") => page.getByRole("combobox", { name, exact: true });
const option = (name: string | RegExp) => page.getByRole("option", { name });
const listbox = () => page.getByRole("listbox");

function Harness({
  initial = "d1",
  onValueChange,
  clearable = false,
  disabled = false,
  error,
  name,
}: {
  initial?: string | null;
  onValueChange?: ((value: string | null) => void) | undefined;
  clearable?: boolean;
  disabled?: boolean;
  error?: string | undefined;
  name?: string | undefined;
}) {
  const [value, setValue] = useState<string | null>(initial);
  // Room around the box, so a press "outside" lands on the page and not on the label.
  return (
    <Field label="Deck" error={error} className="m-12 w-80">
      <Select
        value={value}
        onValueChange={(next) => {
          setValue(next);
          onValueChange?.(next);
        }}
        items={DECKS}
        disabled={disabled}
        name={name}
      >
        <SelectTrigger>
          <SelectValue placeholder="Choose a deck" />
        </SelectTrigger>
        <SelectContent aria-label="Deck">
          {clearable && <SelectItem value={null}>No deck</SelectItem>}
          {DECKS.map((deck) => (
            <SelectItem key={deck.value} value={deck.value}>
              {deck.label}
            </SelectItem>
          ))}
          <SelectItem value="archived" disabled>
            Archived
          </SelectItem>
        </SelectContent>
      </Select>
    </Field>
  );
}

test("the device rule matches the machine this browser stands in for", () => {
  expect(window.matchMedia(DESKTOP_QUERY).matches).toBe(desktop);
});

describe("Select", () => {
  test("the Field's label names the box, and the box shows the chosen label", async () => {
    await render(<Harness />);
    await expect.element(combobox()).toHaveTextContent("Lesson 14");
    await expect.element(combobox()).toHaveAttribute("aria-expanded", "false");
  });

  test("shows the placeholder when nothing is chosen", async () => {
    await render(<Harness initial={null} />);
    await expect.element(combobox()).toHaveTextContent("Choose a deck");
    await expect.element(combobox()).toHaveAttribute("data-placeholder");
  });

  test("renders every part in this shape: group, label, separator, and the check on the chosen row", async () => {
    await render(
      <Select defaultValue="d3" items={DECKS}>
        <SelectTrigger>
          <SelectValue placeholder="Choose a deck" />
        </SelectTrigger>
        <SelectContent aria-label="Deck">
          <SelectGroup>
            <SelectLabel>Your decks</SelectLabel>
            <SelectItem value="d1">Lesson 14</SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Shared with you</SelectLabel>
            <SelectItem value="d3">Українська для Марко</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>,
    );
    await page.getByRole("combobox").click();

    await expect.element(listbox()).toBeVisible();
    await expect.element(page.getByRole("group", { name: "Your decks" })).toBeInTheDocument();
    await expect.element(page.getByRole("group", { name: "Shared with you" })).toBeInTheDocument();
    // An unlabelled group names nothing, rather than pointing at an id that is not there.
    const groups = page.getByRole("group").elements();
    expect(
      groups.every(
        (g) =>
          !g.hasAttribute("aria-labelledby") ||
          document.getElementById(g.getAttribute("aria-labelledby") as string),
      ),
    ).toBe(true);
    expect(document.querySelector('[data-slot="select-separator"]')).not.toBeNull();
    const chosen = option("Українська для Марко");
    await expect.element(chosen).toHaveAttribute("aria-selected", "true");
    expect(chosen.element().querySelector("svg")).not.toBeNull();
    expect(option("Lesson 14").element().querySelector("svg")).toBeNull();
  });

  test(
    desktop ? "anchors its list under the box" : "rises as a drawer named by its label",
    async () => {
      await render(<Harness />);
      // Held before opening: a modal drawer hides the rest of the page from the ARIA tree.
      const box = combobox().element();
      await combobox().click();

      await expect.element(listbox()).toBeVisible();
      await expect.element(option("Portuguese")).toBeVisible();
      await expect.poll(() => box.getAttribute("aria-expanded")).toBe("true");
      await expect.poll(() => box.hasAttribute("data-popup-open")).toBe(true);
      if (desktop) {
        expect(document.querySelector('[data-slot="drawer-popup"]')).toBeNull();
        const rect = box.getBoundingClientRect();
        const panel = () =>
          document.querySelector('[data-slot="select-content"]')?.getBoundingClientRect();
        // Polled: the panel is still scaling up from 0.98 in its first frames.
        await expect.poll(() => panel()?.width).toBeCloseTo(rect.width, 0);
        expect(panel()?.top).toBeGreaterThanOrEqual(rect.bottom);
      } else {
        const drawer = page.getByRole("dialog", { name: "Deck" });
        await expect.element(drawer).toBeVisible();
        await expect.element(drawer.getByText("Deck", { exact: true })).toBeVisible();
      }
    },
  );

  test("picks a row with the pointer, closes, shows it in the box, and hands focus back", async () => {
    const onValueChange = vi.fn();
    await render(<Harness onValueChange={onValueChange} />);
    await openWithKeyboard(combobox());
    await option("Portuguese").click();

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("d2");
    await expect.element(listbox()).not.toBeInTheDocument();
    await expect.element(combobox()).toHaveTextContent("Portuguese");
    await expect.element(combobox()).toHaveFocus();
  });

  test("opens on the chosen row and walks every row with the arrow keys, disabled ones included", async () => {
    await render(<Harness initial="d2" />);
    await openWithKeyboard(combobox());

    const current = () =>
      desktop
        ? page
            .getByRole("option")
            .elements()
            .find((el) => el.hasAttribute("data-highlighted"))
        : document.activeElement;
    await expect.poll(() => current()?.textContent).toBe("Portuguese");
    await userEvent.keyboard("{ArrowDown}");
    await expect.poll(() => current()?.textContent).toBe("Українська для Марко");
    // A disabled row is still walked, so a screen reader hears that it is there.
    await userEvent.keyboard("{ArrowDown}");
    await expect.poll(() => current()?.textContent).toBe("Archived");
    await userEvent.keyboard("{Home}");
    await expect.poll(() => current()?.textContent).toBe("Lesson 14");
    await userEvent.keyboard("{End}");
    await expect.poll(() => current()?.textContent).toBe("Archived");
  });

  test("typing a letter jumps to a name, and Enter picks it", async () => {
    const onValueChange = vi.fn();
    await render(<Harness onValueChange={onValueChange} />);
    await openWithKeyboard(combobox());
    await userEvent.keyboard("p");
    await userEvent.keyboard("{Enter}");

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("d2");
    await expect.element(listbox()).not.toBeInTheDocument();
    await expect.element(combobox()).toHaveTextContent("Portuguese");
  });

  test("ignores a disabled row", async () => {
    const onValueChange = vi.fn();
    await render(<Harness onValueChange={onValueChange} />);
    await combobox().click();
    const archived = option("Archived");
    await expect.element(archived).toHaveAttribute("aria-disabled", "true");
    await expect.element(archived).toBeInViewport({ ratio: 1 });
    await archived.click({ force: true });

    expect(onValueChange).not.toHaveBeenCalled();
    await expect.element(listbox()).toBeVisible();
  });

  test("a null row clears the choice and brings the placeholder back", async () => {
    const onValueChange = vi.fn();
    await render(<Harness clearable onValueChange={onValueChange} />);
    await combobox().click();
    await option("No deck").click();

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith(null);
    await expect.element(combobox()).toHaveTextContent("Choose a deck");
  });

  test("a null row with its own label shows that label in the box", async () => {
    await render(
      <Select defaultValue="d1" items={[{ value: null, label: "No deck" }, ...DECKS]}>
        <SelectTrigger>
          <SelectValue placeholder="Choose a deck" />
        </SelectTrigger>
        <SelectContent aria-label="Deck">
          <SelectItem value={null}>No deck</SelectItem>
          {DECKS.map((deck) => (
            <SelectItem key={deck.value} value={deck.value}>
              {deck.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>,
    );
    await page.getByRole("combobox").click();
    await option("No deck").click();

    await expect.element(page.getByRole("combobox")).toHaveTextContent("No deck");
  });

  test("closes on Escape and hands focus back to the box", async () => {
    await render(<Harness />);
    await openWithKeyboard(combobox());
    await expect.element(listbox()).toBeVisible();
    await userEvent.keyboard("{Escape}");

    await expect.element(listbox()).not.toBeInTheDocument();
    await expect.element(combobox()).toHaveFocus();
    await expect.element(combobox()).toHaveTextContent("Lesson 14");
  });

  test("keeps its rows out of the tab order, and Tab leaves and closes the list", async () => {
    await render(<Harness />);
    await openWithKeyboard(combobox());
    const reachable = page
      .getByRole("option")
      .elements()
      .filter((row) => (row as HTMLElement).tabIndex >= 0);
    expect(reachable.length).toBeLessThanOrEqual(1);
    await userEvent.keyboard("{Tab}");

    await expect.element(listbox()).not.toBeInTheDocument();
  });

  test("closes on a press outside it", async () => {
    await render(<Harness />);
    await combobox().click();
    await expect.element(listbox()).toBeVisible();
    await userEvent.click(document.body, { position: { x: 10, y: 10 } });

    await expect.element(listbox()).not.toBeInTheDocument();
  });

  test("a disabled box does not open", async () => {
    await render(<Harness disabled />);
    await expect.element(combobox()).toBeDisabled();
    await combobox().click({ force: true });

    expect(listbox().elements()).toHaveLength(0);
  });

  test("a Field error marks the box invalid and describes it with the message", async () => {
    await render(<Harness initial={null} error="Choose a deck for this card." />);
    const box = combobox();
    await expect.element(box).toHaveAttribute("aria-invalid", "true");
    const described = box.element().getAttribute("aria-describedby");
    expect(described).toBeTruthy();
    expect(document.getElementById(described as string)?.textContent).toContain(
      "Choose a deck for this card.",
    );
  });

  test("submits its value under its name", async () => {
    let submitted: FormData | undefined;
    await render(
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitted = new FormData(e.currentTarget);
        }}
      >
        <Harness name="deckId" />
        <button type="submit">Save</button>
      </form>,
    );
    await combobox().click();
    await option("Portuguese").click();
    await page.getByRole("button", { name: "Save" }).click();

    await expect.poll(() => submitted?.get("deckId")).toBe("d2");
  });

  test("picks inside an open Dialog without closing it", async () => {
    const onValueChange = vi.fn();
    await render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogTitle>Add a card</DialogTitle>
          <Harness onValueChange={onValueChange} />
        </DialogContent>
      </Dialog>,
    );
    const dialog = page.getByRole("dialog", { name: "Add a card" });
    await expect.element(dialog).toBeVisible();
    await combobox().click();
    await expect.element(option("Portuguese")).toBeVisible();
    if (!desktop) {
      // The list is a second drawer stacked over the form's.
      expect(document.querySelectorAll('[data-slot="drawer-popup"]')).toHaveLength(2);
    }
    await option("Portuguese").click();

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("d2");
    await expect.element(listbox()).not.toBeInTheDocument();
    await expect.element(dialog).toBeVisible();
    await expect.element(combobox()).toHaveTextContent("Portuguese");
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
      await combobox().click();
      await expect.element(listbox()).toBeInTheDocument();
      expect(document.querySelector('[data-slot="drawer-popup"]') === null).toBe(other);
    } finally {
      spy.mockRestore();
    }
  });
});
