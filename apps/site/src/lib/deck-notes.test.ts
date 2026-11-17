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
    const long = `${"word ".repeat(120)}end`;
    const shown = text(cardNotes(long));
    expect(shown.length).toBeLessThanOrEqual(221);
    expect(shown.endsWith("word…")).toBe(true);
  });

  it("keeps a list to its first four items", () => {
    const [list] = cardNotes("- one\n- two\n- three\n- four\n- five\n- six");
    expect(list?.type === "list" && list.items).toHaveLength(4);
  });
});
