import { describe, expect, it } from "vitest";
import { markAnswer } from "./answers";
import { realForms, type MarkedItem } from "./sentences";

const mark = (item: Omit<MarkedItem, "id">, typed: string) =>
  markAnswer(typed, item.answers, realForms({ id: "x", ...item })).verdict;

describe("realForms", () => {
  it("knows the course's own close pairs", () => {
    const item = { kind: "dictation", answers: ["Me läheme linna."] } as const;
    expect(mark(item, "Me läheme lina")).toBe("wrong");
    expect(mark(item, "Me laheme linna")).toBe("almost");
    expect(mark({ kind: "translate", answers: ["Ma olen kodus."] }, "Maa olen kodus")).toBe(
      "wrong",
    );
  });

  it("knows what the item lists and shows", () => {
    expect(mark({ kind: "dictation", answers: ["Ma olen tööl."] }, "Ma olen tool")).toBe("almost");
    expect(
      mark({ kind: "dictation", answers: ["Ma olen tööl."], confusable: ["tool"] }, "Ma olen tool"),
    ).toBe("wrong");
    expect(
      mark({ kind: "build", answers: ["Ta on vanna."], words: ["ta", "vana"] }, "Ta on vana"),
    ).toBe("wrong");
    expect(
      mark({ kind: "rewrite", answers: ["Ta on vanna."], from: "Ta on vana." }, "Ta on vana"),
    ).toBe("wrong");
    expect(mark({ kind: "ask", answers: ["Kas vanna?"], reply: "Jah, vana." }, "Kas vana")).toBe(
      "wrong",
    );
  });
});
