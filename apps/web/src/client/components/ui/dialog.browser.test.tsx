import { useRef, useState } from "react";
import { describe, expect, inject, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { DESKTOP_QUERY } from "../../lib/device";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

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
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        onOpenChange?.(next);
      }}
    >
      <DialogTrigger render={<button type="button">Sign out</button>} />
      <DialogContent {...(safeFirst ? { initialFocus: stay } : {})}>
        <DialogHeader>
          <DialogTitle>Some grades haven’t synced</DialogTitle>
          <DialogDescription>Sign out once you’re back online.</DialogDescription>
        </DialogHeader>
        <input aria-label="Note" />
        <DialogFooter>
          <button type="button" ref={stay} onClick={() => setOpen(false)}>
            Stay signed in
          </button>
          <button type="button">Sign out and lose them</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const dialog = () => page.getByRole("dialog", { name: "Some grades haven’t synced" });

describe("Dialog", () => {
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
      // The rise is 450 ms, and a slow CI runner starts it late, so allow well past one second.
      await expect
        .poll(() => popup.getBoundingClientRect().bottom, { timeout: 5000 })
        .toBeCloseTo(window.innerHeight, 0);
    }
  });

  test(
    desktop
      ? "takes its width from the caller"
      : "spans the drawer with the same inset on both sides, and long content never widens it",
    async () => {
      await render(
        <Dialog defaultOpen>
          <DialogContent className="w-[min(92vw,440px)]">
            <DialogTitle>New deck</DialogTitle>
            <input aria-label="Name" className="w-full" />
            <button type="button" className="whitespace-nowrap">
              {`Add to ${"Long learning ".repeat(12)}`}
            </button>
          </DialogContent>
        </Dialog>,
      );
      const popup = page.getByRole("dialog", { name: "New deck" });
      await expect.element(popup).toBeVisible();
      const field = page.getByRole("textbox", { name: "Name" }).element().getBoundingClientRect();
      const box = popup.element().getBoundingClientRect();
      if (desktop) {
        expect(box.width).toBeCloseTo(440, 0);
      } else {
        expect(field.left - box.left).toBeGreaterThan(0);
        expect(box.right - field.right).toBeCloseTo(field.left - box.left, 0);
        expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
        expect(field.right).toBeLessThanOrEqual(box.right);
      }
    },
  );

  test(
    desktop
      ? "as a place, is still a centred dialog, named by its own heading"
      : "as a place, arrives from the end edge over the whole screen, named by its own heading",
    async () => {
      await render(
        <Dialog kind="place" defaultOpen>
          <DialogContent className="w-[min(92vw,400px)]" aria-labelledby="place-title">
            <h2 id="place-title">9 days in a row</h2>
          </DialogContent>
        </Dialog>,
      );
      const place = page.getByRole("dialog", { name: "9 days in a row" });
      await expect.element(place).toBeVisible();
      const popup = place.element() as HTMLElement;
      if (desktop) {
        expect(popup.dataset.slot).toBe("dialog-content");
        expect(popup.getBoundingClientRect().width).toBeCloseTo(400, 0);
      } else {
        expect(popup.dataset.slot).toBe("drawer-popup");
        expect(popup.dataset.swipeDirection).toBe("right");
        await expect
          .poll(() => popup.getBoundingClientRect().left, { timeout: 5000 })
          .toBeCloseTo(0, 0);
        const box = popup.getBoundingClientRect();
        expect(box.width).toBeCloseTo(window.innerWidth, 0);
        expect(box.height).toBeCloseTo(window.innerHeight, 0);
        expect(getComputedStyle(popup).borderTopLeftRadius).toBe("0px");
        expect(popup.querySelector('[data-slot="drawer-swipe-handle"]')).toBeNull();
      }
    },
  );

  test(
    desktop
      ? "as a place at the end edge, is a full-height side sheet"
      : "as a place at the end edge, still rises over the whole screen",
    async () => {
      await render(
        <Dialog kind="place" defaultOpen>
          <DialogContent placement="end" aria-labelledby="sheet-title">
            <h2 id="sheet-title">sbrigarsi</h2>
          </DialogContent>
        </Dialog>,
      );
      const place = page.getByRole("dialog", { name: "sbrigarsi" });
      await expect.element(place).toBeVisible();
      const popup = place.element() as HTMLElement;
      if (desktop) {
        expect(popup.dataset.placement).toBe("end");
        await expect
          .poll(() => popup.getBoundingClientRect().right, { timeout: 5000 })
          .toBeCloseTo(window.innerWidth, 0);
        const box = popup.getBoundingClientRect();
        expect(box.width).toBeCloseTo(400, 0);
        expect(box.height).toBeCloseTo(window.innerHeight, 0);
      } else {
        expect(popup.dataset.slot).toBe("drawer-popup");
        expect(popup.dataset.placement).toBeUndefined();
      }
    },
  );

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

  test.runIf(desktop)("takes its width from a size step, 420 px unless asked", async () => {
    const steps = [
      [undefined, 420],
      ["md", 480],
      ["lg", 560],
    ] as const;
    for (const [size, width] of steps) {
      const screen = await render(
        <Dialog defaultOpen>
          <DialogContent size={size}>
            <DialogTitle>Export</DialogTitle>
          </DialogContent>
        </Dialog>,
      );
      const popup = page.getByRole("dialog", { name: "Export" });
      await expect.poll(() => popup.element().getBoundingClientRect().width).toBeCloseTo(width, 0);
      await screen.unmount();
    }
  });

  test("passes its own props and ref to the element holding the dialog role", async () => {
    let slot: string | undefined;
    await render(
      <Dialog defaultOpen>
        <DialogContent
          data-testid="panel"
          aria-describedby="panel-note"
          ref={(el: HTMLDivElement | null) => {
            if (el) slot = el.dataset.slot;
          }}
        >
          <DialogTitle>New deck</DialogTitle>
          <p id="panel-note">Decks hold cards.</p>
        </DialogContent>
      </Dialog>,
    );
    const panel = page.getByRole("dialog", { name: "New deck" });
    await expect.element(panel).toHaveAttribute("data-testid", "panel");
    await expect.element(panel).toHaveAttribute("aria-describedby", "panel-note");
    expect(slot).toBe(desktop ? "dialog-content" : "drawer-popup");
  });

  test("hands Base UI's reason for closing to onOpenChange", async () => {
    const onOpenChange = vi.fn();
    const screen = await render(
      <Dialog onOpenChange={onOpenChange}>
        <DialogTrigger render={<button type="button">Shortcuts</button>} />
        <DialogContent>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    await openWithKeyboard(screen.getByRole("button", { name: "Shortcuts" }));
    await expect.element(page.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeVisible();
    await userEvent.keyboard("{Escape}");

    await expect.poll(() => onOpenChange.mock.lastCall?.[0]).toBe(false);
    expect(onOpenChange.mock.lastCall?.[1]?.reason).toBe("escape-key");
  });

  test("a DialogClose takes its own children when it has no render", async () => {
    await render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogClose data-testid="done">Done</DialogClose>
        </DialogContent>
      </Dialog>,
    );
    await expect.element(page.getByTestId("done")).toHaveTextContent("Done");
    await page.getByRole("button", { name: "Done" }).click();

    await expect.element(page.getByRole("dialog")).not.toBeInTheDocument();
  });

  test("closes from a DialogClose part", async () => {
    const screen = await render(
      <Dialog>
        <DialogTrigger render={<button type="button">Shortcuts</button>} />
        <DialogContent>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogClose render={<button type="button">Done</button>} />
        </DialogContent>
      </Dialog>,
    );
    await screen.getByRole("button", { name: "Shortcuts" }).click();
    await expect.element(page.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeVisible();
    await page.getByRole("button", { name: "Done" }).click();

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
          <DropdownMenu>
            <DropdownMenuTrigger render={<button type="button">Options</button>} />
            <DropdownMenuContent aria-label="Options">
              <DropdownMenuItem onClick={() => setOpen(true)}>Keyboard shortcuts</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
              <DialogTitle>Keyboard shortcuts</DialogTitle>
              <button type="button" onClick={() => setOpen(false)}>
                Close
              </button>
            </DialogContent>
          </Dialog>
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
