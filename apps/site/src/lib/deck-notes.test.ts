import { describe, expect, it } from "vitest";
import { cardNotes } from "./deck-notes";

const text = (blocks: ReturnType<typeof cardNotes>): string =>
  JSON.stringify(blocks)
    .match(/"value":"([^"]*)"/g)
    ?.map((v) => v.slice(9, -1))
    .join(" ") ?? "";

describe("cardNotes", () => {
  it("keeps a short note whole", () => {
    const blocks = cardNotes("Gender: masculine\n\nFor a woman: *sprzedawczyni*");
    expect(blocks).toHaveLength(2);
    expect(text(blocks)).toContain("sprzedawczyni");
    expect(text(blocks)).not.toContain("…");
  });

  it("cuts one long paragraph at a word and says there is more", () => {
    const long = `${"word ".repeat(300)}end`;
    const shown = text(cardNotes(long));
    expect(shown.length).toBeLessThanOrEqual(601);
    expect(shown.endsWith("word…")).toBe(true);
  });

  it("keeps a list to its first eight items and marks the cut", () => {
    const [list] = cardNotes(Array.from({ length: 10 }, (_, i) => `- item ${i + 1}`).join("\n"));
    if (list?.type !== "list") throw new Error("Expected a list");
    expect(list.items).toHaveLength(9);
    expect(text([list]).endsWith("item 8 …")).toBe(true);
  });

  it("marks blocks left out after the budget", () => {
    const blocks = cardNotes(`${"word ".repeat(115)}end.\n\nA second paragraph.`);
    expect(text(blocks).endsWith("…")).toBe(true);
    expect(text(blocks)).not.toContain("second");
  });

  it("adds nothing to a note that fits", () => {
    expect(text(cardNotes("- one\n- two"))).not.toContain("…");
  });
});
