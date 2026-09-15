#!/usr/bin/env node

/**
 * Load a deck from `content/decks/<name>.json` into a Lymi account through the public API, and
 * optionally publish it. The account is the one the API key belongs to. Run `pnpm load-deck --help`.
 */

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const HELP = `Usage: pnpm load-deck <file> --url <product origin> [--publish]

Creates the deck, its sections in order and every card, as the account LYMI_API_KEY belongs
to. The key needs the write scope, and the API validates every field. Refuses to run when
that account already has an active deck with the same name, so a second run makes no copy.

  --url <origin>   Product origin, for example https://my.lymi.app or http://localhost:5241
  --publish        Also publish the deck; the account must be on PUBLISHER_EMAILS
`;

/** The file's shape, checked before any write so a typo cannot leave half a deck behind. */
export function problemsIn(file) {
  const problems = [];
  if (!file?.deck?.name) problems.push("deck.name is missing");
  if (!file?.publication?.slug) problems.push("publication.slug is missing");
  if (!Array.isArray(file?.sections) || file.sections.length === 0) {
    problems.push("sections is empty");
    return problems;
  }
  for (const [index, section] of file.sections.entries()) {
    if (!section.name) problems.push(`section ${index + 1} has no name`);
    if (!Array.isArray(section.cards) || section.cards.length === 0) {
      problems.push(`section ${section.name ?? index + 1} has no cards`);
    } else if (section.cards.length > 200) {
      problems.push(`section ${section.name} has more than 200 cards`);
    }
    for (const card of section.cards ?? []) {
      if (!card.term) problems.push(`a card in ${section.name ?? index + 1} has no term`);
    }
  }
  const repeated = repeatedTerms(file);
  if (repeated.length) problems.push(`terms appear twice: ${repeated.join(", ")}`);
  return problems;
}

export function parseArgs(argv) {
  const options = { publish: false };
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--publish") options.publish = true;
    else if (arg === "--url") options.url = argv[++i];
    else positional.push(arg);
  }
  return { file: positional[0], ...options };
}

/** Terms that repeat inside the file, which the duplicate rule would silently skip. */
export function repeatedTerms(file) {
  const seen = new Set();
  const repeated = [];
  for (const section of file.sections ?? []) {
    for (const card of section.cards ?? []) {
      if (!card.term) continue;
      const key = card.term.toLowerCase().normalize("NFC");
      if (seen.has(key)) repeated.push(card.term);
      seen.add(key);
    }
  }
  return repeated;
}

async function call(url, key, method, path, body) {
  const response = await fetch(new URL(path, url), {
    method,
    headers: { "x-api-key": key, ...(body && { "content-type": "application/json" }) },
    ...(body && { body: JSON.stringify(body) }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`${method} ${path} failed with ${response.status}: ${JSON.stringify(payload)}`);
  }
  return payload;
}

export async function loadDeck(file, { url, key, publish, log = console.log }) {
  const decks = await call(url, key, "GET", "/api/decks");
  if (decks.some((deck) => deck.name === file.deck.name)) {
    throw new Error(`This account already has a deck named "${file.deck.name}"`);
  }
  const deck = await call(url, key, "POST", "/api/decks", file.deck);
  log(`Created deck ${deck.name} (${deck.id})`);

  let added = 0;
  for (const section of file.sections) {
    const created = await call(url, key, "POST", `/api/decks/${deck.id}/sections`, {
      name: section.name,
    });
    const cards = section.cards.map((card) => ({
      ...card,
      deckId: deck.id,
      sectionId: created.id,
    }));
    const result = await call(url, key, "POST", "/api/cards/batch", { cards });
    const skipped = result.results.filter((outcome) => outcome.status !== "added").length;
    added += cards.length - skipped;
    log(
      `  ${section.name}: ${cards.length - skipped} cards${skipped ? `, ${skipped} skipped` : ""}`,
    );
  }

  if (publish) {
    const { publication } = await call(
      url,
      key,
      "PUT",
      `/api/decks/${deck.id}/publication`,
      file.publication,
    );
    log(`Published at ${publication.addUrl}`);
  }
  return { deckId: deck.id, added };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.file || !args.url) {
    console.log(HELP);
    process.exit(args.help ? 0 : 1);
  }
  const key = process.env.LYMI_API_KEY;
  if (!key) throw new Error("Set LYMI_API_KEY to a write key for the publishing account");
  const file = JSON.parse(readFileSync(args.file, "utf8"));
  const problems = problemsIn(file);
  if (problems.length) throw new Error(`The deck file has problems:\n  ${problems.join("\n  ")}`);
  await loadDeck(file, { url: args.url, key, publish: args.publish });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
