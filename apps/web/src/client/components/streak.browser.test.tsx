import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { expect, inject, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { streak } from "../design/mock";
import { StreakButton } from "./streak";

i18n.load("en", messages);
i18n.activate("en");

const desktop = inject("machine") === "desktop";

test(
  desktop
    ? "the pill opens the streak centred, named by the run, and its close button closes it"
    : "the pill opens the streak over the whole screen, named by the run, and its back button closes it",
  async () => {
    await render(
      <I18nProvider i18n={i18n}>
        <StreakButton variant="phone" summary={streak} />
      </I18nProvider>,
    );
    const pill = page.getByRole("button", { name: /^Streak: / });
    (pill.element() as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");

    const place = page.getByRole("dialog", { name: `${streak.current} days in a row` });
    await expect.element(place).toBeVisible();
    // Measured once the entrance settles: the page slides in for 450 ms, the dialog scales up for 200.
    const box = () => (place.element() as HTMLElement).getBoundingClientRect();
    if (desktop) {
      await expect.poll(() => box().width, { timeout: 5000 }).toBeCloseTo(400, 0);
    } else {
      await expect.poll(() => box().left, { timeout: 5000 }).toBeCloseTo(0, 0);
      expect(box().height).toBeCloseTo(window.innerHeight, 0);
    }
    await expect.poll(() => document.activeElement?.tagName).toBe("H2");
    expect(document.querySelector('[data-slot="tooltip-content"]')).toBeNull();
    // On touch a place is a page, so it leaves by back; with no screen named under it, back names the place.
    const leave = place.getByRole("button", { name: desktop ? "Close" : "Streak", exact: true });
    await expect.element(leave).toBeVisible();

    await leave.click();
    await expect.element(page.getByRole("dialog")).not.toBeInTheDocument();
  },
);
