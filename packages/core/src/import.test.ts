import { describe, expect, it } from "vitest";
import {
  boldStress,
  clozeRecordings,
  fieldsFromRoles,
  fitFields,
  guessFieldRoles,
  htmlToText,
  IMPORT_LIMITS,
  imageSources,
  importFieldText,
  importTags,
  noteRecordings,
  pitchNotation,
  soundCount,
  soundSources,
} from "./import";

/** A mora as Yomitan writes pitch accent for Anki: the kana, then an empty span drawing its line. */
const mora = (kana: string, line: "high" | "low" | "drop") =>
  `<span style="display:inline-block;position:relative;"><span style="display:inline;">${kana}</span>${
    line === "low"
      ? ""
      : `<span style="display:block;position:absolute;top:0.1em;left:0;right:0;height:0;border-top-width:0.1em;border-top-style:solid;${
          line === "drop" ? "border-right-width:0.1em;border-right-style:solid;" : ""
        }"></span>`
  }</span>`;

describe("boldStress", () => {
  it("writes a bold or underlined vowel inside a Cyrillic word with U+0301", () => {
    expect(boldStress("з<b>а</b>мок")).toBe("за\u0301мок");
    expect(boldStress("зам<u>о</u>к, м<strong>у</strong>ка")).toBe("замо\u0301к, му\u0301ка");
    expect(htmlToText(boldStress("<div>рук<B>а</B> и з<b>а</b>мок</div>"))).toBe(
      "рука\u0301 и за\u0301мок",
    );
  });
  it("leaves a tag around anything but one vowel in a word", () => {
    expect(boldStress("<b>а</b> не <b>о</b>")).toBe("<b>а</b> не <b>о</b>");
    expect(boldStress("the c<b>a</b>t")).toBe("the c<b>a</b>t");
    expect(boldStress("<b>замок</b>")).toBe("<b>замок</b>");
  });
});

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
  it("reads Lapis, whose field names run together", () => {
    const lapis = {
      Expression: "term",
      ExpressionFurigana: "skip",
      ExpressionReading: "pronunciation",
      ExpressionAudio: "skip",
      SelectionText: "notes",
      MainDefinition: "meaning",
      DefinitionPicture: "skip",
      Sentence: "example",
      SentenceFurigana: "skip",
      SentenceAudio: "skip",
      Picture: "skip",
      Glossary: "notes",
      Hint: "notes",
      IsWordAndSentenceCard: "skip",
      IsClickCard: "skip",
      IsSentenceCard: "skip",
      IsAudioCard: "skip",
      PitchPosition: "notes",
      PitchCategories: "skip",
      Frequency: "skip",
      FreqSort: "skip",
      MiscInfo: "notes",
    };
    expect(guessFieldRoles(Object.keys(lapis))).toEqual(Object.values(lapis));
  });
  it("reads spaced names by their last word", () => {
    expect(
      guessFieldRoles([
        "Word",
        "Word Reading",
        "Word Meaning",
        "Word Furigana",
        "Word Audio",
        "Sentence",
        "Sentence Meaning",
        "Pitch Accent",
        "word_audio",
      ]),
    ).toEqual([
      "term",
      "pronunciation",
      "meaning",
      "skip",
      "skip",
      "example",
      "exampleTranslation",
      "notes",
      "skip",
    ]);
  });
  it("reads Kaishi 1.5k: the translation is the example's, one pitch line goes to notes, frequency is left out", () => {
    const kaishi = {
      Word: "term",
      "Word Reading": "pronunciation",
      "Word Meaning": "meaning",
      "Word Furigana": "skip",
      "Word Audio": "skip",
      Sentence: "example",
      "Sentence Meaning": "exampleTranslation",
      "Sentence Furigana": "skip",
      "Sentence Audio": "skip",
      Notes: "notes",
      "Pitch Accent": "notes",
      "Pitch Accent Notes": "notes",
      Frequency: "skip",
      Picture: "skip",
    };
    expect(guessFieldRoles(Object.keys(kaishi))).toEqual(Object.values(kaishi));
  });
  it("keeps a sentence translation listed before the meaning out of the meaning", () => {
    expect(guessFieldRoles(["Expression", "Sentence-English", "Meaning", "Rank"])).toEqual([
      "term",
      "exampleTranslation",
      "meaning",
      "skip",
    ]);
  });
  it("reads Chinese decks' script names, keeping the simplified term and its sentence", () => {
    const both = {
      WordTraditional: "notes",
      WordSimplified: "term",
      Definition: "meaning",
      SentenceTraditional: "notes",
      SentenceSimplified: "example",
      SentencePinyin: "notes",
      SentenceZhuyin: "notes",
      SentenceTranslation: "exampleTranslation",
      WordAudio: "skip",
    };
    expect(guessFieldRoles(Object.keys(both))).toEqual(Object.values(both));
    expect(guessFieldRoles(["Traditional", "Hanzi", "Pinyin", "English"])).toEqual([
      "notes",
      "term",
      "pronunciation",
      "meaning",
    ]);
    // A deck written only in traditional characters keeps them as its term, and its sentence.
    expect(guessFieldRoles(["Traditional", "Pinyin", "English"])).toEqual([
      "term",
      "pronunciation",
      "meaning",
    ]);
    expect(
      guessFieldRoles(["Traditional", "Pinyin", "Sentence Traditional", "Sentence Simplified"]),
    ).toEqual(["term", "pronunciation", "example", "notes"]);
  });
  it("reads script names only in a Chinese note type, since Trad is also a translation", () => {
    for (const names of [
      ["Mot", "Trad"],
      ["Word", "Trad"],
      ["Parola", "Trad."],
      ["Name", "Character"],
    ]) {
      expect(guessFieldRoles(names)).toEqual(["term", "meaning"]);
    }
    expect(guessFieldRoles(["Simp", "Trad", "Pinyin", "English"])).toEqual([
      "term",
      "notes",
      "pronunciation",
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
    ).toEqual({ term: "gatto", meaning: "cat", notes: "pet\nfurry" });
  });
  it("ignores skipped fields and fields without a role", () => {
    expect(fieldsFromRoles(["a", "b", "c"], ["term", "skip"])).toEqual({ term: "a" });
  });
});

describe("noteRecordings", () => {
  const names = ["Word", "Word Meaning", "Word Audio", "Sentence", "Sentence Audio"];
  const roles = guessFieldRoles(names);

  it("takes the term's clip and the sentence's, each for its own field", () => {
    expect(noteRecordings(names, roles, [[], [], ["word.mp3"], [], ["sentence.mp3"]])).toEqual({
      recording: "word.mp3",
      exampleRecording: "sentence.mp3",
      leftOut: 0,
    });
  });
  it("falls back to a clip in the term field, and gives the example field's clip to the example", () => {
    expect(
      noteRecordings(
        ["Front", "Back", "Example"],
        ["term", "meaning", "example"],
        [["hund.mp3"], [], ["satz.mp3"]],
      ),
    ).toEqual({ recording: "hund.mp3", exampleRecording: "satz.mp3", leftOut: 0 });
    expect(
      noteRecordings(
        ["Front", "Back", "Example"],
        ["term", "meaning", "example"],
        [[], [], ["satz.mp3"]],
      ),
    ).toEqual({ recording: undefined, exampleRecording: "satz.mp3", leftOut: 0 });
  });
  it("follows the field the learner chose as the example", () => {
    expect(
      noteRecordings(
        ["Front", "Back", "Extra"],
        ["term", "meaning", "skip"],
        [[], [], ["satz.mp3"]],
      ),
    ).toEqual({ recording: undefined, exampleRecording: undefined, leftOut: 1 });
    expect(
      noteRecordings(
        ["Front", "Back", "Extra"],
        ["term", "meaning", "example"],
        [[], [], ["satz.mp3"]],
      ),
    ).toEqual({ recording: undefined, exampleRecording: "satz.mp3", leftOut: 0 });
  });
  it("gives a cloze's sentence clip to the example and leaves any other out", () => {
    expect(
      clozeRecordings(
        ["Text", "Back Extra", "Word Audio", "Sentence Audio"],
        [[], ["extra.mp3"], ["word.mp3"], ["sentence.mp3"]],
        0,
      ),
    ).toEqual({ recording: undefined, exampleRecording: "sentence.mp3", leftOut: 2 });
    expect(clozeRecordings(["Text", "Word Audio"], [[], ["word.mp3"]], 0)).toEqual({
      recording: undefined,
      exampleRecording: undefined,
      leftOut: 1,
    });
    expect(clozeRecordings(["Text", "Back Extra"], [[], ["word.mp3"]], 0)).toEqual({
      recording: undefined,
      exampleRecording: undefined,
      leftOut: 1,
    });
    expect(clozeRecordings(["Text", "Back Extra"], [["satz.mp3"], []], 0)).toEqual({
      recording: undefined,
      exampleRecording: "satz.mp3",
      leftOut: 0,
    });
  });
  it("keeps one clip each and ignores Lymi's own speech", () => {
    expect(
      noteRecordings(names, roles, [[], [], ["a.mp3", "b.mp3"], [], ["c.mp3", "d.mp3"]]),
    ).toEqual({ recording: "a.mp3", exampleRecording: "c.mp3", leftOut: 2 });
    expect(
      noteRecordings(["Term", "Sound"], ["term", "skip"], [[], ["lymi-card1-speech.mp3"]]),
    ).toEqual({ recording: undefined, exampleRecording: undefined, leftOut: 0 });
  });
  it("reads every sound reference in a field", () => {
    expect(soundSources("[sound:a b.mp3] text [sound:R&amp;B.mp3]")).toEqual([
      "a b.mp3",
      "R&B.mp3",
    ]);
  });
});

describe("pitchNotation", () => {
  it("marks the downstep and position from Yomitan's lines", () => {
    // 箸 はし is atamadaka: high, then low.
    expect(pitchNotation(`<ol><li>${mora("は", "drop")}${mora("し", "low")}</li></ol>`)).toBe(
      "はꜜし [1]",
    );
    // 桜 さくら is heiban: low, then high with no fall.
    expect(pitchNotation(mora("さ", "low") + mora("く", "high") + mora("ら", "high"))).toBe(
      "さくら [0]",
    );
  });
  it("counts morae, so a small kana joins the one before it", () => {
    // 京都 きょうと is atamadaka, and きょ is one mora.
    expect(pitchNotation(mora("きょ", "drop") + mora("う", "low") + mora("と", "low"))).toBe(
      "きょꜜうと [1]",
    );
  });
  it("reads an overline run and keeps each pronunciation", () => {
    expect(
      pitchNotation(
        '<ol><li><span style="text-decoration:overline">は</span>し</li><li>は<span style="text-decoration: overline">し</span></li></ol>',
      ),
    ).toBe("はꜜし [1] · はし [0]");
  });
  it("reads bare positions and drops graphs", () => {
    expect(pitchNotation("0")).toBe("[0]");
    expect(pitchNotation("<ol><li>1</li><li>3</li></ol>")).toBe("[1] · [3]");
    expect(pitchNotation('<svg viewBox="0 0 10 10"><path d="M0 0"/></svg>')).toBe("");
    expect(pitchNotation('<img src="pitch.png">')).toBe("");
  });
});

describe("importFieldText", () => {
  it("leaves ruby annotations out of the text they annotate", () => {
    expect(
      importFieldText(
        "Ruby",
        "<ruby>你<rt>nǐ</rt></ruby><ruby>好<rp>(</rp><rt>hǎo</rt><rp>)</rp></ruby>",
      ),
    ).toBe("你好");
  });
  it("reads a translation as one line and a pitch field as its notation", () => {
    expect(importFieldText("Sentence Meaning", "I eat<br>with chopsticks.")).toBe(
      "I eat with chopsticks.",
    );
    expect(importFieldText("Pitch Accent", "[1]")).toBe("[1]");
    expect(importFieldText("Notes", "one<br>two")).toBe("one\ntwo");
  });
});
