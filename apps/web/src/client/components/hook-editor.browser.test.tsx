import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { queueItem } from "../design/mock";
import { api } from "../lib/api";
import { writes } from "../lib/writes";
import { HookEditor } from "./hook-editor";

i18n.load("en", messages);
i18n.activate("en");

beforeEach(() => {
  // No draft unless a test gives one, so nothing reaches the network.
  vi.spyOn(api, "draftHook").mockResolvedValue({ hook: null });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function Editor(props: { hook?: string | null; onCancel?: () => void; onSaved?: () => void }) {
  const card = { ...queueItem.card, hook: props.hook ?? null };
  return (
    <QueryClientProvider client={new QueryClient()}>
      <I18nProvider i18n={i18n}>
        <HookEditor
          card={card}
          onCancel={props.onCancel ?? (() => undefined)}
          onSaved={props.onSaved ?? (() => undefined)}
        />
      </I18nProvider>
    </QueryClientProvider>
  );
}

test("Enter saves the hook as the learner's own and closes the editor", async () => {
  const update = vi.spyOn(writes, "updateCard").mockImplementation(async (card, patch) => ({
    card: { ...card, hook: patch.hook ?? card.hook },
    queued: false,
  }));
  const saved = vi.fn();
  await render(<Editor onSaved={saved} />);
  const field = page.getByRole("textbox", { name: "Memory hook" });
  await expect.element(field).toHaveFocus();
  await userEvent.type(field, "A brigade bursting out of the station{Enter}");
  await expect.poll(() => saved.mock.calls.length).toBe(1);
  expect(update.mock.calls[0]?.[1]).toEqual({
    hook: "A brigade bursting out of the station",
    hookSource: "manual",
  });
});

test("Escape lets go without saving, and an empty hook asks for one", async () => {
  const update = vi.spyOn(writes, "updateCard");
  const cancelled = vi.fn();
  await render(<Editor onCancel={cancelled} />);
  await page.getByRole("button", { name: "Save" }).click();
  await expect.element(page.getByText("Write a hook.")).toBeVisible();
  await userEvent.keyboard("{Escape}");
  expect(cancelled).toHaveBeenCalledOnce();
  expect(update).not.toHaveBeenCalled();
});

test("an existing hook opens ready to change", async () => {
  await render(<Editor hook="A brigade bursting out of the station" />);
  await expect
    .element(page.getByRole("textbox", { name: "Memory hook" }))
    .toHaveValue("A brigade bursting out of the station");
});

test("the AI's draft is the placeholder, and saving the empty field keeps it", async () => {
  vi.spyOn(api, "draftHook").mockResolvedValue({ hook: "A fire BRIGAde scrambling out" });
  const update = vi.spyOn(writes, "updateCard").mockImplementation(async (card, patch) => ({
    card: { ...card, hook: patch.hook ?? card.hook },
    queued: false,
  }));
  const saved = vi.fn();
  await render(<Editor onSaved={saved} />);
  const field = page.getByRole("textbox", { name: "Memory hook" });
  await expect.element(field).toHaveAttribute("placeholder", "A fire BRIGAde scrambling out");
  await expect.element(page.getByText(/^AI draft/)).toBeVisible();
  await page.getByRole("button", { name: "Save" }).click();
  await expect.poll(() => saved.mock.calls.length).toBe(1);
  expect(update.mock.calls[0]?.[1]).toMatchObject({ hook: "A fire BRIGAde scrambling out" });
});

test("Tab on the empty field takes the draft to edit", async () => {
  vi.spyOn(api, "draftHook").mockResolvedValue({ hook: "A fire BRIGAde scrambling out" });
  await render(<Editor />);
  const field = page.getByRole("textbox", { name: "Memory hook" });
  await expect.element(field).toHaveAttribute("placeholder", "A fire BRIGAde scrambling out");
  await userEvent.keyboard("{Tab}");
  await expect.element(field).toHaveValue("A fire BRIGAde scrambling out");
});
