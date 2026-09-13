import { expect, test } from "vitest";
import { render } from "vitest-browser-react";

/** Base UI marks state with empty presence attributes; the copied shadcn variants must match them. */
test.each([
  ["data-open", "data-open:bg-edge"],
  ["data-closed", "data-closed:bg-edge"],
  ["data-checked", "data-checked:bg-edge"],
  ["data-unchecked", "data-unchecked:bg-edge"],
  ["data-selected", "data-selected:bg-edge"],
  ["data-disabled", "data-disabled:bg-edge"],
  ["data-active", "data-active:bg-edge"],
])("%s as a presence attribute matches its variant", async (attribute, className) => {
  const screen = await render(
    <>
      <div data-testid="on" className={className} {...{ [attribute]: "" }} />
      <div data-testid="false" className={className} {...{ [attribute]: "false" }} />
      <div data-testid="probe" className="bg-edge" />
    </>,
  );
  const color = (id: string) => getComputedStyle(screen.getByTestId(id).element()).backgroundColor;
  expect(color("on")).toBe(color("probe"));
  expect(color("false")).not.toBe(color("probe"));
});
