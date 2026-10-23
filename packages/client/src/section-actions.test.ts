import { describe, expect, it } from "vitest";
import { sectionActions } from "./section-actions";

describe("sectionActions", () => {
  it("gives the owner of a waiting section with due cards every action, learning first", () => {
    expect(sectionActions({ status: "locked", due: 3 }, { owner: true, several: true })).toEqual([
      ["start_section", "review"],
      ["add_card", "rename_section", "reorder_sections"],
    ]);
  });

  it("offers a member only what learns the section", () => {
    expect(sectionActions({ status: "locked", due: 0 }, { owner: false, several: true })).toEqual([
      ["start_section"],
    ]);
    expect(sectionActions({ status: "open", due: 0 }, { owner: false, several: true })).toEqual([]);
  });

  it("starts only a locked section and reorders only when there is an order", () => {
    expect(sectionActions({ status: "ready", due: 0 }, { owner: true, several: false })).toEqual([
      ["add_card", "rename_section"],
    ]);
  });
});
