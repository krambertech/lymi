import { isolate } from "@lymi/core";
import { afterEach, describe, expect, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { ExampleText, TermText } from "./term-text";
import { Input } from "./ui/input";
import { Toaster, toast } from "./ui/toast";

/** Where a run of a text node is drawn, found by its first occurrence inside `root`. */
function boxOf(root: Element, text: string): DOMRect {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const at = node.textContent?.indexOf(text) ?? -1;
    if (at < 0) continue;
    const range = document.createRange();
    range.setStart(node, at);
    range.setEnd(node, at + text.length);
    return range.getBoundingClientRect();
  }
  throw new Error(`“${text}” is not drawn`);
}

const container = () => document.querySelector("[data-testid=line]") as HTMLElement;

afterEach(() => toast.close());

describe("right-to-left terms", () => {
  test("an Arabic term holding a Latin word and digits reads right to left inside an English line", async () => {
    await render(
      <p data-testid="line">
        Archived <TermText card={{ term: "كتاب PDF 2024", language: "ar" }} /> today
      </p>,
    );
    const term = container().querySelector("span[lang=ar]") as HTMLElement;
    expect(getComputedStyle(term).direction).toBe("rtl");
    const arabic = boxOf(term, "كتاب");
    const latin = boxOf(term, "PDF");
    const digits = boxOf(term, "2024");
    // Read from the right: the Arabic word first, then the Latin word and the year as one left-to-right run.
    expect(arabic.left).toBeGreaterThanOrEqual(digits.right);
    expect(latin.right).toBeLessThanOrEqual(digits.left);
    // The English words keep their sides of it.
    expect(boxOf(container(), "Archived").right).toBeLessThanOrEqual(latin.left);
    expect(boxOf(container(), "today").left).toBeGreaterThanOrEqual(arabic.right);
  });

  test("an example takes its language's direction, and a Japanese term stays left to right", async () => {
    await render(
      <p data-testid="line">
        <ExampleText text="قرأتُ كتاب 3 مرات" lang="ar" />{" "}
        <TermText card={{ term: "猫", language: "ja" }} />
      </p>,
    );
    const example = container().querySelector("span[lang=ar]") as HTMLElement;
    expect(getComputedStyle(example).direction).toBe("rtl");
    expect(boxOf(example, "قرأتُ").left).toBeGreaterThan(boxOf(example, "مرات").right);
    const japanese = container().querySelector("span[lang=ja]") as HTMLElement;
    expect(japanese.matches(":dir(ltr)")).toBe(true);
  });

  test("a toast keeps an isolated term in its own order", async () => {
    await render(<Toaster aria-label="Notifications" closeLabel="Dismiss" timeout={0} />);
    // As routes/review.tsx titles an archive.
    toast.add({ title: `Archived “${isolate("كتاب PDF")}”` });
    const title = page.getByRole("region", { name: "Notifications" }).getByText(/Archived/);
    await expect.element(title).toBeVisible();
    const el = title.element();
    // WebKit ignores the isolate characters, so the toast draws the run in <bdi>.
    expect(el.querySelector("bdi")?.textContent).toBe("كتاب PDF");
    // Unisolated, the Latin word would follow the Arabic one rightwards, as in an English sentence.
    expect(boxOf(el, "كتاب").left).toBeGreaterThanOrEqual(boxOf(el, "PDF").right);
    expect(boxOf(el, "Archived").right).toBeLessThan(boxOf(el, "PDF").left);
  });

  test("a field turns right to left as Arabic is typed", async () => {
    await render(<Input aria-label="Term" placeholder="A word or phrase" />);
    const field = page.getByRole("textbox", { name: "Term" });
    const input = field.element() as HTMLInputElement;
    expect(input.matches(":dir(ltr)")).toBe(true);
    await userEvent.type(field, "كتاب");
    await expect.poll(() => input.matches(":dir(rtl)")).toBe(true);
  });
});
