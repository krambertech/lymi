import { describe, expect, inject, test } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { RailHeading, RailNav, RailRow } from "./rail-nav";

const desktop = inject("machine") === "desktop";

const fill = () => document.querySelector<HTMLElement>(".fluid-highlight");

async function renderRail() {
  return render(
    <div className="w-60 bg-rail p-3">
      <RailNav>
        <RailRow href="#today">Today</RailRow>
        <RailRow href="#library" className="active">
          Library
        </RailRow>
        <RailHeading>Decks</RailHeading>
        <RailRow href="#verbi">Verbi</RailRow>
        <RailRow href="#portuguese">Portuguese</RailRow>
      </RailNav>
    </div>,
  );
}

describe.runIf(desktop)("RailNav hover", () => {
  test("one fill slides between rows in a group", async () => {
    const screen = await renderRail();
    await screen.getByRole("link", { name: "Verbi" }).hover();
    const before = fill();
    expect(before).not.toBeNull();
    await screen.getByRole("link", { name: "Portuguese" }).hover();
    expect(fill()).toBe(before);
  });

  test("past a heading the fill starts again at the new row instead of sliding over it", async () => {
    const screen = await renderRail();
    await screen.getByRole("link", { name: "Today" }).hover();
    const before = fill();
    await screen.getByRole("link", { name: "Verbi" }).hover();
    expect(fill()).not.toBe(before);
    const y = Number.parseFloat(fill()?.style.translate.split(" ")[1] ?? "");
    const verbi = screen.getByRole("link", { name: "Verbi" }).element() as HTMLElement;
    expect(y).toBeCloseTo(verbi.offsetTop, 0);
  });

  test("keyboard focus hides the fill, because focus carries its own ring", async () => {
    const screen = await renderRail();
    await screen.getByRole("link", { name: "Verbi" }).hover();
    await userEvent.keyboard("{Tab}");
    await expect.poll(() => fill()?.hasAttribute("data-hidden")).toBe(true);
  });
});
