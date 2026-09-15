import { describe, expect, it } from "vitest";
import { splitNoteTypes } from "./import-note-types";

const types = (...notes: number[]) => notes.map((n, i) => ({ key: `t${i}`, notes: n }));

describe("splitNoteTypes", () => {
  it("asks about the biggest kinds and folds the rare tail", () => {
    const { asked, rest } = splitNoteTypes(types(3, 1800, 5, 150, 2, 40));
    expect(asked.map((t) => t.notes)).toEqual([1800, 150]);
    expect(rest.map((t) => t.notes)).toEqual([40, 5, 3, 2]);
  });

  it("asks about every kind when the tail would be a single one", () => {
    const { asked, rest } = splitNoteTypes(types(6, 1, 1, 1));
    expect(asked.map((t) => t.notes)).toEqual([6, 1, 1, 1]);
    expect(rest).toEqual([]);
    expect(splitNoteTypes(types(990, 10)).asked).toHaveLength(2);
  });

  it("always asks about at least one kind", () => {
    expect(splitNoteTypes(types(500)).asked).toHaveLength(1);
  });
});
