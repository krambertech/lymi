import { useState } from "react";
import { expect, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { offsetOnceChosen, plateOffset } from "../../test/plate";
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

const plate = () => document.querySelector('[data-slot="plate"]') as HTMLElement;

test("the plate glides to a tab chosen by pointer, even when the choice lands late", async () => {
  await render(<Tabs />);
  const library = page.getByRole("link", { name: "Library" });
  const landed = offsetOnceChosen(plate, library.element(), "aria-current", "page");
  await library.click();
  expect(await landed).not.toEqual({ start: 0, width: 0 });
  await expect.poll(() => plateOffset(plate(), library.element())).toEqual({ start: 0, width: 0 });
});

test("the plate jumps to a tab chosen from the keyboard, even when the choice lands late", async () => {
  await render(<Tabs />);
  const library = page.getByRole("link", { name: "Library" });
  // Focused directly, since WebKit's Tab skips links by default.
  (library.element() as HTMLElement).focus();
  await expect.element(library).toHaveFocus();
  const landed = offsetOnceChosen(plate, library.element(), "aria-current", "page");
  await userEvent.keyboard("{Enter}");
  expect(await landed).toEqual({ start: 0, width: 0 });
});
