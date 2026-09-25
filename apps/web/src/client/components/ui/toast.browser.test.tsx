import { afterEach, beforeEach, describe, expect, inject, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { Toaster, toast } from "./toast";

const region = () => page.getByRole("region", { name: "Notifications" });
// The toaster runs without a dismiss timer: a toast leaves when a test closes it, and the timing test sets its own on `add`.
const renderToaster = () =>
  render(<Toaster aria-label="Notifications" closeLabel="Dismiss" timeout={0} />);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// The pointer stays wherever an earlier test left it; a stack arriving under it spreads and pauses.
beforeEach(() => userEvent.hover(document.documentElement, { position: { x: 1, y: 1 } }));
afterEach(() => toast.close());

describe("toast", () => {
  test("toasts stack up to three, newest in front", async () => {
    await renderToaster();
    for (const term of ["uno", "due", "tre", "quattro"]) toast.add({ title: `Archived “${term}”` });
    await expect.element(region().getByText("Archived “quattro”")).toBeVisible();

    const toasts = () => [...document.querySelectorAll<HTMLElement>('[data-slot="toast"]')];
    await expect.poll(() => toasts().filter((t) => !t.hasAttribute("data-limited")).length).toBe(3);
    expect(toasts()[0]?.textContent).toContain("quattro");
    expect(
      toasts()
        .find((t) => t.textContent?.includes("uno"))
        ?.hasAttribute("data-limited"),
    ).toBe(true);
  });

  test("the stack collapses behind the newest and spreads under the pointer", async () => {
    await renderToaster();
    for (const term of ["cinque", "sei", "sette"]) toast.add({ title: `Archived “${term}”` });
    const box = (term: string) =>
      [...document.querySelectorAll('[data-slot="toast"]')]
        .find((t) => t.textContent?.includes(term))
        ?.getBoundingClientRect() ?? new DOMRect();
    const front = region().getByText("Archived “sette”");
    await expect.element(front).toBeVisible();

    // The stack settles after Base UI measures each toast and the 500 ms motion ends, which is slow on CI.
    const settle = { timeout: 5000 };
    await expect.poll(() => box("sette").top - box("sei").top, settle).toBeGreaterThan(8);
    await expect.poll(() => box("sette").top - box("sei").top, settle).toBeLessThan(16);

    await userEvent.hover(front);
    await expect.poll(() => box("sette").top - box("sei").bottom, settle).toBeGreaterThanOrEqual(6);
    await expect
      .poll(() => box("sei").top - box("cinque").bottom, settle)
      .toBeGreaterThanOrEqual(6);
  });

  // WebKit's Tab skips buttons, so the keyboard path is proven on the desktop machine only.
  test.runIf(inject("machine") === "desktop")(
    "a focused button's ring is the room's colour, so it shows on the ink toast",
    async () => {
      await renderToaster();
      toast.add({ title: "Archived “uno”", actionProps: { children: "Undo" } });
      const undo = region().getByRole("button", { name: "Undo" });
      await expect.element(undo).toBeVisible();

      await userEvent.keyboard("{F6}");
      await userEvent.tab();
      await userEvent.tab();
      for (const name of ["Undo", "Dismiss"]) {
        const button = region().getByRole("button", { name }).element();
        expect(document.activeElement).toBe(button);
        const toastElement = button.closest<HTMLElement>('[data-slot="toast"]');
        if (!toastElement) throw new Error("The button is outside its toast.");
        expect(getComputedStyle(button).outlineStyle).toBe("solid");
        // The close button's colour transition carries its outline colour too.
        await expect
          .poll(() => getComputedStyle(button).outlineColor)
          .toBe(getComputedStyle(toastElement).color);
        await userEvent.tab();
      }
    },
  );

  test("its one action runs", async () => {
    const onClick = vi.fn();
    await renderToaster();
    toast.add({ title: "Archived “uno”", actionProps: { children: "Undo", onClick } });

    await region().getByRole("button", { name: "Undo" }).click();
    expect(onClick).toHaveBeenCalledOnce();
  });

  test("it holds while the pointer is on it and leaves after", async () => {
    await renderToaster();
    toast.add({ title: "Archived “nove”", timeout: 800 });
    const message = region().getByText("Archived “nove”");
    await expect.element(message).toBeVisible();

    // Dispatched rather than moved: a real hover waits for the moving stack to settle, which can outlast the timer.
    const pointer = (type: "mouseover" | "mouseout") =>
      message
        .element()
        .dispatchEvent(new MouseEvent(type, { bubbles: true, relatedTarget: document.body }));
    pointer("mouseover");
    await wait(1500);
    await expect.element(message).toBeVisible();

    pointer("mouseout");
    await expect.poll(() => message.elements(), { timeout: 4000 }).toHaveLength(0);
  });

  test("an error is announced at once", async () => {
    await renderToaster();
    toast.add({ type: "error", title: "Couldn’t save “uno”." });

    await expect.element(page.getByRole("alert")).toHaveTextContent("Couldn’t save “uno”.");
  });

  test("Escape dismisses it from the keyboard", async () => {
    const onClose = vi.fn();
    await renderToaster();
    toast.add({ title: "Archived “uno”", actionProps: { children: "Undo" }, onClose });
    const undo = region().getByRole("button", { name: "Undo" });
    await expect.element(undo).toBeVisible();

    (undo.element() as HTMLElement).focus();
    await userEvent.keyboard("{Escape}");
    // Closing is the behaviour; removal waits on the exit animation, which a starved renderer can hold past any poll.
    expect(onClose).toHaveBeenCalledOnce();
  });
});
