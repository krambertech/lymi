import { describe, expect, it } from "vitest";
import { CardSearchInput, DateValue, resolveDateValue } from "./card-search";

describe("DateValue", () => {
  it("takes an ISO timestamp or a duration from now, and nothing else", () => {
    for (const value of [
      "2026-09-01T00:00:00Z",
      "2026-09-01T03:00:00+03:00",
      "-P30D",
      "P1W",
      "-PT12H",
    ]) {
      expect(DateValue.safeParse(value).success).toBe(true);
    }
    for (const value of ["yesterday", "2026-09-01", "P", "-PT", "30D"]) {
      expect(DateValue.safeParse(value).success).toBe(false);
    }
  });

  it("bounds a duration at 100 years", () => {
    expect(DateValue.safeParse("-P100Y").success).toBe(true);
    expect(DateValue.safeParse("-P101Y").success).toBe(false);
    expect(DateValue.safeParse("P99999999D").success).toBe(false);
    expect(DateValue.safeParse("-PT999999999H").success).toBe(false);
  });

  it("moves months by the calendar and clamps to the end of the month", () => {
    const at = (iso: string, value: string) => resolveDateValue(value, new Date(iso)).toISOString();
    expect(at("2026-03-31T10:00:00.000Z", "-P1M")).toBe("2026-02-28T10:00:00.000Z");
    expect(at("2024-03-31T10:00:00.000Z", "-P1M")).toBe("2024-02-29T10:00:00.000Z");
    expect(at("2026-01-31T10:00:00.000Z", "P1M")).toBe("2026-02-28T10:00:00.000Z");
    expect(at("2026-01-15T10:00:00.000Z", "-P1Y2M")).toBe("2024-11-15T10:00:00.000Z");
    expect(at("2026-09-21T10:00:00.000Z", "-P2WT6H")).toBe("2026-09-07T04:00:00.000Z");
    expect(at("2026-09-21T10:00:00.000Z", "2026-01-01T00:00:00Z")).toBe("2026-01-01T00:00:00.000Z");
  });
});

describe("CardSearchInput", () => {
  it("refuses a comparison the filter does not offer", () => {
    expect(CardSearchInput.safeParse({ filter: { term: { neq: "ema" } } }).success).toBe(false);
    expect(CardSearchInput.safeParse({ filter: { createdAt: { eq: "-P1D" } } }).success).toBe(
      false,
    );
    expect(
      CardSearchInput.safeParse({ filter: { reviews: { lastRating: { gte: 2 } } } }).success,
    ).toBe(false);
    expect(
      CardSearchInput.safeParse({ filter: { reviews: { lastRating: { in: [1, 2] } } } }).success,
    ).toBe(true);
  });
});
