import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { writes } from "@lymi/client/writes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { queueItem } from "../design/mock";
import { api } from "../lib/api";
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

test("nothing is drafted until the learner asks", async () => {
  const draft = vi.spyOn(api, "draftHook");
  await render(<Editor />);
  await expect.element(page.getByRole("button", { name: "Draft a hook" })).toBeVisible();
  expect(draft).not.toHaveBeenCalled();
});

test("Draft a hook puts the AI's hook in the field to edit, and saving it as written keeps it", async () => {
  vi.spyOn(api, "draftHook").mockResolvedValue({ hook: "A fire BRIGAde scrambling out" });
  const update = vi.spyOn(writes, "updateCard").mockImplementation(async (card, patch) => ({
    card: { ...card, hook: patch.hook ?? card.hook },
    queued: false,
  }));
  const saved = vi.fn();
  await render(<Editor onSaved={saved} />);
  await page.getByRole("button", { name: "Draft a hook" }).click();
  const field = page.getByRole("textbox", { name: "Memory hook" });
  await expect.element(field).toHaveValue("A fire BRIGAde scrambling out");
  await expect.element(page.getByText("AI draft")).toBeVisible();
  await page.getByRole("button", { name: "Save" }).click();
  await expect.poll(() => saved.mock.calls.length).toBe(1);
  expect(update.mock.calls[0]?.[1]).toMatchObject({ hook: "A fire BRIGAde scrambling out" });
});

test("an untouched draft can be swapped for another, and an edited one keeps the learner's words", async () => {
  vi.spyOn(api, "draftHook")
    .mockResolvedValueOnce({ hook: "A fire BRIGAde scrambling out" })
    .mockResolvedValueOnce({ hook: "SBRIGA, the brigade is late" });
  await render(<Editor />);
  await page.getByRole("button", { name: "Draft a hook" }).click();
  await page.getByRole("button", { name: "Another draft" }).click();
  const field = page.getByRole("textbox", { name: "Memory hook" });
  await expect.element(field).toHaveValue("SBRIGA, the brigade is late");
  await userEvent.type(field, "!");
  await expect.element(page.getByRole("button", { name: "Another draft" })).not.toBeInTheDocument();
});

test("a draft that fails or comes back empty says so and leaves the field alone", async () => {
  vi.spyOn(api, "draftHook")
    .mockResolvedValueOnce({ hook: null })
    .mockRejectedValueOnce(new Error("503"));
  await render(<Editor />);
  await page.getByRole("button", { name: "Draft a hook" }).click();
  await expect
    .element(page.getByText("No strong hook for this one. Try again, or write your own."))
    .toBeVisible();
  await page.getByRole("button", { name: "Draft a hook" }).click();
  await expect
    .element(page.getByText("Couldn’t draft a hook. Try again in a moment."))
    .toBeVisible();
  await expect.element(page.getByRole("textbox", { name: "Memory hook" })).toHaveValue("");
});
