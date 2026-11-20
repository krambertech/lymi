/**
 * Counts the cards whose fields would show differently once math and code render, and writes
 * nothing to D1. It prints counts only and saves a sample of the cards to a local file, because
 * the sample holds learners' own words:
 *
 *   pnpm --filter @lymi/web notation:dry-run --local
 *   pnpm --filter @lymi/web notation:dry-run --remote
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type FieldInline, parseFieldNotation } from "@lymi/core/notation";
import { type NoteBlock, type NoteInline, parseNotes } from "@lymi/core/notes";

const target = process.argv.includes("--remote") ? "--remote" : "--local";
const cwd = new URL("../..", import.meta.url).pathname;

function d1(command: string): Record<string, unknown>[] {
  const out = execFileSync(
    "npx",
    ["wrangler", "d1", "execute", "lymi", target, "--json", "--command", command],
    { cwd, encoding: "utf8", maxBuffer: 1 << 30 },
  );
  const parsed = JSON.parse(out.slice(out.indexOf("["))) as { results?: unknown[] }[];
  return (parsed[0]?.results ?? []) as Record<string, unknown>[];
}

const FIELDS = { term: "term", meaning: "meaning", example: "example", hint: "hook" } as const;
const MARKERS = ["$", "`", "\\(", "\\[", "~~~"];
const has = (column: string) =>
  MARKERS.map((marker) => `instr(${column}, '${marker}') > 0`).join(" or ");

type Kind = "math" | "chemistry" | "code" | "escape" | "layout";

function spanKinds(nodes: readonly (FieldInline | NoteInline | NoteBlock)[], into: Set<Kind>) {
  for (const node of nodes) {
    if (node.type === "math" || node.type === "displayMath")
      into.add(/\\(?:ce|pu)\{/.test(node.tex) ? "chemistry" : "math");
    else if (node.type === "code" || node.type === "codeBlock") into.add("code");
    else if (node.type === "list") for (const item of node.items) spanKinds(item, into);
    else if ("children" in node) spanKinds(node.children, into);
  }
}

/** The kinds that make a field show differently, or none when it shows as it does today. */
function fieldKinds(value: string): Set<Kind> {
  const kinds = new Set<Kind>();
  const nodes = parseFieldNotation(value);
  spanKinds(nodes, kinds);
  if (!kinds.size && !(nodes.length === 1 && nodes[0]?.type === "text" && nodes[0].value === value))
    kinds.add("escape");
  return kinds;
}

function notesKinds(value: string): Set<Kind> {
  const before = parseNotes(value);
  const after = parseNotes(value, { notation: true });
  const kinds = new Set<Kind>();
  if (JSON.stringify(before) === JSON.stringify(after)) return kinds;
  spanKinds(after, kinds);
  // Without a span, a `\$` escape or a protected `$`, backtick run or `*` changed the layout.
  if (!kinds.size) kinds.add("layout");
  return kinds;
}

const columns = [...Object.values(FIELDS), "notes"];
const rows = d1(
  `select id, ${columns.join(", ")} from cards where archived_at is null and (${columns
    .map((column) => `(${has(column)})`)
    .join(" or ")})`,
);

const byField: Record<string, number> = {};
const byKind: Record<Kind, number> = { math: 0, chemistry: 0, code: 0, escape: 0, layout: 0 };
const changed: { id: string; fields: Record<string, string>; kinds: Kind[] }[] = [];
for (const row of rows) {
  const fields: Record<string, string> = {};
  const kinds = new Set<Kind>();
  for (const [field, column] of [...Object.entries(FIELDS), ["notes", "notes"] as const]) {
    const value = row[column];
    if (typeof value !== "string" || !value) continue;
    const found = field === "notes" ? notesKinds(value) : fieldKinds(value);
    if (!found.size) continue;
    fields[field] = value;
    byField[field] = (byField[field] ?? 0) + 1;
    for (const kind of found) kinds.add(kind);
  }
  if (!kinds.size) continue;
  for (const kind of kinds) byKind[kind]++;
  changed.push({ id: String(row.id), fields, kinds: [...kinds] });
}

const sample = changed
  .map((card) => ({ card, order: Math.random() }))
  .sort((a, b) => a.order - b.order)
  .slice(0, 40)
  .map(({ card }) => card);
const file = join(tmpdir(), `lymi-notation-sample-${target.slice(2)}.json`);
writeFileSync(file, `${JSON.stringify(sample, null, 2)}\n`);

const total = d1("select count(*) as n from cards where archived_at is null")[0]?.n;
console.log(
  JSON.stringify(
    { cards: total, withMarkers: rows.length, changed: changed.length, byField, byKind },
    null,
    2,
  ),
);
console.log(
  `A sample of ${sample.length} changed cards is in ${file}. Keep it out of the repository.`,
);
