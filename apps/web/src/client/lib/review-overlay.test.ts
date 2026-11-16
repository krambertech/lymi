import { expect, test } from "vitest";
import type { Card } from "./api";
import { NO_OVERLAY, reviewOverlay } from "./review-overlay";

const card = { id: "c1" } as Card;

test("a menu row that opens the editor keeps it when the menu reports its own close", () => {
  const menu = reviewOverlay(NO_OVERLAY, { type: "open", overlay: { kind: "menu" } });
  const edit = reviewOverlay(menu, { type: "open", overlay: { kind: "edit", card } });
  expect(reviewOverlay(edit, { type: "close", kind: "menu" })).toEqual({ kind: "edit", card });
});

test("closing the overlay that is open leaves the card with the keys", () => {
  const report = reviewOverlay(NO_OVERLAY, { type: "open", overlay: { kind: "report" } });
  expect(reviewOverlay(report, { type: "close", kind: "report" })).toBe(NO_OVERLAY);
});
