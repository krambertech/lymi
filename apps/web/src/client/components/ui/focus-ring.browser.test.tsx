import { expect, inject, test } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { Checkbox } from "./checkbox";
import { RadioGroup, RadioGroupItem } from "./radio-group";
import { Switch } from "./switch";
import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

// WebKit's Tab skips buttons, so the keyboard path is proven on the desktop machine only.
const desktop = inject("machine") === "desktop";

/** `outline-none` beside `focus-visible:outline-2` zeroes the outline style that the ring reads. */
test.runIf(desktop)("every choice control shows the focus ring under the keyboard", async () => {
  await render(
    <>
      <Checkbox aria-label="Include AI examples" />
      <Switch aria-label="Autoplay" />
      <RadioGroup aria-label="Sort cards by" defaultValue="due">
        <RadioGroupItem value="due" aria-label="When they are due" />
      </RadioGroup>
      <ToggleGroup aria-label="Direction" defaultValue={["both"]}>
        <ToggleGroupItem value="both">Both</ToggleGroupItem>
      </ToggleGroup>
    </>,
  );
  for (const slot of ["checkbox", "switch", "radio-group-item", "toggle-group-item"]) {
    await userEvent.tab();
    const focused = document.activeElement as HTMLElement;
    const style = getComputedStyle(focused);
    expect([focused.dataset.slot, focused.matches(":focus-visible")]).toEqual([slot, true]);
    expect([slot, style.outlineStyle, style.outlineWidth]).toEqual([slot, "solid", "2px"]);
  }
});
