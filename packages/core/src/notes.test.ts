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

describe("parseNotes with notation", () => {
  const notation = (source: string) => parseNotes(source, { notation: true });
  const math = (tex: string, source: string) => ({ type: "math", tex, source }) as const;
  const code = (value: string, source: string) => ({ type: "code", value, source }) as const;

  it("reads nothing new unless asked", () => {
    expect(parseNotes("$a*b$ and $c*d$")).toEqual([
      paragraph(text("$a"), { type: "emphasis", children: [text("b$ and $c")] }, text("d$")),
    ]);
    expect(parseNotes("`map()`")).toEqual([literal("`map()`")]);
  });

  it("reads inline math, chemistry and code inside formatting and links", () => {
    expect(notation("**$E = mc^2$** and \\(\\ce{H2O}\\) via `map()`")).toEqual([
      paragraph(
        { type: "strong", children: [math("E = mc^2", "$E = mc^2$")] },
        text(" and "),
        math("\\ce{H2O}", "\\(\\ce{H2O}\\)"),
        text(" via "),
        code("map()", "`map()`"),
      ),
    ]);
    expect(notation("[$x$ in `js`](https://example.com)")).toEqual([
      paragraph({
        type: "link",
        href: "https://example.com",
        children: [math("x", "$x$"), text(" in "), code("js", "`js`")],
      }),
    ]);
  });

  it("keeps Markdown out of math and code", () => {
    expect(notation("$a*b$ and $c*d$")).toEqual([
      paragraph(math("a*b", "$a*b$"), text(" and "), math("c*d", "$c*d$")),
    ]);
    expect(notation("$\\{x\\}$ and `**not bold**`")).toEqual([
      paragraph(
        math("\\{x\\}", "$\\{x\\}$"),
        text(" and "),
        code("**not bold**", "`**not bold**`"),
      ),
    ]);
  });

  it("follows Pandoc's rule for a single dollar and keeps \\$ literal", () => {
    for (const source of ["$5 and $10", "$HOME and $PATH", "$x$5", "$ x$"]) {
      expect(notation(source)).toEqual([literal(source)]);
    }
    expect(notation("\\$5 and \\$x\\$")).toEqual([paragraph(text("$5 and $x$"))]);
  });

  it("reads display math on lines of its own", () => {
    const displayMath = (tex: string, source: string) => ({ type: "displayMath", tex, source });
    expect(notation("$$E = mc^2$$")).toEqual([displayMath("E = mc^2", "$$E = mc^2$$")]);
    expect(notation("Energy:\n$$\n\\int_0^1 x\\,dx\n= \\frac{1}{2}\n$$\nso half.")).toEqual([
      paragraph(text("Energy:")),
      displayMath("\\int_0^1 x\\,dx\n= \\frac{1}{2}", "$$\n\\int_0^1 x\\,dx\n= \\frac{1}{2}\n$$"),
      paragraph(text("so half.")),
    ]);
    expect(notation("\\[a^2 + b^2 = c^2\\]")).toEqual([
      displayMath("a^2 + b^2 = c^2", "\\[a^2 + b^2 = c^2\\]"),
    ]);
    expect(notation("- step\n\n  $$x = 1$$")).toEqual([
      {
        type: "list",
        ordered: false,
        start: 1,
        items: [[paragraph(text("step")), displayMath("x = 1", "$$x = 1$$")]],
      },
    ]);
  });

  it("reads fenced code blocks with an optional language", () => {
    expect(notation("Try:\n```js\nconst a = [1, 2];\n\na.map((x) => x * 2);\n```")).toEqual([
      paragraph(text("Try:")),
      {
        type: "codeBlock",
        value: "const a = [1, 2];\n\na.map((x) => x * 2);",
        language: "js",
        source: "```js\nconst a = [1, 2];\n\na.map((x) => x * 2);\n```",
      },
    ]);
    expect(notation("~~~~\n**not bold**\n~~~\n~~~~")).toEqual([
      { type: "codeBlock", value: "**not bold**\n~~~", source: "~~~~\n**not bold**\n~~~\n~~~~" },
    ]);
  });

  it("keeps malformed notation as the text that was typed", () => {
    for (const source of [
      "$x",
      "`map",
      "$$x",
      "$$ $$",
      "$$x$$ and more",
      "a $$x$$ b",
      "``map()``",
      "```js\nunclosed",
      "~~~\nunclosed ```",
    ]) {
      expect(notation(source)).toEqual([literal(source)]);
    }
    expect(notation("$$\nx\n\ny\n$$")).toEqual([literal("$$\nx"), literal("y\n$$")]);
    // An unclosed opener is an ordinary Markdown escape, as before.
    expect(notation("\\(x")).toEqual([paragraph(text("(x"))]);
    expect(notation("\\[x")).toEqual([paragraph(text("[x"))]);
  });
});

describe("notesToText with notation nodes", () => {
  it("keeps the source of math and code", () => {
    expect(notesToText("**$x^2$** and `map()`")).toBe("$x^2$ and `map()`");
  });
});
