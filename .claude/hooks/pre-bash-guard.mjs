#!/usr/bin/env node
// Claude Code PreToolUse hook: refuses a command Lymi never wants an agent to run and names the one to run instead.
// AGENTS.md states the same rules for agents that do not run hooks; scripts/pre-bash-guard.test.mjs covers each.
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { pathToFileURL } from "node:url";

export const FULL_SUITE = "LYMI_FULL_SUITE";

const production = (command) =>
  `\`${command}\` touches production, which the user runs (AGENTS.md, "Leave alone"). The post-merge build deploys and applies pending migrations. Run \`pnpm deploy:check\` to check a build, or \`pnpm deploy:health\` to see what is live.`;

const stash = (command) =>
  `\`${command}\` can take another session's work, because every worktree shares one stash stack. Set work aside with a WIP commit, or run \`git stash push -u -m "<unique tag>"\`, note its SHA from \`git stash list --format='%H %gs'\`, restore it with \`git stash apply <sha>\`, and drop it with \`git stash drop stash@{n}\` after finding n by its tag.`;

const phone = (command) =>
  `\`${command}\` compiles a dev client for this worktree alone. From apps/mobile, run \`pnpm exec stim start\` and then \`pnpm exec stim ios\`, which installs the shared cached dev client (\`pnpm exec stim ios --no-build-cache\` rebuilds it); to verify a change, run \`node .agents/skills/verify-phone/scripts/stack.mjs start\`. The smoke journey's Release build stays allowed: \`npx expo run:ios --configuration Release --device <udid> --no-bundler\`.`;

const e2e = (command) =>
  `\`${command}\` runs every browser. Run \`pnpm test:e2e:chromium\`, or name the specs or the \`--project\` you need. When WebKit, mobile, PWA, navigation, caching, focus, touch, sheet or dialog behaviour is at risk (AGENTS.md, "Before you push"), run \`${FULL_SUITE}=1 pnpm test:e2e\`.`;

const verify = (command) =>
  `\`${command}\` runs every test. Run \`pnpm verify:changed\`, which hands over to the full gate itself when the diff touches configuration the tests depend on. When the user asks for the full gate, run \`${FULL_SUITE}=1 pnpm verify\`.`;

const productionScripts = new Set([
  "deploy",
  "deploy:product",
  "deploy:site",
  "deploy:ci",
  "design:deploy",
  "design:deploy:ci",
  "db:migrate:prod",
]);

const wrappers = new Set([
  "command",
  "exec",
  "nohup",
  "time",
  "sudo",
  "nice",
  "caffeinate",
  "{",
  "!",
]);
const shells = new Set(["bash", "sh", "zsh"]);
const keywords = new Set(["if", "then", "elif", "else", "do", "while", "until"]);

/** Returns why `command` is refused, or null when it may run. */
export function check(command, inherited = new Map()) {
  const exported = new Map(inherited);
  for (const words of segments(command)) {
    if (words[0] === "export") {
      for (const word of words.slice(1)) assign(exported, word);
      continue;
    }
    const reason = inspect(words, new Map(exported));
    if (reason) return reason;
  }
  return null;
}

function assign(env, word) {
  const [name, ...value] = word.split("=");
  if (value.length) env.set(name, value.join("="));
}

function inspect(input, env) {
  let words = input;
  for (;;) {
    while (words.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[0])) {
      assign(env, words[0]);
      words = words.slice(1);
    }
    const head = words[0];
    if (head === undefined) return null;
    if (keywords.has(head)) {
      words = words.slice(1);
    } else if (head === "env") {
      words = words.slice(1);
      while (words[0]?.startsWith("-")) words = words.slice(1);
    } else if (head === "timeout") {
      words = words.slice(1);
      while (words[0]?.startsWith("-")) words = words.slice(1);
      words = words.slice(1);
    } else if (wrappers.has(head)) {
      words = words.slice(1);
      while (words[0]?.startsWith("-")) words = words.slice(1);
    } else {
      break;
    }
  }

  const program = basename(words[0]).replace(/(?<=.)@[^@]*$/, "");
  const args = words.slice(1);
  if (shells.has(program)) {
    const flag = args.findIndex((arg) => /^-[a-z]*c[a-z]*$/.test(arg));
    return flag === -1 || args[flag + 1] === undefined ? null : check(args[flag + 1], env);
  }
  if (program === "git") return git(args);
  if (program === "pnpm") return pnpm(args, env);
  if (program === "npm" || program === "yarn") return npm(program, args, env);
  if (program === "npx" || program === "bunx")
    return inspect(skipOptions(args, ["-p", "--package"]), env);
  if (program === "wrangler") return wrangler(args);
  if (program === "expo") return expo(args);
  if (program === "playwright")
    return args[0] === "test" ? suite("playwright test", args.slice(1), env) : null;
  return null;
}

function git(input) {
  let args = input;
  while (args[0]?.startsWith("-")) {
    args = ["-C", "-c", "--git-dir", "--work-tree", "--namespace"].includes(args[0])
      ? args.slice(2)
      : args.slice(1);
  }
  if (args[0] !== "stash") return null;
  const rest = args.slice(1);
  const [sub, entry] =
    !rest.length || rest[0].startsWith("-") ? ["push", rest] : [rest[0], rest.slice(1)];
  const named = entry.some((arg) => !arg.startsWith("-"));
  if (sub === "pop" || sub === "clear") return stash(`git stash ${sub}`);
  if ((sub === "apply" || sub === "drop") && !named) return stash(`git stash ${sub}`);
  if (sub === "save" && !named) return stash("git stash save");
  if (sub === "push" && !entry.some((arg) => /^(-m|--message)/.test(arg))) {
    return stash(rest.length ? `git stash ${rest.join(" ")}` : "git stash");
  }
  return null;
}

const pnpmValues = [
  "--filter",
  "-F",
  "-C",
  "--dir",
  "--reporter",
  "--loglevel",
  "--workspace-concurrency",
];

function pnpm(input, env) {
  const args = skipOptions(input, pnpmValues);
  const [sub, ...rest] = args;
  if (sub === undefined) return null;
  if (sub === "exec" || sub === "dlx") return inspect(skipOptions(rest, pnpmValues), env);
  if (sub === "run" || sub === "run-script") {
    const [script, ...scriptArgs] = skipOptions(rest, pnpmValues);
    return script === undefined ? null : runScript(script, scriptArgs, env);
  }
  return runScript(sub, rest, env) ?? inspect(args, env);
}

function npm(program, args, env) {
  const [sub, ...rest] = skipOptions(args, ["-w", "--workspace"]);
  if (sub === "exec" || sub === "dlx") return inspect(skipOptions(rest, ["-p", "--package"]), env);
  if (sub === "run" || sub === "run-script") {
    const [script, ...scriptArgs] = skipOptions(rest, []);
    return script === undefined ? null : runScript(script, scriptArgs, env);
  }
  return program === "yarn" && sub !== undefined ? runScript(sub, rest, env) : null;
}

function runScript(name, args, env) {
  if (productionScripts.has(name)) return production(`pnpm ${name}`);
  if (name === "ios") return expo(["run:ios", ...args]);
  if (name === "test:e2e") return suite("pnpm test:e2e", args, env);
  if (name === "verify" && !optedIn(env)) return verify("pnpm verify");
  return null;
}

const wranglerValues = new Set([
  "-c",
  "--config",
  "-e",
  "--env",
  "--cwd",
  "--name",
  "--tag",
  "--message",
  "--command",
  "--file",
  "--persist-to",
]);

function wrangler(args) {
  const words = [];
  for (let i = 0; i < args.length; i++) {
    if (wranglerValues.has(args[i])) i++;
    else if (!args[i].startsWith("-")) words.push(args[i]);
  }
  const named = (count) => production(`wrangler ${words.slice(0, count).join(" ")}`);
  if (words[0] === "deploy") return args.includes("--dry-run") ? null : named(1);
  if (words[0] === "rollback" || words[0] === "delete") return named(1);
  if (words[0] === "versions" && words[1] === "deploy") return named(2);
  const secret = words.indexOf("secret");
  if (secret !== -1 && ["put", "delete", "bulk"].includes(words[secret + 1]))
    return named(secret + 2);
  const remote = args.includes("--remote");
  if (remote && words[0] === "d1" && words[1] === "execute") return named(2);
  if (remote && words[0] === "d1" && words[1] === "migrations" && words[2] === "apply")
    return named(3);
  return null;
}

function expo(args) {
  if (args[0] !== "run:ios") return null;
  const release = args.some(
    (arg, i) =>
      arg === "--configuration=Release" || (arg === "--configuration" && args[i + 1] === "Release"),
  );
  const device = args.some((arg) => arg === "--device" || arg.startsWith("--device="));
  return release && device ? null : phone(["expo", ...args].join(" "));
}

const playwrightValues = new Set([
  "--reporter",
  "--workers",
  "-j",
  "--retries",
  "--repeat-each",
  "--timeout",
  "--max-failures",
  "--shard",
  "--config",
  "-c",
  "--output",
  "--trace",
  "--grep-invert",
  "--tsconfig",
]);
const playwrightNarrowing =
  /^(--project|-g|--grep|--last-failed|--only-changed|--list|--ui|--debug)(=|$)/;

function suite(command, args, env) {
  if (optedIn(env)) return null;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--") continue;
    if (playwrightValues.has(arg)) i++;
    else if (!arg.startsWith("-") || playwrightNarrowing.test(arg)) return null;
  }
  return e2e(command);
}

function optedIn(env) {
  const value = env.get(FULL_SUITE);
  return value !== undefined && value !== "" && value !== "0";
}

function skipOptions(args, valued) {
  let i = 0;
  while (i < args.length && args[i].startsWith("-")) i += valued.includes(args[i]) ? 2 : 1;
  return args.slice(i);
}

/** Splits a shell command into simple commands, each a list of words with quotes removed. */
export function segments(command) {
  const result = [];
  let words = [];
  let word = null;
  let skipTarget = false;
  const heredocs = [];

  const endWord = () => {
    if (word === null) return;
    if (skipTarget) skipTarget = false;
    else words.push(word);
    word = null;
  };
  const endSegment = () => {
    endWord();
    if (words.length) result.push(words);
    words = [];
  };

  for (let i = 0; i < command.length; i++) {
    const c = command[i];
    if (c === "'") {
      const close = command.indexOf("'", i + 1);
      const end = close === -1 ? command.length : close;
      word = (word ?? "") + command.slice(i + 1, end);
      i = end;
    } else if (c === '"') {
      let text = "";
      for (i++; i < command.length && command[i] !== '"'; i++) {
        if (command[i] === "\\" && i + 1 < command.length) i++;
        text += command[i];
      }
      word = (word ?? "") + text;
    } else if (c === "\\") {
      if (command[i + 1] !== "\n") word = (word ?? "") + (command[i + 1] ?? "");
      i++;
    } else if (c === "#" && word === null) {
      while (i + 1 < command.length && command[i + 1] !== "\n") i++;
    } else if (c === "\n") {
      endSegment();
      for (const delimiter of heredocs.splice(0)) {
        let end = command.indexOf("\n", i + 1);
        while (end !== -1 && command.slice(i + 1, end).replace(/^\t+/, "") !== delimiter) {
          i = end;
          end = command.indexOf("\n", i + 1);
        }
        i = end === -1 ? command.length : end;
      }
    } else if (c === " " || c === "\t") {
      endWord();
    } else if (c === ">" || c === "<") {
      if (word !== null && /^\d+$/.test(word)) word = null;
      endWord();
      const operator = command.slice(i).match(/^(<<<|<<-?|>>|>\||<>|[<>])(&[\d-]*)?/)[0];
      i += operator.length - 1;
      if (operator.startsWith("<<") && !operator.startsWith("<<<")) {
        const rest = command.slice(i + 1).match(/^\s*(['"]?)([^\s'"]+)\1/);
        if (rest) {
          heredocs.push(rest[2]);
          i += rest[0].length;
        }
      } else if (!operator.includes("&")) {
        skipTarget = true;
      }
    } else if (c === "&" && command[i + 1] === ">") {
      endWord();
      i += command[i + 2] === ">" ? 2 : 1;
      skipTarget = true;
    } else if ("|&;()`".includes(c) || (c === "$" && command[i + 1] === "(")) {
      endSegment();
      if (c === "$" || command[i + 1] === c) i++;
    } else {
      word = (word ?? "") + c;
    }
  }
  endSegment();
  return result;
}

function main() {
  let command;
  try {
    const input = JSON.parse(readFileSync(0, "utf8"));
    if (input.tool_name !== "Bash") return;
    command = input.tool_input?.command;
  } catch {
    return;
  }
  if (typeof command !== "string") return;
  const reason = check(command);
  if (!reason) return;
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    }),
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
