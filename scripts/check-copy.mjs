#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const SKILL = ".agents/skills/public-writing/SKILL.md";
const CATALOG = "apps/site/src/locales/en.po";
const PROSE = [
  "apps/site/src/content/*.md",
  "apps/site/src/content/*.mdx",
  "apps/mobile/store/listing/*.md",
];

export const RULES = [
  {
    id: "scheduling claim",
    pattern: /\b(?:just )?as (?:it|they) starts? to fade|right before you(?:[’']d)? forget/i,
    fix: "say what the schedule does: a card you remember waits longer, one you forget comes back soon",
    since: 1153,
  },
  {
    id: "promise",
    pattern:
      /\b(?:remember|learn|keep|know)\b[^.!?]*\b(?:for good|forever)\b|\bmakes? (?:it|them|everything) stick\b|\bnever forget\b|\bstays? with you\b/i,
    fix: "nobody can promise this; say what the learner does or what the app does next",
    since: 1153,
  },
  {
    id: "thing that acts",
    pattern:
      /\b(?:cards?|terms?|words?|it|they|each one|decks?|everything)\b[^.!?]{0,24}\bland(?:s|ed)? (?:in|here|back|on)\b|\bsteps? aside\b|\blean(?:s|ed)? on\b|\bcounts? as yours\b/i,
    fix: "use the literal verb: Lymi adds, shows, saves or imports it",
    since: 1153,
  },
  {
    id: "filler claim",
    pattern:
      /\bworth (?:remembering|keeping|knowing|learning)\b|\bwhatever else\b|\bsend it anything\b/i,
    fix: "name the things: a word, a formula, a date",
    since: 1153,
  },
  {
    id: "hype",
    pattern:
      /\b(?:unlock(?:s|ing)?|effortless(?:ly)?|seamless(?:ly)?|supercharg\w*|game[- ]chang\w*|revolutioni[sz]\w*|next level|say goodbye to|like never before|cutting[- ]edge|delve|blazing(?:ly)? fast)\b/i,
    fix: "state the fact, with a number if there is one, or delete the line",
    since: 1153,
  },
  {
    id: "contrast",
    pattern: /\b(?:not (?:just|only|merely)|more than just)\b[^.!?]{1,60}\b(?:but|it[’']s)\b/i,
    fix: "state the point; keep the negative half only when a reader believes it",
    since: 1153,
  },
  {
    id: "throat-clearing",
    pattern:
      /^(?:imagine|picture this|ever wondered|let[’']s face it|in today[’']s|whether you[’']re)\b/i,
    fix: "open with what the reader can do or find out",
    since: 1153,
  },
];

const NAMES =
  /\b(?:ChatGPT|Claude(?: Code)?|Gemini(?: CLI)?|Grok(?: Bot)?|Codex|Cursor|Perplexity|Anki|Quizlet|Mochi|Noji|Pleco|Readwise|Japanese|Chinese|Mandarin|Cantonese|Korean|Spanish|French|German|Italian|Portuguese|Polish|Ukrainian|Estonian|Finnish|Dutch|Turkish|Arabic|Hebrew|Hindi|English)\b/g;
export const SAME_SLOGAN = 3;
const RULES_FROM = "2026-11-22";

export function readCatalog(source) {
  const messages = [];
  let id = null;
  for (const line of source.split("\n")) {
    if (line.startsWith("msgid ")) id = JSON.parse(line.slice("msgid ".length));
    else if (line.startsWith("msgstr ")) {
      if (id) messages.push(id);
      id = null;
    } else if (id !== null && line.startsWith('"')) id += JSON.parse(line);
  }
  return messages;
}

const words = (text) =>
  text
    .replaceAll(/<[^>]*>|\{[^}]*\}/g, " ")
    .replaceAll("’", "'")
    .replaceAll(/\s+/g, " ")
    .trim();

export function phraseProblems(where, text) {
  const plain = text.replaceAll(/<[^>]*>/g, "");
  return RULES.flatMap(({ id, pattern, fix, since }) => {
    const hit = plain.match(pattern)?.[0];
    return hit ? [{ where, text, hit, rule: id, fix: `${fix} (#${since})` }] : [];
  });
}

export function skeleton(text) {
  const plain = words(text);
  const named = plain.match(NAMES);
  if (!named || !/[.!]$/.test(plain) || plain.split(" ").length > 12) return null;
  return plain.replaceAll(NAMES, "…");
}

export function sloganProblems(messages) {
  const groups = new Map();
  for (const text of messages) {
    const shape = skeleton(text);
    if (shape) groups.set(shape, [...(groups.get(shape) ?? []), text]);
  }
  return [...groups]
    .filter(([, texts]) => texts.length >= SAME_SLOGAN)
    .map(([shape, texts]) => ({
      where: CATALOG,
      text: texts.join(" | "),
      hit: shape,
      rule: "same slogan",
      fix: `${texts.length} lines differ only by a name; say something true of one page only, or write one shared line (#1153)`,
    }));
}

export function isKnown(problem, known) {
  return known.some((each) => each.rule === problem.rule && problem.text.includes(each.text));
}

const isRecord = (file) =>
  (file.match(/\/changelog\/(\d{4}-\d{2}-\d{2})-/)?.[1] ?? RULES_FROM) < RULES_FROM;

function tracked(globs) {
  return execFileSync("git", ["ls-files", "--", ...globs], { cwd: root, encoding: "utf8" })
    .split("\n")
    .filter(Boolean);
}

const read = (file) => readFileSync(resolve(root, file), "utf8");

function proseProblems(file) {
  let fenced = false;
  return read(file)
    .split("\n")
    .flatMap((line, i) => {
      if (/^\s*```/.test(line)) fenced = !fenced;
      return fenced ? [] : phraseProblems(`${file}:${i + 1}`, line);
    });
}

export function check(files) {
  if (files.length > 0) return files.flatMap(proseProblems);
  const messages = readCatalog(read(CATALOG));
  return [
    ...messages.flatMap((text) => phraseProblems(CATALOG, text)),
    ...sloganProblems(messages),
    ...tracked(PROSE)
      .filter((file) => !isRecord(file))
      .flatMap(proseProblems),
  ];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const files = process.argv.slice(2);
  const known = JSON.parse(read("scripts/copy-known.json"));
  const found = check(files);
  const problems = found.filter((problem) => !isKnown(problem, known));
  for (const { where, text, hit, rule, fix } of problems) {
    console.error(`${where}: ${rule}: “${hit}” in “${text.trim().slice(0, 200)}”\n  ${fix}\n`);
  }
  const stale = files.length
    ? []
    : known.filter((each) => !found.some((problem) => isKnown(problem, [each])));
  for (const each of stale) {
    console.error(`scripts/copy-known.json: “${each.text}” is gone; delete its entry\n`);
  }
  if (problems.length + stale.length > 0) {
    console.error(`${problems.length + stale.length} line(s) to rewrite; ${SKILL} says how.`);
    process.exit(1);
  }
}
