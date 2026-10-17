#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

/** Matches `EDITION_IMPORT_CARDS` in packages/core/src/types.ts; the test holds them together. */
export const PART_CARDS = 500;
const PART_SECTIONS = 500;
const ATTEMPTS = 4;
const RETRIED = new Set([429, 500, 502, 503, 504]);

const USAGE = `Usage: node scripts/publish-edition.mjs <plan|upload|publish> <deck-id> <language> <edition.json> [--apply]

Sends a published deck's edition to the API in parts of at most ${PART_CARDS} cards, all into the same edition.
plan reads only. upload --apply writes every part as drafts. publish --apply writes every part, then signs off and publishes the edition, and only once every part landed.
The file is the edition API's body: { deck, series, sections, cards } with section and card ids.
Needs LYMI_API_KEY, a publisher's write-scoped key. LYMI_API_ORIGIN defaults to https://my.lymi.app.`;

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

export function parseArgs(argv) {
  const [command, deckId, language, file, flag, ...extra] = argv;
  ensure(["plan", "upload", "publish"].includes(command) && deckId && language && file, USAGE);
  ensure(extra.length === 0, USAGE);
  if (command === "plan") ensure(flag === undefined, "plan reads only and takes no --apply");
  else ensure(flag === "--apply", `${command} writes, so it needs --apply`);
  ensure(/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(language), "The language is not a language tag");
  return { command, deckId, language, file };
}

/** Checks what the API would refuse anyway, before any part is sent. */
export function validateEdition(value) {
  ensure(
    value && typeof value === "object" && !Array.isArray(value),
    "The edition must be an object",
  );
  for (const key of Object.keys(value)) {
    ensure(["deck", "series", "sections", "cards"].includes(key), `Unsupported field ${key}`);
  }
  const sections = value.sections ?? [];
  const cards = value.cards ?? [];
  ensure(Array.isArray(sections) && Array.isArray(cards), "sections and cards must be arrays");
  ensure(cards.length > 0, "The edition has no cards");
  ensure(sections.length <= PART_SECTIONS, `At most ${PART_SECTIONS} sections`);
  const unique = (rows, key, what) => {
    const ids = rows.map((row) => row?.[key]);
    ensure(
      ids.every((id) => typeof id === "string" && id),
      `Every ${what} needs a ${key}`,
    );
    ensure(new Set(ids).size === ids.length, `List each ${what} once`);
  };
  unique(sections, "sectionId", "section");
  unique(cards, "cardId", "card");
  return { ...value, sections, cards };
}

/** The deck, series and sections ride on the first part, so a later part never clears them. */
export function partsOf(edition) {
  const parts = [];
  for (let start = 0; start < edition.cards.length; start += PART_CARDS) {
    const cards = edition.cards.slice(start, start + PART_CARDS);
    parts.push(
      start === 0
        ? {
            ...(edition.deck ? { deck: edition.deck } : {}),
            ...(edition.series ? { series: edition.series } : {}),
            sections: edition.sections,
            cards,
          }
        : { sections: [], cards },
    );
  }
  return parts;
}

export function createClient({ key, origin = "https://my.lymi.app", fetchImpl = fetch, wait }) {
  ensure(typeof key === "string" && key.length > 0, "LYMI_API_KEY is required");
  const base = new URL(origin);
  ensure(
    (base.protocol === "https:" && base.hostname === "my.lymi.app") ||
      (base.protocol === "http:" && ["localhost", "127.0.0.1"].includes(base.hostname)),
    "The API origin must be https://my.lymi.app or a loopback address",
  );
  const pause = wait ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  // Every call this script makes lands the same when repeated, so a busy or failed answer is retried.
  return async (method, path, body) => {
    let failure = "";
    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      if (attempt > 0) await pause(1000 * 2 ** (attempt - 1));
      let response;
      try {
        response = await fetchImpl(new URL(path, base), {
          method,
          redirect: "manual",
          headers: {
            "x-api-key": key,
            ...(body === undefined ? {} : { "content-type": "application/json" }),
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
          signal: AbortSignal.timeout(60_000),
        });
      } catch (error) {
        failure = error instanceof Error ? error.message : String(error);
        continue;
      }
      if (response.ok) return response.json();
      const detail = await response.text().catch(() => "");
      failure = `HTTP ${response.status}${detail ? `: ${detail.slice(0, 500)}` : ""}`;
      if (!RETRIED.has(response.status)) break;
    }
    throw new Error(`${method} ${path} failed: ${failure}`);
  };
}

function editionPath(deckId, language) {
  return `/api/decks/${encodeURIComponent(deckId)}/editions/${encodeURIComponent(language)}`;
}

async function currentEdition(call, deckId, language) {
  const { editions } = await call("GET", `/api/decks/${encodeURIComponent(deckId)}/editions`);
  return editions.find((row) => row.language === language) ?? null;
}

/**
 * Writes an edition part by part. A live edition is refused: a part sent over it would put its
 * cards back to draft, and learners would read the original until all of it is signed off again.
 */
export async function upload(call, { deckId, language }, edition, log = () => {}) {
  const current = await currentEdition(call, deckId, language);
  ensure(
    current?.status !== "published",
    `The ${language} edition is live. Withdraw it first, or upload to a deck whose edition is not published.`,
  );
  const parts = partsOf(edition);
  let report = current;
  for (const [index, part] of parts.entries()) {
    try {
      report = await call("PUT", editionPath(deckId, language), part);
    } catch (error) {
      throw new Error(
        `Part ${index + 1} of ${parts.length} failed; nothing was published. Run the same command again to resend every part. ${error.message}`,
      );
    }
    log(`Part ${index + 1} of ${parts.length}: ${part.cards.length} cards written as drafts.`);
  }
  return report;
}

export async function publish(call, target, edition, log = () => {}) {
  await upload(call, target, edition, log);
  const approved = await call(
    "POST",
    `${editionPath(target.deckId, target.language)}/approval`,
    {},
  );
  ensure(
    approved.blockers.length === 0,
    `Every part landed, but the edition is not ready: ${approved.blockers.join(" ")}`,
  );
  return call("PUT", `${editionPath(target.deckId, target.language)}/publication`);
}

export async function main(argv = process.argv.slice(2), env = process.env, log = console.log) {
  const target = parseArgs(argv);
  const edition = validateEdition(JSON.parse(await readFile(target.file, "utf8")));
  const parts = partsOf(edition);
  const call = createClient({ key: env.LYMI_API_KEY, origin: env.LYMI_API_ORIGIN });
  if (target.command === "plan") {
    const current = await currentEdition(call, target.deckId, target.language);
    log(
      `${edition.cards.length} cards in ${parts.length} parts. The ${target.language} edition is ${current?.status ?? "new"}. Nothing was written.`,
    );
  } else if (target.command === "upload") {
    const report = await upload(call, target, edition, log);
    log(`Every part landed as drafts: ${report.missing} of ${report.total} still to sign off.`);
  } else {
    const report = await publish(call, target, edition, log);
    log(
      `The ${target.language} edition is ${report.status}: ${report.ready} of ${report.total} signed off.`,
    );
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
