import { describe, expect, it } from "vitest";
import {
  isTamilReading,
  markKnownTamil,
  readTamilWord,
  sameTamilReading,
  tamilPairs,
  tamilReading,
  tamilSegments,
  tamilTermReading,
} from ".";

describe("readTamilWord", () => {
  it("reads vowel letters, vowel signs and the inherent a", () => {
    expect(readTamilWord("அம்மா")).toBe("ammā");
    expect(readTamilWord("ஈ")).toBe("ī");
    expect(readTamilWord("ஊர்")).toBe("ūr");
    expect(readTamilWord("ஐந்து")).toBe("aindu");
    expect(readTamilWord("ஔவை")).toBe("auvai");
    expect(readTamilWord("கொடு")).toBe("koḍu");
    expect(readTamilWord("கோடு")).toBe("kōḍu");
    expect(readTamilWord("கௌரவம்")).toBe("kauravam");
  });

  it("tells short vowels from long", () => {
    expect(readTamilWord("கல்")).toBe("kal");
    expect(readTamilWord("கால்")).toBe("kāl");
    expect(readTamilWord("வெள்ளை")).toBe("veḷḷai");
    expect(readTamilWord("வேலை")).toBe("vēlai");
  });

  it("ends a consonant at the pulli", () => {
    expect(readTamilWord("நான்")).toBe("nān");
    expect(readTamilWord("மரம்")).toBe("maram");
    expect(readTamilWord("பள்ளி")).toBe("paḷḷi");
  });

  it("keeps a stop voiceless at the start and when doubled", () => {
    expect(readTamilWord("பட்டம்")).toBe("paṭṭam");
    expect(readTamilWord("அக்கா")).toBe("akkā");
    expect(readTamilWord("தப்பு")).toBe("tappu");
    expect(readTamilWord("படித்தேன்")).toBe("paḍittēn");
  });

  it("voices a stop between vowels and after a nasal", () => {
    expect(readTamilWord("பாடல்")).toBe("pāḍal");
    expect(readTamilWord("மகன்")).toBe("magan");
    expect(readTamilWord("பாதம்")).toBe("pādam");
    expect(readTamilWord("தங்கம்")).toBe("taṅgam");
    expect(readTamilWord("தம்பி")).toBe("tambi");
    expect(readTamilWord("வந்து")).toBe("vandu");
    expect(readTamilWord("வண்டி")).toBe("vaṇḍi");
    expect(readTamilWord("போகிறேன்")).toBe("pōgirēn");
  });

  it("voices a stop after r, l and the other sonorants", () => {
    expect(readTamilWord("சார்பு")).toBe("sārbu");
    expect(readTamilWord("பல்கலை")).toBe("palgalai");
  });

  it("reads ச as s, j after ஞ, and ch when doubled or after a stop", () => {
    expect(readTamilWord("சாப்பாடு")).toBe("sāppāḍu");
    expect(readTamilWord("பசி")).toBe("pasi");
    expect(readTamilWord("மஞ்சள்")).toBe("mañjaḷ");
    expect(readTamilWord("பச்சை")).toBe("pacchai");
    expect(readTamilWord("பயிற்சி")).toBe("payirchi");
  });

  it("reads ழ as zh, ள and the retroflexes with a dot below", () => {
    expect(readTamilWord("தமிழ்")).toBe("tamizh");
    expect(readTamilWord("பழம்")).toBe("pazham");
    expect(readTamilWord("வாழை")).toBe("vāzhai");
    expect(readTamilWord("கண்")).toBe("kaṇ");
  });

  it("reads ற as r, ற்ற as tr and ன்ற as ndr", () => {
    expect(readTamilWord("கறி")).toBe("kari");
    expect(readTamilWord("காற்று")).toBe("kātru");
    expect(readTamilWord("ஒன்று")).toBe("ondru");
  });

  it("reads the grantha letters as written", () => {
    expect(readTamilWord("ஜன்னல்")).toBe("jannal");
    expect(readTamilWord("கஷ்டம்")).toBe("kashṭam");
    expect(readTamilWord("ஸ்ரீ")).toBe("srī");
    expect(readTamilWord("ஹோட்டல்")).toBe("hōṭṭal");
    expect(readTamilWord("பக்ஷி")).toBe("pakshi");
    expect(readTamilWord("டாக்டர்")).toBe("ṭākṭar");
  });

  it("reads the aytham as f before ப, z before ஜ and h elsewhere", () => {
    expect(readTamilWord("ஃபேன்")).toBe("fēn");
    expect(readTamilWord("ஃஜூ")).toBe("zū");
    expect(readTamilWord("எஃகு")).toBe("ehku");
  });

  it("reads a vowel sign typed in two parts as one", () => {
    expect(readTamilWord("கொ")).toBe("ko");
    expect(readTamilWord("கௌ")).toBe("kau");
  });

  it("ignores joiners and reads Tamil digits as digits", () => {
    expect(readTamilWord("க்‍ஷ")).toBe("ksha");
    expect(readTamilWord("௧௦")).toBe("10");
  });
});

describe("tamilSegments", () => {
  it("gives each Tamil word its reading and leaves the rest plain", () => {
    expect(tamilSegments("நான் school போறேன்.")).toEqual([
      { text: "நான்", reading: "nān" },
      { text: " school " },
      { text: "போறேன்", reading: "pōrēn" },
      { text: "." },
    ]);
  });

  it("gives no reading to text without a Tamil letter", () => {
    expect(tamilSegments("௧௦ km")).toEqual([{ text: "௧௦ km" }]);
    expect(tamilSegments("")).toEqual([]);
  });

  it("reads a whole text", () => {
    expect(tamilReading("தமிழ் பாடல்")).toBe("tamizh pāḍal");
  });
});

describe("tamilTermReading", () => {
  it("draws the spelling's reading over each word", () => {
    expect(tamilTermReading("தமிழ் பாடல்")).toEqual([
      { text: "தமிழ்", reading: "tamizh" },
      { text: " " },
      { text: "பாடல்", reading: "pāḍal" },
    ]);
  });

  it("draws nothing over a term without a Tamil word", () => {
    expect(tamilTermReading("song")).toBeNull();
  });

  it("draws the card's own reading word for word", () => {
    expect(tamilTermReading("பஸ் நிலையம்", "bas nilaiyam")).toEqual([
      { text: "பஸ்", reading: "bas" },
      { text: " " },
      { text: "நிலையம்", reading: "nilaiyam" },
    ]);
  });

  it("draws the card's own reading over the whole term when the words do not match", () => {
    expect(tamilTermReading("பஸ் நிலையம்", "busstand")).toEqual([
      { text: "பஸ் நிலையம்", reading: "busstand" },
    ]);
  });

  it("ignores a pronunciation that is not a reading", () => {
    const spelled = [{ text: "பாடல்", reading: "pāḍal" }];
    expect(tamilTermReading("பாடல்", "/paːɖal/")).toEqual(spelled);
    expect(tamilTermReading("பாடல்", "பாட்டு")).toEqual(spelled);
  });
});

describe("isTamilReading", () => {
  it("takes Latin letters with or without marks", () => {
    expect(isTamilReading("pāḍal")).toBe(true);
    expect(isTamilReading("paadal")).toBe(true);
    expect(isTamilReading("bas nilaiyam")).toBe(true);
    expect(isTamilReading("Tamizh-Nāḍu")).toBe(true);
  });

  it("refuses IPA, Tamil script, digits and an empty field", () => {
    expect(isTamilReading("/paːɖal/")).toBe(false);
    expect(isTamilReading("paːɖal")).toBe(false);
    expect(isTamilReading("பாடல்")).toBe(false);
    expect(isTamilReading("10 rupees")).toBe(false);
    expect(isTamilReading("")).toBe(false);
    expect(isTamilReading(null)).toBe(false);
  });
});

describe("sameTamilReading", () => {
  it("is true when the pronunciation only repeats the spelling's reading", () => {
    expect(sameTamilReading("பாடல்", "pāḍal")).toBe(true);
    expect(sameTamilReading("பாடல்", "Paaḍal")).toBe(true);
    expect(sameTamilReading("தமிழ் பாடல்", "tamizh-pāḍal")).toBe(true);
  });

  it("is false for a word said against the rule, or a field that is not a reading", () => {
    expect(sameTamilReading("பஸ்", "bas")).toBe(false);
    expect(sameTamilReading("பாடல்", "paadal")).toBe(false);
    expect(sameTamilReading("பாடல்", "/paːɖal/")).toBe(false);
  });
});

describe("Known words", () => {
  it("gives one pair per word, namespaced by the engine", () => {
    expect(tamilPairs("தமிழ் பாடல்")).toEqual(["tamil:தமிழ்", "tamil:பாடல்"]);
    expect(tamilPairs("song")).toEqual([]);
  });

  it("fades a word that matches a Known word as written, and only that word", () => {
    const known = new Set(tamilPairs("வீடு"));
    expect(markKnownTamil(tamilSegments("என் வீடு, வீட்டில்"), known)).toEqual([
      { text: "என்", reading: "en" },
      { text: " " },
      { text: "வீடு", reading: "vīḍu", known: true },
      { text: ", " },
      { text: "வீட்டில்", reading: "vīṭṭil" },
    ]);
  });

  it("leaves the runs alone without Known words", () => {
    const segments = tamilSegments("வீடு");
    expect(markKnownTamil(segments, undefined)).toBe(segments);
  });
});
