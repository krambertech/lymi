import { describe, expect, it } from "vitest";
import { markdownSentences, readableHtml } from "./link";
import { findTerm, holdsEveryWord } from "./quote";

describe("readableHtml", () => {
  it("drops scripts, JSON-LD and styles before the page is converted", () => {
    const html =
      '<article><nav><a href="/">Uudised</a></nav><script type="application/ld+json">{"@type":"NewsArticle","author":"Mari"}</script><style>p{}</style><p>Kevad on käes.</p></article>';
    expect(readableHtml(html)).toBe("<article><p>Kevad on käes.</p></article>");
  });

  it("unwraps links and drops footnote marks, images and buttons, so an example is the page's words", () => {
    const html =
      '<p><b>Può</b> essere una <a href="/wiki/Candela_(illuminazione)" title="Candela (illuminazione)">candela</a> o una lampadina.<sup id="cite_ref-1" class="reference"><a href="#cite_note-1"><span>&#91;</span>1<span>&#93;</span></a></sup> È di 2 m<sup>2</sup>.<img src="a(1).png"><button>Condividi</button></p><abbr>a.C.</abbr>';
    expect(readableHtml(html)).toBe(
      "<p>Può essere una candela o una lampadina. È di 2 m<sup>2</sup>.</p><abbr>a.C.</abbr>",
    );
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

  it("removes a link whose address has brackets in it", () => {
    expect(
      markdownSentences(
        'Una [candela](/wiki/Candela_(illuminazione) "Candela (illuminazione)") accesa.',
      ),
    ).toEqual(["Una candela accesa."]);
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

describe("holdsEveryWord", () => {
  it.each([
    ["Formano un complesso proteico detto glutine.", "il glutine", true],
    ["Con burro, olio d'oliva e strutto.", "l'olio d'oliva", true],
    ["Esempi di pani dolci consumati in Europa.", "il pane dolce", true],
    ["Se stai cercando altri significati, vedi Pane.", "il pane dolce", false],
    ["Pani con l'uovo.", "l'uovo", true],
    ["Der Hund schläft.", "der Hund", true],
    ["Wo ist es?", "es", true],
    ["毎朝パンを食べます。", "パン", true],
  ])("%s holds %s: %s", (sentence, term, holds) => {
    expect(holdsEveryWord(sentence, term)).toBe(holds);
  });
});
