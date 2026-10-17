import { describe, expect, it } from "vitest";
import {
  canSpeakTerm,
  duplicateKey,
  headword,
  kanaReading,
  languageKey,
  normaliseTerm,
  revealedAnswer,
  revealsAnswer,
  SPOKEN_TERM_MAX,
} from "./terms";

describe("normaliseTerm", () => {
  it("trims, collapses whitespace and case-folds", () => {
    expect(normaliseTerm("  Sbrigarsi ")).toBe("sbrigarsi");
    expect(normaliseTerm("in  bocca\tal lupo")).toBe("in bocca al lupo");
  });
  it("keeps accents", () => {
    expect(normaliseTerm("pèsca")).not.toBe(normaliseTerm("pesca"));
  });
  it("treats composed and decomposed accents as one", () => {
    expect(normaliseTerm("café")).toBe(normaliseTerm("café"));
  });
  it("folds non-Latin case", () => {
    expect(normaliseTerm("Їжак")).toBe("їжак");
  });
});

describe("duplicateKey", () => {
  it("compares languages by their primary subtag", () => {
    expect(duplicateKey("ja-JP", "上手")).toBe(duplicateKey("ja", "上手"));
    expect(duplicateKey("PT-br", "pão")).toBe(duplicateKey("pt", "pão"));
    expect(duplicateKey("it", "pesca")).not.toBe(duplicateKey("es", "pesca"));
  });
  it("keeps a card with no language apart from every language", () => {
    expect(languageKey(null)).toBe("");
    expect(duplicateKey(null, "ok")).not.toBe(duplicateKey("en", "ok"));
  });
  it("keeps kana and kanji spellings apart", () => {
    expect(duplicateKey("ja", normaliseTerm("上手"))).not.toBe(
      duplicateKey("ja", normaliseTerm("じょうず")),
    );
  });
});

describe("kanaReading", () => {
  it("takes a Japanese card's kana reading", () => {
    expect(kanaReading({ language: "ja", pronunciation: " じょうず " })).toBe("じょうず");
    expect(kanaReading({ language: "ja-JP", pronunciation: "コーヒー" })).toBe("コーヒー");
  });
  it("refuses anything that is not kana", () => {
    expect(kanaReading({ language: "ja", pronunciation: "joːzɯ" })).toBeNull();
    expect(kanaReading({ language: "ja", pronunciation: "jōzu" })).toBeNull();
    expect(kanaReading({ language: "ja", pronunciation: "上手" })).toBeNull();
    expect(kanaReading({ language: "ja", pronunciation: "" })).toBeNull();
    expect(kanaReading({ language: "ja", pronunciation: null })).toBeNull();
  });
  it("is only for Japanese", () => {
    expect(kanaReading({ language: "zh", pronunciation: "じょうず" })).toBeNull();
    expect(kanaReading({ language: null, pronunciation: "じょうず" })).toBeNull();
  });
});

describe("revealsAnswer", () => {
  const card = { term: "ülekäigurada", meaning: "pedestrian crossing" };
  it("catches the term or the meaning inside a description", () => {
    expect(revealsAnswer(card, "Pedestrian  Crossing sign")).toBe(true);
    expect(revealsAnswer(card, "the word ÜLEKÄIGURADA")).toBe(true);
  });
  it("lets a description that only shows the picture through", () => {
    expect(revealsAnswer(card, "A blue square sign: a figure walking over white stripes")).toBe(
      false,
    );
  });
  it("ignores answers too short to mean anything", () => {
    expect(revealsAnswer({ term: "ja", meaning: null }, "a jar of jam")).toBe(false);
  });
  it("catches a one- or two-character answer in a script where that is a word", () => {
    expect(revealsAnswer({ term: "水", meaning: "water" }, "コップの水")).toBe(true);
    expect(revealsAnswer({ term: "上手", meaning: null }, "上手な絵")).toBe(true);
    expect(revealsAnswer({ term: "ねこ", meaning: null }, "ねこが寝ている")).toBe(true);
    expect(revealsAnswer({ term: "학교", meaning: null }, "학교 건물")).toBe(true);
    expect(revealsAnswer({ term: "水", meaning: "water" }, "A glass on a table")).toBe(false);
  });
  it("names the field it matched, as the card spells it", () => {
    expect(revealedAnswer(card, "a Pedestrian Crossing sign")).toEqual({
      field: "meaning",
      text: "pedestrian crossing",
    });
    expect(revealedAnswer(card, "the word ÜLEKÄIGURADA")).toEqual({
      field: "term",
      text: "ülekäigurada",
    });
  });
});

describe("canSpeakTerm", () => {
  it("speaks a language card's term up to the limit", () => {
    expect(canSpeakTerm({ term: "a".repeat(SPOKEN_TERM_MAX), language: "de" })).toBe(true);
    expect(canSpeakTerm({ term: "a".repeat(SPOKEN_TERM_MAX + 1), language: "de" })).toBe(false);
  });
  it("never speaks a card without a language", () => {
    expect(canSpeakTerm({ term: "Hund", language: null })).toBe(false);
  });
});

describe("headword", () => {
  it("keeps the first of a term's principal parts", () => {
    expect(headword("pikk · pika · pikka")).toBe("pikk");
    expect(headword("einsteigen · stieg ein · ist eingestiegen")).toBe("einsteigen");
  });
  it("leaves a term without the separator as it is", () => {
    expect(headword("to lie (lay, lain)")).toBe("to lie (lay, lain)");
    expect(headword("брать / взять")).toBe("брать / взять");
    expect(headword("a·b")).toBe("a·b");
  });
});
