import { describe, expect, it } from "vitest";
import type { MarkedItem } from "../sentences";
import { lessonForms } from "./forms";
import { parse } from "./html";
import type { Rendered } from "./lessons";
import { repeatedIds, sentenceProblems, writtenItems } from "./sentences";

const known = {
  verified: {
    ma: "mina",
    elan: "elama",
    tartus: "Tartu",
    elab: "elama",
    akenal: "by hand: not a word; x",
  },
  clipSays: (src: string) => (src === "tartus.mp3" ? "Ma elan Tartus." : undefined),
};
const dictation: MarkedItem = {
  kind: "dictation",
  id: "tartus",
  src: "tartus.mp3",
  answers: ["Ma elan Tartus."],
};
const fix: MarkedItem = {
  kind: "fix",
  id: "tartus",
  wrong: "Ma elan Tartul.",
  answers: ["Ma elan Tartus."],
};
const problems = (item: MarkedItem) => sentenceProblems(item, known);

describe("what is wrong with a written sentence", () => {
  it("finds nothing in a good one", () => {
    expect(problems(dictation)).toEqual([]);
    expect(problems(fix)).toEqual([]);
  });

  it("finds a form nobody checked and one that is no word", () => {
    expect(problems({ ...fix, wrong: "Ma elan siin.", answers: ["Ma elan seal."] })[0]).toContain(
      "“seal” isn't in verified-forms.json",
    );
    expect(problems({ kind: "translate", id: "a", answers: ["Ma elan akenal."] })[0]).toContain(
      "is not a word",
    );
  });

  it("lets the wrong word of a fix be any form at all", () => {
    expect(problems({ ...fix, wrong: "Ma elan Tartull." })).toEqual([]);
  });

  it("finds a clip that says something else, and a dictation with none", () => {
    expect(problems({ ...dictation, answers: ["Ma elan."] })[0]).toContain(
      "says “Ma elan Tartus.”",
    );
    const silent: MarkedItem = { kind: "dictation", id: "a", answers: ["Ma elan."] };
    expect(problems(silent)[0]).toContain("has no clip");
    expect(problems({ kind: "build", id: "a", answers: ["Ma elan."] })).toEqual([]);
  });

  it("finds an answer listed twice and an item that accepts nothing", () => {
    expect(problems({ kind: "build", id: "a", answers: ["Ma elan.", "ma, elan!"] })[0]).toContain(
      "twice",
    );
    expect(problems({ kind: "build", id: "a", answers: [] })[0]).toContain("accepts nothing");
  });

  it("finds a fix with no wrong word, two, or a word too many", () => {
    expect(problems({ ...fix, wrong: "ma elan tartus" })[0]).toContain("exactly one word");
    expect(problems({ ...fix, wrong: "Ta elan Tartul." })[0]).toContain("exactly one word");
    expect(problems({ ...fix, wrong: "Ma ei elan Tartus." })[0]).toContain("exactly one word");
    expect(
      problems({
        ...fix,
        wrong: "Ma elab Tartus.",
        answers: ["Ma elan Tartus.", "Elab elab Tartus."],
      }),
    ).toHaveLength(1);
  });

  it("finds a repeated id, but lets a drill ask the same item again", () => {
    const item = (quiz: string, each: MarkedItem) => ({ quiz, item: each });
    expect(repeatedIds([item("a", dictation), item("b", dictation)])).toEqual([]);
    expect(repeatedIds([item("a", dictation), item("a", dictation)])).toHaveLength(1);
    expect(repeatedIds([item("a", dictation), item("b", fix)])).toHaveLength(1);
  });
});

describe("reading a lesson", () => {
  const parts = [
    { part: "Quiz", props: { id: "write", items: [dictation, fix] } },
    { part: "Quiz", props: { id: "order", items: [{ answers: ["Ma elan."] }] } },
  ];

  it("collects the written items of every quiz and no other", () => {
    expect(writtenItems(parts).map(({ quiz, item }) => `${quiz}/${item.kind}`)).toEqual([
      "write/dictation",
      "write/fix",
    ]);
  });

  it("checks every accepted word, and not the wrong one a fix shows", () => {
    const page = {
      slug: "none",
      tree: parse(
        '<fieldset data-fix=""><button lang="et">Ma</button><button lang="et">Tartul.</button></fieldset><b lang="et">kass</b>',
        "en",
      ),
      recording: { words: [], parts },
    } as unknown as Rendered;
    expect([...lessonForms(page).keys()].sort()).toEqual(["elan", "kass", "ma", "tartus"]);
  });
});
