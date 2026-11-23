import { describe, expect, it } from "vitest";
import { fitSource, sourceLink } from "./source";
import { CARD_LIMITS } from "./types";

const long = (n: number) => "a".repeat(n);

describe("fitSource", () => {
  it("keeps a source that fits", () => {
    expect(fitSource("Lesson 3")).toBe("Lesson 3");
    expect(fitSource("https://example.com/a?b=1")).toBe("https://example.com/a?b=1");
  });

  it("drops every query parameter but t from a URL that is too long", () => {
    const url = `https://youtu.be/abc?si=${long(200)}&t=221&utm_source=x`;
    expect(fitSource(url)).toBe("https://youtu.be/abc?t=221");
  });

  it("drops the path next, keeping the moment", () => {
    const url = `https://example.com/${long(220)}?t=90&x=1`;
    expect(fitSource(url)).toBe("https://example.com/?t=90");
  });

  it("drops the whole query when there is no moment", () => {
    const url = `https://example.com/news/story?${long(220)}=1`;
    expect(fitSource(url)).toBe("https://example.com/news/story");
  });

  it("leaves out long text that is not a web address", () => {
    expect(fitSource(long(CARD_LIMITS.source + 1))).toBeUndefined();
    expect(fitSource(`ftp://example.com/${long(220)}`)).toBeUndefined();
  });
});

describe("sourceLink", () => {
  it("names a web address by its site", () => {
    expect(sourceLink("https://www.err.ee/1609999/uudis")).toEqual({
      href: "https://www.err.ee/1609999/uudis",
      site: "err.ee",
    });
  });

  it("is null for any other source", () => {
    expect(sourceLink("Lesson 3")).toBeNull();
    expect(sourceLink("see https://example.com")).toBeNull();
    expect(sourceLink("javascript:alert(1)")).toBeNull();
    expect(sourceLink(null)).toBeNull();
  });
});
