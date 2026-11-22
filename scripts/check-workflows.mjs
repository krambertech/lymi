#!/usr/bin/env node

import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DIR = ".github/workflows";
const { parse: parseYaml } = createRequire(resolve(root, "apps/site/package.json"))("yaml");

const MAIN = "github.ref == 'refs/heads/main'";
const SAME_REPOSITORY = "github.event.pull_request.head.repo.full_name == github.repository";

export const ALLOWED = [
  {
    file: "phone.yml",
    job: "journey",
    trigger: "workflow_dispatch",
    reason:
      "A pull request that changes something native starts the journey by hand on its own branch. Its one step with `issues: write` runs only on main; moving that to a main-only job changes the workflow Promote waits for, which only a release can test.",
  },
  {
    file: "app-preview-cleanup.yml",
    job: "cleanup",
    trigger: "workflow_dispatch",
    reason:
      "A cleanup fix runs by hand on its own branch before it merges. The app-preview token reaches only disposable previews, and ci.yml already gives it to same-repository pull requests.",
  },
];

const UNKNOWN = Symbol("unknown");
const SOME_FALSY = Symbol("some falsy value");

class AnyExcept {
  constructor(...values) {
    this.values = values.map((value) => value.toLowerCase());
  }
}

const SOME_TRUTHY = new AnyExcept();

function truth(value) {
  if (value === SOME_FALSY) return false;
  return value === UNKNOWN ? UNKNOWN : Boolean(value);
}

function tokenize(source) {
  const pattern =
    /\s*(?:'((?:[^']|'')*)'|(\d+(?:\.\d+)?)|([A-Za-z_][\w-]*)|(&&|\|\||[=!<>]=|[<>!().,[\]*]))/y;
  const tokens = [];
  while (source.slice(pattern.lastIndex).trim() !== "") {
    const at = pattern.lastIndex;
    const match = pattern.exec(source);
    if (!match) throw new Error(`cannot read the expression at "${source.slice(at).trim()}"`);
    const [, string, number, name, symbol] = match;
    if (string !== undefined) tokens.push({ type: "literal", value: string.replaceAll("''", "'") });
    else if (number !== undefined) tokens.push({ type: "literal", value: Number(number) });
    else if (name !== undefined) tokens.push({ type: "name", value: name });
    else tokens.push({ type: "symbol", value: symbol });
  }
  return tokens;
}

const LITERALS = { true: true, false: false, null: null };

export function parseExpression(source) {
  const tokens = tokenize(source);
  let at = 0;
  const is = (value) => tokens[at]?.type === "symbol" && tokens[at].value === value;
  const take = (value) => {
    if (!is(value)) throw new Error(`expected ${value} in "${source}"`);
    at++;
  };

  function named(name) {
    if (is("(")) {
      at++;
      const args = [];
      while (!is(")")) {
        args.push(either());
        if (is(",")) at++;
      }
      take(")");
      return { type: "call", name: name.toLowerCase(), args };
    }
    if (Object.hasOwn(LITERALS, name)) return { type: "literal", value: LITERALS[name] };
    const path = [name.toLowerCase()];
    const inner = [];
    while (is(".") || is("[")) {
      if (is(".")) {
        at++;
        path.push(String(tokens[at++]?.value).toLowerCase());
      } else {
        at++;
        const index = either();
        take("]");
        path.push(index.type === "literal" ? String(index.value).toLowerCase() : "*");
        inner.push(index);
      }
    }
    return { type: "path", path, args: inner };
  }

  function unary() {
    if (is("!")) {
      at++;
      return { type: "not", args: [unary()] };
    }
    if (is("(")) {
      at++;
      const node = either();
      take(")");
      return node;
    }
    const token = tokens[at++];
    if (token?.type === "literal") return token;
    if (token?.type === "name") return named(token.value);
    if (token?.value === "*") return { type: "literal", value: "*" };
    throw new Error(`cannot read the expression "${source}"`);
  }

  function binary(next, operators) {
    return () => {
      let left = next();
      while (tokens[at]?.type === "symbol" && operators.includes(tokens[at].value)) {
        const operator = tokens[at++].value;
        left = { type: "operator", operator, args: [left, next()] };
      }
      return left;
    };
  }

  const compare = binary(unary, ["==", "!=", "<", "<=", ">", ">="]);
  const both = binary(compare, ["&&"]);
  const either = binary(both, ["||"]);

  const node = either();
  if (at < tokens.length) throw new Error(`cannot read the expression "${source}"`);
  return node;
}

function* nodesOf(node) {
  yield node;
  for (const child of node.args ?? []) yield* nodesOf(child);
}

function equals(a, b) {
  if ([a, b].some((value) => value === UNKNOWN || value === SOME_FALSY)) return UNKNOWN;
  if (a instanceof AnyExcept || b instanceof AnyExcept) {
    const [any, value] = a instanceof AnyExcept ? [a, b] : [b, a];
    return typeof value === "string" && any.values.includes(value.toLowerCase()) ? false : UNKNOWN;
  }
  if (typeof a === "string" && typeof b === "string") return a.toLowerCase() === b.toLowerCase();
  return typeof a === typeof b ? a === b : Number(a) === Number(b);
}

const PAYLOADS = ["pull_request", "issue", "comment", "workflow_run"];

function read(path, run) {
  const key = path.join(".");
  if (Object.hasOwn(run.values, key)) return run.values[key];
  const payload = path[0] === "github" && path[1] === "event" && path[2];
  return PAYLOADS.includes(payload) && !run.payload.includes(payload) ? null : UNKNOWN;
}

function evaluate(node, run) {
  if (node.type === "literal") return node.value;
  if (node.type === "path") return read(node.path, run);
  if (node.type === "call") return node.name === "always" ? true : UNKNOWN;
  const [a, b] = node.args.map((child) => evaluate(child, run));
  if (node.type === "not") return truth(a) === UNKNOWN ? UNKNOWN : !truth(a);
  if (node.operator === "&&") {
    if (truth(a) === UNKNOWN) return truth(b) === false ? SOME_FALSY : UNKNOWN;
    return truth(a) ? b : a;
  }
  if (node.operator === "||") {
    if (truth(a) === UNKNOWN) return truth(b) === true ? SOME_TRUTHY : UNKNOWN;
    return truth(a) ? a : b;
  }
  const same = equals(a, b);
  if (node.operator === "==") return same;
  if (node.operator === "!=") return same === UNKNOWN ? UNKNOWN : !same;
  return UNKNOWN;
}

function condition(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  const wrapped = text.match(/^\$\{\{([\s\S]*)\}\}$/);
  const source = wrapped ? wrapped[1] : text;
  return source.includes("${{") ? null : parseExpression(source);
}

function mayRun(value, run) {
  const node = condition(value);
  if (!node) return true;
  return truth(evaluate(node, run)) !== false;
}

function ignoresNeeds(value) {
  const node = condition(value);
  if (!node) return false;
  return [...nodesOf(node)].some(
    (child) => child.type === "call" && ["always", "cancelled", "failure"].includes(child.name),
  );
}

const REPOSITORY = { "github.repository": "krambertech/lymi" };
const FORK = new AnyExcept(REPOSITORY["github.repository"]);
const STRANGER = new AnyExcept("OWNER", "MEMBER", "COLLABORATOR");
const NOT_MAIN = {
  ...REPOSITORY,
  "github.ref": new AnyExcept("refs/heads/main"),
  "github.ref_name": new AnyExcept("main"),
};
const ON_MAIN = {
  ...REPOSITORY,
  "github.ref": "refs/heads/main",
  "github.ref_name": "main",
};
const FORK_HEAD = {
  "github.event.pull_request.head.repo.full_name": FORK,
  "github.event.pull_request.head.repo.fork": true,
  "github.event.pull_request.author_association": STRANGER,
};

const RUNS = {
  workflow_dispatch: {
    payload: [],
    values: { ...NOT_MAIN },
    from: "by hand on any branch",
    fix: `add \`${MAIN}\` to the job's \`if\`, or to the job it needs (#967, #1011)`,
  },
  push: {
    payload: [],
    values: { ...NOT_MAIN },
    from: "on a push to any branch",
    fix: `limit \`push\` to \`branches: [main]\`, or add \`${MAIN}\` to the job's \`if\` (#967)`,
  },
  pull_request: {
    payload: ["pull_request"],
    values: { ...NOT_MAIN, ...FORK_HEAD },
    from: "on any pull request, with the branch's own scripts",
    fix: `move it to a job that runs only when \`${MAIN}\`; if a pull request needs it, add \`${SAME_REPOSITORY}\` to the job's \`if\` (#1205)`,
  },
  pull_request_target: {
    payload: ["pull_request"],
    values: { ...ON_MAIN, ...FORK_HEAD },
    from: "on a pull request from a fork",
    fix: `add \`${SAME_REPOSITORY}\` to the job's \`if\`; the ref is always main here, so it guards nothing (#1205)`,
  },
  issue_comment: {
    payload: ["issue", "comment"],
    values: { ...ON_MAIN, "github.event.comment.author_association": STRANGER },
    from: "on anyone's comment",
    fix: "add `github.event.comment.author_association == 'OWNER'` to the job's `if`; the ref is always main here, so it guards nothing",
  },
  workflow_run: {
    payload: ["workflow_run"],
    values: {
      ...ON_MAIN,
      "github.event.workflow_run.event": new AnyExcept("push"),
      "github.event.workflow_run.head_repository.full_name": FORK,
    },
    from: "after a fork's run",
    fix: "add `github.event.workflow_run.event == 'push'` to the job's `if`; the ref is always main here, so it guards nothing",
  },
};
for (const [trigger, run] of Object.entries(RUNS)) run.values["github.event_name"] = trigger;

function triggersOf(on) {
  if (typeof on === "string") return { [on]: null };
  if (Array.isArray(on)) return Object.fromEntries(on.map((name) => [name, null]));
  return on ?? {};
}

function riskyTriggers(on) {
  return Object.entries(triggersOf(on))
    .filter(([name, options]) => {
      if (!Object.hasOwn(RUNS, name)) return false;
      if (name !== "push") return true;
      return options?.tags || [options?.branches ?? []].flat().join() !== "main";
    })
    .map(([name]) => name);
}

function* strings(value) {
  if (typeof value === "string") yield value;
  else if (value && typeof value === "object")
    for (const child of Object.values(value)) yield* strings(child);
}

function pathsIn(value) {
  const paths = [];
  for (const text of strings(value)) {
    for (const [, source] of text.matchAll(/\$\{\{([\s\S]*?)\}\}/g)) {
      for (const node of nodesOf(parseExpression(source)))
        if (node.type === "path") paths.push(node.path);
    }
  }
  return paths;
}

function secretsIn(value) {
  const names = pathsIn(value)
    .filter(([context, name]) => context === "secrets" && name !== "github_token")
    .map(([, name]) => `secrets.${(name ?? "*").toUpperCase()}`);
  return [...new Set(names)];
}

function writesIn(permissions) {
  if (permissions === "write-all") return ["write-all"];
  return Object.entries(permissions ?? {})
    .filter(([, level]) => level === "write")
    .map(([scope]) => `${scope}: write`);
}

function isTainted([context, ...rest]) {
  if (context === "inputs") return true;
  if (context !== "github") return false;
  return rest.length === 0 || ["event", "head_ref", "ref_name", "*"].includes(rest[0]);
}

function privilegesIn(job, workflow, run) {
  const { steps = [], ...settings } = job;
  const reached = steps.filter((step) => mayRun(step.if, run));
  return [
    ...(job.secrets === "inherit" ? ["secrets: inherit"] : []),
    ...secretsIn([workflow.env, settings, reached]),
    ...writesIn(job.permissions ?? workflow.permissions),
  ];
}

export function workflowProblems(file, source, allowed = ALLOWED) {
  const workflow = parseYaml(source);
  const jobs = workflow.jobs ?? {};
  const name = basename(file);
  const where = `${DIR}/${name}`;
  const used = new Set();
  const problems = [];

  for (const secret of secretsIn(workflow.env))
    problems.push(
      `${where}: ${secret} is in the workflow's \`env\`, so every action and script of every job can read it; set it in the \`env\` of the step that needs it (#967)`,
    );

  for (const [id, job] of Object.entries(jobs)) {
    if (workflow.permissions === undefined && job.permissions === undefined)
      problems.push(
        `${where}: job ${id} has no \`permissions\`, so its token gets the repository's default; add \`permissions:\` with \`contents: read\` and only the scopes it uses`,
      );

    for (const secret of secretsIn(job.env))
      problems.push(
        `${where}: ${secret} is in the \`env\` of job ${id}, so every action and script in it can read it; set it in the \`env\` of the step that needs it (#967)`,
      );

    for (const step of job.steps ?? []) {
      for (const path of pathsIn([step.run, step.with?.script]).filter(isTainted))
        problems.push(
          `${where}: job ${id} writes \`\${{ ${path.join(".")} }}\` into a script, where its text runs as code; pass it through the step's \`env\` and read the variable in quotes`,
        );
    }
  }

  for (const trigger of riskyTriggers(workflow.on)) {
    const run = RUNS[trigger];
    const reaches = (id) => {
      const job = jobs[id];
      if (!job || !mayRun(job.if, run)) return false;
      return ignoresNeeds(job.if) || [job.needs ?? []].flat().every(reaches);
    };
    for (const [id, job] of Object.entries(jobs)) {
      if (!reaches(id)) continue;
      const privileges = privilegesIn(job, workflow, run);
      if (privileges.length === 0) continue;
      const exception = allowed.find(
        (entry) => entry.file === name && entry.job === id && entry.trigger === trigger,
      );
      if (exception) used.add(exception);
      else
        problems.push(
          `${where}: job ${id} holds ${privileges.join(", ")} and can run ${run.from} (${trigger}); ${run.fix}`,
        );
    }
  }

  for (const entry of allowed.filter((item) => item.file === name && !used.has(item)))
    problems.push(
      `${where}: job ${entry.job} no longer needs its ${entry.trigger} exception; delete it from ALLOWED in scripts/check-workflows.mjs`,
    );

  return [...new Set(problems)];
}

export function check(dir = resolve(root, DIR)) {
  const files = readdirSync(dir).filter((file) => /\.ya?ml$/.test(file));
  const missing = ALLOWED.filter((entry) => !files.includes(entry.file)).map(
    (entry) =>
      `${DIR}/${entry.file} is gone; delete its exception from ALLOWED in scripts/check-workflows.mjs`,
  );
  return [
    ...missing,
    ...files.flatMap((file) => workflowProblems(file, readFileSync(resolve(dir, file), "utf8"))),
  ];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [file] = process.argv.slice(2);
  const problems = file ? workflowProblems(file, readFileSync(file, "utf8"), []) : check();
  for (const problem of problems) console.error(problem);
  if (problems.length > 0) {
    console.error(`\n${problems.length} workflow privilege problem(s); docs/testing.md.`);
    process.exit(1);
  }
}
