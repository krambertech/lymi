import type { Card } from "@lymi/client/api";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({ I18nManager: { isRTL: false }, Platform: { OS: "ios" } }));

const { peekHeight } = await import("./peek-height");

const WIDTH = 361;
const card = (meaning: string, patch: Partial<Card> = {}) =>
  ({
    term: "sbrigare",
    meaning,
    example: null,
    pronunciation: null,
    language: "it",
    ...patch,
  }) as unknown as Card;

/** The peek with an empty meaning: what the text leaves for one line, the shortest it counts. */
const frame = (scale: number, line: number) => peekHeight(card(""), WIDTH, scale) - line;

describe("peekHeight", () => {
  it("holds three lines of a long meaning at text-xl's own size and line height", () => {
    const long = "m".repeat(70);
    expect(peekHeight(card(long), WIDTH, 1)).toBeCloseTo(frame(1, 28.6) + 3 * 28.6, 0);
  });

  it("wraps at the drawn size, so a meaning that needs three lines counts three", () => {
    // 55 letters fit two lines at 20 pt and need three at 22.
    const meaning = "m".repeat(55);
    expect(peekHeight(card(meaning), WIDTH, 1)).toBeCloseTo(frame(1, 28.6) + 3 * 28.6, 0);
  });

  it("follows the title 2 ramp at a large text size", () => {
    // Accessibility 1 draws body at 28 pt and title 2 at 34: a line of 44.2 pt.
    const scale = 28 / 17;
    const long = "m".repeat(70);
    expect(peekHeight(card(long), WIDTH, scale)).toBeCloseTo(frame(scale, 44.2) + 3 * 44.2, 0);
  });

  it("gives a short example's translation a line of its own", () => {
    const example = { example: "Devo uscire." };
    const alone = peekHeight(card("to hurry", example), WIDTH, 1);
    const translated = peekHeight(
      card("to hurry", { ...example, exampleTranslation: "I must go." }),
      WIDTH,
      1,
    );
    expect(translated - alone).toBe(4 + 23);
  });
});
