import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { MotionConfig } from "motion/react";
import { afterEach, expect, test } from "vitest";
import { commands } from "vitest/browser";
import { render } from "vitest-browser-react";
import { RollingNumber } from "./rolling-number";

declare module "vitest/browser" {
  interface BrowserCommands {
    emulateReducedMotion: (reducedMotion: "reduce" | "no-preference") => Promise<void>;
  }
}

i18n.activate("en");

afterEach(() => commands.emulateReducedMotion("reduce"));

const shown = (reduce: boolean, value: number) => (
  <MotionConfig reducedMotion={reduce ? "always" : "never"}>
    <I18nProvider i18n={i18n}>
      <span data-testid="count">
        <RollingNumber value={value} />
      </span>
    </I18nProvider>
  </MotionConfig>
);

test("only the digits that change roll, and the number is plain text once they settle", async () => {
  // The component reads the system setting too, and the suite runs with it on.
  await commands.emulateReducedMotion("no-preference");
  const { rerender, getByTestId } = await render(shown(false, 41));
  const count = getByTestId("count").element();
  await rerender(shown(false, 42));
  expect(count.querySelectorAll(".inline-grid")).toHaveLength(1);
  await expect.poll(() => count.querySelector(".inline-grid"), { timeout: 3000 }).toBeNull();
  expect(count.textContent).toBe("42");
});

test("under reduced motion the new number shows at once", async () => {
  const { rerender, getByTestId } = await render(shown(true, 9));
  await rerender(shown(true, 10));
  expect(getByTestId("count").element().textContent).toBe("10");
});
