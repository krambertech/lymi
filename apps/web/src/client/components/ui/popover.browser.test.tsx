import { useRef } from "react";
import { expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { Popover, PopoverContent } from "./popover";

const popup = () => document.querySelector<HTMLElement>('[data-slot="popover-content"]');

function Anchored({ top }: { top: number }) {
  const anchor = useRef<HTMLButtonElement>(null);
  return (
    <div style={{ paddingTop: top }} className="flex justify-center">
      <button ref={anchor} type="button">
        Play
      </button>
      <Popover open>
        <PopoverContent anchor={anchor} initialFocus={false} finalFocus={false}>
          Couldn’t play it
        </PopoverContent>
      </Popover>
    </div>
  );
}

test("sits over the control it is anchored to, with no trigger, in Lymi's plate", async () => {
  await render(<Anchored top={200} />);
  await expect.element(page.getByText("Couldn’t play it")).toBeVisible();
  const tip = popup();
  const control = page.getByRole("button", { name: "Play" }).element().getBoundingClientRect();
  const box = tip?.getBoundingClientRect();

  expect(tip?.dataset.side).toBe("top");
  expect(Math.round((control.top ?? 0) - (box?.bottom ?? 0))).toBe(8);
  expect(
    Math.abs((box?.left ?? 0) + (box?.width ?? 0) / 2 - (control.left + control.width / 2)),
  ).toBeLessThan(1);
  const probe = document.body.appendChild(document.createElement("div"));
  probe.className = "bg-plate";
  expect(tip && getComputedStyle(tip).backgroundColor).toBe(
    getComputedStyle(probe).backgroundColor,
  );
  probe.remove();
});

test("turns below the control when there is no room above it", async () => {
  await render(<Anchored top={0} />);
  await expect.element(page.getByText("Couldn’t play it")).toBeVisible();
  const control = page.getByRole("button", { name: "Play" }).element().getBoundingClientRect();

  await expect.poll(() => popup()?.dataset.side).toBe("bottom");
  expect(Math.round((popup()?.getBoundingClientRect().top ?? 0) - control.bottom)).toBe(8);
});
