import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { useLift } from "./lift";

function Tile({ onTap, onDrop }: { onTap: () => void; onDrop: () => void }) {
  const { start, handlers } = useLift<string>({ onTap, onDrop });
  return (
    <button type="button" onPointerDown={start("tile")} {...handlers}>
      tile
    </button>
  );
}

const capture = HTMLElement.prototype.setPointerCapture;
beforeEach(() => {
  HTMLElement.prototype.setPointerCapture = () => {};
});
afterEach(() => {
  HTMLElement.prototype.setPointerCapture = capture;
});

const press = (target: Element, type: string, x: number) =>
  target.dispatchEvent(
    new PointerEvent(type, { bubbles: true, button: 0, pointerId: 1, clientX: x, clientY: 10 }),
  );

async function moveBy(steps: number[]) {
  const onTap = vi.fn();
  const onDrop = vi.fn();
  const screen = await render(<Tile onTap={onTap} onDrop={onDrop} />);
  const tile = screen.getByRole("button").element();
  let x = 10;
  press(tile, "pointerdown", x);
  for (const step of steps) {
    x += step;
    press(tile, "pointermove", x);
  }
  press(tile, "pointerup", x);
  return { onTap, onDrop };
}

test("a slow drag, a few pixels at a time, is still a drag", async () => {
  const { onTap, onDrop } = await moveBy([3, 3, 3, 3, 3]);
  expect(onDrop).toHaveBeenCalledOnce();
  expect(onTap).not.toHaveBeenCalled();
});

test("a press that barely moves is a tap", async () => {
  const { onTap, onDrop } = await moveBy([2, -1, 2]);
  expect(onTap).toHaveBeenCalledOnce();
  expect(onDrop).not.toHaveBeenCalled();
});
