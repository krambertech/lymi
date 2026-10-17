import { useState } from "react";
import { expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import {
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandPalette,
  type RunKeys,
  useCommandList,
} from "./command-palette";

const ROWS = ["Today", "Library", "Insights"];

interface PaletteProps {
  onRun: (row: string, keys: RunKeys) => void;
  onOpenChange?: (open: boolean) => void;
  onBack?: () => void;
  compact?: boolean;
}

function Palette({ onRun, onOpenChange = () => {}, onBack, compact }: PaletteProps) {
  const [query, setQuery] = useState("");
  const rows = ROWS.filter((r) => r.toLowerCase().includes(query.toLowerCase()));
  const list = useCommandList({
    items: rows,
    onRun,
    onBack: query ? () => setQuery("") : onBack,
    compact,
  });
  return (
    <CommandPalette open onOpenChange={onOpenChange} label="Command menu" compact={compact}>
      <CommandInput
        {...list.inputProps}
        lead="›"
        aria-label="Search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          list.reset();
        }}
      />
      <CommandList {...list.listProps} aria-label="Results">
        <CommandGroup label="Go to">
          {rows.map((row, i) => (
            <CommandItem key={row} {...list.optionProps(i)}>
              {row}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandPalette>
  );
}

test("arrows move the highlight and wrap, and Enter runs the highlighted row", async () => {
  const onRun = vi.fn();
  await render(<Palette onRun={onRun} />);
  const field = page.getByRole("combobox", { name: "Search" });
  await expect.element(field).toHaveFocus();
  await expect
    .element(page.getByRole("option", { name: "Today" }))
    .toHaveAttribute("aria-selected", "true");

  await userEvent.keyboard("{ArrowUp}");
  await expect
    .element(page.getByRole("option", { name: "Insights" }))
    .toHaveAttribute("aria-selected", "true");
  await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");
  expect(onRun).toHaveBeenLastCalledWith("Library", { mod: false });
});

test("⌘Enter runs the row's second action and typing starts again from the first row", async () => {
  const onRun = vi.fn();
  await render(<Palette onRun={onRun} />);
  await userEvent.keyboard("{ArrowDown}");
  await userEvent.type(page.getByRole("combobox", { name: "Search" }), "in");
  await expect
    .element(page.getByRole("option", { name: "Insights" }))
    .toHaveAttribute("aria-selected", "true");
  await userEvent.keyboard("{Meta>}{Enter}{/Meta}");
  expect(onRun).toHaveBeenLastCalledWith("Insights", { mod: true });
});

test("a click runs the row and leaves focus in the field", async () => {
  const onRun = vi.fn();
  await render(<Palette onRun={onRun} />);
  await page.getByRole("option", { name: "Library" }).click();
  expect(onRun).toHaveBeenLastCalledWith("Library", { mod: false });
  await expect.element(page.getByRole("combobox", { name: "Search" })).toHaveFocus();
});

test("with no rows to scroll, a pinned row sits right under the field", async () => {
  await render(
    <CommandPalette open onOpenChange={() => {}} label="Command menu">
      <CommandInput lead="›" aria-label="Search" />
      <CommandList
        role="listbox"
        aria-label="Results"
        pinned={
          <div role="option" tabIndex={-1} aria-selected={false}>
            Add
          </div>
        }
      >
        {[]}
      </CommandList>
    </CommandPalette>,
  );
  const list = page.getByRole("listbox", { name: "Results" }).element();
  expect(list.children).toHaveLength(1);
  expect(list.firstElementChild?.textContent).toBe("Add");
});

test("Escape empties the field, then steps back, and only then closes", async () => {
  const onBack = vi.fn();
  const onOpenChange = vi.fn();
  const { rerender } = await render(
    <Palette onRun={() => {}} onBack={onBack} onOpenChange={onOpenChange} />,
  );
  const field = page.getByRole("combobox", { name: "Search" });
  await userEvent.type(field, "li");
  await userEvent.keyboard("{Escape}");
  await expect.element(field).toHaveValue("");
  expect(onBack).not.toHaveBeenCalled();

  await userEvent.keyboard("{Backspace}");
  expect(onBack).toHaveBeenCalledTimes(1);
  await userEvent.keyboard("{Escape}");
  expect(onBack).toHaveBeenCalledTimes(2);
  expect(onOpenChange).not.toHaveBeenCalled();

  await rerender(<Palette onRun={() => {}} onOpenChange={onOpenChange} />);
  await userEvent.keyboard("{Escape}");
  expect(onOpenChange).toHaveBeenLastCalledWith(false);
});

test("compact waits for a tap before the keyboard and highlights nothing until it is used", async () => {
  const onRun = vi.fn();
  await render(<Palette onRun={onRun} compact />);
  const field = page.getByRole("combobox", { name: "Search" });
  await expect.element(field).not.toHaveFocus();
  await expect.element(field).not.toHaveAttribute("aria-activedescendant");

  // Playwright reads a full-screen popup in the touch frame as off-screen and won't tap the field.
  field.element().focus();
  await expect.element(field).toHaveFocus();
  await userEvent.keyboard("{Enter}");
  expect(onRun).not.toHaveBeenCalled();
  await userEvent.keyboard("{ArrowDown}");
  await expect
    .element(page.getByRole("option", { name: "Today" }))
    .toHaveAttribute("aria-selected", "true");
  await userEvent.keyboard("{Enter}");
  expect(onRun).toHaveBeenLastCalledWith("Today", { mod: false });
});
