#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const SKILL = ".agents/skills/model-check";
const MODELS = `${SKILL}/models`;
const MANIFEST = `${MODELS}/models.json`;
const CONFIRMED = `${MODELS}/confirmed.json`;

const HOLDS = 0;
const VIOLATED = 12;

const read = (file) => readFileSync(resolve(root, file), "utf8");

export function guardsIn(config) {
  return [...config.matchAll(/^\s*(\w+)\s*=\s*(TRUE|FALSE)\s*$/gm)].map(([, name, value]) => ({
    name,
    on: value === "TRUE",
  }));
}

export function invariantsIn(config) {
  return [...config.matchAll(/^\s*INVARIANT\s+(\w+)\s*$/gm)].map(([, name]) => name);
}

export function withGuardOff(config, guard) {
  return config.replace(new RegExp(`^(\\s*${guard}\\s*=\\s*)TRUE(\\s*)$`, "m"), "$1FALSE$2");
}

export function parseTlc(output, status) {
  return {
    status,
    states: Number(output.match(/(\d+) distinct states found, 0 states left/)?.[1] ?? Number.NaN),
    violated: output.match(/Invariant (\w+) is violated/)?.[1] ?? null,
  };
}

function declarations(tree) {
  const found = new Map();
  const visit = (node) => {
    const name = node.name && ts.isIdentifier(node.name) ? node.name.text : null;
    const isFunction = ts.isFunctionDeclaration(node) && node.body;
    const isConstant = ts.isVariableDeclaration(node) && node.initializer;
    if (name && (isFunction || isConstant) && !found.has(name)) found.set(name, node);
    ts.forEachChild(node, visit);
  };
  visit(tree);
  return found;
}

export function fingerprint(file, source, symbols) {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const found = declarations(tree);
  const printer = ts.createPrinter({ removeComments: true });
  const missing = symbols.filter((symbol) => !found.has(symbol));
  const text = symbols
    .filter((symbol) => found.has(symbol))
    .map((symbol) => printer.printNode(ts.EmitHint.Unspecified, found.get(symbol), tree))
    .join("\n")
    .replaceAll(/\s+/g, " ");
  return { missing, hash: createHash("sha256").update(text).digest("hex").slice(0, 16) };
}

export function confirmationsFor(models, readFile = read) {
  const confirmed = {};
  for (const [model, { covers }] of Object.entries(models)) {
    confirmed[model] = {};
    for (const [file, symbols] of Object.entries(covers)) {
      confirmed[model][file] = fingerprint(file, readFile(file), symbols).hash;
    }
  }
  return confirmed;
}

export function staticProblems(models, confirmed, { names, configOf, readFile, exists }) {
  const problems = [];
  for (const name of names) {
    if (!models[name]) problems.push(`${MODELS}/${name}.tla has no entry in ${MANIFEST}`);
  }
  for (const [model, entry] of Object.entries(models)) {
    if (!names.includes(model)) {
      problems.push(`${MANIFEST} names ${model}, which has no ${model}.tla`);
      continue;
    }
    const config = configOf(model);
    const checked = invariantsIn(config);
    for (const invariant of entry.invariants.filter((each) => !checked.includes(each))) {
      problems.push(`${model}.cfg no longer checks ${invariant}; restore its INVARIANT line`);
    }
    for (const guard of guardsIn(config)) {
      const known = entry.guards[guard.name];
      if (!known) {
        problems.push(
          `${model}.cfg has the guard ${guard.name}, but ${MANIFEST} does not say which rule breaks without it; add it under guards with "breaks" and "fixedIn"`,
        );
      } else if (!guard.on) {
        problems.push(
          `${model}.cfg turns ${guard.name} off; the default config describes the code on main`,
        );
      }
    }
    const set = guardsIn(config).map((guard) => guard.name);
    for (const guard of Object.keys(entry.guards).filter((each) => !set.includes(each))) {
      problems.push(`${MANIFEST} names the guard ${guard}, which ${model}.cfg does not set`);
    }
    for (const [file, titles] of Object.entries(entry.replays)) {
      const source = exists(file) ? readFile(file) : "";
      for (const title of titles.filter((each) => !source.includes(JSON.stringify(each)))) {
        problems.push(
          `${file} no longer holds the replay "${title}" of ${model}; a model without a replay against the real code proves nothing about it, so restore the test or name the one that replaced it in ${MANIFEST}`,
        );
      }
    }
    for (const [file, symbols] of Object.entries(entry.covers)) {
      if (!exists(file)) {
        problems.push(`${MANIFEST} says ${model} covers ${file}, which does not exist`);
        continue;
      }
      const { missing, hash } = fingerprint(file, readFile(file), symbols);
      for (const symbol of missing) {
        problems.push(
          `${model} covers ${symbol} in ${file}, which no longer exists; point ${MANIFEST} at the code that took over and check the model still matches it`,
        );
      }
      if (missing.length === 0 && hash !== confirmed[model]?.[file]) {
        problems.push(
          `${file} changed code that ${model} models (${symbols.join(", ")}); compare each step in ${SKILL}/SKILL.md with the new code, change ${model}.tla if a step moved, then run pnpm check:models --confirm`,
        );
      }
    }
  }
  return problems;
}

function runTlc(model, configText) {
  const dir = mkdtempSync(join(tmpdir(), "lymi-models-"));
  try {
    const config = join(dir, `${model}.cfg`);
    writeFileSync(config, configText);
    const { status, stdout, stderr } = spawnSync(
      resolve(root, SKILL, "scripts/check.sh"),
      [model, config],
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
    );
    return { ...parseTlc(stdout, status), output: `${stdout}\n${stderr}` };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export function verdicts(models, configOf, run) {
  const problems = [];
  const lines = [];
  for (const [model, entry] of Object.entries(models)) {
    const config = configOf(model);
    const whole = run(model, config);
    if (whole.status !== HOLDS) {
      problems.push(
        whole.violated
          ? `${model}: ${whole.violated} is violated; replay the path below against the code, as ${SKILL}/SKILL.md says\n${whole.output}`
          : `${model}: TLC exited ${whole.status}\n${whole.output}`,
      );
    } else if (whole.states !== entry.states) {
      problems.push(
        `${model} reached ${whole.states} states where ${MANIFEST} records ${entry.states}; a step that can no longer happen makes a model pass for nothing, so explain the change and record the new count`,
      );
    } else {
      lines.push(`${model} holds over ${whole.states} states`);
    }
    for (const [guard, { breaks, fixedIn }] of Object.entries(entry.guards)) {
      const off = run(model, withGuardOff(config, guard));
      if (off.status === VIOLATED && off.violated === breaks) {
        lines.push(`  without ${guard} (#${fixedIn}) ${breaks} breaks, as it should`);
      } else {
        problems.push(
          `${model} without ${guard} should break ${breaks}, the bug #${fixedIn} fixed, but TLC exited ${off.status}${off.violated ? ` on ${off.violated}` : ""}; the model no longer catches it`,
        );
      }
    }
  }
  return { problems, lines };
}

function fail(problems) {
  for (const problem of problems) console.error(`${problem}\n`);
  if (problems.length > 0) process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const models = JSON.parse(read(MANIFEST));
  const configOf = (model) => read(`${MODELS}/${model}.cfg`);
  if (process.argv.includes("--confirm")) {
    writeFileSync(
      resolve(root, CONFIRMED),
      `${JSON.stringify(confirmationsFor(models), null, 2)}\n`,
    );
  }
  fail(
    staticProblems(models, JSON.parse(read(CONFIRMED)), {
      names: readdirSync(resolve(root, MODELS))
        .filter((file) => file.endsWith(".tla"))
        .map((file) => file.slice(0, -".tla".length)),
      configOf,
      readFile: read,
      exists: (file) => existsSync(resolve(root, file)),
    }),
  );
  if (process.argv.includes("--run")) {
    const { problems, lines } = verdicts(models, configOf, runTlc);
    for (const line of lines) console.log(line);
    fail(problems);
  }
}
