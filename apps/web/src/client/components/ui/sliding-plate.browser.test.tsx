import { useState } from "react";
import { expect, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { SlidingPlate } from "./sliding-plate";

const TABS = ["Today", "Library"];

/** A row of links whose choice lands after the click returns, as a route commit does. */
function Tabs() {
  const [current, setCurrent] = useState("Today");
  return (
    <nav className="relative flex">
      <SlidingPlate
        chosen='[aria-current="page"]'
        attribute="aria-current"
        data-slot="plate"
        className="inset-y-0"
      />
      {TABS.map((tab) => (
        <a
          key={tab}
          href={`#${tab}`}
          aria-current={current === tab ? "page" : undefined}
          onClick={(event) => {
            event.preventDefault();
            setTimeout(() => setCurrent(tab), 50);
          }}
          className="relative px-4 py-2"
        >
          {tab}
        </a>
      ))}
    </nav>
  );
}

function offset(item: Element) {
  const plate = document.querySelector('[data-slot="plate"]')?.getBoundingClientRect();
  const target = item.getBoundingClientRect();
  // `|| 0` folds -0 into 0.
  return {
    start: Math.round((plate?.left ?? 0) - target.left) || 0,
    width: Math.round((plate?.width ?? 0) - target.width) || 0,
  };
}

test("the plate glides to a tab chosen by pointer, even when the choice lands late", async () => {
  await render(<Tabs />);
  const library = page.getByRole("link", { name: "Library" });
  await library.click();
  await expect.element(library).toHaveAttribute("aria-current", "page");
  expect(offset(library.element())).not.toEqual({ start: 0, width: 0 });
  await expect.poll(() => offset(library.element())).toEqual({ start: 0, width: 0 });
});

test("the plate jumps to a tab chosen from the keyboard, even when the choice lands late", async () => {
  await render(<Tabs />);
  const library = page.getByRole("link", { name: "Library" });
  // Focused directly, since WebKit's Tab skips links by default.
  (library.element() as HTMLElement).focus();
  await expect.element(library).toHaveFocus();
  await userEvent.keyboard("{Enter}");
  await expect.element(library).toHaveAttribute("aria-current", "page");
  expect(offset(library.element())).toEqual({ start: 0, width: 0 });
});
