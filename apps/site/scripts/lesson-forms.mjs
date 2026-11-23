#!/usr/bin/env node
/**
 * Checks the Estonian lessons' new word forms in Sõnaveeb and adds the ones it confirms to
 * `src/lib/learn/verified-forms.json`.
 *
 *   pnpm --filter @lymi/site lesson:forms
 *
 * The lesson checks (`src/lib/learn/checks/lesson-checks.test.ts`) list every form a lesson shows
 * or says that the file doesn't hold yet. This script asks Sõnaveeb's EKI dictionary, which carries
 * ÕS 2025, about each one: a headword, or "a form of <headword>", is added with that headword. A
 * form Sõnaveeb doesn't know is printed for a person to fix or to add by hand with its source.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const site = new URL("..", import.meta.url).pathname;
const listPath = new URL("../src/lib/learn/verified-forms.json", import.meta.url);
const dir = mkdtempSync(join(tmpdir(), "lesson-forms-"));
const out = join(dir, "missing.txt");

const run = spawnSync(
  "pnpm",
  [
    "exec",
    "vitest",
    "run",
    "src/lib/learn/checks/lesson-checks.test.ts",
    "-t",
    "uses only Estonian forms",
  ],
  { cwd: site, env: { ...process.env, LESSON_FORMS_OUT: out }, stdio: "ignore" },
);
let missing = [];
try {
  missing = [...new Set(readFileSync(out, "utf8").split("\n").filter(Boolean))].sort();
} catch {
  if (run.status !== 0) {
    console.error("The lesson checks didn't run. Run `pnpm --filter @lymi/site test` to see why.");
    process.exit(1);
  }
}
rmSync(dir, { recursive: true, force: true });

function writeNearForms() {
  const wrote = spawnSync(
    "pnpm",
    ["exec", "vitest", "run", "src/lib/learn/near-forms.test.ts", "-u"],
    {
      cwd: site,
      env: { ...process.env, CI: "" },
      stdio: "ignore",
    },
  );
  if (wrote.status === 0) return;
  console.error("near-forms.json wasn't written. Run the near-forms test to see why.");
  process.exit(1);
}

if (missing.length === 0) {
  writeNearForms();
  console.log("Every Estonian form in the lessons is already checked.");
  process.exit(0);
}

const strip = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");

/** Sõnaveeb's verdict on one form: its headword, or null when it isn't a word. */
async function lookUp(form) {
  const url = `https://sonaveeb.ee/search/unif/est/eki/${encodeURIComponent(form)}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(url, { headers: { "user-agent": "lesson-forms-check" } });
    if (!response.ok) {
      await new Promise((done) => setTimeout(done, 1500 * (attempt + 1)));
      continue;
    }
    const html = await response.text();
    const text = strip(html);
    // "Sõna ”vanni” ei leitud, aga see on vorm sõnast vann", with a link to each headword.
    const formOf = html.search(/aga see on vorm (?:sõnast|sõnadest)/);
    if (formOf >= 0 && /ei leitud, aga see on vorm/.test(text)) {
      const links = html
        .slice(formOf, formOf + 3000)
        .matchAll(/href="\/search\/unif\/est\/eki\/([^"/]+)"/g);
      const headwords = [...new Set([...links].map((link) => decodeURIComponent(link[1])))];
      if (headwords.length) return headwords.join(", ");
    }
    if (/Sõna ” ?[^”]*” ei leitud/.test(text)) return null;
    // A headword page lists the word's forms.
    if (html.includes("form-value-field")) return form;
    return null;
  }
  throw new Error(`Sõnaveeb didn't answer for ${form}`);
}

const list = JSON.parse(readFileSync(listPath, "utf8"));
const unknown = [];
let added = 0;
const queue = [...missing];
await Promise.all(
  Array.from({ length: 4 }, async () => {
    for (let form = queue.shift(); form; form = queue.shift()) {
      const headword = await lookUp(form);
      if (headword) {
        list[form] = headword;
        added++;
      } else unknown.push(form);
    }
  }),
);

const sorted = Object.fromEntries(
  Object.entries(list).sort(([a], [b]) => a.localeCompare(b, "et")),
);
writeFileSync(listPath, `${JSON.stringify(sorted, null, 2)}\n`);
writeNearForms();
console.log(`Added ${added} form${added === 1 ? "" : "s"} Sõnaveeb confirms.`);
if (unknown.length) {
  console.log(
    `\nSõnaveeb doesn't know ${unknown.length}. Fix each in the lesson, or, if a source you can name confirms it (ÕS 2025, a name), add it to src/lib/learn/verified-forms.json as "<form>": "by hand: <source>":\n`,
  );
  for (const form of unknown.sort())
    console.log(`  ${form}  https://sonaveeb.ee/search/unif/est/eki/${encodeURIComponent(form)}`);
  process.exitCode = 1;
}
