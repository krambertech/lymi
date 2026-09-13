import { describe, expect, inject, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { DESKTOP_QUERY } from "../lib/device";
import {
  ResponsiveMenu,
  ResponsiveMenuContent,
  ResponsiveMenuItem,
  ResponsiveMenuLinkItem,
  ResponsiveMenuSeparator,
  ResponsiveMenuShortcut,
  ResponsiveMenuTrigger,
} from "./ResponsiveMenu";

const desktop = inject("machine") === "desktop";

/** Opens from the keyboard, so focus has somewhere to return to: WebKit never focuses a tapped button. */
async function openWithKeyboard(trigger: { element: () => Element }) {
  (trigger.element() as HTMLElement).focus();
  await userEvent.keyboard("{Enter}");
}

function Harness({ onEdit = () => {} }: { onEdit?: () => void }) {
  return (
    <ResponsiveMenu>
      <ResponsiveMenuTrigger render={<button type="button">Options</button>} />
      <ResponsiveMenuContent label="Card options" align="end">
        <ResponsiveMenuItem onClick={onEdit}>
          Edit
          <ResponsiveMenuShortcut>E</ResponsiveMenuShortcut>
        </ResponsiveMenuItem>
        <ResponsiveMenuItem disabled>Move to…</ResponsiveMenuItem>
        <ResponsiveMenuLinkItem render={<a href="#settings" />}>Settings</ResponsiveMenuLinkItem>
        <ResponsiveMenuSeparator />
        <ResponsiveMenuItem variant="destructive">Archive</ResponsiveMenuItem>
      </ResponsiveMenuContent>
    </ResponsiveMenu>
  );
}

test("the device rule matches the machine this browser stands in for", () => {
  expect(window.matchMedia(DESKTOP_QUERY).matches).toBe(desktop);
});

describe("ResponsiveMenu", () => {
  test(desktop ? "anchors to its trigger" : "rises as a drawer named by its label", async () => {
    const screen = await render(<Harness />);
    await screen.getByRole("button", { name: "Options" }).click();

    await expect.element(page.getByRole("menu")).toBeVisible();
    await expect.element(page.getByRole("menuitem", { name: /Edit/ })).toBeVisible();
    if (desktop) {
      expect(document.querySelector('[data-slot="drawer-popup"]')).toBeNull();
      await expect.element(page.getByText("E", { exact: true })).toBeVisible();
    } else {
      await expect.element(page.getByRole("dialog", { name: "Card options" })).toBeVisible();
      expect(page.getByText("E", { exact: true }).elements()).toHaveLength(0);
    }
  });

  test("runs the chosen item, closes, and hands focus back to the trigger", async () => {
    const onEdit = vi.fn();
    const screen = await render(<Harness onEdit={onEdit} />);
    const trigger = screen.getByRole("button", { name: "Options" });
    await openWithKeyboard(trigger);
    await page.getByRole("menuitem", { name: /Edit/ }).click();

    expect(onEdit).toHaveBeenCalledOnce();
    await expect.element(page.getByRole("menu")).not.toBeInTheDocument();
    await expect.element(trigger).toHaveFocus();
  });

  test("ignores a disabled item", async () => {
    const screen = await render(<Harness />);
    await screen.getByRole("button", { name: "Options" }).click();
    const move = page.getByRole("menuitem", { name: "Move to…" });
    await expect.element(move).toHaveAttribute("aria-disabled", "true");
    await expect.element(move).toBeInViewport({ ratio: 1 });
    await move.click({ force: true });
    await expect.element(page.getByRole("menu")).toBeVisible();
  });

  test("closes on Escape", async () => {
    const screen = await render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Options" });
    await openWithKeyboard(trigger);
    await expect.element(page.getByRole("menu")).toBeVisible();
    await userEvent.keyboard("{Escape}");

    await expect.element(page.getByRole("menu")).not.toBeInTheDocument();
    await expect.element(trigger).toHaveFocus();
  });

  test("walks every item with the arrow keys, disabled ones included", async () => {
    const screen = await render(<Harness />);
    await openWithKeyboard(screen.getByRole("button", { name: "Options" }));
    const item = (name: string | RegExp) => page.getByRole("menuitem", { name });
    await expect.element(item(/Edit/)).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    await expect.element(item("Move to…")).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    await expect.element(item("Settings")).toHaveFocus();
    await userEvent.keyboard("{End}");
    await expect.element(item("Archive")).toHaveFocus();
    await userEvent.keyboard("{Home}");
    await expect.element(item(/Edit/)).toHaveFocus();
  });

  test("keeps its rows out of the tab order, and Tab leaves and closes the menu", async () => {
    const screen = await render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Options" });
    await openWithKeyboard(trigger);
    await expect.element(page.getByRole("menuitem", { name: /Edit/ })).toHaveFocus();
    // Roving focus: at most the active row is reachable with Tab.
    const reachable = page
      .getByRole("menuitem")
      .elements()
      .filter((row) => (row as HTMLElement).tabIndex >= 0);
    expect(reachable.length).toBeLessThanOrEqual(1);
    await userEvent.keyboard("{Tab}");

    await expect.element(page.getByRole("menu")).not.toBeInTheDocument();
  });

  test("a link row navigates and closes the menu", async () => {
    const screen = await render(<Harness />);
    await screen.getByRole("button", { name: "Options" }).click();
    const link = page.getByRole("menuitem", { name: "Settings" });
    await expect.element(link).toHaveAttribute("href", "#settings");
    await link.click();

    await expect.poll(() => location.hash).toBe("#settings");
    await expect.element(page.getByRole("menu")).not.toBeInTheDocument();
  });

  test("closes on a press outside it", async () => {
    const screen = await render(<Harness />);
    await screen.getByRole("button", { name: "Options" }).click();
    await expect.element(page.getByRole("menu")).toBeVisible();
    await userEvent.click(document.body, { position: { x: 10, y: 10 } });

    await expect.element(page.getByRole("menu")).not.toBeInTheDocument();
  });

  test("takes the machine's shape at the moment it opens, even if no media event arrived", async () => {
    const screen = await render(<Harness />);
    const other = !desktop;
    const real = window.matchMedia.bind(window);
    const spy = vi
      .spyOn(window, "matchMedia")
      .mockImplementation((query) =>
        query === DESKTOP_QUERY
          ? ({ ...real(query), matches: other } as MediaQueryList)
          : real(query),
      );
    try {
      await screen.getByRole("button", { name: "Options" }).click();
      await expect.element(page.getByRole("menu")).toBeInTheDocument();
      expect(document.querySelector('[data-slot="drawer-popup"]') === null).toBe(other);
    } finally {
      spy.mockRestore();
    }
  });
});
