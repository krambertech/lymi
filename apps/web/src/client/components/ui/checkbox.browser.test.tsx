import { createRef, useState } from "react";
import { expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { Checkbox } from "./checkbox";
import { Field, FieldDescription, FieldError, FieldLabel } from "./field";

const submitted = (form: HTMLFormElement) => Object.fromEntries(new FormData(form));

test("a label beside it names and presses it, and the description describes it", async () => {
  const onCheckedChange = vi.fn();
  await render(
    <Field orientation="horizontal">
      <Checkbox onCheckedChange={onCheckedChange} />
      <FieldLabel>Include AI examples</FieldLabel>
      <FieldDescription>Adds two sentences to every new card.</FieldDescription>
    </Field>,
  );
  const box = page.getByRole("checkbox", { name: "Include AI examples" });
  await expect.element(box).not.toBeChecked();
  const describedBy = box.element().getAttribute("aria-describedby") ?? "";
  expect(document.getElementById(describedBy)?.textContent).toBe(
    "Adds two sentences to every new card.",
  );

  await page.getByText("Include AI examples").click();
  await expect.element(box).toBeChecked();
  expect(onCheckedChange).toHaveBeenLastCalledWith(true, expect.anything());

  await box.click();
  await expect.element(box).not.toBeChecked();
});

test("Space toggles it from the keyboard, and it tells its owner when focus leaves", async () => {
  const onBlur = vi.fn();
  await render(
    <>
      <Checkbox aria-label="Keep audio" onBlur={onBlur} />
      <button type="button">Next</button>
    </>,
  );
  const box = page.getByRole("checkbox", { name: "Keep audio" });
  await userEvent.tab();
  await expect.element(box).toHaveFocus();
  await userEvent.keyboard(" ");
  await expect.element(box).toBeChecked();
  await userEvent.tab();
  expect(onBlur).toHaveBeenCalledTimes(1);
});

test("it submits with a form under its name, and only while checked", async () => {
  function Harness() {
    const [checked, setChecked] = useState(false);
    return (
      <form data-testid="form">
        <Checkbox
          name="examples"
          value="yes"
          aria-label="Examples"
          checked={checked}
          onCheckedChange={setChecked}
        />
      </form>
    );
  }
  await render(<Harness />);
  const form = page.getByTestId("form").element() as HTMLFormElement;
  expect(submitted(form)).toEqual({});
  await page.getByRole("checkbox", { name: "Examples" }).click();
  expect(submitted(form)).toEqual({ examples: "yes" });
});

test("required blocks a native submit until it is checked", async () => {
  await render(
    <form data-testid="form">
      <Checkbox name="rights" required aria-label="I have the rights" />
    </form>,
  );
  const form = page.getByTestId("form").element() as HTMLFormElement;
  expect(form.checkValidity()).toBe(false);
  await page.getByRole("checkbox", { name: "I have the rights" }).click();
  expect(form.checkValidity()).toBe(true);
});

test("its Field decides invalid and disabled, and a ref reaches the control", async () => {
  const ref = createRef<HTMLElement>();
  await render(
    <>
      <Field orientation="horizontal">
        <Checkbox ref={ref} />
        <FieldLabel>Rights</FieldLabel>
        <FieldError>Confirm this to upload them.</FieldError>
      </Field>
      <Field orientation="horizontal" disabled>
        <Checkbox defaultChecked />
        <FieldLabel>Original audio</FieldLabel>
      </Field>
    </>,
  );
  const rights = page.getByRole("checkbox", { name: "Rights" });
  await expect.element(rights).toHaveAttribute("aria-invalid", "true");
  expect(ref.current).toBe(rights.element());

  const audio = page.getByRole("checkbox", { name: "Original audio" });
  await expect.element(audio).toHaveAttribute("aria-disabled", "true");
  await page.getByText("Original audio").click({ force: true });
  await expect.element(audio).toBeChecked();
});

test("mixed reads as mixed and draws a dash instead of a tick", async () => {
  await render(<Checkbox indeterminate aria-label="All cards" />);
  const box = page.getByRole("checkbox", { name: "All cards" });
  await expect.element(box).toHaveAttribute("aria-checked", "mixed");
  const [tick, dash] = box.element().querySelectorAll("path");
  await expect.poll(() => dash && getComputedStyle(dash).opacity).toBe("1");
  expect(tick && getComputedStyle(tick).opacity).toBe("0");
});
