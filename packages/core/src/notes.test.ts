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

  it("reads underline and strikethrough with nested formatting", () => {
    expect(parseNotes("++**hea** aeg++ → ~~*head aega*~~")).toEqual([
      paragraph(
        {
          type: "underline",
          children: [{ type: "strong", children: [text("hea")] }, text(" aeg")],
        },
        text(" → "),
        { type: "strikethrough", children: [{ type: "emphasis", children: [text("head aega")] }] },
      ),
    ]);
  });

  it("leaves escaped, unmatched and spaced markers literal", () => {
    for (const source of [
      "++unclosed",
      "~~unclosed",
      "++ spaced ++",
      "~~ spaced ~~",
      "a + b ~ c",
    ]) {
      expect(parseNotes(source)).toEqual([literal(source)]);
    }
    expect(notesToText("\\+\\+plain\\+\\+ and \\~\\~plain\\~\\~")).toBe("++plain++ and ~~plain~~");
  });

  it("reads safe links with formatted labels and an optional title", () => {
    expect(parseNotes('[**Dictionary**](https://example.com "Look it up")')).toEqual([
      paragraph({
        type: "link",
        href: "https://example.com",
        title: "Look it up",
        children: [{ type: "strong", children: [text("Dictionary")] }],
      }),
    ]);
    for (const href of ["http://example.com", "mailto:hello@example.com"]) {
      expect(parseNotes(`[label](${href})`)).toEqual([
        paragraph({ type: "link", href, children: [text("label")] }),
      ]);
    }
    expect(parseNotes("<https://example.com>")).toEqual([
      paragraph({
        type: "link",
        href: "https://example.com",
        children: [text("https://example.com")],
      }),
    ]);
  });

  it("leaves unsafe and relative link destinations literal", () => {
    for (const href of [
      "javascript:alert%281%29",
      "JaVaScRiPt:alert%281%29",
      "javascript&#58;alert%281%29",
      "data:text/html,hello",
      "vbscript:msgbox",
      "file:///etc/passwd",
      "//example.com",
      "/settings",
    ]) {
      const source = `[label](${href})`;
      expect(parseNotes(source)).toEqual([literal(source)]);
    }
    expect(parseNotes("<javascript:alert>")).toEqual([literal("<javascript:alert>")]);
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
      "![picture](https://example.com/a.png)",
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

  it("keeps underlined, struck-through and linked words for search and quoting", () => {
    expect(notesToText("++hea aeg++")).toBe("hea aeg");
    expect(notesToText("~~head aega~~")).toBe("head aega");
    expect(notesToText("[Dictionary](https://example.com)")).toBe("Dictionary");
    expect(notesToText("<https://example.com>")).toBe("https://example.com");
  });

  it("keeps characters that are not formatting", () => {
    expect(notesToText("5 * 3 and snake_case_word")).toBe("5 * 3 and snake_case_word");
    expect(notesToText("\\*not italic\\*")).toBe("*not italic*");
  });
});
