import { describe, expect, it } from "vitest";
import {
  type AnswerPart,
  answerTokens,
  answerWords,
  differing,
  lettersOff,
  formsOf,
  type IsForm,
  markAnswer,
  onlyOrderDiffers,
  otherAnswers,
  sameAnswer,
  singleChange,
  slipBetween,
} from "./answers";

const forms =
  (...list: string[]): IsForm =>
  (word) =>
    list.includes(word);
const verdict = (typed: string, accepted: string | string[], isForm?: IsForm) =>
  markAnswer(typed, [accepted].flat(), isForm).verdict;
const shape = (parts: readonly AnswerPart[]) =>
  parts.map((part) =>
    part.kind === "missing"
      ? `+${part.right}`
      : part.kind === "extra"
        ? `-${part.typed}`
        : part.kind === "same"
          ? part.right
          : `${part.typed}>${part.right}`,
  );

describe("what marking ignores", () => {
  it.each([
    ["ma elan tartus", "capitals and the full stop"],
    ["  Ma   elan\nTartus .  ", "spaces, and a space before the full stop"],
    ["Ma elan Tartus!", "which mark ends it"],
    ["„Ma elan Tartus.“", "Estonian quotes"],
    ["«Ma elan Tartus»", "guillemets"],
    ["Ma elan Tartus…", "an ellipsis"],
    ["Ma, elan Tartus", "a comma"],
    ["Ma elan​ Tartus", "a no-break space and a zero-width one"],
  ])("%j: %s", (typed) => {
    expect(verdict(typed, "Ma elan Tartus.")).toBe("right");
  });

  it("reads letters with marks typed as two characters", () => {
    expect(verdict("sõber", "sõber")).toBe("right");
  });

  it("treats every apostrophe, dash and quote as the same", () => {
    expect(verdict("Bordeaux'sse", "Bordeaux’sse")).toBe("right");
    expect(verdict("Bordeaux´sse", "Bordeaux’sse")).toBe("right");
    expect(verdict("e‑kiri", "e-kiri")).toBe("right");
    expect(verdict("Ma loen - palju", "Ma loen – palju")).toBe("right");
    expect(verdict('Ta ütles "jah"', "Ta ütles „jah“")).toBe("right");
  });

  it("splits words a missed space after a comma joined, and keeps decimals whole", () => {
    expect(verdict("Ei,ma olen arst", "Ei, ma olen arst.")).toBe("right");
    expect(verdict("See maksab 3,50 eurot", "See maksab 3,50 eurot.")).toBe("right");
    expect(verdict("See maksab 350 eurot", "See maksab 3,50 eurot.")).toBe("wrong");
    expect(verdict("Kell on 10.30", "Kell on 10.30.")).toBe("right");
  });

  it("keeps hyphens inside a word", () => {
    expect(verdict("ekiri", "e-kiri")).toBe("wrong");
  });
});

describe("which accepted sentence it is marked against", () => {
  it("takes any of them, and keeps the one matched", () => {
    const marked = markAnswer("eestis elame me", ["Me elame Eestis.", "Eestis elame me."]);
    expect(marked).toMatchObject({ verdict: "right", accepted: "Eestis elame me." });
  });

  it("picks the closest when none matches", () => {
    const marked = markAnswer("meie elama eestis", ["Me elame Eestis.", "Meie elame Eestis."]);
    expect(marked.accepted).toBe("Meie elame Eestis.");
    expect(shape(marked.parts)).toEqual(["Meie", "elama>elame", "Eestis."]);
  });

  it("prefers a sentence it is nearly right for over one fewer letters away", () => {
    const marked = markAnswer("sober koolis opib", ["sõber koolis õpib", "sober koolis opin"]);
    expect(marked).toMatchObject({ verdict: "almost", accepted: "sõber koolis õpib" });
  });

  it("prefers the same words in another order over a sentence with one word fewer", () => {
    const marked = markAnswer("kus elad sa", ["Kus elad?", "Kus sa elad?"]);
    expect(marked).toMatchObject({ verdict: "wrong", accepted: "Kus sa elad?" });
    expect(onlyOrderDiffers(marked)).toBe(true);
  });

  it("takes the first of two equally close", () => {
    expect(markAnswer("Ma", ["Ma loen.", "Ma elan."]).accepted).toBe("Ma loen.");
  });

  it("counts word order", () => {
    expect(verdict("Tartus ma elan", "Ma elan Tartus.")).toBe("wrong");
    expect(verdict("Tartus elan ma", ["Ma elan Tartus.", "Tartus elan ma."])).toBe("right");
  });

  it("marks an empty answer wrong, every word missing", () => {
    const marked = markAnswer(" . ", ["Ma loen."]);
    expect(marked.verdict).toBe("wrong");
    expect(shape(marked.parts)).toEqual(["+Ma", "+loen."]);
    expect(markAnswer("Ma loen", [])).toEqual({ verdict: "wrong", accepted: "", parts: [] });
  });
});

describe("the word by word alignment", () => {
  const parts = (typed: string, right: string) => shape(markAnswer(typed, [right]).parts);

  it("finds a missing word", () => {
    expect(parts("Ma lähen homme", "Ma lähen homme Tartusse.")).toEqual([
      "Ma",
      "lähen",
      "homme",
      "+Tartusse.",
    ]);
    expect(parts("lähen homme Tartusse", "Ma lähen homme Tartusse.")[0]).toBe("+Ma");
  });

  it("finds an extra word", () => {
    expect(parts("Ma ei ole loe", "Ma ei loe.")).toEqual(["Ma", "ei", "-ole", "loe."]);
  });

  it("finds a changed word, with the typed word as written", () => {
    expect(parts("Ma elan Tartul.", "Ma elan Tartus.")).toEqual(["Ma", "elan", "Tartul.>Tartus."]);
  });

  it("shows a moved word as extra in one place and missing in the other", () => {
    expect(parts("Homme ma lähen Tartusse", "Homme lähen ma Tartusse.")).toEqual([
      "Homme",
      "+lähen",
      "ma",
      "-lähen",
      "Tartusse.",
    ]);
  });

  it("tells a sentence with only its order wrong", () => {
    const order = (typed: string) =>
      onlyOrderDiffers(markAnswer(typed, ["Homme lähen ma Tartusse."]));
    expect(order("Homme ma lähen Tartusse")).toBe(true);
    expect(order("homme lähen ma tartusse")).toBe(false);
    expect(order("Homme ma lähen")).toBe(false);
    expect(order("Homme ma lahen Tartusse")).toBe(false);
  });

  it("pairs an altered word with its own place, beside a missing one", () => {
    expect(parts("Ta läks tartu", "Ta läks eile Tartusse.")).toEqual([
      "Ta",
      "läks",
      "+eile",
      "tartu>Tartusse.",
    ]);
  });

  it("says nothing differs in a right answer", () => {
    expect(differing(markAnswer("ma loen", ["Ma loen."]))).toEqual([]);
  });
});

describe("nearly right", () => {
  it.each([
    ["Minu sober on arst", "marks", "a missing mark"],
    ["Minu söber on arst", "marks", "the wrong mark"],
    ["Minu sõbber on arst", "single", "a letter doubled"],
  ])("%j: %s", (typed, slip) => {
    const marked = markAnswer(typed, ["Minu sõber on arst."]);
    expect(marked.verdict).toBe("almost");
    expect(differing(marked)).toMatchObject([{ kind: "slip", slip }]);
  });

  it("names a letter that should be double", () => {
    expect(differing(markAnswer("Ta tötab", ["Ta töötab."]))).toMatchObject([
      { kind: "slip", slip: "double", typed: "tötab", right: "töötab." },
    ]);
  });

  it("allows š and ž without their hooks", () => {
    expect(verdict("sokolaad ja zurnaal", "šokolaad ja žurnaal")).toBe("almost");
  });

  it("allows two such words, not three", () => {
    expect(verdict("opetaja raagib hästi", "Õpetaja räägib hästi.")).toBe("almost");
    expect(verdict("opetaja raagib hasti", "Õpetaja räägib hästi.")).toBe("wrong");
  });

  it("is wrong beside any other mistake", () => {
    expect(verdict("sober koolis", "sõber koolist")).toBe("wrong");
    expect(verdict("Minu sober arst", "Minu sõber on arst.")).toBe("wrong");
    expect(verdict("Minu sober on on arst", "Minu sõber on arst.")).toBe("wrong");
  });

  it("is wrong for a letter lost, added or swapped that isn't a doubling", () => {
    expect(verdict("Ma elane", "Ma elan.")).toBe("wrong");
    expect(verdict("Ma ela", "Ma elan.")).toBe("wrong");
    expect(verdict("Ma elam", "Ma elan.")).toBe("wrong");
  });

  it("is wrong when one word slips twice", () => {
    expect(verdict("sobber", "sõber")).toBe("wrong");
    expect(verdict("saaada", "sada")).toBe("wrong");
  });
});

describe("length and marks that change the meaning", () => {
  it.each([
    ["Me läheme lina", "Me läheme linna.", "lina"],
    ["Mul on saada eurot", "Mul on sada eurot.", "saada"],
    ["Ma lähen kool", "Ma lähen kooli.", "kool"],
    ["See on korv", "See on kõrv.", "korv"],
    ["Kass on uks", "Kass on üks.", "uks"],
  ])("%j for %j is wrong when %s is a form", (typed, accepted, form) => {
    expect(verdict(typed, accepted, forms(form))).toBe("wrong");
  });

  it("says the learner wrote another form, not a misspelling", () => {
    const marked = markAnswer("Me läheme lina", ["Me läheme linna."], forms("lina", "linna"));
    expect(differing(marked)).toEqual([
      { kind: "changed", typed: "lina", right: "linna.", mistaken: "form" },
    ]);
  });

  it("looks the form up without its capital or punctuation", () => {
    expect(verdict("Lina, on ilus", "Linna on ilus", forms("lina"))).toBe("wrong");
  });

  it("marks a word that isn't near a form as another word", () => {
    expect(differing(markAnswer("Ma loen", ["Ma elan."], forms("loen")))).toMatchObject([
      { kind: "changed", mistaken: "word" },
    ]);
  });
});

describe("slipBetween", () => {
  it("tells marks from length, and neither from anything else", () => {
    expect(slipBetween("sober", "sõber")).toBe("marks");
    expect(slipBetween("lina", "linna")).toBe("double");
    expect(slipBetween("linna", "lina")).toBe("single");
    expect(slipBetween("maja", "majja")).toBe("double");
    expect(slipBetween("joe", "jooe")).toBe("double");
    expect(slipBetween("kool", "kooli")).toBeNull();
    expect(slipBetween("saada", "saata")).toBeNull();
    expect(slipBetween("linn", "linnn n")).toBeNull();
    expect(slipBetween("Sõber.", "sõber")).toBeNull();
  });

  it("doubles the first and the last letter too", () => {
    expect(slipBetween("ma", "maa")).toBe("double");
    expect(slipBetween("aa", "a")).toBe("single");
  });
});

describe("the helpers", () => {
  it("lists words and the sentence as written", () => {
    expect(answerWords("Ei, ma – olen «arst».")).toEqual(["ei", "ma", "olen", "arst"]);
    expect(answerTokens("Ei, ma – olen arst.")).toEqual(["Ei,", "ma –", "olen", "arst."]);
  });

  it("compares sentences and lists the other accepted ones", () => {
    expect(sameAnswer("Ma loen.", "ma loen")).toBe(true);
    const accepted = ["Me elame Eestis.", "Meie elame Eestis.", "me elame eestis!"];
    expect(otherAnswers(markAnswer("me elame eestis", accepted), accepted)).toEqual([
      "Meie elame Eestis.",
    ]);
  });

  it("counts the letters a typed word is off by", () => {
    expect(lettersOff(markAnswer("jalk", ["jalg"]))).toBe(1);
    expect(lettersOff(markAnswer("talv", ["jalg"]))).toBe(2);
  });

  it("collects the forms in texts", () => {
    expect([...formsOf(["Ei loe.", "loe"])]).toEqual(["ei", "loe"]);
  });

  it("finds the one word that differs, or nothing", () => {
    expect(singleChange("Ma elan Tallinnal.", "Ma elan Tallinnas.")).toEqual({
      at: 2,
      wrong: "tallinnal",
      right: "tallinnas",
    });
    expect(singleChange("Ma elan.", "Ma elan.")).toBeNull();
    expect(singleChange("Sa elan Tallinnal.", "Ma elan Tallinnas.")).toBeNull();
    expect(singleChange("Ma ei elan siin.", "Ma elan siin.")).toBeNull();
  });
});
