import { describe, expect, it } from "vitest";
import { meaningText, plainText, soundFiles, sourceText } from "./anki-connect-text";

// Shaped like Yomitan 26.10's {glossary} for a JMdict entry: one list item per sense, a tag label,
// the sense's glosses, a cross-reference, and the forms table JMdict adds as a last "sense".
const JMDICT = [
  '<div style="text-align: left;" class="yomitan-glossary"><ol>',
  '<li data-dictionary="JMdict"><i>(1, n, JMdict)</i> <span><ul data-sc-content="glossary" lang="en" style="list-style-type: circle;"><li>cat</li><li>feline</li></ul></span></li>',
  '<li data-dictionary="JMdict"><i>(2, n, abbr, JMdict)</i> <span><ul data-sc-content="glossary" lang="en"><li>wheelbarrow</li></ul><ul data-sc-content="references" lang="en"><li>see: <a lang="ja" href="#"><span>猫車</span></a></li></ul></span></li>',
  '<li data-dictionary="JMdict"><i>(forms, JMdict)</i> <ul><li>猫（★）</li><li>ネコ</li></ul></li>',
  "</ol></div>",
].join("");

// Shaped like a Wiktionary dictionary from kaikki-to-yomitan: grammar and etymology in <details>,
// numbered senses, a backlink, and the dictionary's own stylesheet.
const WIKTIONARY = [
  '<div style="text-align: left;" class="yomitan-glossary"><ol>',
  '<li data-dictionary="kty-it-en"><i>(fem, n, kty-it-en)</i> <span><div><div data-sc-content="preamble">',
  '<details data-sc-content="details-entry-Grammar"><summary>Grammar</summary><div>trattoria f (plural trattorie)</div></details>',
  '<details data-sc-content="details-entry-Etymology"><summary>Etymology</summary><div>From trattore.</div></details>',
  '</div></div><ol data-sc-content="glosses"><li><div>small or simple restaurant; bistro</div></li><li><div>factory for silk-processing</div></li></ol>',
  '<div data-sc-content="backlink"><a href="https://en.wiktionary.org/wiki/trattoria#Italian"><span>Wiktionary</span></a></div></span></li>',
  '<style>.yomitan-glossary [data-dictionary="kty-it-en"] summary { font-weight: bold; }</style>',
  "</ol></div>",
].join("");

describe("meaningText", () => {
  it("keeps a JMdict sense's glosses on one line and leaves out labels, references and forms", () => {
    expect(meaningText(JMDICT)).toBe("1. cat; feline\n2. wheelbarrow");
  });

  it("keeps one line per Wiktionary sense and leaves out grammar, etymology, links and styles", () => {
    expect(meaningText(WIKTIONARY)).toBe(
      "1. small or simple restaurant; bistro\n2. factory for silk-processing",
    );
  });

  it("writes a single sense without a number", () => {
    const single =
      '<div class="yomitan-glossary"><ol><li data-dictionary="JMdict"><i>(n, JMdict)</i> <span><ul data-sc-content="glossary"><li>typhoon</li><li>hurricane</li></ul></span></li></ol></div>';
    expect(meaningText(single)).toBe("typhoon; hurricane");
  });

  it("keeps the text of a dictionary in neither shape, without its labels", () => {
    expect(meaningText("<i>(n, Legacy)</i> <span>library</span>")).toBe("library");
    expect(meaningText("to eat")).toBe("to eat");
  });
});

describe("plainText", () => {
  it("turns breaks into lines, decodes entities and drops sound references", () => {
    expect(plainText("毎朝、<b>散歩</b>します。<br>A &amp; B&nbsp;&#x263A;[sound:a.mp3]")).toBe(
      "毎朝、散歩します。\nA & B ☺",
    );
  });

  it("leaves a reference past the last code point as it was written", () => {
    expect(plainText("a &#99999999; b &#xFFFFFFF;")).toBe("a &#99999999; b &#xFFFFFFF;");
  });
});

describe("sourceText", () => {
  it("reads the address from Yomitan's link, or takes plain text as it is", () => {
    expect(sourceText('<a href="https://example.com/a?b=1&amp;c=2">Page</a>')).toBe(
      "https://example.com/a?b=1&c=2",
    );
    expect(sourceText("https://example.com/")).toBe("https://example.com/");
  });
});

describe("soundFiles", () => {
  it("lists the files a field plays", () => {
    expect(soundFiles("[sound:yomitan_audio_1.mp3][sound:b.mp3]")).toEqual([
      "yomitan_audio_1.mp3",
      "b.mp3",
    ]);
  });
});
