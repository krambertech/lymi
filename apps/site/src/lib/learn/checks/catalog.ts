import { readFileSync } from "node:fs";

/** One message of a `.po` catalog. */
export interface Entry {
  context: string | undefined;
  id: string;
  text: string;
}

const unquote = (value: string) =>
  value.replace(/\\"/g, '"').replace(/\\n/g, "\n").replace(/\\\\/g, "\\");

/** Reads a Lingui `.po` file: each message's context, its English id and this language's text. */
type Field = "msgctxt" | "msgid" | "msgstr";

export function readCatalog(url: URL): Entry[] {
  const entries: Entry[] = [];
  let current: Partial<Record<Field, string>> = {};
  let field: Field | null = null;
  const flush = () => {
    if (current.msgid)
      entries.push({ context: current.msgctxt, id: current.msgid, text: current.msgstr ?? "" });
    current = {};
    field = null;
  };
  for (const line of readFileSync(url, "utf8").split("\n")) {
    const start = line.match(/^(msgctxt|msgid|msgstr) "(.*)"$/);
    if (start) {
      const name = start[1] as Field;
      if (name === "msgctxt" || (name === "msgid" && current.msgid !== undefined)) flush();
      field = name;
      current[name] = unquote(start[2] ?? "");
      continue;
    }
    const more = line.match(/^"(.*)"$/);
    if (more && field) current[field] = (current[field] ?? "") + unquote(more[1] ?? "");
    else if (!line.trim()) flush();
  }
  flush();
  return entries;
}

const squash = (text: string) => text.replace(/\{" "\}/g, " ").replace(/\s+/g, " ");

/** A message's own words, between its placeholders: `<0/>`, `<1>…</1>`, `{name}`. */
export const chunks = (id: string): string[] =>
  id
    .split(/<\/?\d+\/?>|\{[^}]*\}/)
    .map((part) => squash(part).trim())
    .filter((part) => part.length > 0);

/** The messages a source file holds: every word of the message appears in it, in order. */
export function messagesIn<T extends { id: string }>(source: string, entries: readonly T[]): T[] {
  const flat = squash(source);
  return entries.filter((entry) => {
    const parts = chunks(entry.id);
    if (parts.join("").length < 4) return false;
    let from = 0;
    for (const part of parts) {
      const at = flat.indexOf(part, from);
      if (at < 0) return false;
      from = at + part.length;
    }
    return true;
  });
}
