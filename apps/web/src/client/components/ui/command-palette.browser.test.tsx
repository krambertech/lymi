import { useState } from "react";
import { expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { canOffer } from "../command-menu";
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

function Palette({ onRun }: { onRun: (row: string, keys: RunKeys) => void }) {
  const [query, setQuery] = useState("");
  const rows = ROWS.filter((r) => r.toLowerCase().includes(query.toLowerCase()));
  const list = useCommandList({ items: rows, onRun });
  return (
    <CommandPalette open onOpenChange={() => {}} label="Command menu">
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

test("the add bar waits for three letters, or one ideograph or kana", () => {
  expect(canOffer("ca")).toBe(false);
  expect(canOffer("cas")).toBe(true);
  expect(canOffer("家")).toBe(true);
  expect(canOffer("ね")).toBe(true);
});
