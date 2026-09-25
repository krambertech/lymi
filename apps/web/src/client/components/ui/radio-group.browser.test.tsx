import { createRef, useState } from "react";
import { expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { RadioCard } from "../radio-card";
import { Field, FieldLabel, FieldLegend, FieldSet } from "./field";
import { RadioGroup, RadioGroupItem } from "./radio-group";

function Directions({ onValueChange }: { onValueChange?: (value: string) => void }) {
  const [value, setValue] = useState("recognition");
  return (
    <form data-testid="form">
      <RadioGroup
        aria-label="How cards are asked"
        name="directions"
        value={value}
        onValueChange={(next) => {
          setValue(next);
          onValueChange?.(next);
        }}
      >
        <RadioCard value="recognition" title="Recognition" description="See the term." />
        <RadioCard value="production" title="Production" description="See the meaning." />
        <RadioCard value="both" title="Both ways" description="Asked twice." disabled />
      </RadioGroup>
      {/* A text box, since WebKit leaves buttons out of the Tab order. */}
      <input aria-label="After" />
    </form>
  );
}

test("a row is named by its title, described by its sentence, and chosen anywhere on it", async () => {
  const onValueChange = vi.fn();
  await render(<Directions onValueChange={onValueChange} />);
  const production = page.getByRole("radio", { name: "Production" });
  await expect.element(production).toHaveAccessibleDescription("See the meaning.");
  await expect.element(page.getByRole("radio", { name: "Recognition" })).toBeChecked();

  await page.getByText("See the meaning.").click();
  await expect.element(production).toBeChecked();
  expect(onValueChange).toHaveBeenLastCalledWith("production");
  const form = page.getByTestId("form").element() as HTMLFormElement;
  expect(new FormData(form).get("directions")).toBe("production");
});

test("the group is one tab stop, and arrow keys move the choice past a disabled row", async () => {
  await render(<Directions />);
  await userEvent.tab();
  await expect.element(page.getByRole("radio", { name: "Recognition" })).toHaveFocus();
  await userEvent.keyboard("{ArrowDown}");
  await expect.element(page.getByRole("radio", { name: "Production" })).toBeChecked();
  await userEvent.keyboard("{ArrowDown}");
  // Both ways is disabled, so the choice wraps back to the first row.
  await expect.element(page.getByRole("radio", { name: "Recognition" })).toBeChecked();
  await expect.element(page.getByRole("radio", { name: "Both ways" })).not.toBeChecked();
  await userEvent.tab();
  await expect.element(page.getByRole("textbox", { name: "After" })).toHaveFocus();
});

test("plain items take their names from Field labels, and required blocks a native submit", async () => {
  const ref = createRef<HTMLDivElement>();
  await render(
    <form data-testid="form">
      <FieldSet>
        <FieldLegend>Sort cards by</FieldLegend>
        <RadioGroup ref={ref} name="sort" required>
          <Field orientation="horizontal">
            <RadioGroupItem value="due" />
            <FieldLabel>When they are due</FieldLabel>
          </Field>
          <Field orientation="horizontal">
            <RadioGroupItem value="term" />
            <FieldLabel>Term, A to Z</FieldLabel>
          </Field>
        </RadioGroup>
      </FieldSet>
    </form>,
  );
  const form = page.getByTestId("form").element() as HTMLFormElement;
  expect(ref.current?.getAttribute("role")).toBe("radiogroup");
  expect(form.checkValidity()).toBe(false);
  await page.getByText("Term, A to Z").click();
  await expect.element(page.getByRole("radio", { name: "Term, A to Z" })).toBeChecked();
  expect(form.checkValidity()).toBe(true);
  expect(new FormData(form).get("sort")).toBe("term");
});

test("a disabled group ignores presses and is marked for assistive technology", async () => {
  await render(
    <RadioGroup aria-label="Theme" defaultValue="light" disabled>
      <RadioGroupItem value="light" aria-label="Light" />
      <RadioGroupItem value="dark" aria-label="Dark" />
    </RadioGroup>,
  );
  const dark = page.getByRole("radio", { name: "Dark" });
  await expect.element(dark).toHaveAttribute("aria-disabled", "true");
  await dark.click({ force: true });
  await expect.element(dark).not.toBeChecked();
});

test("Tab lands on the chosen row, and arrow keys in a control inside a row stay with that control", async () => {
  const onValueChange = vi.fn();
  function Harness() {
    const [value, setValue] = useState("custom");
    return (
      <>
        <input aria-label="Before" />
        <RadioGroup
          aria-label="Daily goal"
          value={value}
          onValueChange={(next) => {
            setValue(next);
            onValueChange(next);
          }}
        >
          <RadioGroupItem value="light" aria-label="Light" />
          <RadioGroupItem value="custom" aria-label="Custom" />
          <input type="number" aria-label="Reviews a day" defaultValue={12} />
        </RadioGroup>
      </>
    );
  }
  await render(<Harness />);
  page.getByRole("textbox", { name: "Before" }).element().focus();
  await userEvent.tab();
  await expect.element(page.getByRole("radio", { name: "Custom" })).toHaveFocus();

  const reviews = page.getByRole("spinbutton", { name: "Reviews a day" });
  await reviews.click();
  await userEvent.keyboard("{ArrowUp}{ArrowUp}");
  await expect.element(reviews).toHaveValue(14);
  await expect.element(reviews).toHaveFocus();
  expect(onValueChange).not.toHaveBeenCalled();

  await page.getByRole("radio", { name: "Light" }).click();
  await expect.element(page.getByRole("radio", { name: "Light" })).toBeChecked();
  expect(onValueChange).toHaveBeenCalledTimes(1);
});

test("a RadioCard with children is named by them and passes its own props to the row", async () => {
  function Harness() {
    const [value, setValue] = useState("10");
    return (
      <RadioGroup aria-label="Daily goal" value={value} onValueChange={setValue}>
        <RadioCard value="10" data-testid="light" className="min-h-12 items-center py-0">
          <span>Light</span> <span>10 reviews</span>
        </RadioCard>
        <RadioCard value="25">
          <span>Steady</span>
        </RadioCard>
      </RadioGroup>
    );
  }
  await render(<Harness />);
  const light = page.getByTestId("light");
  await expect.element(light).toHaveClass("items-center");
  await expect.element(light).not.toHaveClass("items-start");
  await expect.element(page.getByRole("radio", { name: "Light 10 reviews" })).toBeChecked();

  await page.getByText("Steady").click();
  await expect.element(page.getByRole("radio", { name: "Steady" })).toBeChecked();
});
