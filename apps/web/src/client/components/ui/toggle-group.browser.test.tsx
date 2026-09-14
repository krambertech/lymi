import { MotionConfig } from "motion/react";
import { useState } from "react";
import { expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { Segmented } from "../segmented";
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

test("under reduced motion the plate appears at a pointer's choice and fades in there", async () => {
  await render(
    <MotionConfig reducedMotion="always">
      <Theme />
    </MotionConfig>,
  );
  const dark = page.getByRole("button", { name: "Dark" });
  await dark.click();
  await expect.element(dark).toHaveAttribute("aria-pressed", "true");
  expect(offset(dark.element())).toEqual({ start: 0, width: 0 });
  await expect.poll(() => getComputedStyle(indicator()).opacity).toBe("1");
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

test("Tab lands on the chosen option, and blur is reported once as focus leaves the group", async () => {
  const onBlur = vi.fn();
  function Harness() {
    const [value, setValue] = useState("system");
    return (
      <>
        <input aria-label="Before" />
        <Segmented
          label="Theme"
          value={value}
          onChange={setValue}
          options={OPTIONS}
          onBlur={onBlur}
        />
        <input aria-label="After" />
      </>
    );
  }
  await render(<Harness />);
  page.getByRole("textbox", { name: "Before" }).element().focus();
  await userEvent.tab();
  const system = page.getByRole("button", { name: "Follow the system" });
  await expect.element(system).toHaveFocus();
  await userEvent.keyboard("{ArrowLeft}{ArrowLeft}");
  expect(onBlur).not.toHaveBeenCalled();
  await userEvent.tab();
  await expect.element(page.getByRole("textbox", { name: "After" })).toHaveFocus();
  expect(onBlur).toHaveBeenCalledTimes(1);
});

test("a disabled group submits nothing, as a disabled native control would", async () => {
  await render(
    <form data-testid="form">
      <Segmented
        label="Theme"
        name="theme"
        value="light"
        onChange={() => {}}
        options={OPTIONS}
        disabled
      />
    </form>,
  );
  const form = page.getByTestId("form").element() as HTMLFormElement;
  expect(new FormData(form).getAll("theme")).toEqual([]);
});

test("after a keyboard choice, a change made from outside the group still glides", async () => {
  function Harness() {
    const [value, setValue] = useState("light");
    return (
      <>
        <Segmented label="Theme" value={value} onChange={setValue} options={OPTIONS} />
        <button type="button" onClick={() => setValue("light")}>
          Clear
        </button>
      </>
    );
  }
  await render(<Harness />);
  await userEvent.tab();
  await userEvent.keyboard("{ArrowRight}{ArrowRight}{Enter}");
  const system = page.getByRole("button", { name: "Follow the system" });
  await expect.element(system).toHaveAttribute("aria-pressed", "true");
  expect(offset(system.element())).toEqual({ start: 0, width: 0 });

  const light = page.getByRole("button", { name: "Light" });
  await page.getByRole("button", { name: "Clear" }).click();
  await expect.element(light).toHaveAttribute("aria-pressed", "true");
  expect(offset(light.element())).not.toEqual({ start: 0, width: 0 });
  await expect.poll(() => offset(light.element())).toEqual({ start: 0, width: 0 });
});

test("a change the owner cancels leaves both the pressed item and the submitted value alone", async () => {
  await render(
    <form data-testid="form">
      <ToggleGroup
        aria-label="Theme"
        name="theme"
        defaultValue={["light"]}
        onValueChange={(_, details) => details.cancel()}
      >
        <ToggleGroupItem value="light">Light</ToggleGroupItem>
        <ToggleGroupItem value="dark">Dark</ToggleGroupItem>
      </ToggleGroup>
    </form>,
  );
  await page.getByRole("button", { name: "Dark" }).click();
  await expect
    .element(page.getByRole("button", { name: "Light" }))
    .toHaveAttribute("aria-pressed", "true");
  const form = page.getByTestId("form").element() as HTMLFormElement;
  expect(new FormData(form).getAll("theme")).toEqual(["light"]);
});
