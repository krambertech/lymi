import { useState } from "react";
import { expect, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { Slider } from "./slider";

function Zoom({ disabled }: { disabled?: boolean }) {
  const [zoom, setZoom] = useState(1.5);
  return (
    <>
      <Slider
        min={1}
        max={3}
        step={0.25}
        value={zoom}
        onValueChange={setZoom}
        disabled={disabled}
        aria-label="Zoom"
        className="w-64"
      />
      <output>{zoom}</output>
    </>
  );
}

test("is a named slider that the arrow keys move in steps", async () => {
  await render(<Zoom />);
  const slider = page.getByRole("slider", { name: "Zoom" });
  await expect.element(slider).toHaveValue("1.5");
  (slider.element() as HTMLElement).focus();

  await userEvent.keyboard("{ArrowRight}");
  await expect.element(page.getByRole("status")).toHaveTextContent("1.75");
  await userEvent.keyboard("{End}");
  await expect.element(slider).toHaveValue("3");
});

test("a press on the track moves the thumb there", async () => {
  await render(<Zoom />);
  const track = document.querySelector<HTMLElement>('[data-slot="slider-track"]');
  await page.elementLocator(track as HTMLElement).click({ position: { x: 1, y: 3 } });
  await expect.element(page.getByRole("slider", { name: "Zoom" })).toHaveValue("1");
});

test("keeps a 44 px target in Lymi's ink, and disabled it does not move", async () => {
  await render(<Zoom disabled />);
  const slider = page.getByRole("slider", { name: "Zoom" });
  await expect.element(slider).toBeDisabled();
  const control = document.querySelector<HTMLElement>('[data-slot="slider"] > div');
  expect(control && getComputedStyle(control).height).toBe("44px");
  const fill = document.querySelector<HTMLElement>('[data-slot="slider-range"]');
  const probe = document.body.appendChild(document.createElement("div"));
  probe.className = "bg-text-2";
  expect(fill && getComputedStyle(fill).backgroundColor).toBe(
    getComputedStyle(probe).backgroundColor,
  );
  probe.remove();
});
