/**
 * Prints what the stress backfill would write, and writes nothing: how many stressed terms split,
 * fold, stay beside another pronunciation, or are Ukrainian terms rekeyed for their apostrophes,
 * and how many meet a duplicate. It reads D1 through
 * Wrangler, so it runs against the local database or production before the job does:
 *
 *   pnpm --filter @lymi/web backfill:stress --local
 *   pnpm --filter @lymi/web backfill:stress --remote
 */
import { execFileSync } from "node:child_process";
import {
  type ActiveRow,
  BACKFILL_TERMS,
  countDuplicates,
  planStressBackfill,
  type StressRow,
} from "./plan";

const target = process.argv.includes("--remote") ? "--remote" : "--local";
const cwd = new URL("../../..", import.meta.url).pathname;

function d1(command: string): Record<string, unknown>[] {
  const out = execFileSync(
    "npx",
    ["wrangler", "d1", "execute", "lymi", target, "--json", "--command", command],
    { cwd, encoding: "utf8" },
  );
  const parsed = JSON.parse(out.slice(out.indexOf("["))) as { results?: unknown[] }[];
  return (parsed[0]?.results ?? []) as Record<string, unknown>[];
}

const text = (value: unknown) => (typeof value === "string" ? value : null);
const card = (row: Record<string, unknown>): ActiveRow => ({
  id: String(row.id),
  userId: String(row.user_id),
  language: text(row.language),
  term: String(row.term),
  normalizedTerm: String(row.normalized_term),
  pronunciation: text(row.pronunciation),
});
const quoted = (value: string) => `'${value.replaceAll("'", "''")}'`;
const COLUMNS = "id, user_id, language, term, normalized_term, pronunciation, archived_at";

const read = d1(`select ${COLUMNS} from cards where ${BACKFILL_TERMS}`);
const rows: StressRow[] = read.map(card);
const { changes, counts } = planStressBackfill(rows);
const keys = [...new Set(changes.map((change) => change.normalizedTerm))];
const keyed: ActiveRow[] = [];
for (let at = 0; at < keys.length; at += 50) {
  const list = keys
    .slice(at, at + 50)
    .map(quoted)
    .join(", ");
  keyed.push(
    ...d1(
      `select ${COLUMNS} from cards where archived_at is null and normalized_term in (${list})`,
    ).map(card),
  );
}
const active = new Map(
  [...keyed, ...read.filter((row) => row.archived_at === null).map(card)].map((row) => [
    row.id,
    row,
  ]),
);
const duplicates = countDuplicates(changes, [...active.values()]);

console.log(
  `Stress backfill dry run (${target}): ${read.length} cards with U+0301 or an apostrophe other than ' in the term`,
);
console.log(`  split    ${counts.split}  stress moves into an empty pronunciation`);
console.log(`  folded   ${counts.folded}  term loses marks its pronunciation already says`);
console.log(`  kept     ${counts.kept}  beside another pronunciation, stressed key kept`);
console.log(`  rekeyed  ${counts.rekeyed}  Ukrainian term keyed with ' for its apostrophe`);
console.log(`  meet     ${duplicates}  rewritten cards that meet a duplicate, left as they are`);
console.log("Nothing was written.");
