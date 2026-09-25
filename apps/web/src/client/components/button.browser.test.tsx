import { createRef } from "react";
import { expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { Button } from "./button";

test("render swaps the element for a link that keeps the button's classes, inside and ref", async () => {
  const ref = createRef<HTMLAnchorElement>();
  await render(
    <Button
      variant="primary"
      size="lg"
      kbd="R"
      className="w-full"
      render={<a href="/today" ref={ref} />}
    >
      Review
    </Button>,
  );
  await render(
    <Button variant="primary" size="lg" kbd="R" className="w-full">
      Start
    </Button>,
  );
  const link = page.getByRole("link", { name: "Review" });
  await expect.element(link).toHaveAttribute("href", "/today");
  const el = link.element();
  expect(el.tagName).toBe("A");
  expect(el.hasAttribute("type")).toBe(false);
  expect(el.className).toBe(page.getByRole("button", { name: "Start" }).element().className);
  expect(el.querySelector(":scope > span > span > kbd")?.textContent).toBe("R");
  expect(ref.current).toBe(el);
});

test("a button forwards its ref and swallows a press while loading", async () => {
  const ref = createRef<HTMLButtonElement>();
  const onClick = vi.fn();
  await render(
    <Button ref={ref} loading onClick={onClick}>
      Save
    </Button>,
  );
  const button = page.getByRole("button", { name: "Save" });
  expect(ref.current).toBe(button.element());
  await expect.element(button).toHaveAttribute("type", "button");
  await expect.element(button).toHaveAttribute("aria-disabled", "true");
  await userEvent.click(button, { force: true });
  expect(onClick).not.toHaveBeenCalled();
});
