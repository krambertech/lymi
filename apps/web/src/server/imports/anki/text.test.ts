import { describe, expect, it } from "vitest";
import {
  clozeAnswer,
  clozeNumbers,
  furiganaBase,
  furiganaReading,
  hasFurigana,
  isImageOcclusion,
  questionField,
  revealCloze,
} from "./text";

describe("cloze", () => {
  const text = "Io {{c1::sono}} stanco e tu {{c2::sei::essere}} felice, {{c1::sono}} io.";
  it("reveals every deletion", () => {
    expect(revealCloze(text)).toBe("Io sono stanco e tu sei felice, sono io.");
  });
  it("lists the numbers and each number's answers and hint", () => {
    expect(clozeNumbers(text)).toEqual([1, 2]);
    expect(clozeAnswer(text, 1)).toEqual({ answers: ["sono", "sono"], hint: null });
    expect(clozeAnswer(text, 2)).toEqual({ answers: ["sei"], hint: "essere" });
  });
  it("reads nested deletions", () => {
    const nested = "{{c1::big {{c2::red}} house}} today";
    expect(revealCloze(nested)).toBe("big red house today");
    expect(clozeNumbers(nested)).toEqual([1, 2]);
    expect(clozeAnswer(nested, 1).answers).toEqual(["big red house"]);
    expect(clozeAnswer(nested, 2).answers).toEqual(["red"]);
  });
  it("leaves an unclosed deletion as text", () => {
    expect(revealCloze("a {{c1::b")).toBe("a {{c1::b");
  });
});

describe("furigana", () => {
  it("splits a term into what is written and how it is read", () => {
    expect(hasFurigana("漢字[かんじ]")).toBe(true);
    expect(furiganaBase("漢字[かんじ]")).toBe("漢字");
    expect(furiganaReading("漢字[かんじ]")).toBe("かんじ");
    expect(furiganaBase("日本[にほん] 語[ご]を 話[はな]す")).toBe("日本語を話す");
    expect(furiganaReading("日本[にほん] 語[ご]を 話[はな]す")).toBe("にほんごをはなす");
  });
  it("leaves brackets that are not readings alone", () => {
    expect(hasFurigana("cat [informal]")).toBe(false);
    expect(furiganaBase("cat [informal]")).toBe("cat [informal]");
    expect(hasFurigana("猫[sound:neko.mp3]")).toBe(false);
  });
});

describe("questionField", () => {
  const fields = ["Front", "Back", "Picture"];
  it("finds the first field a question shows", () => {
    expect(questionField("{{Front}}", fields)).toBe(0);
    expect(questionField("{{#Picture}}{{Picture}}{{/Picture}}<br>{{back}}", fields)).toBe(2);
    expect(questionField("{{type:Back}}", fields)).toBe(1);
    expect(questionField("{{cloze:Front}}", fields)).toBe(0);
    expect(questionField("{{FrontSide}}", fields)).toBeNull();
  });
  it("recognises image occlusion", () => {
    const template = "{{#Image Occlusion}}{{image-occlusion:Occlusion}}{{/Image Occlusion}}";
    expect(isImageOcclusion(template)).toBe(true);
    expect(questionField(template, ["Occlusion", "Image"])).toBeNull();
  });
});
