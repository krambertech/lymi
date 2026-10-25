import { describe, expect, it } from "vitest";
import {
  acuteStress,
  addsStress,
  cyrillicStress,
  hasStress,
  markedForm,
  missingStress,
  stressSpans,
  stripStress,
  wordStress,
} from ".";

const RU = {
  vowels: "аеёиоуыэюя",
  restores: { ё: "е" },
  marks: "every",
  draw: "mark",
} as const;

const UK = { vowels: "аеєиіїоуюя", marks: "every", draw: "mark" } as const;

const PL = {
  vowels: "aąeęioóuy",
  mark: "\u0300",
  acuteVowels: "aeiuy",
  digraphs: ["ch", "cz", "dz", "dź", "dż", "rz", "sz"],
  marks: "exceptions",
  draw: "syllable",
} as const;

describe("a grave stress mark", () => {
  it("leaves ó, ś and every other Polish letter alone", () => {
    expect(stripStress("żółć ćma źdźbło", PL.mark)).toBe("żółć ćma źdźbło");
    expect(hasStress("żółw", PL.mark)).toBe(false);
    expect(stripStress("mùzyka", PL.mark)).toBe("muzyka");
    expect(markedForm("Ósma", "Ósma", PL)).toBeNull();
    expect(markedForm("matematyka", "matemàtyka", PL)).toBe("matemàtyka");
  });

  it("never finds a Polish word missing its stress, since only exceptions carry one", () => {
    expect(missingStress("Lubię muzykę i matematykę.", PL)).toBe(false);
    expect(wordStress("Słucham mùzyki.", PL).map((word) => word.acutes)).toEqual([0, 1]);
  });

  it("takes an acute over a vowel Polish never writes with one as the mark, and keeps ó", () => {
    expect(acuteStress("múzyka", PL)).toBe("mùzyka");
    expect(acuteStress("ósmy", PL)).toBe("ósmy");
    expect(acuteStress("Ámeryka", PL)).toBe("Àmeryka");
    expect(acuteStress("замóк", RU)).toBe("замóк");
  });
});

describe("stressSpans", () => {
  const underlined = (term: string, pronunciation: string) =>
    stressSpans(term, pronunciation, PL)
      ?.filter((span) => span.stressed)
      .map((span) => span.text);

  it("underlines the stressed syllable's onset and vowel", () => {
    expect(underlined("muzyka", "mùzyka")).toEqual(["mu"]);
    expect(underlined("matematyka", "matemàtyka")).toEqual(["ma"]);
    expect(underlined("byliśmy", "bỳliśmy")).toEqual(["by"]);
    expect(underlined("zrobiłabym", "zrobìłabym")).toEqual(["bi"]);
    expect(underlined("technika", "tèchnika")).toEqual(["te"]);
  });

  it("takes a word's whole opening cluster, a digraph and a softening i", () => {
    expect(underlined("czterysta", "cztèrysta")).toEqual(["czte"]);
    expect(underlined("rzeczpospolita", "rzeczpospòlita")).toEqual(["po"]);
    expect(underlined("gramatyka", "gramàtyka")).toEqual(["ma"]);
    expect(underlined("uniwersytet", "uniwersỳtet")).toEqual(["sy"]);
    expect(underlined("pojechaliśmy", "pojechàliśmy")).toEqual(["cha"]);
    expect(underlined("poszliśmy", "pòszliśmy")).toEqual(["po"]);
    expect(underlined("musielibyśmy", "musièlibyśmy")).toEqual(["sie"]);
  });

  it("keeps the term's own letters and case, and draws nothing without a mark", () => {
    expect(stressSpans("Ameryka", "Amèryka", PL)).toEqual([
      { text: "A", stressed: false },
      { text: "me", stressed: true },
      { text: "ryka", stressed: false },
    ]);
    expect(stressSpans("muzyka", "muzyka", PL)).toBeNull();
    expect(stressSpans("muzyka", "múzyka", PL)).toBeNull();
  });
});

describe("stripStress", () => {
  it("removes U+0301 and keeps every other mark", () => {
    expect(stripStress("за́мок")).toBe("замок");
    expect(stripStress("мо́йка")).toBe("мойка");
    expect(stripStress("ёжик")).toBe("ёжик");
    expect(stripStress("ą́")).toBe("ą");
  });
});

describe("hasStress", () => {
  it("finds a mark in either normal form", () => {
    expect(hasStress("за́мок")).toBe(true);
    expect(hasStress("замок")).toBe(false);
    expect(hasStress("ёжик")).toBe(false);
  });
});

describe("markedForm", () => {
  it("keeps й and ё, which carry marks of their own", () => {
    expect(markedForm("мойка", "мо́йка", RU)).toBe("мо́йка");
    expect(markedForm("мойка", "мо́ика", RU)).toBeNull();
    expect(markedForm("ёлка", "ёлка", RU)).toBeNull();
  });
  it("draws ё in the term's case where the pronunciation restores it", () => {
    expect(markedForm("ЕЖ", "ёж", RU)).toBe("ЁЖ");
  });
  it("counts a hyphenated word's syllables across the hyphen", () => {
    expect(markedForm("что-то", "что́-то", RU)).toBe("что́-то");
    expect(markedForm("из-за", "и́з-за", RU)).toBe("и́з-за");
    expect(markedForm("пол-литра", "по́л-ли́тра", RU)).toBe("по́л-ли́тра");
    expect(markedForm("кто‑то", "кто́‑то", RU)).toBe("кто́‑то");
    // A hyphen between spaces is no part of a word.
    expect(markedForm("дом - сад", "до́м - са́д", RU)).toBeNull();
  });
  it("lets a word take two acutes, as тво́ро́г does", () => {
    expect(markedForm("творог", "тво́ро́г", RU)).toBe("тво́ро́г");
  });
  it("restores nothing where the rules restore nothing", () => {
    expect(markedForm("ежик", "ёжик", UK)).toBeNull();
  });
});

describe("cyrillicStress", () => {
  it("writes an accented Latin look-alike in a Cyrillic word as the vowel and U+0301", () => {
    expect(cyrillicStress("замóк", RU)).toBe("замо́к");
    expect(cyrillicStress("Áист", RU)).toBe("А́ист");
    expect(cyrillicStress("café и замóк", RU)).toBe("café и замо́к");
  });
  it("leaves a letter the language does not write", () => {
    expect(cyrillicStress("кíно", RU)).toBe("кíно");
  });
});

describe("wordStress", () => {
  it("counts each Cyrillic word's syllables and marks, and skips Latin words", () => {
    expect(wordStress("Я ви́жу ёлку и café.", RU)).toEqual([
      { word: "Я", syllables: 1, acutes: 0, dotted: false, acuteOnDotted: false },
      { word: "ви́жу", syllables: 2, acutes: 1, dotted: false, acuteOnDotted: false },
      { word: "ёлку", syllables: 2, acutes: 0, dotted: true, acuteOnDotted: false },
      { word: "и", syllables: 1, acutes: 0, dotted: false, acuteOnDotted: false },
    ]);
    expect(wordStress("ё́лка", RU)[0]?.acuteOnDotted).toBe(true);
    expect(wordStress("что́-то", RU)).toHaveLength(1);
    expect(wordStress("об’є́кт", UK)).toEqual([
      { word: "об’є́кт", syllables: 2, acutes: 1, dotted: false, acuteOnDotted: false },
    ]);
  });
});

describe("missingStress", () => {
  it("finds a word of two or more syllables with neither an acute nor ё", () => {
    expect(missingStress("Я живу́ в Москве́.", RU)).toBe(false);
    expect(missingStress("Я живу в Москве́.", RU)).toBe(true);
    expect(missingStress("Ёлка в лесу́.", RU)).toBe(false);
    expect(missingStress("Я бачу ялинку.", UK)).toBe(true);
    expect(missingStress("OK, да.", RU)).toBe(false);
  });
});

describe("addsStress", () => {
  it("takes marks added to the same text, keeping the marks it had", () => {
    expect(addsStress("Я живу в Москве.", "Я живу́ в Москве́.")).toBe(true);
    expect(addsStress("Я живу́ в Москве.", "Я живу́ в Москве́.")).toBe(true);
    expect(addsStress("Я живу́ в Москве.", "Я живу в Москве́.")).toBe(false);
    expect(addsStress("Я живу в Москве.", "Я живу́ в Москве́!")).toBe(false);
    expect(addsStress("Я живу в Москве.", "Я живу в Москве.")).toBe(false);
  });
});
