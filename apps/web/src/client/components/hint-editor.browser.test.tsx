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
import { HintEditor } from "./hint-editor";

i18n.load("en", messages);
i18n.activate("en");

beforeEach(() => {
  // No draft unless a test gives one, so nothing reaches the network.
  vi.spyOn(api, "draftHint").mockResolvedValue({ hint: null });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function Editor(props: {
  hint?: string | null;
  meaningLanguage?: string;
  onCancel?: () => void;
  onSaved?: () => void;
}) {
  const card = { ...queueItem.card, hint: props.hint ?? null };
  const client = new QueryClient();
  // The settings the editor reads to tell whether the AI can draft for this card.
  client.setQueryData(["settings"], { meaningLanguage: props.meaningLanguage ?? "en" });
  return (
    <QueryClientProvider client={client}>
      <I18nProvider i18n={i18n}>
        <HintEditor
          card={card}
          onCancel={props.onCancel ?? (() => undefined)}
          onSaved={props.onSaved ?? (() => undefined)}
        />
      </I18nProvider>
    </QueryClientProvider>
  );
}

test("Enter saves the hint as the learner's own and closes the editor", async () => {
  const update = vi.spyOn(writes, "updateCard").mockImplementation(async (card, patch) => ({
    card: { ...card, hint: patch.hint ?? card.hint },
    queued: false,
  }));
  const saved = vi.fn();
  await render(<Editor onSaved={saved} />);
  const field = page.getByRole("textbox", { name: "Hint" });
  await expect.element(field).toHaveFocus();
  await userEvent.type(field, "A brigade bursting out of the station{Enter}");
  await expect.poll(() => saved.mock.calls.length).toBe(1);
  expect(update.mock.calls[0]?.[1]).toEqual({
    hint: "A brigade bursting out of the station",
    hintSource: "manual",
  });
});

test("Escape lets go without saving, and an empty hint asks for one", async () => {
  const update = vi.spyOn(writes, "updateCard");
  const cancelled = vi.fn();
  await render(<Editor onCancel={cancelled} />);
  await page.getByRole("button", { name: "Save" }).click();
  await expect.element(page.getByText("Write a hint.")).toBeVisible();
  await userEvent.keyboard("{Escape}");
  expect(cancelled).toHaveBeenCalledOnce();
  expect(update).not.toHaveBeenCalled();
});

test("an existing hint opens ready to change", async () => {
  await render(<Editor hint="A brigade bursting out of the station" />);
  await expect
    .element(page.getByRole("textbox", { name: "Hint" }))
    .toHaveValue("A brigade bursting out of the station");
});

test("nothing is drafted until the learner asks", async () => {
  const draft = vi.spyOn(api, "draftHint");
  await render(<Editor />);
  await expect.element(page.getByRole("button", { name: "Draft a hint" })).toBeVisible();
  expect(draft).not.toHaveBeenCalled();
});

test("Draft a hint puts the AI's hint in the field to edit, and saving it as written keeps it", async () => {
  vi.spyOn(api, "draftHint").mockResolvedValue({ hint: "A fire BRIGAde scrambling out" });
  const update = vi.spyOn(writes, "updateCard").mockImplementation(async (card, patch) => ({
    card: { ...card, hint: patch.hint ?? card.hint },
    queued: false,
  }));
  const saved = vi.fn();
  await render(<Editor onSaved={saved} />);
  await page.getByRole("button", { name: "Draft a hint" }).click();
  const field = page.getByRole("textbox", { name: "Hint" });
  await expect.element(field).toHaveValue("A fire BRIGAde scrambling out");
  await expect.element(page.getByRole("button", { name: "Another draft" })).toBeVisible();
  await page.getByRole("button", { name: "Save" }).click();
  await expect.poll(() => saved.mock.calls.length).toBe(1);
  expect(update.mock.calls[0]?.[1]).toMatchObject({ hint: "A fire BRIGAde scrambling out" });
});

test("an untouched draft can be swapped for another, and an edited one keeps the learner's words", async () => {
  vi.spyOn(api, "draftHint")
    .mockResolvedValueOnce({ hint: "A fire BRIGAde scrambling out" })
    .mockResolvedValueOnce({ hint: "SBRIGA, the brigade is late" });
  await render(<Editor />);
  await page.getByRole("button", { name: "Draft a hint" }).click();
  await page.getByRole("button", { name: "Another draft" }).click();
  const field = page.getByRole("textbox", { name: "Hint" });
  await expect.element(field).toHaveValue("SBRIGA, the brigade is late");
  await userEvent.type(field, "!");
  await expect.element(page.getByRole("button", { name: "Another draft" })).not.toBeInTheDocument();
});

test("a draft that fails or comes back empty says so and leaves the field alone", async () => {
  vi.spyOn(api, "draftHint")
    .mockResolvedValueOnce({ hint: null })
    .mockRejectedValueOnce(new Error("503"));
  await render(<Editor />);
  await page.getByRole("button", { name: "Draft a hint" }).click();
  await expect
    .element(page.getByText("No strong hint for this one. Try again, or write your own."))
    .toBeVisible();
  await page.getByRole("button", { name: "Draft a hint" }).click();
  await expect
    .element(page.getByText("Couldn’t draft a hint. Try again in a moment."))
    .toBeVisible();
  await expect.element(page.getByRole("textbox", { name: "Hint" })).toHaveValue("");
});

test("words typed while a draft is on its way stay, and the late draft gives way", async () => {
  let land: (value: { hint: string | null }) => void = () => undefined;
  vi.spyOn(api, "draftHint").mockReturnValue(new Promise((resolve) => (land = resolve)));
  await render(<Editor />);
  await page.getByRole("button", { name: "Draft a hint" }).click();
  // The button itself says it is drafting; no second line repeats it.
  await expect.element(page.getByRole("button", { name: "Drafting a hint…" })).toBeVisible();
  await expect.element(page.getByText("Drafting a hint…")).not.toBeInTheDocument();
  const field = page.getByRole("textbox", { name: "Hint" });
  await userEvent.type(field, "My own");
  land({ hint: "A fire BRIGAde scrambling out" });
  await expect.element(page.getByRole("button", { name: "Draft a hint" })).not.toBeInTheDocument();
  await expect.element(field).toHaveValue("My own");
});

test("a card the AI cannot draft for offers no button", async () => {
  await render(<Editor meaningLanguage="it" />);
  await expect.element(page.getByRole("textbox", { name: "Hint" })).toBeVisible();
  await expect.element(page.getByRole("button", { name: "Draft a hint" })).not.toBeInTheDocument();
});

test("pressing Draft again while it works sends no second ask", async () => {
  let land: (value: { hint: string | null }) => void = () => undefined;
  const draft = vi
    .spyOn(api, "draftHint")
    .mockReturnValue(new Promise((resolve) => (land = resolve)));
  await render(<Editor />);
  const button = page.getByRole("button", { name: "Draft a hint" });
  await button.click();
  await page.getByRole("button", { name: "Drafting a hint…" }).click({ force: true });
  land({ hint: "A fire BRIGAde scrambling out" });
  await expect
    .element(page.getByRole("textbox", { name: "Hint" }))
    .toHaveValue("A fire BRIGAde scrambling out");
  expect(draft).toHaveBeenCalledOnce();
});
