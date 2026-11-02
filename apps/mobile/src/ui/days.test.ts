import { describe, expect, it } from "vitest";
import { addDays, deviceDate, lastSevenDays, monthsFrom, monthWeeks, weekLetters } from "./days";

describe("days", () => {
  it("counts calendar days across a month and a year", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
  });

  it("lists every month from the first to the last, across a year", () => {
    expect(monthsFrom("2026-11", "2027-02")).toEqual(["2026-11", "2026-12", "2027-01", "2027-02"]);
    expect(monthsFrom("2026-11", "2026-11")).toEqual(["2026-11"]);
    expect(monthsFrom("2027-01", "2026-11")).toEqual(["2026-11"]);
  });

  it("lays a month out in Monday-first weeks", () => {
    const november = monthWeeks("2026-11");
    expect(november).toHaveLength(6);
    expect(november[0]).toEqual([null, null, null, null, null, null, "2026-11-01"]);
    expect(november[5]?.[0]).toBe("2026-11-30");
    expect(monthWeeks("2027-02")).toHaveLength(4);
    expect(monthWeeks("2027-02").flat()).not.toContain(null);
  });

  it("ends the week on today, oldest first", () => {
    expect(lastSevenDays("2026-10-13")).toEqual([
      "2026-10-07",
      "2026-10-08",
      "2026-10-09",
      "2026-10-10",
      "2026-10-11",
      "2026-10-12",
      "2026-10-13",
    ]);
    expect(lastSevenDays(undefined)).toEqual(["", "", "", "", "", "", ""]);
  });

  it("names each date's own weekday, whatever the phone's timezone", () => {
    const sunday = weekLetters(["2026-10-11"])[0];
    const monday = weekLetters(["2026-10-12"])[0];
    expect(weekLetters(["2026-10-18", "2026-10-19"])).toEqual([sunday, monday]);
    expect(
      new Intl.DateTimeFormat(undefined, { weekday: "narrow" }).format(new Date(2026, 9, 12)),
    ).toBe(monday);
  });

  it("leaves an unknown day blank", () => {
    expect(weekLetters(["", "2026-10-12"])[0]).toBe("");
  });

  it("reads the phone's own date", () => {
    expect(deviceDate(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });
});
