#!/usr/bin/env node

import { pathToFileURL } from "node:url";

const USAGE = `Usage: node scripts/withdraw-deck.mjs <deck-id> [--redirect-to <slug>] [--apply]

Withdraws a published deck: it leaves Explore and the sitemap, nobody new can add it, and learners who added it keep it.
With --redirect-to, its public page sends visitors to that deck for good. The API refuses a target that is not published.
Run on a deck that is already withdrawn, it sets or moves the redirect. Publishing the deck again brings it back.
Without --apply it only reads. Needs LYMI_API_KEY, the publisher's write-scoped key. LYMI_API_ORIGIN defaults to https://my.lymi.app.`;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

export function parseArgs(argv) {
  const options = { deckId: undefined, redirectTo: undefined, apply: false };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--apply") options.apply = true;
    else if (arg === "--redirect-to") {
      options.redirectTo = argv[++index];
      ensure(
        options.redirectTo && SLUG.test(options.redirectTo),
        "--redirect-to needs a deck slug",
      );
    } else if (!arg.startsWith("-") && !options.deckId) options.deckId = arg;
    else throw new Error(USAGE);
  }
  ensure(options.deckId, USAGE);
  return options;
}

export function createClient({ key, origin = "https://my.lymi.app", fetchImpl = fetch }) {
  ensure(typeof key === "string" && key.length > 0, "LYMI_API_KEY is required");
  const base = new URL(origin);
  ensure(
    (base.protocol === "https:" && base.hostname === "my.lymi.app") ||
      (base.protocol === "http:" && ["localhost", "127.0.0.1"].includes(base.hostname)),
    "The API origin must be https://my.lymi.app or a loopback address",
  );
  return async (method, path) => {
    const response = await fetchImpl(new URL(path, base), {
      method,
      redirect: "manual",
      headers: { "x-api-key": key },
      signal: AbortSignal.timeout(30_000),
    });
    if (response.ok) return response.json();
    const detail = await response.text().catch(() => "");
    throw new Error(
      `${method} ${path} failed: HTTP ${response.status}${detail ? `: ${detail.slice(0, 500)}` : ""}`,
    );
  };
}

export async function withdraw(call, { deckId, redirectTo, apply }) {
  const path = `/api/decks/${encodeURIComponent(deckId)}/publication`;
  const { publication } = await call("GET", path);
  ensure(publication, "This deck has never been published");
  if (redirectTo) ensure(redirectTo !== publication.slug, "A deck cannot redirect to its own page");
  const plan = `${publication.slug} (${publication.status})${redirectTo ? ` -> ${redirectTo}` : ""}`;
  if (!apply) return `Would withdraw ${plan}. Nothing was written; add --apply to withdraw.`;
  const query = redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : "";
  const result = (await call("DELETE", `${path}${query}`)).publication;
  ensure(result?.status === "withdrawn", "The API did not confirm the withdrawal");
  return `Withdrew ${result.slug}${result.redirectTo ? `; its page now redirects to ${result.redirectTo}` : ""}.`;
}

export async function main(argv = process.argv.slice(2), env = process.env, log = console.log) {
  const options = parseArgs(argv);
  const call = createClient({ key: env.LYMI_API_KEY, origin: env.LYMI_API_ORIGIN });
  log(await withdraw(call, options));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
