import { describe, expect, it } from "vitest";
import { originBadge } from "./origin-badge";

const visitor = { timeZone: "Europe/Berlin", languages: ["en-US"], pageLocale: "en" };

describe("originBadge", () => {
  it("names Ukraine for the Ukrainian page, a Ukrainian browser or a Ukrainian time zone", () => {
    expect(originBadge({ ...visitor, pageLocale: "uk" })).toBe("ukraine");
    expect(originBadge({ ...visitor, languages: ["uk-UA", "en"] })).toBe("ukraine");
    expect(originBadge({ ...visitor, languages: ["ru-UA"] })).toBe("ukraine");
    expect(originBadge({ ...visitor, timeZone: "Europe/Kyiv" })).toBe("ukraine");
    expect(originBadge({ ...visitor, timeZone: "Europe/Kiev" })).toBe("ukraine");
  });

  it("names Estonia for an Estonian browser or the Tallinn time zone", () => {
    expect(originBadge({ ...visitor, languages: ["et"] })).toBe("estonia");
    expect(originBadge({ ...visitor, languages: ["ru-EE"] })).toBe("estonia");
    expect(originBadge({ ...visitor, timeZone: "Europe/Tallinn" })).toBe("estonia");
  });

  it("lets the browser's language outrank the time zone", () => {
    expect(originBadge({ ...visitor, timeZone: "Europe/Tallinn", languages: ["uk"] })).toBe(
      "ukraine",
    );
    expect(originBadge({ ...visitor, timeZone: "Europe/Kyiv", languages: ["et-EE"] })).toBe(
      "estonia",
    );
  });

  it("names nothing elsewhere", () => {
    expect(originBadge(visitor)).toBeNull();
    expect(originBadge({ ...visitor, languages: [], timeZone: undefined })).toBeNull();
    expect(originBadge({ ...visitor, languages: ["ru-RU"], timeZone: "Europe/Moscow" })).toBeNull();
  });
});
