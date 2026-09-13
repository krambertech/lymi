import { useRef, useState } from "react";
import { describe, expect, inject, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { DESKTOP_QUERY } from "../lib/device";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "./ResponsiveDialog";
import {
  ResponsiveMenu,
  ResponsiveMenuContent,
  ResponsiveMenuItem,
  ResponsiveMenuTrigger,
} from "./ResponsiveMenu";

const desktop = inject("machine") === "desktop";

/** Opens from the keyboard, so focus has somewhere to return to: WebKit never focuses a tapped button. */
async function openWithKeyboard(trigger: { element: () => Element }) {
  (trigger.element() as HTMLElement).focus();
  await userEvent.keyboard("{Enter}");
}

function scrollLocked() {
  const html = getComputedStyle(document.documentElement).overflow;
  const body = getComputedStyle(document.body).overflow;
  return html === "hidden" || body === "hidden";
}

function Harness({
  onOpenChange,
  safeFirst,
}: {
  onOpenChange?: (open: boolean) => void;
  safeFirst?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const stay = useRef<HTMLButtonElement>(null);
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        onOpenChange?.(next);
      }}
    >
      <ResponsiveDialogTrigger render={<button type="button">Sign out</button>} />
      <ResponsiveDialogContent {...(safeFirst ? { initialFocus: stay } : {})}>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Some grades haven’t synced</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Sign out once you’re back online.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <input aria-label="Note" />
        <ResponsiveDialogFooter>
          <button type="button" ref={stay} onClick={() => setOpen(false)}>
            Stay signed in
          </button>
          <button type="button">Sign out and lose them</button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

const dialog = () => page.getByRole("dialog", { name: "Some grades haven’t synced" });

describe("ResponsiveDialog", () => {
  test(desktop ? "is a centred dialog" : "is a drawer from the bottom edge", async () => {
    const screen = await render(<Harness />);
    await screen.getByRole("button", { name: "Sign out" }).click();

    await expect.element(dialog()).toBeVisible();
    const popup = dialog().element();
    expect(popup.dataset.slot).toBe(desktop ? "dialog-content" : "drawer-popup");
    if (desktop) {
      const r = popup.getBoundingClientRect();
      expect(Math.abs(r.left + r.width / 2 - window.innerWidth / 2)).toBeLessThan(2);
    } else {
      await expect
        .poll(() => dialog().element().getBoundingClientRect().bottom)
        .toBeCloseTo(window.innerHeight, 0);
    }
  });

  test("is named by its title and described by its description", async () => {
    const screen = await render(<Harness />);
    await screen.getByRole("button", { name: "Sign out" }).click();
    await expect.element(dialog()).toBeVisible();
    const describedBy = dialog().element().getAttribute("aria-describedby");
    expect(describedBy && document.getElementById(describedBy)?.textContent).toBe(
      "Sign out once you’re back online.",
    );
  });

  test(
    desktop
      ? "puts the actions in a row with the primary last"
      : "stacks the actions full width with the primary on top",
    async () => {
      const screen = await render(<Harness />);
      await screen.getByRole("button", { name: "Sign out" }).click();
      await expect.element(dialog()).toBeVisible();
      const safe = page.getByRole("button", { name: "Stay signed in" }).element();
      const primary = page.getByRole("button", { name: "Sign out and lose them" }).element();
      await expect.poll(() => primary.getBoundingClientRect().width > 0).toBe(true);
      const a = safe.getBoundingClientRect();
      const b = primary.getBoundingClientRect();
      if (desktop) {
        expect(b.left).toBeGreaterThan(a.left);
        expect(b.top).toBe(a.top);
      } else {
        expect(b.top).toBeLessThan(a.top);
        expect(b.width).toBe(a.width);
      }
    },
  );

  test("closes on Escape and hands focus back to what opened it", async () => {
    const onOpenChange = vi.fn();
    const screen = await render(<Harness onOpenChange={onOpenChange} />);
    const trigger = screen.getByRole("button", { name: "Sign out" });
    await openWithKeyboard(trigger);
    await expect.element(dialog()).toBeVisible();
    await userEvent.keyboard("{Escape}");

    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    await expect.element(page.getByRole("dialog")).not.toBeInTheDocument();
    await expect.element(trigger).toHaveFocus();
  });

  test("closes on a press outside it", async () => {
    const screen = await render(<Harness />);
    await screen.getByRole("button", { name: "Sign out" }).click();
    await expect.element(dialog()).toBeVisible();
    await userEvent.click(document.body, { position: { x: 10, y: 10 } });

    await expect.element(page.getByRole("dialog")).not.toBeInTheDocument();
  });

  test("lands focus on the safe action when asked", async () => {
    const screen = await render(<Harness safeFirst />);
    await openWithKeyboard(screen.getByRole("button", { name: "Sign out" }));
    await expect.element(page.getByRole("button", { name: "Stay signed in" })).toHaveFocus();
  });

  test("locks the page scroll while open", async () => {
    const screen = await render(<Harness />);
    await expect.poll(scrollLocked).toBe(false);
    await screen.getByRole("button", { name: "Sign out" }).click();
    await expect.element(dialog()).toBeVisible();
    await expect.poll(scrollLocked).toBe(true);
    await page.getByRole("button", { name: "Stay signed in" }).click();
    await expect.element(page.getByRole("dialog")).not.toBeInTheDocument();
    await expect.poll(scrollLocked).toBe(false);
  });

  test("opens from a menu item and keeps focus inside", async () => {
    function FromMenu() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <ResponsiveMenu>
            <ResponsiveMenuTrigger render={<button type="button">Options</button>} />
            <ResponsiveMenuContent label="Options">
              <ResponsiveMenuItem onClick={() => setOpen(true)}>
                Keyboard shortcuts
              </ResponsiveMenuItem>
            </ResponsiveMenuContent>
          </ResponsiveMenu>
          <ResponsiveDialog open={open} onOpenChange={setOpen}>
            <ResponsiveDialogContent>
              <ResponsiveDialogTitle>Keyboard shortcuts</ResponsiveDialogTitle>
              <button type="button" onClick={() => setOpen(false)}>
                Close
              </button>
            </ResponsiveDialogContent>
          </ResponsiveDialog>
        </>
      );
    }
    const screen = await render(<FromMenu />);
    await screen.getByRole("button", { name: "Options" }).click();
    await page.getByRole("menuitem", { name: "Keyboard shortcuts" }).click();

    const shortcuts = page.getByRole("dialog", { name: "Keyboard shortcuts" });
    await expect.element(shortcuts).toBeVisible();
    await expect.element(page.getByRole("menu")).not.toBeInTheDocument();
    await expect.poll(() => shortcuts.element().contains(document.activeElement)).toBe(true);
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
      await screen.getByRole("button", { name: "Sign out" }).click();
      await expect.element(dialog()).toBeInTheDocument();
      expect(dialog().element().dataset.slot).toBe(other ? "dialog-content" : "drawer-popup");
    } finally {
      spy.mockRestore();
    }
  });

  test.runIf(desktop)(
    "keeps its shape while open when the window crosses the breakpoint",
    async () => {
      const screen = await render(<Harness />);
      await screen.getByRole("button", { name: "Sign out" }).click();
      await page.getByRole("textbox", { name: "Note" }).fill("half-typed");
      await page.viewport(500, 800);

      expect(dialog().element().dataset.slot).toBe("dialog-content");
      await expect.element(page.getByRole("textbox", { name: "Note" })).toHaveValue("half-typed");

      await page.getByRole("button", { name: "Stay signed in" }).click();
      await expect.element(page.getByRole("dialog")).not.toBeInTheDocument();
      await screen.getByRole("button", { name: "Sign out" }).click();
      await expect.poll(() => dialog().element().dataset.slot).toBe("drawer-popup");
      await page.viewport(1280, 800);
    },
  );
});
