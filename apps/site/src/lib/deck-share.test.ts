import { describe, expect, it } from "vitest";
import {
  deckShareSvg,
  escapeXml,
  layoutTitle,
  oklchToHex,
  SHARE_HEIGHT,
  SHARE_WIDTH,
  type ShareContent,
  textWidth,
  wrapWords,
} from "./deck-share";

const content = (over: Partial<ShareContent> = {}): ShareContent => ({
  name: "Everyday Estonian",
  facts: "Estonian · A1 · 14 cards",
  byline: "By Lymi",
  hue: 3,
  ...over,
});

describe("oklchToHex", () => {
  it("maps the ends of the lightness scale to black and white and stays in range between", () => {
    expect(oklchToHex(0, 0, 0)).toBe("#000000");
    expect(oklchToHex(1, 0, 0)).toBe("#ffffff");
    expect(oklchToHex(0.8, 0.15, 72)).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("wrapWords", () => {
  it("keeps a short name on one line and wraps a long one between words", () => {
    expect(wrapWords("Everyday Estonian", 96, 1040, -0.03)).toEqual(["Everyday Estonian"]);
    const lines = wrapWords("Words for the first weeks in a new country", 84, 1040, -0.03);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join(" ")).toBe("Words for the first weeks in a new country");
    for (const line of lines) expect(textWidth(line, 84, -0.03)).toBeLessThanOrEqual(1040);
  });

  it("breaks a word longer than the line rather than letting it run off", () => {
    const lines = wrapWords("a".repeat(60), 96, 1040, -0.03);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) expect(textWidth(line, 96, -0.03)).toBeLessThanOrEqual(1040);
  });
});

describe("layoutTitle", () => {
  it("sets a short name at the largest size and steps down as the name grows", () => {
    expect(layoutTitle("Everyday Estonian")).toEqual({ size: 96, lines: ["Everyday Estonian"] });
    const two = layoutTitle("Estonian for the first weeks in Tallinn");
    expect(two.size).toBeLessThan(96);
    expect(two.lines).toHaveLength(2);
  });

  it("cuts a name that will not fit three lines at the smallest size", () => {
    const { size, lines } = layoutTitle(
      "A very long deck name that goes on and on about everything one could learn in a year of lessons, and then keeps going for another year after that",
    );
    expect(size).toBe(56);
    expect(lines).toHaveLength(3);
    expect(lines[2]).toMatch(/…$/);
    for (const line of lines) expect(textWidth(line, size, -0.03)).toBeLessThanOrEqual(1040);
  });
});

describe("deckShareSvg", () => {
  it("draws the name, the facts, the byline and the lockup at the share size", () => {
    const svg = deckShareSvg(content());
    expect(svg).toContain(`width="${SHARE_WIDTH}" height="${SHARE_HEIGHT}"`);
    expect(svg).toContain(">Everyday Estonian</text>");
    expect(svg).toContain(">Estonian · A1 · 14 cards</text>");
    expect(svg).toContain(">By Lymi</text>");
    expect(svg).toContain('font-family="Onest"');
    // The lockup's lantern, from the brand file.
    expect(svg).toContain('fill="#f6b34d"');
    expect(svg.match(/<svg /g)).toHaveLength(1);
  });

  it("wears the deck's own hue", () => {
    const pool = (svg: string) => svg.match(/<stop offset="0" stop-color="(#[0-9a-f]{6})"/)?.[1];
    expect(pool(deckShareSvg(content({ hue: 0 })))).not.toBe(
      pool(deckShareSvg(content({ hue: 4 }))),
    );
    expect(pool(deckShareSvg(content({ hue: 8 })))).toBe(pool(deckShareSvg(content({ hue: 0 }))));
  });

  it("cannot be broken out of by a name", () => {
    const svg = deckShareSvg(content({ name: '</text><script>alert("x")</script>' }));
    expect(svg).not.toContain("<script>");
    expect(escapeXml("a & b < c")).toBe("a &amp; b &lt; c");
  });
});
