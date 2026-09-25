import type { BaseUIEvent } from "@base-ui/react/types";
import { Component, type MouseEvent, type ReactNode, useState } from "react";
import { describe, expect, inject, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { DESKTOP_QUERY } from "../../lib/device";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuLinkItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "./dropdown-menu";

const desktop = inject("machine") === "desktop";

class Boundary extends Component<{ onError: (error: unknown) => void; children: ReactNode }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch(error: unknown) {
    this.props.onError(error);
  }
  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Opens from the keyboard, so focus has somewhere to return to: WebKit never focuses a tapped button. */
async function openWithKeyboard(trigger: { element: () => Element }) {
  (trigger.element() as HTMLElement).focus();
  await userEvent.keyboard("{Enter}");
}

function Harness({ onEdit = () => {} }: { onEdit?: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<button type="button">Options</button>} />
      <DropdownMenuContent aria-label="Card options" align="end">
        <DropdownMenuItem onClick={onEdit}>
          Edit
          <DropdownMenuShortcut>E</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem disabled>Move to…</DropdownMenuItem>
        <DropdownMenuLinkItem render={<a href="#settings" />}>Settings</DropdownMenuLinkItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="danger">Archive</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ChoiceHarness({ onSort = () => {} }: { onSort?: (value: string) => void }) {
  const [states, setStates] = useState<string[]>(["Known"]);
  const [sort, setSort] = useState("lesson");
  const toggle = (name: string) => (on: boolean) =>
    setStates((list) => (on ? [...list, name] : list.filter((x) => x !== name)));
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<button type="button">Filter</button>} />
        <DropdownMenuContent aria-label="Filter">
          <DropdownMenuCheckboxItem
            checked={states.includes("New")}
            onCheckedChange={toggle("New")}
          >
            New
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={states.includes("Known")}
            onCheckedChange={toggle("Known")}
          >
            Known
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger render={<button type="button">Sort</button>} />
        <DropdownMenuContent aria-label="Sort">
          <DropdownMenuRadioGroup
            value={sort}
            onValueChange={(value) => {
              setSort(value);
              onSort(value);
            }}
          >
            <DropdownMenuRadioItem value="lesson">Lesson</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="az">A–Z</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="added" closeOnClick={false}>
              Recently added
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

test("the device rule matches the machine this browser stands in for", () => {
  expect(window.matchMedia(DESKTOP_QUERY).matches).toBe(desktop);
});

describe("DropdownMenu", () => {
  test("renders every part in this shape: group, label, danger row and inset", async () => {
    const screen = await render(
      <DropdownMenu>
        <DropdownMenuTrigger render={<button type="button">Account</button>} />
        <DropdownMenuContent aria-label="Account">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Signed in as Kateryna</DropdownMenuLabel>
            <DropdownMenuItem inset>Settings</DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="danger">Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await screen.getByRole("button", { name: "Account" }).click();

    await expect.element(page.getByRole("menu", { name: "Account" })).toBeVisible();
    await expect
      .element(page.getByRole("group", { name: "Signed in as Kateryna" }))
      .toBeInTheDocument();
    await expect.element(page.getByText("Signed in as Kateryna")).toBeVisible();
    await expect
      .element(page.getByRole("menuitem", { name: "Settings" }))
      .toHaveAttribute("data-inset");
    await expect
      .element(page.getByRole("menuitem", { name: "Sign out" }))
      .toHaveAttribute("data-variant", "danger");
    await expect.element(page.getByRole("separator")).toBeInTheDocument();
  });

  test("refuses a label outside a group in this shape, as in the other", async () => {
    const caught: unknown[] = [];
    const swallow = (event: ErrorEvent) => {
      caught.push(event.error);
      event.preventDefault();
    };
    window.addEventListener("error", swallow);
    try {
      await render(
        <Boundary onError={(error) => caught.push(error)}>
          <DropdownMenu defaultOpen>
            <DropdownMenuTrigger render={<button type="button">Account</button>} />
            <DropdownMenuContent aria-label="Account">
              <DropdownMenuLabel>Signed in as Kateryna</DropdownMenuLabel>
              <DropdownMenuItem>Settings</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Boundary>,
      );
      await expect
        .poll(() => caught.map((e) => (e instanceof Error ? e.message : String(e))).join(" "))
        .toMatch(/Group/);
    } finally {
      window.removeEventListener("error", swallow);
    }
  });

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

  test("a checkbox row toggles and keeps the menu open for the next choice", async () => {
    const screen = await render(<ChoiceHarness />);
    await openWithKeyboard(screen.getByRole("button", { name: "Filter" }));
    const known = page.getByRole("menuitemcheckbox", { name: "Known" });
    const fresh = page.getByRole("menuitemcheckbox", { name: "New" });
    await expect.element(known).toHaveAttribute("aria-checked", "true");
    await expect.element(fresh).toHaveAttribute("aria-checked", "false");

    await fresh.click();
    await expect.element(fresh).toHaveAttribute("aria-checked", "true");
    await known.click();
    await expect.element(known).toHaveAttribute("aria-checked", "false");
    await expect.element(page.getByRole("menu", { name: "Filter" })).toBeVisible();
  });

  test("the arrow keys walk checkbox rows like any other row", async () => {
    const screen = await render(<ChoiceHarness />);
    await openWithKeyboard(screen.getByRole("button", { name: "Filter" }));
    await expect.element(page.getByRole("menuitemcheckbox", { name: "New" })).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    await expect.element(page.getByRole("menuitemcheckbox", { name: "Known" })).toHaveFocus();
  });

  test("a radio row chooses one, closes the menu, and shows the choice next time", async () => {
    const onSort = vi.fn();
    const screen = await render(<ChoiceHarness onSort={onSort} />);
    const trigger = screen.getByRole("button", { name: "Sort" });
    await openWithKeyboard(trigger);
    await expect
      .element(page.getByRole("menuitemradio", { name: "Lesson" }))
      .toHaveAttribute("aria-checked", "true");
    await page.getByRole("menuitemradio", { name: "A–Z" }).click();

    expect(onSort).toHaveBeenCalledWith("az");
    await expect.element(page.getByRole("menu", { name: "Sort" })).not.toBeInTheDocument();
    await openWithKeyboard(trigger);
    await expect
      .element(page.getByRole("menuitemradio", { name: "A–Z" }))
      .toHaveAttribute("aria-checked", "true");
  });

  test("passes its own props and refs to the trigger, the menu and each row", async () => {
    const refs: Record<string, string | undefined> = {};
    const keep = (part: string) => (el: HTMLElement | null) => {
      if (el) refs[part] = el.dataset.slot;
    };
    await render(
      <DropdownMenu>
        <DropdownMenuTrigger
          data-testid="trigger"
          aria-keyshortcuts="O"
          render={<button type="button">Options</button>}
        />
        <DropdownMenuContent aria-label="Options" data-testid="menu" ref={keep("menu")}>
          <DropdownMenuItem data-testid="edit" aria-keyshortcuts="E" ref={keep("edit")}>
            Edit
          </DropdownMenuItem>
          <DropdownMenuCheckboxItem data-testid="known" ref={keep("known")}>
            Known
          </DropdownMenuCheckboxItem>
          <DropdownMenuRadioGroup defaultValue="az">
            <DropdownMenuRadioItem value="az" data-testid="az" ref={keep("az")}>
              A–Z
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuLinkItem render={<a href="#settings" />} data-testid="settings">
            Settings
          </DropdownMenuLinkItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await expect.element(page.getByTestId("trigger")).toHaveAttribute("aria-keyshortcuts", "O");
    await page.getByTestId("trigger").click();

    await expect
      .element(page.getByTestId("menu"))
      .toHaveAttribute("data-slot", "dropdown-menu-content");
    await expect.element(page.getByTestId("edit")).toHaveAttribute("aria-keyshortcuts", "E");
    await expect.element(page.getByTestId("known")).toHaveAttribute("role", "menuitemcheckbox");
    await expect.element(page.getByTestId("az")).toHaveAttribute("role", "menuitemradio");
    await expect.element(page.getByTestId("settings")).toHaveAttribute("href", "#settings");
    expect(refs).toEqual({
      menu: "dropdown-menu-content",
      edit: "dropdown-menu-item",
      known: "dropdown-menu-checkbox-item",
      az: "dropdown-menu-radio-item",
    });
  });

  test("a row's click handler gets the event, and can keep the menu open", async () => {
    const onPin = vi.fn((event: BaseUIEvent<MouseEvent<HTMLElement>>) => {
      event.preventBaseUIHandler();
    });
    const onEdit = vi.fn();
    const screen = await render(
      <DropdownMenu>
        <DropdownMenuTrigger render={<button type="button">Options</button>} />
        <DropdownMenuContent aria-label="Options">
          <DropdownMenuItem onClick={onPin}>Pin</DropdownMenuItem>
          <DropdownMenuItem onClick={onEdit} closeOnClick={false}>
            Edit
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await openWithKeyboard(screen.getByRole("button", { name: "Options" }));
    await page.getByRole("menuitem", { name: "Pin" }).click();

    expect(onPin).toHaveBeenCalledOnce();
    expect(onPin.mock.calls[0]?.[0].type).toBe("click");
    await expect.element(page.getByRole("menu")).toBeVisible();

    await page.getByRole("menuitem", { name: "Edit" }).click();
    expect(onEdit).toHaveBeenCalledOnce();
    await expect.element(page.getByRole("menu")).toBeVisible();
  });

  test("a checkbox row and a radio group keep their own state when left uncontrolled", async () => {
    const screen = await render(
      <DropdownMenu>
        <DropdownMenuTrigger render={<button type="button">Filter</button>} />
        <DropdownMenuContent aria-label="Filter">
          <DropdownMenuCheckboxItem defaultChecked>Known</DropdownMenuCheckboxItem>
          <DropdownMenuRadioGroup defaultValue="az">
            <DropdownMenuRadioItem value="lesson" closeOnClick={false}>
              Lesson
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="az" closeOnClick={false}>
              A–Z
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await openWithKeyboard(screen.getByRole("button", { name: "Filter" }));
    const known = page.getByRole("menuitemcheckbox", { name: "Known" });
    const lesson = page.getByRole("menuitemradio", { name: "Lesson" });
    const az = page.getByRole("menuitemradio", { name: "A–Z" });
    await expect.element(known).toHaveAttribute("aria-checked", "true");
    await expect.element(az).toHaveAttribute("aria-checked", "true");

    await known.click();
    await expect.element(known).toHaveAttribute("aria-checked", "false");
    await lesson.click();
    await expect.element(lesson).toHaveAttribute("aria-checked", "true");
    await expect.element(az).toHaveAttribute("aria-checked", "false");
  });

  test("a radio row that does not close on click keeps the menu open for the next choice", async () => {
    const screen = await render(<ChoiceHarness />);
    await openWithKeyboard(screen.getByRole("button", { name: "Sort" }));
    const added = page.getByRole("menuitemradio", { name: "Recently added" });
    await added.click();

    await expect.element(added).toHaveAttribute("aria-checked", "true");
    await expect.element(page.getByRole("menu", { name: "Sort" })).toBeVisible();
  });
});
