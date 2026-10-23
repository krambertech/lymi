/**
 * Yomitan fills a note's fields with HTML for Anki to render. A card holds plain text, so each
 * field is read down to its words here.
 */

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decode(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, name: string) => {
    if (name.startsWith("#x") || name.startsWith("#X")) {
      return String.fromCodePoint(Number.parseInt(name.slice(2), 16));
    }
    if (name.startsWith("#")) return String.fromCodePoint(Number.parseInt(name.slice(1), 10));
    return ENTITIES[name.toLowerCase()] ?? entity;
  });
}

/** HTML as plain text: block ends become line breaks, Anki's `[sound:]` references go. */
export function plainText(html: string): string {
  return decode(
    html
      .replace(/<(style|script)[\s\S]*?<\/\1>/gi, "")
      .replace(/\[sound:[^\]]*\]/g, "")
      .replace(/<(br|hr)\s*\/?>/gi, "\n")
      .replace(/<\/(li|div|p|tr|h\d)>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/**
 * A dictionary entry as a meaning, one line per sense. Yomitan wraps each dictionary's senses in
 * `li[data-dictionary]`. JMdict lists a sense's glosses in `ul[data-sc-content=glossary]`; a
 * Wiktionary dictionary numbers its senses in `ol[data-sc-content=glosses]`. Labels, forms tables,
 * grammar and etymology notes, cross-references and stylesheets are left out. An entry in neither
 * shape keeps its text without the labels.
 */
export function meaningText(html: string): string {
  const cleaned = html
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, "")
    .replace(/<details[\s\S]*?<\/details>/gi, "")
    .replace(/<div data-sc-content="backlink"[\s\S]*?<\/div>/gi, "");
  const senses: string[] = [];
  for (const entry of cleaned.split(/<li data-dictionary=/).slice(1)) {
    for (const [, tag, body = ""] of entry.matchAll(
      /<(ul|ol) data-sc-content="gloss(?:ary|es)"[^>]*>([\s\S]*?)<\/\1>/g,
    )) {
      const items = [...body.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)]
        .map(([, item = ""]) => plainText(item))
        .filter(Boolean);
      if (tag === "ol") senses.push(...items);
      else if (items.length > 0) senses.push(items.join("; "));
    }
  }
  if (senses.length === 0) return plainText(cleaned.replace(/<i>\([^<]*\)<\/i>/g, ""));
  return senses.length === 1
    ? (senses[0] ?? "")
    : senses.map((s, i) => `${i + 1}. ${s}`).join("\n");
}

/** The page a note came from: Yomitan's `{url}` is a link, `{url-plain}` the address itself. */
export function sourceText(html: string): string {
  const href = /href="([^"]+)"/i.exec(html)?.[1];
  return href ? decode(href) : plainText(html);
}

/** The file names of the sounds a field plays, in order. */
export function soundFiles(html: string): string[] {
  return [...html.matchAll(/\[sound:([^\]]+)\]/g)].map(([, name = ""]) => name);
}
