import { describe, expect, it } from "vitest";
import { sectionActions } from "./section-actions";

describe("sectionActions", () => {
  it("gives the owner of a waiting section with due cards every action, learning first and archive last", () => {
    expect(
      sectionActions({ status: "locked", due: 3, total: 5 }, { owner: true, several: true }),
    ).toEqual([
      ["start_section", "review"],
      ["add_card", "select_cards", "rename_section", "reorder_sections"],
      ["archive_section"],
    ]);
  });

  it("offers a member what learns the section and selecting its cards", () => {
    expect(
      sectionActions({ status: "locked", due: 0, total: 5 }, { owner: false, several: true }),
    ).toEqual([["start_section"], ["select_cards"]]);
    expect(
      sectionActions({ status: "open", due: 0, total: 5 }, { owner: false, several: true }),
    ).toEqual([["select_cards"]]);
    expect(
      sectionActions({ status: "open", due: 0, total: 0 }, { owner: false, several: true }),
    ).toEqual([]);
  });

  it("starts only a locked section, reorders only when there is an order and selects only cards that exist", () => {
    expect(
      sectionActions({ status: "ready", due: 0, total: 0 }, { owner: true, several: false }),
    ).toEqual([["add_card", "rename_section"], ["archive_section"]]);
  });

  it("offers only Select cards for the cards with no section, whoever owns the deck", () => {
    expect(sectionActions(null, { owner: true, several: true })).toEqual([["select_cards"]]);
    expect(sectionActions(null, { owner: false, several: false })).toEqual([["select_cards"]]);
  });
});
