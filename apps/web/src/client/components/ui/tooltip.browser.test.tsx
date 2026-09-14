import { Pencil } from "lucide-react";
import { describe, expect, inject, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { IconButton } from "../button";
import { Dialog, DialogContent, DialogTitle } from "./dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

const desktop = inject("machine") === "desktop";

const tip = (text: string) => page.getByText(text, { exact: true });

/** The popup carries no role, so tests find it by its slot; `page.getByText` sees `aria-hidden` text. */
const openTips = () => document.querySelectorAll('[data-slot="tooltip-content"]');

/**
 * Chromium's Tab lands on buttons; WebKit's skips them, and its `:focus-visible` after script
 * focus is unreliable, so the keyboard path is proven on the desktop machine only.
 */
const tab = () => userEvent.tab();

function Row({ delay }: { delay?: number | undefined }) {
  return (
    <TooltipProvider delay={delay}>
      <div className="flex gap-1">
        <Tooltip>
          <TooltipTrigger render={<button type="button" aria-label="Rename" />}>R</TooltipTrigger>
          <TooltipContent>Rename</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger render={<button type="button" aria-label="Archive deck" />}>
            A
          </TooltipTrigger>
          <TooltipContent>Archive deck</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

describe("Tooltip", () => {
  test("stays closed until asked, and the trigger's name never depends on it", async () => {
    const screen = await render(<Row />);
    const trigger = screen.getByRole("button", { name: "Rename" });
    await expect.element(trigger).toBeInTheDocument();
    expect(openTips()).toHaveLength(0);
    expect(trigger.element().getAttribute("aria-describedby")).toBeNull();
  });

  test.runIf(desktop)(
    "opens on keyboard focus at once, hidden from assistive technology, in Lymi's ink",
    async () => {
      await render(<Row />);
      await tab();

      await expect.element(tip("Rename")).toBeVisible();
      const popup = openTips()[0];
      expect(popup?.getAttribute("aria-hidden")).toBe("true");
      expect(popup?.getAttribute("role")).toBeNull();
      const probe = document.body.appendChild(document.createElement("div"));
      probe.className = "bg-text";
      expect(popup && getComputedStyle(popup).backgroundColor).toBe(
        getComputedStyle(probe).backgroundColor,
      );
      probe.remove();
    },
  );

  test.runIf(desktop)("closes on Escape and on blur", async () => {
    await render(<Row />);
    await tab();
    await expect.element(tip("Rename")).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await expect.poll(() => openTips().length).toBe(0);

    await tab();
    await expect.element(tip("Archive deck")).toBeVisible();
    await tab();
    await expect.poll(() => openTips().length).toBe(0);
  });

  test("a disabled tooltip never opens, so a menu button stays quiet while its menu is open", async () => {
    const screen = await render(
      <TooltipProvider>
        <Tooltip disabled>
          <TooltipTrigger render={<button type="button" aria-label="Card options" />}>
            …
          </TooltipTrigger>
          <TooltipContent>Card options</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    const trigger = screen.getByRole("button", { name: "Card options" });
    (trigger.element() as HTMLElement).focus();
    await expect.element(trigger).toHaveFocus();
    if (desktop) await trigger.hover();
    await new Promise((r) => setTimeout(r, 700));

    expect(openTips()).toHaveLength(0);
  });

  test.runIf(desktop)("waits under a still pointer, then shows", async () => {
    const screen = await render(<Row />);
    await screen.getByRole("button", { name: "Rename" }).hover();
    await new Promise((r) => setTimeout(r, 150));
    expect(openTips()).toHaveLength(0);

    await expect.element(tip("Rename"), { timeout: 2000 }).toBeVisible();
  });

  test.runIf(desktop)("the next tooltip along a row opens at once, with no fade", async () => {
    const screen = await render(<Row delay={0} />);
    await screen.getByRole("button", { name: "Rename" }).hover();
    await expect.element(tip("Rename")).toBeVisible();
    await screen.getByRole("button", { name: "Archive deck" }).hover();

    await expect.element(tip("Archive deck")).toBeVisible();
    await expect.element(tip("Archive deck")).toHaveAttribute("data-instant", "delay");
  });

  test.runIf(desktop)("one Escape closes the name and the dialog around its control", async () => {
    await render(
      <TooltipProvider>
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Photo</DialogTitle>
            <IconButton label="Zoom in" size="sm">
              <Pencil />
            </IconButton>
          </DialogContent>
        </Dialog>
      </TooltipProvider>,
    );
    await expect.element(page.getByRole("dialog")).toBeVisible();
    await tab();
    await expect.element(tip("Zoom in")).toBeVisible();
    await userEvent.keyboard("{Escape}");

    await expect.poll(() => openTips().length).toBe(0);
    await expect.element(page.getByRole("dialog")).not.toBeInTheDocument();
  });

  test.runIf(desktop)(
    "renders inside a native modal dialog and lets one Escape close both",
    async () => {
      await render(
        <TooltipProvider>
          <dialog ref={(node) => node?.showModal()}>
            {/* Takes the dialog's autofocus, so Tab lands on the control rather than leaving the page. */}
            <button type="button">Before</button>
            <IconButton label="Close" size="sm">
              <Pencil />
            </IconButton>
          </dialog>
        </TooltipProvider>,
      );
      await tab();
      await expect.element(tip("Close")).toBeVisible();
      expect(openTips()[0]?.closest("dialog")).not.toBeNull();
      // The platform closes its dialog on the same Escape, so the key must not be swallowed.
      await userEvent.keyboard("{Escape}");

      await expect.poll(() => openTips().length).toBe(0);
      await expect.poll(() => document.querySelector("dialog:modal")).toBeNull();
    },
  );

  test.runIf(desktop)("pressing the control closes it", async () => {
    const screen = await render(<Row delay={0} />);
    const trigger = screen.getByRole("button", { name: "Rename" });
    await trigger.hover();
    await expect.element(tip("Rename")).toBeVisible();
    await trigger.click();

    await expect.poll(() => openTips().length).toBe(0);
  });

  test.runIf(!desktop)("a tap never opens it", async () => {
    const screen = await render(<Row delay={0} />);
    await screen.getByRole("button", { name: "Rename" }).click();
    await new Promise((r) => setTimeout(r, 150));

    expect(openTips()).toHaveLength(0);
  });
});

describe("IconButton", () => {
  test("keeps its label as the accessible name and shows it as the tooltip", async () => {
    const screen = await render(
      <TooltipProvider>
        <IconButton label="Rename" size="sm">
          <Pencil />
        </IconButton>
      </TooltipProvider>,
    );
    const button = screen.getByRole("button", { name: "Rename" });
    await expect.element(button).toHaveAttribute("aria-label", "Rename");
    expect(openTips()).toHaveLength(0);
    if (!desktop) return;
    await tab();

    await expect.element(button).toHaveFocus();
    await expect.element(tip("Rename")).toBeVisible();
  });

  test("stays quiet while expanded", async () => {
    const screen = await render(
      <TooltipProvider>
        <IconButton label="Card options" aria-expanded>
          <Pencil />
        </IconButton>
      </TooltipProvider>,
    );
    const button = screen.getByRole("button", { name: "Card options" });
    (button.element() as HTMLElement).focus();
    await expect.element(button).toHaveFocus();
    await new Promise((r) => setTimeout(r, 150));

    expect(openTips()).toHaveLength(0);
  });
});
