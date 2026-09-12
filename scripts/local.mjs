#!/usr/bin/env node

/**
 * Drive the local product server from a terminal: become a persona, seed or empty an
 * account, move due dates, or print the state. Talks to the `/api/dev` routes, which only
 * exist while the product is served from localhost. Run `pnpm local --help`.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, renameSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const web = resolve(root, "apps/web");

export const HELP = `Usage: pnpm local <command> [options]

Commands
  personas                    List the personas and what each one starts with
  url [persona] [path]        Print the URL that signs a persona in (default: learner, /today)
  open [persona] [path]       Open that URL in the default browser
  state                       Who is signed in and what the account holds
  seed [persona] [--reset]    Load a persona's data into the account (reset: even if not empty)
  reset                       Empty the account
  due <n|all>                 Make exactly n cards due now
  db:fresh                    Move the local D1 aside and apply every migration again

Options
  --as <persona>              Account to act on (default: $LYMI_PERSONA, then learner)
  --url <origin>              Product origin (default: $LYMI_URL, then PRODUCT_URL in
                              apps/web/.dev.vars, then http://localhost:5241)
`;

export function parseArgs(argv) {
  const positional = [];
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--reset") options.reset = true;
    else if (arg.startsWith("--")) {
      const [key, inline] = arg.slice(2).split("=", 2);
      options[key] = inline ?? argv[++i];
    } else positional.push(arg);
  }
  return { command: positional[0], args: positional.slice(1), options };
}

/** The origin the product is served from, in the order the help text states. */
export function baseUrl(options = {}, env = process.env, devVars = readDevVars()) {
  const raw = options.url ?? env.LYMI_URL ?? devVars.PRODUCT_URL ?? "http://localhost:5241";
  return raw.replace(/\/+$/, "");
}

function readDevVars() {
  const file = resolve(web, ".dev.vars");
  if (!existsSync(file)) return {};
  return parseDevVars(readFileSync(file, "utf8"));
}

export function parseDevVars(text) {
  const vars = {};
  for (const line of text.split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (match) vars[match[1]] = match[2];
  }
  return vars;
}

/** Turn a response's Set-Cookie headers into one Cookie header for the next request. */
export function cookieHeader(setCookies) {
  return setCookies
    .map((c) => c.split(";", 1)[0])
    .filter((pair) => pair.includes("="))
    .join("; ");
}

async function call(base, path, { method = "GET", body, cookie } = {}) {
  const headers = { accept: "application/json" };
  if (body !== undefined) headers["content-type"] = "application/json";
  if (cookie) headers.cookie = cookie;
  let response;
  try {
    response = await fetch(`${base}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: "manual",
      signal: AbortSignal.timeout(60_000),
    });
  } catch (error) {
    throw new Error(`Could not reach ${base}. Is the product server running? (${error.message})`);
  }
  if (response.status === 404) {
    throw new Error(`${base} has no developer tools. They exist only on a localhost PRODUCT_URL.`);
  }
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text.slice(0, 200) };
  }
  if (!response.ok) throw new Error(data.error ?? `HTTP ${response.status}`);
  return { data, cookie: cookieHeader(response.headers.getSetCookie()) };
}

/** Sign the persona in without seeding, so the account is acted on as it is. */
async function session(base, persona) {
  const { cookie } = await call(base, `/api/dev/sign-in?as=${encodeURIComponent(persona)}&seed=0`, {
    method: "POST",
  });
  return cookie;
}

function describe(counts) {
  return `${counts.decks} decks, ${counts.cards} cards, ${counts.due} due, ${counts.reviews} reviews`;
}

export async function run(argv, { stdout = process.stdout, env = process.env } = {}) {
  const { command, args, options } = parseArgs(argv);
  if (!command || options.help) {
    stdout.write(HELP);
    return;
  }
  const base = baseUrl(options, env);
  const persona = options.as ?? env.LYMI_PERSONA ?? "learner";

  switch (command) {
    case "personas": {
      const { data } = await call(base, "/api/dev/personas");
      for (const p of data.personas) {
        const due = p.dueNow === "all" ? "all due" : `${p.dueNow} due`;
        stdout.write(
          `${p.id.padEnd(10)} ${p.name.padEnd(10)} ${p.decks} decks, ${p.cards} cards, ${due}\n`,
        );
        stdout.write(`${"".padEnd(21)} ${p.description}\n`);
      }
      stdout.write(`\nSign in: ${base}/api/dev/sign-in?as=<id>\n`);
      return;
    }
    case "url":
    case "open": {
      const id = args[0] ?? persona;
      const path = args[1] ?? "/today";
      const url = `${base}/api/dev/sign-in?as=${encodeURIComponent(id)}&returnTo=${encodeURIComponent(path)}`;
      stdout.write(`${url}\n`);
      if (command === "open")
        execFileSync(process.platform === "darwin" ? "open" : "xdg-open", [url]);
      return;
    }
    case "state": {
      const cookie = await session(base, persona);
      const { data } = await call(base, "/api/dev/state", { cookie });
      const who = data.persona ? `${data.persona.id} (${data.user.email})` : data.user.email;
      stdout.write(
        `${who}\n${describe(data.counts)}\nlanguage ${data.settings.appLanguage ?? "not chosen"}, meanings ${data.settings.meaningLanguage}\n`,
      );
      return;
    }
    case "seed": {
      const cookie = await session(base, persona);
      const which = args[0] ?? persona;
      if (!options.reset) {
        const { data } = await call(base, "/api/dev/state", { cookie });
        if (data.counts.decks > 0) {
          stdout.write(
            `${persona} already has ${describe(data.counts)}. Add --reset to replace it.\n`,
          );
          return;
        }
      }
      const { data } = await call(base, "/api/dev/seed", {
        method: "POST",
        body: { persona: which },
        cookie,
      });
      stdout.write(`Seeded ${which} into ${persona}: ${describe(data.counts)}\n`);
      return;
    }
    case "reset": {
      const cookie = await session(base, persona);
      const { data } = await call(base, "/api/dev/reset", { method: "POST", cookie });
      stdout.write(`Emptied ${persona}: ${describe(data.counts)}\n`);
      return;
    }
    case "due": {
      const raw = args[0];
      const count = raw === "all" ? "all" : Number(raw);
      if (count !== "all" && !Number.isInteger(count)) throw new Error("due takes a number or all");
      const cookie = await session(base, persona);
      const { data } = await call(base, "/api/dev/due", {
        method: "POST",
        body: { count },
        cookie,
      });
      stdout.write(`${persona}: ${data.due} due now. ${describe(data.counts)}\n`);
      return;
    }
    case "db:fresh": {
      const state = resolve(web, ".wrangler/state");
      if (existsSync(state)) {
        const aside = `${state}.${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}`;
        renameSync(state, aside);
        stdout.write(`Moved the old local D1 to ${aside}\n`);
      }
      execFileSync("pnpm", ["--filter", "@lymi/web", "db:migrate"], {
        cwd: root,
        stdio: "inherit",
      });
      stdout.write("Fresh local D1. Restart the product server if it was running.\n");
      return;
    }
    default:
      throw new Error(`Unknown command: ${command}\n\n${HELP}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await run(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
