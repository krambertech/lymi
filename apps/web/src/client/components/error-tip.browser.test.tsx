import { useRef, useState } from "react";
import { expect, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { ErrorTip } from "./error-tip";

const tip = () => document.querySelector<HTMLElement>('[data-slot="popover-content"]');

function Harness() {
  const button = useRef<HTMLButtonElement>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <div style={{ paddingTop: 120 }}>
      <button ref={button} type="button" onClick={() => setError("Couldn’t play it. Try again.")}>
        Play
      </button>
      <ErrorTip anchor={button} message={error} />
    </div>
  );
}

test("appears over the failed control, is announced, and leaves focus where it was", async () => {
  await render(<Harness />);
  const control = page.getByRole("button", { name: "Play" });
  (control.element() as HTMLElement).focus();
  await userEvent.keyboard("{Enter}");

  await expect.poll(() => tip()?.textContent).toBe("Couldn’t play it. Try again.");
  expect(tip()?.getAttribute("aria-hidden")).toBe("true");
  await expect.element(page.getByRole("alert")).toHaveTextContent("Couldn’t play it. Try again.");
  expect(document.activeElement).toBe(control.element());
});

test("leaves at the next key, and its announcement goes with it", async () => {
  await render(<Harness />);
  const control = page.getByRole("button", { name: "Play" });
  (control.element() as HTMLElement).focus();
  await userEvent.keyboard("{Enter}");
  await expect.poll(() => tip()).not.toBeNull();

  await userEvent.keyboard("{Shift}");
  await expect.poll(() => tip()).toBeNull();
  await expect.element(page.getByRole("alert")).toHaveTextContent("");
});
