import { describe, expect, it } from "vitest";
import type { PassageQuestion } from "../questions";
import { nameProblems, questionProblems } from "./questions";

const sentences = ["Ma elan Tartus.", "Mul on kaks venda.", "Nad elavad väikeses linnas."];
const truth = (id: string, answer: boolean, line = 0): PassageQuestion => ({
  id,
  kind: "truefalse",
  ask: id,
  answer,
  line,
});
const short = (answers: string[], line = 0): PassageQuestion => ({
  id: "q",
  kind: "short",
  ask: "?",
  answers,
  line,
});
const options = [
  { id: "a", label: "A" },
  { id: "b", label: "B" },
];
const match = (...answers: string[]): PassageQuestion => ({
  id: "m",
  kind: "match",
  ask: "?",
  options,
  statements: answers.map((answer, i) => ({ id: `s${i}`, label: `${i}`, answer, line: i })),
});

describe("questionProblems", () => {
  it("passes questions the text answers", () => {
    expect(
      questionProblems(
        [
          { id: "p", ask: "?", options, answer: "a", line: 2 },
          truth("t1", true),
          truth("t2", false),
          short(["Tartus", "Tartu"]),
          match("a", "b", "a"),
        ],
        sentences,
      ),
    ).toEqual([]);
  });

  it("finds an answer that is none of the options", () => {
    expect(
      questionProblems([{ id: "p", ask: "?", options, answer: "c", line: 0 }], sentences)[0],
    ).toContain('"c" is none of its options');
    expect(questionProblems([match("a", "c")], sentences)[0]).toContain('statement "s1"');
  });

  it("finds a sentence that isn't there, in any kind", () => {
    expect(questionProblems([truth("t", true, 3)], sentences)[0]).toContain("names sentence 3");
    expect(questionProblems([match("a", "b", "a", "b")], sentences)[0]).toContain("m/s3");
  });

  it("finds statements one answer fits", () => {
    expect(questionProblems([truth("t1", true), truth("t2", true)], sentences)[0]).toContain(
      "all 2 true or false statements are true",
    );
    expect(questionProblems([truth("t1", true)], sentences)).toEqual([]);
    expect(questionProblems([match("a", "a")], sentences)[0]).toContain("the same answer");
  });

  it("finds a short answer the sentence doesn't say whole, or of three words", () => {
    expect(questionProblems([short(["Tartu"])], sentences)[0]).toContain("isn't in the sentence");
    expect(questionProblems([short(["kaks venda"], 1)], sentences)).toEqual([]);
    expect(questionProblems([short(["elavad väikeses linnas"], 2)], sentences)[0]).toContain(
      "not one or two words",
    );
    expect(questionProblems([short([])], sentences)[0]).toContain("accepts no answer");
  });

  it("finds a repeated id", () => {
    expect(questionProblems([truth("t", true), truth("t", false)], sentences)).toEqual([
      'two questions share the id "t"',
    ]);
  });
});

describe("conversations", () => {
  const turns = [
    { voice: "main", text: "Tere!" },
    { voice: "third", text: ["Tere!", "Kuidas läheb?"] },
  ] as const;

  it("need a name for each voice when more than one speaks", () => {
    expect(nameProblems({ turns }, { main: "Jaan" })).toEqual(["third has no name"]);
    expect(nameProblems({ turns: turns.slice(0, 1) })).toEqual([]);
  });
});
