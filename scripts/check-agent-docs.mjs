#!/usr/bin/env node

// Fails when agent guidance names a path, pnpm script or skill that does not exist, when the verify
// skill's feature map and its files disagree, when a product route has no feature entry or reason,
// or when an agent guide outgrows its budget. External links and whether the prose is true are out
// of scope. Usage: node scripts/check-agent-docs.mjs

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

// Keep shared instructions small; area rules belong in nested guides.
export const BUDGET = { root: 12_288, nested: 8_192 };

const SKILLS = ".agents/skills";
const VERIFY = `${SKILLS}/verify`;
const ROUTES = "apps/web/src/client/routes";

/** Skills a doc may name that each machine installs for itself rather than the repo. */
export const EXTERNAL_SKILLS = {
  impeccable: "a design skill installed per machine, not kept in the repo",
};

/** Product routes a learner can open that have no verify entry yet, each with the reason. */
export const UNMAPPED_ROUTES = {
  "/add/$slug":
    "no entry yet: reached from a published deck's link, which needs the publisher persona",
  "/archived": "no entry yet: write one with the next change to Archived",
  "/consent": "an OAuth consent screen that only an integration's authorization request opens",
  "/design": "developer-only design system pages; production redirects home",
  "/design/$page": "developer-only design system pages; production redirects home",
  "/design/components/$group": "developer-only design system pages; production redirects home",
  "/design/frame/$specimen": "developer-only design system pages; production redirects home",
  "/desktop/add": "the Mac app's quick-add panel, driven in apps/desktop rather than a browser",
  "/desktop/sign-in":
    "the Mac app's sign-in hand-off, driven in apps/desktop rather than a browser",
  "/explore": "no entry yet: write one with the next change to Explore",
  "/explore/$kind/$name": "no entry yet: write one with the next change to Explore",
  "/explore/$slug": "no entry yet: write one with the next change to Explore",
  "/import/lymi": "no entry yet: the import entries drive Anki and Pleco, whose flow this shares",
  "/import/mochi": "no entry yet: the import entries drive Anki and Pleco, whose flow this shares",
  "/import/noji": "no entry yet: the import entries drive Anki and Pleco, whose flow this shares",
  "/import/quizlet": "no entry yet: write one with the next change to the Quizlet import",
  "/insights": "no entry yet: write one with the next change to Insights",
  "/join/$token": "no entry yet: deck-invitation.md makes the link; joining needs a second persona",
  "/library/$deckId/settings/tags": "no entry yet: write one with the next change to deck tags",
  "/reset-password": "reached only from a reset email's link, which local dev does not send",
  "/settings/delete-account": "no entry yet: write one with the next change to account deletion",
};

const PNPM_COMMANDS = new Set(
  "add audit bin create dedupe deploy dlx env exec fetch i import init install link list ls outdated pack patch prune publish rebuild remove rm root run self-update setup store un unlink up update why".split(
    " ",
  ),
);
const SHELL = new Set(["", "bash", "sh", "shell", "zsh", "console"]);
const PARAM = "\0";

/** The working tree as the check sees it: tracked and untracked files git does not ignore. */
export function workingTree(dir = root) {
  const git = (args) => spawnSync("git", args, { cwd: dir, encoding: "utf8", maxBuffer: 1 << 28 });
  const listed = git(["ls-files", "-co", "--exclude-standard"]).stdout.split("\n").filter(Boolean);
  const files = listed.filter((file) => existsSync(join(dir, file)));
  return {
    files,
    read: (file) => readFileSync(join(dir, file), "utf8"),
    exists: (path) => existsSync(join(dir, path)),
    isDirectory: (path) => existsSync(join(dir, path)) && statSync(join(dir, path)).isDirectory(),
    ignored: (path) => git(["check-ignore", "-q", "--no-index", path]).status === 0,
  };
}

/** A tree from a map of file to contents, for tests. */
export function memoryTree(contents, { ignored = [] } = {}) {
  const files = Object.keys(contents);
  const isDirectory = (path) => {
    const prefix = `${path.replace(/\/$/, "")}/`;
    return path === "" || files.some((file) => file.startsWith(prefix));
  };
  return {
    files,
    read: (file) => contents[file],
    exists: (path) => files.includes(path.replace(/\/$/, "")) || isDirectory(path),
    isDirectory,
    ignored: (path) => ignored.some((entry) => path === entry || path.startsWith(`${entry}/`)),
  };
}

/** Each line outside fences, and each shell line inside one, with its number. */
function linesOf(text) {
  const lines = [];
  let fence = null;
  text.split("\n").forEach((text, index) => {
    const marker = /^\s*(`{3,}|~{3,})\s*([\w-]*)/.exec(text);
    if (marker && (!fence || marker[1].startsWith(fence.marker))) {
      fence = fence ? null : { marker: marker[1], shell: SHELL.has(marker[2]) };
      return;
    }
    if (!fence) lines.push({ number: index + 1, text, prose: true });
    else if (fence.shell) lines.push({ number: index + 1, text, prose: false });
  });
  return lines;
}

const codeSpans = (text) => [...text.matchAll(/(`+)(.+?)\1/g)].map((match) => match[2].trim());
/** Code spans that name existing things: one after "a new" names a file the reader is to create. */
const namingSpans = (text) =>
  [...text.matchAll(/(`+)(.+?)\1/g)]
    .filter((match) => !/\ba new $/i.test(text.slice(0, match.index)))
    .map((match) => match[2].trim());
const withoutCode = (text) => text.replace(/(`+)(.+?)\1/g, "");

/** Splits shell text into words, dropping quotes, brackets and trailing punctuation. */
const words = (text) =>
  text
    .split(/[\s"'()[\]{},;=|&]+/)
    .map((word) => word.replace(/[.:,]+$/, ""))
    .filter(Boolean);

/** A path's file part, without an anchor, query or `:line` suffix. */
const bare = (path) => path.replace(/[#?].*$/, "").replace(/:\d+(?::\d+)?$/, "");

function globRegex(pattern) {
  const source = pattern
    .split(/(\*\*\/?|\*|\?)/)
    .map((part) => {
      if (part === "**/" || part === "**") return "(?:.*/)?[^/]*";
      if (part === "*") return "[^/]*";
      if (part === "?") return "[^/]";
      return part.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    })
    .join("");
  return new RegExp(`^${source}/?$`);
}

function resolves(tree, path) {
  const clean = normalize(path).replace(/^\.\//, "");
  // Outside the repo, such as a sibling clone, is out of scope.
  if (clean.startsWith("..")) return true;
  if (/[*?]/.test(clean)) {
    const regex = globRegex(clean);
    return tree.files.some((file) => regex.test(file));
  }
  // A placeholder such as `features/<feature>.mjs` or `$param` checks the folder it sits in.
  const segments = clean.split("/");
  const open = segments.findIndex((segment) => /[<>$]/.test(segment));
  if (open === 0) return true;
  if (open > 0) return tree.isDirectory(segments.slice(0, open).join("/"));
  return tree.exists(clean) || tree.ignored(clean);
}

/** Where a word in code could live: from the repo root, or beside the doc. */
function candidates(tree, doc, word) {
  if (!word.includes("/") || word.includes("://") || /^[/~@$-]/.test(word)) return [];
  // Words such as `./review.webm` are examples of what to write; links carry the real relative paths.
  if (/^\.\.?\//.test(word)) return [];
  const first = word.split("/")[0];
  const found = [];
  if (tree.isDirectory(first)) found.push(word);
  const beside = join(dirname(doc), first);
  if (dirname(doc) !== "." && tree.isDirectory(beside)) found.push(join(dirname(doc), word));
  return found;
}

function linkTargets(text) {
  const targets = [];
  for (const match of withoutCode(text).matchAll(/\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)) {
    targets.push(match[1]);
  }
  const reference = /^\s*\[[^\]]+\]:\s*<?(\S+?)>?(?:\s|$)/.exec(text);
  if (reference) targets.push(reference[1]);
  return targets.filter((target) => !/^(?:[a-z][\w+.-]*:|#)/i.test(target));
}

/** Every script each workspace defines, by package name, with the root as "". */
export function workspaceScripts(tree) {
  const scripts = new Map();
  for (const file of tree.files) {
    if (!/(?:^|\/)package\.json$/.test(file) || file.includes("node_modules/")) continue;
    let manifest;
    try {
      manifest = JSON.parse(tree.read(file));
    } catch {
      continue;
    }
    const name = file === "package.json" ? "" : manifest.name;
    if (name !== undefined) scripts.set(name, new Set(Object.keys(manifest.scripts ?? {})));
  }
  return scripts;
}

/** The script each `pnpm …` in a line runs, with its workspace. */
export function pnpmScripts(text) {
  const found = [];
  for (const match of text.matchAll(/(?:^|[\s`;&|(])pnpm\s+([^`;&|)]+)/g)) {
    const args = match[1].trim().split(/\s+/);
    let filter = "";
    let script = null;
    for (let index = 0; index < args.length; index++) {
      const arg = args[index];
      if (arg === "--filter" || arg === "-F") filter = args[++index];
      else if (arg.startsWith("--filter=")) filter = arg.slice(9);
      else if (/^(?:-r|--recursive|-C|--dir|-w|--workspace-root)$/.test(arg)) break;
      else if (arg.startsWith("-")) continue;
      else if (arg === "run") continue;
      else {
        script = arg;
        break;
      }
    }
    if (script && /^[\w:.-]+$/.test(script)) found.push({ filter, script });
  }
  return found;
}

/** Guides, skills and the reference docs that own their commands and PR rules. */
export function agentDocs(tree) {
  const nested = tree.files.filter((file) => file.endsWith("/AGENTS.md")).sort();
  const skills = tree.files
    .filter((file) => file.startsWith(`${SKILLS}/`) && file.endsWith(".md"))
    .sort();
  const references = ["README.md", "docs/git-workflow.md", "docs/testing.md"].filter((file) =>
    tree.exists(file),
  );
  return { nested, docs: ["AGENTS.md", ...nested, ...skills, ...references] };
}

function checkReferences(tree, doc, scripts, skills) {
  const problems = [];
  const at = (number, message) => problems.push(`${doc}:${number}: ${message}`);
  const allScripts = new Set([...scripts.values()].flatMap((set) => [...set]));
  for (const { number, text, prose } of linesOf(tree.read(doc))) {
    if (prose) {
      for (const target of linkTargets(text)) {
        const path = target.startsWith("/") ? target.slice(1) : join(dirname(doc), bare(target));
        if (!resolves(tree, path)) {
          at(number, `link to ${target}, which does not exist: point it at the file's new path`);
        }
      }
      const names = [
        ...withoutCode(text).matchAll(/\bthe ([a-z][a-z0-9-]*) skill\b/g),
        ...text.matchAll(/\bthe `([a-z][a-z0-9-]*)` skill\b/g),
      ];
      for (const [, name] of names) checkSkill(number, name);
    }
    const code = prose ? namingSpans(text) : [text.replace(/^\s*[$>]\s+/, "")];
    for (const span of code) {
      for (const word of words(span)) {
        const paths = candidates(tree, doc, bare(word));
        if (paths.length > 0 && !paths.some((path) => resolves(tree, path))) {
          at(number, `${bare(word)} does not exist: update the doc to the file's new path`);
        }
      }
      for (const { filter, script } of pnpmScripts(prose ? ` ${span}` : text)) {
        const defined = scripts.get(filter);
        if (!defined) {
          at(number, `pnpm --filter ${filter}: no workspace has that name`);
        } else if (!defined.has(script) && !PNPM_COMMANDS.has(script)) {
          const where = filter ? `${filter}'s package.json` : "the root package.json";
          at(
            number,
            `pnpm ${filter ? `--filter ${filter} ` : ""}${script}: ${where} has no such script; name the script it was renamed to`,
          );
        }
      }
      // A bare script name such as `deploy:site`.
      if (
        prose &&
        /^[a-z][\w-]*(?::[\w-]+)+$/.test(span) &&
        !/^(?:node|cloudflare):/.test(span) &&
        !allScripts.has(span)
      ) {
        at(
          number,
          `${span} is not a script in any package.json: name the script it was renamed to`,
        );
      }
    }
  }
  return problems;

  function checkSkill(number, name) {
    if (["same", "next", "other", "right"].includes(name)) return;
    if (skills.has(name) || name in EXTERNAL_SKILLS) return;
    at(
      number,
      `the ${name} skill is not in ${SKILLS}: name an existing skill, or add it to EXTERNAL_SKILLS in scripts/check-agent-docs.mjs with where it comes from`,
    );
  }
}

/** The verify skill's feature table: each row's title, entry link and line. */
export function featureRows(text) {
  const rows = [];
  let inTable = false;
  text.split("\n").forEach((line, index) => {
    if (/^\|\s*Feature\s*\|\s*Entry\s*\|/.test(line)) {
      inTable = true;
      return;
    }
    if (!inTable) return;
    if (!line.startsWith("|")) {
      inTable = false;
      return;
    }
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.every((cell) => /^-+$/.test(cell))) return;
    const link = /\]\(([^)]+)\)/.exec(cells[1] ?? "");
    rows.push({ number: index + 1, title: cells[0], entry: link?.[1] ?? null });
  });
  return rows;
}

function checkFeatureMap(tree) {
  const doc = `${VERIFY}/SKILL.md`;
  if (!tree.exists(doc)) return [`${doc}: missing, so there is no feature map to check`];
  const problems = [];
  const rows = featureRows(tree.read(doc));
  const listed = new Set();
  for (const { number, title, entry } of rows) {
    if (!entry?.endsWith(".md")) {
      problems.push(`${doc}:${number}: ${title} has no entry link: link its features/<name>.md`);
      continue;
    }
    const path = join(VERIFY, entry);
    if (listed.has(path)) problems.push(`${doc}:${number}: ${entry} has a second row: keep one`);
    listed.add(path);
    if (!tree.exists(path)) {
      problems.push(
        `${doc}:${number}: ${title}'s entry ${entry} does not exist: write it or fix the link`,
      );
    }
    const recipe = path.replace(/\.md$/, ".mjs");
    if (!tree.exists(recipe)) {
      problems.push(
        `${doc}:${number}: ${title} has no recipe ${entry.replace(/\.md$/, ".mjs")}: write the recipe beside its entry`,
      );
    }
  }
  for (const file of tree.files) {
    if (!file.startsWith(`${VERIFY}/features/`)) continue;
    if (file.endsWith(".md") && !listed.has(file)) {
      problems.push(`${file}: not in the feature table in ${doc}: add a row for it`);
    }
    if (file.endsWith(".mjs") && !tree.exists(file.replace(/\.mjs$/, ".md"))) {
      problems.push(`${file}: a recipe with no entry: write ${file.replace(/\.mjs$/, ".md")}`);
    }
  }
  return problems;
}

/** Each product route's path, from its `createFileRoute` id, and whether it draws a screen. */
export function productRoutes(tree) {
  const routes = [];
  for (const file of tree.files) {
    if (dirname(file) !== ROUTES || !/\.tsx$/.test(file) || /\.test\./.test(file)) continue;
    const source = tree.read(file);
    const id = /createFileRoute\(\s*["'`]([^"'`]+)["'`]/.exec(source)?.[1];
    if (!id) continue;
    const path = `/${id
      .split("/")
      .filter(Boolean)
      .map((segment) => segment.replace(/_$/, ""))
      .join("/")}`;
    // A route with no component only redirects, so there is nothing on it to drive.
    routes.push({ file, path, draws: /\bcomponent\s*:/.test(source) });
  }
  return routes;
}

function segmentsOf(path) {
  return bare(path)
    .replace(/<[^>]*>|\$\{[^}]*\}/g, PARAM)
    .split("/")
    .filter(Boolean)
    .map((segment) => (segment.includes(PARAM) ? PARAM : segment));
}

/** Route paths the feature entries and recipes name: code spans in one, string literals in the other. */
export function namedPaths(tree) {
  const named = [];
  for (const file of tree.files) {
    if (!file.startsWith(`${VERIFY}/features/`)) continue;
    const text = tree.read(file);
    if (file.endsWith(".md")) {
      for (const span of codeSpans(text)) if (span.startsWith("/")) named.push(segmentsOf(span));
    } else if (file.endsWith(".mjs")) {
      for (const [, path] of text.matchAll(/["'`](\/[^"'`\s]*)["'`]/g))
        named.push(segmentsOf(path));
    }
  }
  return named;
}

const reaches = (named, route) => {
  const segments = route.split("/").filter(Boolean);
  return (
    named.length === segments.length &&
    segments.every((segment, index) => segment.startsWith("$") || named[index] === segment)
  );
};

function checkRoutes(tree, unmapped) {
  const problems = [];
  const named = namedPaths(tree);
  const routes = productRoutes(tree);
  for (const { file, path, draws } of routes) {
    if (!draws) continue;
    const covered = named.some((segments) => reaches(segments, path));
    if (covered && path in unmapped) {
      problems.push(
        `scripts/check-agent-docs.mjs: ${path} has a verify entry now: drop it from UNMAPPED_ROUTES`,
      );
    } else if (!covered && !(path in unmapped)) {
      problems.push(
        `${file}: ${path} has no verify entry: write ${VERIFY}/features/<name>.md naming \`${path}\` in its Reach, with its recipe, or add it to UNMAPPED_ROUTES in scripts/check-agent-docs.mjs with the reason`,
      );
    }
  }
  const drawn = new Set(routes.filter((route) => route.draws).map((route) => route.path));
  for (const path of Object.keys(unmapped)) {
    if (!drawn.has(path)) {
      problems.push(
        `scripts/check-agent-docs.mjs: UNMAPPED_ROUTES lists ${path}, which no route draws: drop it`,
      );
    }
  }
  return problems;
}

function checkBudgets(tree, nested) {
  const problems = [];
  const size = (file) => Buffer.byteLength(tree.read(file));
  if (size("AGENTS.md") > BUDGET.root) {
    problems.push(
      `AGENTS.md: ${size("AGENTS.md")} bytes, over its ${BUDGET.root}-byte budget: move a rule that applies to one area into that area's AGENTS.md, or cut a sentence`,
    );
  }
  const links = new Set(
    linesOf(tree.read("AGENTS.md")).flatMap(({ text, prose }) =>
      prose ? linkTargets(text).map((target) => normalize(bare(target))) : [],
    ),
  );
  for (const file of nested) {
    if (size(file) > BUDGET.nested) {
      problems.push(
        `${file}: ${size(file)} bytes, over a nested guide's ${BUDGET.nested}-byte budget: cut it, or split it further down the tree`,
      );
    }
    if (!links.has(file)) {
      problems.push(`AGENTS.md: does not list ${file}: link it from the root guide`);
    }
  }
  return problems;
}

export function check(tree, { unmapped = UNMAPPED_ROUTES } = {}) {
  if (!tree.exists("AGENTS.md")) return ["AGENTS.md: missing"];
  const scripts = workspaceScripts(tree);
  const skills = new Set(
    tree.files
      .filter((file) => file.startsWith(`${SKILLS}/`) && file.endsWith("/SKILL.md"))
      .map((file) => file.split("/")[2]),
  );
  const { nested, docs } = agentDocs(tree);
  return [
    ...docs.flatMap((doc) => checkReferences(tree, doc, scripts, skills)),
    ...checkFeatureMap(tree),
    ...checkRoutes(tree, unmapped),
    ...checkBudgets(tree, nested),
  ];
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const found = check(workingTree());
  if (found.length === 0) {
    console.log("check-agent-docs: every path, script, skill, feature and route checks out");
    process.exit(0);
  }
  console.error(found.join("\n"));
  console.error(`\ncheck-agent-docs: ${found.length} problem(s) in the agent docs.`);
  process.exit(1);
}
