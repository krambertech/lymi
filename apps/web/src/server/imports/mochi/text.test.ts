import { describe, expect, it } from "vitest";
import { attachments, furigana, markdownToText, questionFields, splitSides } from "./text";
import { decodeTransit } from "./transit";

describe("mochi text", () => {
  it("splits at the first --- line only", () => {
    expect(splitSides("front")).toEqual(["front"]);
    expect(splitSides("a\n---\nb")).toEqual(["a\n", "\nb"]);
    expect(splitSides("a\n--- \nb\n---\nc")).toEqual(["a\n", "\nb\n\nc"]);
    expect(splitSides("a --- b")).toEqual(["a --- b"]);
  });

  it("turns Markdown into plain text with line breaks", () => {
    expect(markdownToText("# Title\n\n**bold** and *it* and _it_ and ~~gone~~")).toBe(
      "Title\n\nbold and it and it and gone",
    );
    expect(markdownToText("see [the site](https://x.y) and [[Card title|abcdefgh]]")).toBe(
      "see the site and Card title",
    );
    expect(markdownToText("word ![](@media/a.png) ![[abcdefgh]]")).toBe("word");
    expect(markdownToText("> quoted\n- item\n`code`")).toBe("quoted\n- item\ncode");
    expect(markdownToText("snake_case_name and 2 * 3 * 4")).toBe("snake_case_name and 2 * 3 * 4");
    expect(markdownToText("{{1::hidden}} and {{shown}}")).toBe("hidden and shown");
    expect(markdownToText("a<br>b &amp; c")).toBe("a\nb & c");
  });

  it("reads furigana only as kana in brackets after kanji", () => {
    expect(furigana("参加(さんか)する")).toEqual({ base: "参加する", reading: "さんかする" });
    expect(furigana("teilnehmen (formal)")).toBeNull();
    expect(furigana("猫")).toBeNull();
  });

  it("finds attachments and the fields a template's first side shows", () => {
    expect(attachments("![x](@media/a%20b.png) [s](@media/s.mp3)")).toEqual(["a b.png", "s.mp3"]);
    expect(
      questionFields("# << Word >>\n<< #flag >><< Audio >><</ flag >>\n---\n<< Meaning >>"),
    ).toEqual(["Word", "Audio"]);
  });
});

describe("transit", () => {
  it("reads the verbose form Mochi writes", () => {
    expect(
      decodeTransit(
        {
          "~:version": 2,
          "~:tags": { "~#set": ["a"] },
          "~:date": "~t1767240000000",
          "~:created": { "~#dt": 1767240000000 },
          "~:id": "~:abcdefgh",
          "~:text": "~~tilde",
          "~:component-cache": { "~:ai": "unread" },
        },
        new Set(["component-cache"]),
      ),
    ).toEqual({
      version: 2,
      tags: ["a"],
      date: 1767240000000,
      created: 1767240000000,
      id: "abcdefgh",
      text: "~tilde",
    });
  });

  it("reads the compact form with cached keys", () => {
    const compact = [
      "^ ",
      "~:decks",
      [
        ["^ ", "~:name", "One", "~:parent-id", null],
        ["^ ", "^1", "Two", "^2", "~:first"],
      ],
    ];
    expect(decodeTransit(compact)).toEqual({
      decks: [
        { name: "One", "parent-id": null },
        { name: "Two", "parent-id": "first" },
      ],
    });
  });
});
