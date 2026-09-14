import { useState } from "react";
import { expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { Segmented } from "../Segmented";
import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

const OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "Follow the system" },
];

function Theme({ onChange }: { onChange?: (value: string) => void }) {
  const [value, setValue] = useState("light");
  return (
    <form data-testid="form">
      <Segmented
        label="Theme"
        name="theme"
        value={value}
        onChange={(next) => {
          setValue(next);
          onChange?.(next);
        }}
        options={OPTIONS}
      />
    </form>
  );
}

const indicator = () =>
  document.querySelector<HTMLElement>('[data-slot="toggle-group-indicator"]') as HTMLElement;

/** Where the plate sits, relative to the item it should cover. */
function offset(item: Element) {
  const plate = indicator().getBoundingClientRect();
  const target = item.getBoundingClientRect();
  // `|| 0` folds -0 into 0.
  return {
    start: Math.round(plate.left - target.left) || 0,
    width: Math.round(plate.width - target.width) || 0,
  };
}

test("one option is pressed, and pressing it again keeps it pressed", async () => {
  const onChange = vi.fn();
  await render(<Theme onChange={onChange} />);
  await expect.element(page.getByRole("group", { name: "Theme" })).toBeInTheDocument();
  const light = page.getByRole("button", { name: "Light" });
  await expect.element(light).toHaveAttribute("aria-pressed", "true");

  await light.click();
  await expect.element(light).toHaveAttribute("aria-pressed", "true");
  expect(onChange).not.toHaveBeenCalled();

  await page.getByRole("button", { name: "Dark" }).click();
  await expect
    .element(page.getByRole("button", { name: "Dark" }))
    .toHaveAttribute("aria-pressed", "true");
  await expect.element(light).toHaveAttribute("aria-pressed", "false");
  expect(onChange).toHaveBeenCalledWith("dark");
  const form = page.getByTestId("form").element() as HTMLFormElement;
  expect(new FormData(form).getAll("theme")).toEqual(["dark"]);
});

test("the plate settles under a pointer's choice", async () => {
  await render(<Theme />);
  const system = page.getByRole("button", { name: "Follow the system" });
  await expect
    .poll(() => offset(page.getByRole("button", { name: "Light" }).element()))
    .toEqual({
      start: 0,
      width: 0,
    });
  await system.click();
  await expect.poll(() => offset(system.element())).toEqual({ start: 0, width: 0 });
});

test("arrow keys walk the options, Enter chooses, and the plate jumps straight there", async () => {
  await render(<Theme />);
  await userEvent.tab();
  await expect.element(page.getByRole("button", { name: "Light" })).toHaveFocus();
  await userEvent.keyboard("{ArrowRight}{ArrowRight}");
  const system = page.getByRole("button", { name: "Follow the system" });
  await expect.element(system).toHaveFocus();
  await userEvent.keyboard("{Enter}");
  await expect.element(system).toHaveAttribute("aria-pressed", "true");
  expect(offset(system.element())).toEqual({ start: 0, width: 0 });
});

test("a disabled option cannot be chosen, and a disabled group cannot change", async () => {
  const onValueChange = vi.fn();
  await render(
    <>
      <ToggleGroup aria-label="Direction" defaultValue={["one"]} onValueChange={onValueChange}>
        <ToggleGroupItem value="one">One</ToggleGroupItem>
        <ToggleGroupItem value="both" disabled>
          Both
        </ToggleGroupItem>
      </ToggleGroup>
      <Segmented
        label="Locked"
        value="a"
        onChange={onValueChange}
        disabled
        options={[
          { value: "a", label: "A" },
          { value: "b", label: "B" },
        ]}
      />
    </>,
  );
  await page.getByRole("button", { name: "Both" }).click({ force: true });
  await page.getByRole("button", { name: "B", exact: true }).click({ force: true });
  expect(onValueChange).not.toHaveBeenCalled();
  await expect
    .element(page.getByRole("button", { name: "B", exact: true }))
    .toHaveAttribute("aria-disabled", "true");
});
