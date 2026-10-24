#!/usr/bin/env node

import { pathToFileURL } from "node:url";

const ACTIONS = ["dismiss", "archive_card", "archive_deck", "suspend_sharing"];

const USAGE = `Usage: pnpm moderate <list|show|resolve> [...]

  list [--resolved]           Open reports, oldest first, or the latest resolved ones.
  show <report-id>            One report: the content as reported, who sent it, who owns it.
  resolve <report-id> <action> --apply
                              ${ACTIONS.join(", ")}.

Archiving cannot be undone by the owner, and suspend_sharing archives every deck the owner shares
and stops them sharing again. docs/operations.md, "A content report arrives".
Needs LYMI_API_KEY, a write-scoped key on an account in OPERATOR_EMAILS. LYMI_API_ORIGIN defaults to https://my.lymi.app.`;

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

export function parseArgs(argv) {
  const [command, ...rest] = argv;
  if (command === "list") {
    ensure(rest.length === 0 || (rest.length === 1 && rest[0] === "--resolved"), USAGE);
    return { command, status: rest[0] === "--resolved" ? "resolved" : "open" };
  }
  if (command === "show") {
    ensure(rest.length === 1 && rest[0], USAGE);
    return { command, id: rest[0] };
  }
  if (command === "resolve") {
    const [id, action, flag, ...extra] = rest;
    ensure(id && ACTIONS.includes(action) && extra.length === 0, USAGE);
    ensure(flag === "--apply", "resolve writes, so it needs --apply");
    return { command, id, action };
  }
  throw new Error(USAGE);
}

export function createClient({ key, origin = "https://my.lymi.app", fetchImpl = fetch }) {
  ensure(key, "Set LYMI_API_KEY to an operator's write-scoped key");
  return async (method, path, body) => {
    const response = await fetchImpl(`${origin}${path}`, {
      method,
      headers: { "x-api-key": key, "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    const json = text ? JSON.parse(text) : null;
    if (!response.ok) throw new Error(`${response.status}: ${json?.error ?? text}`);
    return json;
  };
}

const REASONS = {
  offensive: "Hateful or offensive",
  sexual: "Sexual content",
  harassment: "Harassment or bullying",
  spam: "Spam or a scam",
  other: "Something else",
};

const person = (who) => (who ? `${who.name} <${who.email}>` : "deleted account");

/** One report as lines a person reads in a terminal. */
export function describeReport(report) {
  const card = report.card;
  return [
    `${report.id}  ${report.status === "open" ? "OPEN" : `resolved: ${report.action}`}  ${report.createdAt}`,
    `  Reason: ${REASONS[report.reason] ?? report.reason}`,
    ...(report.note ? [`  Note: ${report.note}`] : []),
    `  Deck: ${report.deck.name} (${report.deck.id ?? "erased"}), ${report.deck.members} members`,
    ...(card
      ? [
          `  Card: ${card.term}${card.id ? ` (${card.id})` : " (erased)"}`,
          ...(card.meaning ? [`  Meaning: ${card.meaning}`] : []),
          ...(card.example ? [`  Example: ${card.example}`] : []),
          ...(card.notes ? [`  Notes: ${card.notes}`] : []),
        ]
      : []),
    `  Owner: ${person(report.owner)}, ${report.ownerReports} report(s) against them`,
    `  Reporter: ${person(report.reporter)}, ${report.via === "join" ? "from the join page" : "a member"}`,
  ].join("\n");
}

export async function main(argv = process.argv.slice(2), env = process.env, log = console.log) {
  const args = parseArgs(argv);
  const call = createClient({ key: env.LYMI_API_KEY, origin: env.LYMI_API_ORIGIN });
  if (args.command === "list") {
    const reports = await call("GET", `/api/moderation/reports?status=${args.status}`);
    log(reports.length ? reports.map(describeReport).join("\n\n") : `No ${args.status} reports.`);
  } else if (args.command === "show") {
    log(
      describeReport(await call("GET", `/api/moderation/reports/${encodeURIComponent(args.id)}`)),
    );
  } else {
    const report = await call(
      "POST",
      `/api/moderation/reports/${encodeURIComponent(args.id)}/resolve`,
      { action: args.action },
    );
    log(describeReport(report));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
