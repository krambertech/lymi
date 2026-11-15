import { expect, test } from "vitest";
import { sheetPhase } from "./sheet-phase";

test("a dismissal waits for the save, and the save's own close goes through", () => {
  const saving = sheetPhase({ status: "editing" }, { type: "save" });
  expect(sheetPhase(saving, { type: "close" })).toBe(saving);
  expect(sheetPhase(saving, { type: "close", saved: true })).toEqual({ status: "closed" });
});

test("an answer after the sheet closed changes nothing", () => {
  const closed = { status: "closed" } as const;
  expect(sheetPhase(closed, { type: "settle" })).toBe(closed);
  expect(sheetPhase(closed, { type: "save" })).toBe(closed);
});
