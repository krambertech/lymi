import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { type ComponentProps, type ReactNode, useState } from "react";
import { expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { messages } from "../../locales/en.po";
import { CardPlace } from "../components/card-place";
import { Dialog, DialogContent, DialogTitle } from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { toast, Toaster } from "../components/ui/toast";
import { useShortcut } from "./use-shortcut";

i18n.load("en", messages);
i18n.activate("en");

type Options = Parameters<typeof useShortcut>[2];

function Shortcut({
  keys = { key: "n" },
  run,
  options,
}: {
  keys?: Parameters<typeof useShortcut>[0];
  run: () => void;
  options?: Options;
}) {
  useShortcut(keys, run, options);
  return null;
}

function WithDialog(props: ComponentProps<typeof Shortcut> & { children?: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <I18nProvider i18n={i18n}>
      <Shortcut {...props} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent aria-label="Edit card">
          <DialogTitle>Edit card</DialogTitle>
          <button type="button">Save</button>
        </DialogContent>
      </Dialog>
    </I18nProvider>
  );
}

function press(
  init: KeyboardEventInit & { keyCode?: number },
  target: EventTarget = document.body,
) {
  const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init });
  if (init.keyCode) Object.defineProperty(event, "keyCode", { value: init.keyCode });
  target.dispatchEvent(event);
  return event;
}

test("a shortcut waits while a dialog is open and answers once it has closed", async () => {
  const run = vi.fn();
  await render(<WithDialog run={run} />);
  await expect.element(page.getByRole("dialog")).toBeVisible();
  page.getByRole("button", { name: "Save" }).element().focus();
  await userEvent.keyboard("n");
  expect(run).not.toHaveBeenCalled();

  await userEvent.keyboard("{Escape}");
  await expect.element(page.getByRole("dialog")).not.toBeInTheDocument();
  await userEvent.keyboard("n");
  expect(run).toHaveBeenCalledOnce();
});

test("the Escape that closes a dialog does not reach the page's own Escape", async () => {
  const run = vi.fn();
  await render(<WithDialog keys={{ key: "Escape" }} run={run} options={{ focus: "any" }} />);
  await expect.element(page.getByRole("dialog")).toBeVisible();
  page.getByRole("button", { name: "Save" }).element().focus();
  await userEvent.keyboard("{Escape}");
  await expect.element(page.getByRole("dialog")).not.toBeInTheDocument();
  expect(run).not.toHaveBeenCalled();
  await userEvent.keyboard("{Escape}");
  expect(run).toHaveBeenCalledOnce();
});

test("a toast is not an overlay", async () => {
  const run = vi.fn();
  await render(
    <I18nProvider i18n={i18n}>
      <Shortcut run={run} />
      <Toaster aria-label="Notifications" closeLabel="Dismiss" timeout={0} />
    </I18nProvider>,
  );
  toast.add({ title: "Added" });
  await expect.element(page.getByText("Added").first()).toBeInTheDocument();
  press({ key: "n" });
  expect(run).toHaveBeenCalledOnce();
});

test("an open list takes the key, and a closed one gives it back", async () => {
  const run = vi.fn();
  await render(
    <I18nProvider i18n={i18n}>
      <Shortcut run={run} />
      <Select items={[{ value: "a", label: "Italian" }]} defaultValue="a">
        <SelectTrigger aria-label="Language">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">Italian</SelectItem>
        </SelectContent>
      </Select>
    </I18nProvider>,
  );
  await page.getByRole("combobox", { name: "Language" }).click();
  await expect.element(page.getByRole("option", { name: "Italian" })).toBeVisible();
  press({ key: "n" });
  expect(run).not.toHaveBeenCalled();
  await userEvent.keyboard("{Escape}");
  await expect.element(page.getByRole("option", { name: "Italian" })).not.toBeInTheDocument();
  press({ key: "n" });
  expect(run).toHaveBeenCalledOnce();
});

test("J and K walk the cards over an open card, not over a dialog above it", async () => {
  const run = vi.fn();
  function Scene() {
    const [editing, setEditing] = useState(false);
    return (
      <I18nProvider i18n={i18n}>
        <Shortcut keys={{ key: ["j", "k"] }} run={run} options={{ over: "card-place" }} />
        <CardPlace open onClose={() => {}} titleId="card">
          <h2 id="card" tabIndex={-1}>
            mela
          </h2>
          <button type="button" onClick={() => setEditing(true)}>
            Edit
          </button>
        </CardPlace>
        <Dialog open={editing} onOpenChange={setEditing}>
          <DialogContent aria-label="Edit card">
            <DialogTitle>Edit card</DialogTitle>
            <button type="button">Save</button>
          </DialogContent>
        </Dialog>
      </I18nProvider>
    );
  }
  await render(<Scene />);
  await expect.element(page.getByRole("heading", { name: "mela" })).toBeVisible();
  await userEvent.keyboard("j");
  expect(run).toHaveBeenCalledOnce();
  await page.getByRole("button", { name: "Edit" }).click();
  await expect.element(page.getByRole("heading", { name: "Edit card" })).toBeVisible();
  page.getByRole("button", { name: "Save" }).element().focus();
  await userEvent.keyboard("j");
  expect(run).toHaveBeenCalledOnce();
});

test.each(["input", "textarea", "select"] as const)(
  "a shortcut leaves the key to a focused %s",
  async (Field) => {
    const run = vi.fn();
    await render(
      <>
        <Shortcut run={run} />
        <Shortcut keys={{ key: "m" }} run={run} options={{ focus: "any" }} />
        <Field aria-label="Term" />
      </>,
    );
    page.getByLabelText("Term").element().focus();
    await userEvent.keyboard("n");
    expect(run).not.toHaveBeenCalled();
    await userEvent.keyboard("m");
    expect(run).toHaveBeenCalledOnce();
  },
);

test("Space stays with a focused button, and every key does where the shortcut says so", async () => {
  const space = vi.fn();
  const grade = vi.fn();
  await render(
    <>
      <Shortcut keys={{ key: " " }} run={space} />
      <Shortcut keys={{ key: "3" }} run={grade} options={{ focus: { apartFrom: "#speaker" } }} />
      <button type="button" id="speaker">
        Play
      </button>
      <button type="button">Done</button>
    </>,
  );
  page.getByRole("button", { name: "Done" }).element().focus();
  await userEvent.keyboard(" 3");
  expect(space).not.toHaveBeenCalled();
  expect(grade).not.toHaveBeenCalled();
  page.getByRole("button", { name: "Play" }).element().focus();
  await userEvent.keyboard(" 3");
  expect(space).not.toHaveBeenCalled();
  expect(grade).toHaveBeenCalledOnce();
  page.getByRole("button", { name: "Play" }).element().blur();
  await userEvent.keyboard(" ");
  expect(space).toHaveBeenCalledOnce();
});

test("a held key runs a shortcut once, and again only where it walks a list", async () => {
  const add = vi.fn();
  const walk = vi.fn();
  await render(
    <>
      <Shortcut run={add} />
      <Shortcut keys={{ key: "j" }} run={walk} options={{ repeat: true }} />
    </>,
  );
  for (const key of ["n", "j"]) {
    press({ key });
    const held = press({ key, repeat: true });
    expect(held.defaultPrevented).toBe(true);
  }
  expect(add).toHaveBeenCalledOnce();
  expect(walk).toHaveBeenCalledTimes(2);
});

test("a key an input method is composing with is never a shortcut", async () => {
  const run = vi.fn();
  await render(<Shortcut run={run} options={{ focus: "any" }} />);
  press({ key: "n", isComposing: true });
  press({ key: "n", keyCode: 229 });
  expect(run).not.toHaveBeenCalled();
});

test("a modifier makes it another key", async () => {
  const run = vi.fn();
  await render(<Shortcut run={run} />);
  for (const modifier of ["metaKey", "ctrlKey", "altKey"]) press({ key: "n", [modifier]: true });
  expect(run).not.toHaveBeenCalled();
});

test("one press answers one shortcut, even when its answer turns the next one on", async () => {
  const second = vi.fn();
  function Scene() {
    const [first, setFirst] = useState(true);
    return (
      <>
        <Shortcut keys={{ key: " " }} run={() => setFirst(false)} options={{ enabled: first }} />
        <Shortcut keys={{ key: " " }} run={second} options={{ enabled: !first }} />
      </>
    );
  }
  await render(<Scene />);
  await userEvent.keyboard(" ");
  expect(second).not.toHaveBeenCalled();
  await userEvent.keyboard(" ");
  expect(second).toHaveBeenCalledOnce();
});
