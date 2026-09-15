import { describe, expect, it } from "vitest";
import {
  fieldsFromRoles,
  fitFields,
  guessFieldRoles,
  htmlToText,
  IMPORT_LIMITS,
  imageSources,
  importTags,
  soundCount,
} from "./import";

describe("htmlToText", () => {
  it("turns block tags and breaks into lines and drops the rest", () => {
    expect(htmlToText("<div>the <b>dog</b></div><div>il cane</div>")).toBe("the dog\nil cane");
    expect(htmlToText("one<br>two<br/><br />three")).toBe("one\ntwo\n\nthree");
  });
  it("drops styles, scripts, comments and sound references", () => {
    expect(
      htmlToText("<style>.a{color:red}</style><script>alert(1)</script><!-- x -->hi [sound:a.mp3]"),
    ).toBe("hi");
  });
  it("decodes named and numeric entities", () => {
    expect(htmlToText("hello &amp; goodbye&nbsp;&#8212;&#x41;")).toBe("hello & goodbye —A");
    expect(htmlToText("&bogus; &#0;")).toBe("&bogus; &#0;");
  });
  it("collapses spaces and runs of blank lines", () => {
    expect(htmlToText("  a   b \n\n\n\n c  ")).toBe("a b\n\nc");
  });
  it("leaves plain text alone", () => {
    expect(htmlToText("Привіт, 漢字")).toBe("Привіт, 漢字");
  });
});

describe("imageSources and soundCount", () => {
  it("finds every picture in order, however the attribute is quoted", () => {
    expect(imageSources(`<img src="a.png"><IMG alt=x SRC='b&amp;c.jpg'><img src=d.gif>`)).toEqual([
      "a.png",
      "b&c.jpg",
      "d.gif",
    ]);
  });
  it("counts sound references", () => {
    expect(soundCount("[sound:a.mp3] x [sound:b.ogg]")).toBe(2);
    expect(soundCount("no audio")).toBe(0);
  });
});

describe("fitFields", () => {
  it("keeps fields within their limits untouched", () => {
    const fields = { term: "il gatto", meaning: "the cat", notes: "a pet" };
    expect(fitFields(fields)).toEqual({
      fields: { ...fields, pronunciation: undefined, example: undefined },
      shortened: false,
    });
  });
  it("moves a long meaning into the notes and keeps what fits", () => {
    const meaning = "m".repeat(IMPORT_LIMITS.meaning + 10);
    const { fields, shortened } = fitFields({ term: "t", meaning, notes: "own notes" });
    expect(shortened).toBe(true);
    expect([...(fields.meaning ?? "")]).toHaveLength(IMPORT_LIMITS.meaning);
    expect(fields.meaning?.endsWith("…")).toBe(true);
    expect(fields.notes?.startsWith(meaning.slice(0, 100))).toBe(true);
    expect([...(fields.notes ?? "")].length).toBeLessThanOrEqual(IMPORT_LIMITS.notes);
  });
  it("cuts any other long field by characters, not bytes", () => {
    const term = "漢".repeat(IMPORT_LIMITS.term + 1);
    const { fields, shortened } = fitFields({ term });
    expect(shortened).toBe(true);
    expect([...fields.term]).toHaveLength(IMPORT_LIMITS.term);
  });
  it("treats empty fields as absent", () => {
    expect(fitFields({ term: "a", meaning: "", notes: "" }).fields.meaning).toBeUndefined();
  });
});

describe("importTags", () => {
  it("drops bookkeeping tags and duplicates, keeps hierarchy", () => {
    expect(importTags(["animals", "Marked", "leech", "lesson::one", "ANIMALS"])).toEqual({
      tags: ["animals", "lesson::one"],
      shortened: false,
    });
  });
  it("cuts long tags and keeps at most the limit", () => {
    const many = Array.from({ length: 25 }, (_, i) => `tag${i}`);
    expect(importTags(many)).toEqual({ tags: many.slice(0, 20), shortened: true });
    expect(importTags(["x".repeat(50)]).tags[0]).toHaveLength(IMPORT_LIMITS.tag);
  });
});

describe("guessFieldRoles", () => {
  it("reads Anki's stock note types", () => {
    expect(guessFieldRoles(["Front", "Back"])).toEqual(["term", "meaning"]);
    expect(guessFieldRoles(["Front", "Back", "Add Reverse"])).toEqual(["term", "meaning", "skip"]);
    expect(guessFieldRoles(["Text", "Back Extra"])).toEqual(["term", "notes"]);
  });
  it("finds readings, examples and notes by name", () => {
    expect(
      guessFieldRoles(["Expression", "Reading", "Meaning", "Example sentence", "Notes"]),
    ).toEqual(["term", "pronunciation", "meaning", "example", "notes"]);
  });
  it("falls back to the first field as the term and the next as the meaning", () => {
    expect(guessFieldRoles(["Italiano", "Inglese", "Livello"])).toEqual([
      "term",
      "meaning",
      "notes",
    ]);
    expect(guessFieldRoles(["Audio", "Parola", "Significato"])).toEqual([
      "skip",
      "term",
      "meaning",
    ]);
  });
  it("gives each single role to one field", () => {
    expect(guessFieldRoles(["Word", "Term", "Meaning", "Translation"])).toEqual([
      "term",
      "notes",
      "meaning",
      "notes",
    ]);
  });
});

describe("fieldsFromRoles", () => {
  it("takes the first value per role and joins notes", () => {
    expect(
      fieldsFromRoles(
        ["gatto", "", "cat", "pet", "furry"],
        ["term", "meaning", "meaning", "notes", "notes"],
      ),
    ).toEqual({ term: "gatto", meaning: "cat", notes: "pet\n\nfurry" });
  });
  it("ignores skipped fields and fields without a role", () => {
    expect(fieldsFromRoles(["a", "b", "c"], ["term", "skip"])).toEqual({ term: "a" });
  });
});
