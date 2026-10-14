import { describe, expect, it } from "vitest";
import { originBadge as detect, originScript } from "./origin-badge";

interface Visitor {
  timeZone: string | undefined;
  languages: string[];
  pageLocale: string;
}

const originBadge = (v: Visitor) => detect(v.timeZone, v.languages, v.pageLocale);

const visitor: Visitor = { timeZone: "Europe/Berlin", languages: ["en-US"], pageLocale: "en" };

describe("originBadge", () => {
  it("names Ukraine for the Ukrainian page, a Ukrainian browser or a Ukrainian time zone", () => {
    expect(originBadge({ ...visitor, pageLocale: "uk" })).toBe("ukraine");
    expect(originBadge({ ...visitor, languages: ["uk-UA", "en"] })).toBe("ukraine");
    expect(originBadge({ ...visitor, languages: ["en-UA"] })).toBe("ukraine");
    expect(originBadge({ ...visitor, timeZone: "Europe/Kyiv" })).toBe("ukraine");
    expect(originBadge({ ...visitor, timeZone: "Europe/Kiev" })).toBe("ukraine");
  });

  it("never names Ukraine on the Russian page", () => {
    expect(originBadge({ ...visitor, pageLocale: "ru", languages: ["uk-UA"] })).toBeNull();
    expect(originBadge({ ...visitor, pageLocale: "ru", languages: ["ru-UA"] })).toBeNull();
    expect(originBadge({ ...visitor, pageLocale: "ru", timeZone: "Europe/Kyiv" })).toBeNull();
  });

  it("names Estonia for an Estonian browser or the Tallinn time zone, on any page", () => {
    expect(originBadge({ ...visitor, languages: ["et"] })).toBe("estonia");
    expect(originBadge({ ...visitor, languages: ["ru-EE"] })).toBe("estonia");
    expect(originBadge({ ...visitor, timeZone: "Europe/Tallinn" })).toBe("estonia");
    expect(originBadge({ ...visitor, pageLocale: "ru", timeZone: "Europe/Tallinn" })).toBe(
      "estonia",
    );
  });

  it("does not take a neighbour's time zone for Estonia's", () => {
    for (const timeZone of ["Europe/Helsinki", "Europe/Riga", "Europe/Vilnius"]) {
      expect(originBadge({ ...visitor, timeZone })).toBeNull();
    }
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

  it("runs on its own as the pre-paint script", () => {
    const root = { dataset: {} as Record<string, string> };
    const run = new Function("document", "navigator", "Intl", originScript("en"));
    const intl = {
      DateTimeFormat: () => ({ resolvedOptions: () => ({ timeZone: "Europe/Tallinn" }) }),
    };
    run({ documentElement: root }, { languages: ["en-US"] }, intl);
    expect(root.dataset.origin).toBe("estonia");
  });
});
