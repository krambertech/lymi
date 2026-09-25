import { createRef } from "react";
import { expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { Chip } from "./chip";

test("a Chip passes data, aria and ref through to its span", async () => {
  const ref = createRef<HTMLSpanElement>();
  await render(
    <Chip ref={ref} tone="ai" data-testid="chip" data-state="new" aria-label="Three new cards">
      3 new
    </Chip>,
  );
  const chip = page.getByTestId("chip");
  await expect.element(chip).toHaveAttribute("data-state", "new");
  await expect.element(chip).toHaveAccessibleName("Three new cards");
  await expect.element(chip).toHaveClass("bg-ai-soft");
  expect(ref.current).toBe(chip.element());
});
