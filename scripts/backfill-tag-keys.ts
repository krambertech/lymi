/**
 * Recompute tags.normalized_name with tagKey() for every tag, merging a learner's tags that then
 * share a key. Migration 0049 keyed tags with SQLite's lower(trim()), which folds ASCII only, so
 * "Дієслова" and "дієслова" stayed two tags. Run once per database after 0049:
 *
 *   node --experimental-strip-types scripts/backfill-tag-keys.ts --local
 *   node --experimental-strip-types scripts/backfill-tag-keys.ts --remote
 *
 * Reads with `wrangler d1 execute --json`, then writes per tag whose key changes. Safe to re-run.
 */
import { execFileSync } from "node:child_process";
import { tagKey } from "../packages/core/src/terms.ts";

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

const quote = (text: string) => `'${text.replaceAll("'", "''")}'`;

type Row = { id: string; user_id: string; name: string; normalized_name: string };
const rows = d1(
  "select id, user_id, name, normalized_name from tags order by created_at, id",
).filter(
  (row): row is Row =>
    typeof row === "object" &&
    row !== null &&
    ["id", "user_id", "name", "normalized_name"].every(
      (k) => typeof (row as Record<string, unknown>)[k] === "string",
    ),
);

// A tag whose key is already right keeps it, and the others join it.
const keeper = new Map<string, string>();
for (const row of rows) {
  if (tagKey(row.name) === row.normalized_name)
    keeper.set(`${row.user_id} ${row.normalized_name}`, row.id);
}

const stale = rows.filter((row) => tagKey(row.name) !== row.normalized_name);
console.log(`${rows.length} tags, ${stale.length} with a stale key (${target})`);
for (const row of stale) {
  const key = tagKey(row.name);
  const keep = keeper.get(`${row.user_id} ${key}`);
  if (!keep) {
    d1(`update tags set normalized_name = ${quote(key)} where id = ${quote(row.id)}`);
    keeper.set(`${row.user_id} ${key}`, row.id);
    console.log(`  ${row.id} -> ${key}`);
    continue;
  }
  const [old, kept] = [quote(row.id), quote(keep)];
  d1(
    `delete from card_tags where tag_id = ${old} and card_id in (select card_id from card_tags where tag_id = ${kept});
    update card_tags set tag_id = ${kept} where tag_id = ${old};
    delete from tags where id = ${old};
    update cards set tags = (select json_group_array(tags.name order by card_tags.position)
      from card_tags join tags on tags.id = card_tags.tag_id where card_tags.card_id = cards.id)
    where id in (select card_id from card_tags where tag_id = ${kept});`,
  );
  console.log(`  ${row.id} merged into ${keep} (${key})`);
}
