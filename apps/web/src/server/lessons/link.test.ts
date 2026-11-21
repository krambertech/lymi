import { describe, expect, it } from "vitest";
import { markdownSentences, readableHtml } from "./link";
import { findTerm } from "./quote";

describe("readableHtml", () => {
  it("drops scripts, JSON-LD and styles before the page is converted", () => {
    const html =
      '<article><script type="application/ld+json">{"@type":"NewsArticle","author":"Mari"}</script><style>p{}</style><p>Kevad on käes.</p></article>';
    expect(readableHtml(html)).toBe("<article><p>Kevad on käes.</p></article>");
  });
});

describe("markdownSentences", () => {
  it("leaves out code fences and structured data", () => {
    const markdown = [
      "Kevad on käes.",
      "```json",
      '{"@type": "NewsArticle"}',
      "```",
      '{"@context": "https://schema.org"}',
      "Linnud laulavad.",
    ].join("\n");
    expect(markdownSentences(markdown)).toEqual(["Kevad on käes.", "Linnud laulavad."]);
  });
});

describe("findTerm", () => {
  it("finds a stem only where a word starts", () => {
    expect(findTerm("Mul on sõit tulemas.", "tulema")).toMatchObject({ start: 12 });
    expect(findTerm("Kõik on paigas.", "kass")).toBeNull();
    expect(findTerm("Takas on kass.", "kass")).toMatchObject({ start: 9 });
  });

  it("finds a term inside text written without spaces", () => {
    expect(findTerm("毎朝パンを食べます。", "パン")).toMatchObject({ start: 2 });
  });
});
