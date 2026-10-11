import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// A language placeholder already names the language, so "{name} мова" reads as "Hebrew language", #453.
describe.each(["uk", "ru"])("%s catalog", (locale) => {
  it("never follows a language placeholder with the word for language", () => {
    const catalog = readFileSync(new URL(`../locales/${locale}.po`, import.meta.url), "utf8");
    const strings = catalog.split("\n").filter((line) => line.startsWith("msgstr"));
    expect(strings.filter((line) => /\{(name|language)\} (мова|язык)/.test(line))).toEqual([]);
  });
});
