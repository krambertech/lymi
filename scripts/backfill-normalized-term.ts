/**
 * Recompute cards.normalized_term with normaliseTerm() for every card. Migration 0002
 * backfilled the column with SQLite's lower(trim()), which folds ASCII only and keeps
 * double spaces, so keys for terms with non-ASCII capitals or odd spacing can miss a
 * duplicate. Run once per database after 0002:
 *
 *   node --experimental-strip-types scripts/backfill-normalized-term.ts --local
 *   node --experimental-strip-types scripts/backfill-normalized-term.ts --remote
 *
 * Reads with `wrangler d1 execute --json`, then writes one UPDATE per card whose key changes.
 */
import { execFileSync } from "node:child_process";
import { normaliseTerm } from "../packages/core/src/terms.ts";

const target = process.argv.includes("--remote") ? "--remote" : "--local";
const cwd = new URL("../apps/web", import.meta.url).pathname;

function d1(command: string): unknown[] {
  const out = execFileSync(
    "npx",
    ["wrangler", "d1", "execute", "lymi", target, "--json", "--command", command],
    { cwd, encoding: "utf8" },
  );
  const parsed: unknown = JSON.parse(out.slice(out.indexOf("[")));
  if (!Array.isArray(parsed) || parsed.length === 0) return [];
  const first: unknown = parsed[0];
  if (typeof first !== "object" || first === null || !("results" in first)) return [];
  return Array.isArray(first.results) ? first.results : [];
}

const rows = d1("select id, term, normalized_term from cards");
const stale = rows.flatMap((row) => {
  if (typeof row !== "object" || row === null) return [];
  const { id, term, normalized_term } = row as Record<string, unknown>;
  if (typeof id !== "string" || typeof term !== "string") return [];
  const key = normaliseTerm(term);
  return key === normalized_term ? [] : [{ id, key }];
});

console.log(`${rows.length} cards, ${stale.length} with a stale key (${target})`);
for (const { id, key } of stale) {
  d1(`update cards set normalized_term = '${key.replaceAll("'", "''")}' where id = '${id}'`);
  console.log(`  ${id} -> ${key}`);
}
