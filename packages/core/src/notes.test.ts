import { describe, expect, it } from "vitest";
import { type NoteBlock, notesToText, parseNotes } from "./notes";

const text = (value: string) => ({ type: "text", value }) as const;
const br = { type: "break" } as const;
const paragraph = (...children: Extract<NoteBlock, { type: "paragraph" }>["children"]) =>
  ({ type: "paragraph", children }) as const;
/** A source read as one paragraph of its own text, line breaks included. */
const literal = (source: string) =>
  paragraph(
    ...source.split("\n").flatMap((line, i) => (i === 0 ? [text(line)] : [br, text(line)])),
  );

describe("parseNotes", () => {
  it("reads bold and italic", () => {
    expect(parseNotes("**hea** aeg → *head aega*")).toEqual([
      paragraph({ type: "strong", children: [text("hea")] }, text(" aeg → "), {
        type: "emphasis",
        children: [text("head aega")],
      }),
    ]);
    expect(parseNotes("__bold__ and _italic_")).toEqual([
      paragraph({ type: "strong", children: [text("bold")] }, text(" and "), {
        type: "emphasis",
        children: [text("italic")],
      }),
    ]);
  });

  it("keeps a single line break and splits paragraphs on a blank line", () => {
    expect(parseNotes("first line\nsecond line\n\nnext paragraph")).toEqual([
      paragraph(text("first line"), br, text("second line")),
      paragraph(text("next paragraph")),
    ]);
  });

  it("reads bulleted and numbered lists", () => {
    expect(parseNotes("- hea\n- aeg")).toEqual([
      {
        type: "list",
        ordered: false,
        start: 1,
        items: [[paragraph(text("hea"))], [paragraph(text("aeg"))]],
      },
    ]);
    expect(parseNotes("Forms:\n3. head\n4. aega")).toEqual([literal("Forms:\n3. head\n4. aega")]);
    expect(parseNotes("Forms:\n\n3. head\n4. aega")).toMatchObject([
      paragraph(text("Forms:")),
      { type: "list", ordered: true, start: 3, items: [[paragraph(text("head"))], [{}]] },
    ]);
  });

  it("shows HTML as its literal text", () => {
    for (const html of [
      "<script>alert(1)</script>",
      '<img src=x onerror="alert(1)">',
      "a <b>bold</b> word",
    ]) {
      expect(parseNotes(html)).toEqual([paragraph(text(html))]);
    }
  });

  it("shows unsupported syntax as its literal text", () => {
    for (const source of [
      "# heading",
      "> quote",
      "[link](https://example.com)",
      "![picture](https://example.com/a.png)",
      "<https://example.com>",
      "`code`",
      "```\ncode\n```",
      "    indented",
      "---",
      "a &amp; b",
      "Title\n===",
    ]) {
      expect(parseNotes(source)).toEqual([literal(source.trim())]);
    }
  });

  it("returns nothing for an empty note", () => {
    expect(parseNotes("")).toEqual([]);
  });
});

describe("notesToText", () => {
  it("leaves a plain multi-line note as it is", () => {
    expect(notesToText("Reflexive.\nUsed with the genitive.")).toBe(
      "Reflexive.\nUsed with the genitive.",
    );
  });

  it("drops the syntax and keeps the words", () => {
    expect(notesToText("**hea aeg** → *head aega*\n\n- one\n- two")).toBe(
      "hea aeg → head aega\none\ntwo",
    );
  });

  it("keeps characters that are not formatting", () => {
    expect(notesToText("5 * 3 and snake_case_word")).toBe("5 * 3 and snake_case_word");
    expect(notesToText("\\*not italic\\*")).toBe("*not italic*");
  });
});
