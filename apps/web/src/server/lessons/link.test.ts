import { describe, expect, it } from "vitest";
import { markdownSentences, readableHtml } from "./link";
import { findTerm } from "./quote";

describe("readableHtml", () => {
  it("drops scripts, JSON-LD and styles before the page is converted", () => {
    const html =
      '<article><nav><a href="/">Uudised</a></nav><script type="application/ld+json">{"@type":"NewsArticle","author":"Mari"}</script><style>p{}</style><p>Kevad on käes.</p></article>';
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

  it("leaves out the metadata header and page templates that Workers AI passes through", () => {
    const markdown =
      "---\ndescription: Karu nähti.\ntitle: Karu Tartus\nimage: https://s.err.ee/a.png\n---\n\n# Karu Tartus\n\n{{1795381500000 | amCalendar}}\n\nKaru nähti jõe ääres.";
    expect(markdownSentences(markdown)).toEqual(["Karu Tartus", "Karu nähti jõe ääres."]);
  });

  it("keeps a sentence that opens with a link or a quotation mark, as the page writes it", () => {
    const markdown =
      '[Michal](/k/michal) ütles seda eile.\n\n"Tuleb harjuda," ütles ta.\n\nSee oli 22\\-aastane mees &amp; tema koer.';
    expect(markdownSentences(markdown)).toEqual([
      "Michal ütles seda eile.",
      '"Tuleb harjuda," ütles ta.',
      "See oli 22-aastane mees & tema koer.",
    ]);
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
