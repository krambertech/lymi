import { describe, expect, it } from "vitest";
import { languageKey } from "./languages";
import {
  canPlayPronunciation,
  canSpeakExample,
  canSpeakTerm,
  duplicateKey,
  headword,
  normaliseTerm,
  pronunciationInputKey,
  revealedAnswer,
  revealsAnswer,
  SPOKEN_EXAMPLE_MAX,
  SPOKEN_TERM_MAX,
  sameExample,
  sameReading,
  spokenExample,
  spokenText,
  standsAlone,
  termKey,
} from "./terms";

describe("termKey", () => {
  it("drops Russian stress marks, so за́мок and замок are one term", () => {
    expect(termKey("ru", "За́мок")).toBe("замок");
    expect(termKey("ru-RU", "замо́к")).toBe(termKey("ru", "замок"));
    expect(termKey("ru", "Ёжик")).toBe("ёжик");
  });
  it("drops Ukrainian stress marks the same way, and keeps ї", () => {
    expect(termKey("uk", "Ру́ки")).toBe("руки");
    expect(termKey("uk-UA", "їжа́к")).toBe("їжак");
  });
  it("makes Ukrainian's apostrophes one, and leaves Russian's alone", () => {
    for (const term of ["м’ясо", "м‘ясо", "мʼясо", "м`ясо", "М'я́со"]) {
      expect(termKey("uk", term)).toBe("м'ясо");
    }
    expect(termKey("ru", "Д’Артаньян")).toBe("д’артаньян");
  });
  it("keeps the mark in every other language", () => {
    expect(termKey("lt", "ą́")).toBe("ą́");
    expect(termKey("bg", "за́мок")).not.toBe(termKey("bg", "замок"));
    expect(termKey(null, "café")).toBe("café");
  });
});

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

describe("sameReading", () => {
  it("tells cards apart only when both have a reading and they differ", () => {
    expect(sameReading("じょうず", "うわて")).toBe(false);
    expect(sameReading("じょうず", "じょうず")).toBe(true);
    expect(sameReading(null, "うわて")).toBe(true);
    expect(sameReading("じょうず", null)).toBe(true);
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

describe("canPlayPronunciation", () => {
  it("plays a recording on a card with no language, and speech only where it can be made", () => {
    expect(canPlayPronunciation({ term: "猫", language: null, audioSource: "recorded" })).toBe(
      true,
    );
    expect(canPlayPronunciation({ term: "猫", language: null, audioSource: "generated" })).toBe(
      false,
    );
    expect(canPlayPronunciation({ term: "猫", language: "ja" })).toBe(true);
  });
});

describe("standsAlone", () => {
  it("takes three letters, or one character of a dense script", () => {
    expect(standsAlone("ca")).toBe(false);
    expect(standsAlone("cas")).toBe(true);
    expect(standsAlone("家")).toBe(true);
    expect(standsAlone("ね")).toBe(true);
    expect(standsAlone("물")).toBe(true);
  });
});

describe("spokenText", () => {
  it("says a Japanese card's kana reading, so the card decides how 上手 is read", () => {
    expect(spokenText({ term: "上手", language: "ja", pronunciation: "うわて" })).toBe("うわて");
  });
  it("says a Russian card's marked stress, so за́мок and замо́к are two clips", () => {
    expect(spokenText({ term: "замок", language: "ru", pronunciation: "замо́к" })).toBe("замо́к");
    expect(spokenText({ term: "ежик", language: "ru-RU", pronunciation: "ёжик" })).toBe("ёжик");
    expect(spokenText({ term: "замок", language: "ru", pronunciation: "[ˈzamək]" })).toBe("замок");
    expect(spokenText({ term: "замок", language: "bg", pronunciation: "за́мок" })).toBe("замок");
  });
  it("says the term where there is no reading to say", () => {
    expect(spokenText({ term: "上手", language: "ja", pronunciation: "jōzu" })).toBe("上手");
    expect(spokenText({ term: "学习", language: "zh", pronunciation: "xuéxí" })).toBe("学习");
    expect(spokenText({ term: "casa", language: "it", pronunciation: "ˈkaːza" })).toBe("casa");
  });
});

describe("pronunciationInputKey", () => {
  const card = {
    id: "c1",
    term: "上手",
    language: "ja-JP",
    pronunciation: "じょうず",
    meaning: "skilled",
    audioSource: "generated",
  };
  it("changes with the reading or meaning, even when the visible kanji stays the same", () => {
    expect(pronunciationInputKey(card)).not.toBe(
      pronunciationInputKey({ ...card, pronunciation: "うわて" }),
    );
    expect(pronunciationInputKey(card)).not.toBe(
      pronunciationInputKey({ ...card, meaning: "the upper hand" }),
    );
  });
  it("preserves recordings and non-Japanese replays across meaning edits", () => {
    for (const row of [
      { ...card, audioSource: "recorded" },
      { ...card, language: "et" },
    ]) {
      expect(pronunciationInputKey(row)).toBe(
        pronunciationInputKey({ ...row, meaning: "updated meaning" }),
      );
    }
  });
});

describe("spokenExample", () => {
  it("speaks a Japanese example from its readings, never its brackets", () => {
    expect(spokenExample({ example: "毎朝[まいあさ]パンを食[た]べます。", language: "ja" })).toBe(
      "まいあさパンをたべます。",
    );
  });

  it("speaks a Chinese, Cantonese or Tamil example as written", () => {
    expect(spokenExample({ example: "我[wǒ]去[qù]银行[yínháng]。", language: "zh" })).toBe(
      "我去银行。",
    );
    expect(spokenExample({ example: "我[ngo5]去[heoi3]。", language: "yue" })).toBe("我去。");
    expect(spokenExample({ example: "நான் பாடல் கேட்டேன்.", language: "ta" })).toBe("நான் பாடல் கேட்டேன்.");
  });

  it("keeps a Russian example's stress marks, as the term's speech does", () => {
    expect(spokenExample({ example: "Это мой за́мок.", language: "ru" })).toBe("Это мой за́мок.");
  });

  it("can be said only on a language card with a short enough example", () => {
    expect(canSpeakExample({ example: "Ich esse Brot.", language: "de" })).toBe(true);
    expect(canSpeakExample({ example: "Ich esse Brot.", language: null })).toBe(false);
    expect(canSpeakExample({ example: "  ", language: "de" })).toBe(false);
    expect(canSpeakExample({ example: "a".repeat(SPOKEN_EXAMPLE_MAX + 1), language: "de" })).toBe(
      false,
    );
  });
});

describe("sameExample", () => {
  it("keeps the sentence through reading, stress, spacing and case fixes", () => {
    expect(sameExample("ja", "箸で食べます。", "箸[はし]で 食[た]べます。")).toBe(true);
    expect(sameExample("ru", "Это мой замок.", "Это мой за́мок.")).toBe(true);
    expect(sameExample("de", "ich esse  Brot.", "Ich esse Brot.")).toBe(true);
  });

  it("tells a new sentence, or none, apart", () => {
    expect(sameExample("ja", "箸で食べます。", "箸で食べました。")).toBe(false);
    expect(sameExample("de", "Ich esse Brot.", "")).toBe(false);
    expect(sameExample("de", null, null)).toBe(false);
  });
});
