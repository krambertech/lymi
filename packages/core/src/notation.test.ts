import { describe, expect, it } from "vitest";
import { parseFieldNotation } from "./notation";

const text = (value: string) => ({ type: "text", value }) as const;
const math = (tex: string, source: string) => ({ type: "math", tex, source }) as const;
const code = (value: string, source: string) => ({ type: "code", value, source }) as const;

describe("parseFieldNotation", () => {
  it("leaves a field with no notation as one text", () => {
    expect(parseFieldNotation("hea aeg")).toEqual([text("hea aeg")]);
    expect(parseFieldNotation("C:\\Users\\snake_case")).toEqual([text("C:\\Users\\snake_case")]);
    expect(parseFieldNotation("")).toEqual([]);
  });

  it("reads inline math between single dollars or \\( and \\)", () => {
    expect(parseFieldNotation("$E = mc^2$ is energy")).toEqual([
      math("E = mc^2", "$E = mc^2$"),
      text(" is energy"),
    ]);
    expect(parseFieldNotation("area \\(\\pi r^2\\)")).toEqual([
      text("area "),
      math("\\pi r^2", "\\(\\pi r^2\\)"),
    ]);
    expect(parseFieldNotation("$\\ce{H2SO4}$")).toEqual([math("\\ce{H2SO4}", "$\\ce{H2SO4}$")]);
  });

  it("reads inline code between single backticks", () => {
    expect(parseFieldNotation("call `map()` on it")).toEqual([
      text("call "),
      code("map()", "`map()`"),
      text(" on it"),
    ]);
    expect(parseFieldNotation("`a $x$ b`")).toEqual([code("a $x$ b", "`a $x$ b`")]);
    expect(parseFieldNotation("`\\`")).toEqual([code("\\", "`\\`")]);
  });

  it("follows Pandoc's rule for a single dollar", () => {
    for (const field of [
      "$5 and $10",
      "$HOME and $PATH",
      "$ x$",
      "$x $",
      "costs $5, sells for $7.50",
      "$x$5",
    ]) {
      expect(parseFieldNotation(field)).toEqual([text(field)]);
    }
    expect(parseFieldNotation("$x$, then $y$.")).toEqual([
      math("x", "$x$"),
      text(", then "),
      math("y", "$y$"),
      text("."),
    ]);
    expect(parseFieldNotation("$a $b$")).toEqual([math("a $b", "$a $b$")]);
  });

  it("keeps \\$ and \\` as a literal dollar and backtick", () => {
    expect(parseFieldNotation("\\$5 and \\$10")).toEqual([text("$5 and $10")]);
    expect(parseFieldNotation("\\$x\\$")).toEqual([text("$x$")]);
    expect(parseFieldNotation("\\`map\\`")).toEqual([text("`map`")]);
    expect(parseFieldNotation("$a\\$b$")).toEqual([math("a\\$b", "$a\\$b$")]);
  });

  it("keeps display math and longer backtick runs as text", () => {
    for (const field of ["$$x^2$$", "``map()``", "```js```", "a ``b`` c"]) {
      expect(parseFieldNotation(field)).toEqual([text(field)]);
    }
  });

  it("keeps malformed notation as the text that was typed", () => {
    for (const field of ["$x", "x$", "\\(x", "x\\)", "`map", "$$", "``", "$ $", "\\( \\)", "` `"]) {
      expect(parseFieldNotation(field)).toEqual([text(field)]);
    }
    expect(parseFieldNotation("`a`` b")).toEqual([text("`a`` b")]);
  });
});
