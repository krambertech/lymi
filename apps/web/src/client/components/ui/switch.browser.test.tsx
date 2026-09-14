import { createRef } from "react";
import { expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { Field, FieldContent, FieldDescription, FieldLabel } from "./field";
import { Switch } from "./switch";

test("its label names and flips it, and the description describes it", async () => {
  const onCheckedChange = vi.fn();
  await render(
    <Field orientation="horizontal">
      <FieldContent>
        <FieldLabel>Send a daily reminder</FieldLabel>
        <FieldDescription>Only on days with cards due.</FieldDescription>
      </FieldContent>
      <Switch onCheckedChange={onCheckedChange} />
    </Field>,
  );
  const control = page.getByRole("switch", { name: "Send a daily reminder" });
  await expect.element(control).not.toBeChecked();
  const describedBy = control.element().getAttribute("aria-describedby") ?? "";
  expect(document.getElementById(describedBy)?.textContent).toBe("Only on days with cards due.");

  await page.getByText("Send a daily reminder").click();
  await expect.element(control).toBeChecked();
  expect(onCheckedChange).toHaveBeenLastCalledWith(true, expect.anything());
});

test("Space and Enter flip it, and it tells its owner when focus leaves", async () => {
  const onBlur = vi.fn();
  await render(
    <>
      <Switch aria-label="Autoplay" onBlur={onBlur} />
      <button type="button">Next</button>
    </>,
  );
  const control = page.getByRole("switch", { name: "Autoplay" });
  await userEvent.tab();
  await userEvent.keyboard(" ");
  await expect.element(control).toBeChecked();
  await userEvent.keyboard("{Enter}");
  await expect.element(control).not.toBeChecked();
  await userEvent.tab();
  expect(onBlur).toHaveBeenCalledTimes(1);
});

test("the thumb travels to the end it is switched to and stays inside the track", async () => {
  await render(<Switch aria-label="Autoplay" />);
  const control = page.getByRole("switch", { name: "Autoplay" });
  await control.click();
  const track = control.element().getBoundingClientRect();
  const thumb = () =>
    control.element().querySelector('[data-slot="switch-thumb"] > span')?.getBoundingClientRect();
  await expect.poll(() => Math.round(track.right - (thumb()?.right ?? 0))).toBe(3);
  expect(Math.round((thumb()?.width ?? 0) * 10) / 10).toBe(20);
});

test("in a right-to-left page the thumb starts at the right and travels left", async () => {
  await render(
    <div dir="rtl">
      <Switch aria-label="Autoplay" />
    </div>,
  );
  const control = page.getByRole("switch", { name: "Autoplay" });
  const track = control.element().getBoundingClientRect();
  const thumb = () =>
    control.element().querySelector('[data-slot="switch-thumb"] > span')?.getBoundingClientRect();
  expect(Math.round(track.right - (thumb()?.right ?? 0))).toBe(3);
  await control.click();
  await expect.poll(() => Math.round((thumb()?.left ?? 0) - track.left)).toBe(3);
});

test("it submits with a form, and a Field decides invalid and disabled", async () => {
  const ref = createRef<HTMLElement>();
  await render(
    <form data-testid="form">
      <Field orientation="horizontal" invalid>
        <FieldLabel>Reminder</FieldLabel>
        <Switch ref={ref} name="reminder" defaultChecked />
      </Field>
      <Field orientation="horizontal" disabled>
        <FieldLabel>Blocked</FieldLabel>
        <Switch name="blocked" />
      </Field>
    </form>,
  );
  const form = page.getByTestId("form").element() as HTMLFormElement;
  expect(Object.fromEntries(new FormData(form))).toEqual({ reminder: "on" });

  const reminder = page.getByRole("switch", { name: "Reminder" });
  await expect.element(reminder).toHaveAttribute("aria-invalid", "true");
  expect(ref.current).toBe(reminder.element());

  const blocked = page.getByRole("switch", { name: "Blocked" });
  await expect.element(blocked).toHaveAttribute("aria-disabled", "true");
  await page.getByText("Blocked").click({ force: true });
  await expect.element(blocked).not.toBeChecked();
});
