import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { withMotion } from "../test/motion";
import { RollingNumber } from "./rolling-number";

i18n.activate("en");

const shown = (value: number) => (
  <I18nProvider i18n={i18n}>
    <span data-testid="count">
      <RollingNumber value={value} />
    </span>
  </I18nProvider>
);

test("only the digits that change roll, and the number is plain text once they settle", async () => {
  await withMotion();
  const { rerender, getByTestId } = await render(shown(41));
  const count = getByTestId("count").element();
  await rerender(shown(42));
  expect(count.querySelectorAll(".inline-grid")).toHaveLength(1);
  await expect.poll(() => count.querySelector(".inline-grid"), { timeout: 3000 }).toBeNull();
  expect(count.textContent).toBe("42");
});

test("under reduced motion the new number shows at once", async () => {
  const { rerender, getByTestId } = await render(shown(9));
  await rerender(shown(10));
  expect(getByTestId("count").element().textContent).toBe("10");
});
