import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { MotionConfig } from "motion/react";
import { expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { RollingNumber } from "./rolling-number";

i18n.activate("en");

const shown = (reduce: boolean, value: number) => (
  <MotionConfig reducedMotion={reduce ? "always" : "never"}>
    <I18nProvider i18n={i18n}>
      <span data-testid="count">
        <RollingNumber value={value} />
      </span>
    </I18nProvider>
  </MotionConfig>
);

test("a digit that does not change stays the same element", async () => {
  const { rerender, getByTestId } = await render(shown(false, 41));
  const digits = () => getByTestId("count").element().querySelectorAll(".inline-block");
  const tens = digits()[0];
  await rerender(shown(false, 42));
  expect(digits()[0]).toBe(tens);
  expect(tens?.textContent).toBe("4");
});

test("under reduced motion the new number shows at once", async () => {
  const { rerender, getByTestId } = await render(shown(true, 9));
  await rerender(shown(true, 10));
  // Short of a spring's run, so only a number that did not roll passes.
  await expect.poll(() => getByTestId("count").element().textContent, { timeout: 150 }).toBe("10");
});
