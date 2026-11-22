#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const SUMMARY_WORDS = 150;
const BODY_WORDS = 600;

const AUDIT_SKILL =
  /(?<![\w./-])(?:impeccable|emil-[a-z][a-z-]*|better-ui|unslop|poteto|pstack)(?![\w/-])/i;

const TEST_PATH = /\.(?:test|spec)\.|\/(?:test|tests|__tests__|fixtures)\//;
const DESIGN_PAGE = /\/design(?:\/|\.)/;

function rendersUi(path) {
  return (
    /^apps\/(?:web\/src\/client|site\/src|mobile\/src)\/.+\.(?:tsx|astro|css)$/.test(path) &&
    !TEST_PATH.test(path) &&
    !DESIGN_PAGE.test(path)
  );
}

function changesBehavior(path) {
  return (
    /^(?:apps|packages)\/[^/]+\/src\/.+\.(?:[cm]?[jt]s|tsx|astro)$/.test(path) &&
    !path.endsWith(".d.ts") &&
    !TEST_PATH.test(path) &&
    !DESIGN_PAGE.test(path)
  );
}

function prose(body) {
  const kept = [];
  let table = [];
  const endTable = () => {
    if (!table.some((row) => /!\[|<img\b/.test(row))) kept.push(...table);
    table = [];
  };
  const text = body
    .replaceAll("\r\n", "\n")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/^ *(`{3,}|~{3,})[^\n]*\n[\s\S]*?^ *\1[^\n]*$/gm, "");
  for (const line of text.split("\n")) {
    if (/^\s*\|/.test(line)) table.push(line);
    else {
      endTable();
      kept.push(line);
    }
  }
  endTable();
  return kept.join("\n").replace(/!\[[^\]]*\]\([^)]*\)|<img\b[^>]*>/g, "");
}

function countWords(text) {
  return text.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

function sectionsOf(text) {
  const [, ...parts] = `\n${text}`.split("\n## ");
  return parts.map((part) => {
    const [name, ...rest] = part.split("\n");
    const content = rest.join("\n");
    return { name: name.trim(), content, words: countWords(content) };
  });
}

function labelled(text, label) {
  const line = new RegExp(`^[\\s>*-]*(?:${label})(?::\\**|\\**:)[ \\t]*(\\S.*)$`, "im").exec(text);
  return line?.[1] ?? "";
}

export function checkBody({ title, body, files }) {
  const errors = [];
  const add = (rule, message) => errors.push({ rule, message });
  const text = prose(body);
  const sections = sectionsOf(text);
  const section = (name) => sections.find((each) => each.name === name);

  const summary = section("Summary");
  if (!summary?.words) {
    add("summary", "there is no ## Summary with text; start from .github/pull_request_template.md");
  } else if (summary.words > SUMMARY_WORDS) {
    add(
      "summary",
      `the Summary is ${summary.words} words; the maximum is ${SUMMARY_WORDS}. State the outcome in one short paragraph or up to three bullets and leave the how to the diff`,
    );
  }

  const words = countWords(text);
  if (words > BODY_WORDS) {
    const longest = sections
      .toSorted((a, b) => b.words - a.words)
      .slice(0, 4)
      .map((each) => `${each.name} ${each.words}`)
      .join(", ");
    add(
      "length",
      `the body is ${words} words without images, screenshot tables and fenced output; the maximum is ${BODY_WORDS}. Longest: ${longest}. Cut passing checks CI already shows, file inventories and the story of the work`,
    );
  }

  const skill = AUDIT_SKILL.exec(title) ?? AUDIT_SKILL.exec(text);
  if (skill) {
    add(
      "skill",
      `it names ${skill[0]}, an audit skill outside this repository; say what was checked and found instead`,
    );
  }

  if (files.some(rendersUi) && !labelled(text, "No visible change")) {
    if (!/!\[[^\]]*\]\(\s*\S|<img\b/.test(body)) {
      add(
        "screenshots",
        "the diff changes rendered UI and the body has no image; attach one per affected surface, or add “No visible change: <why>”",
      );
    }
    if (countWords(labelled(text, "Try it")) < 4) {
      add(
        "try",
        "the diff changes rendered UI and no “Try it: …” line says how to open the changed state; name the preview path or screen, the persona and the steps",
      );
    }
  }

  if (files.some(changesBehavior) && !labelled(section("Verification")?.content ?? "", "Review")) {
    add(
      "review",
      "the diff changes behavior and Verification has no “Review: …” line; name the reviewer, the rounds and the verdict, or why none ran",
    );
  }

  return errors;
}

function main([bodyFile, ...titleWords], env) {
  const local = bodyFile !== undefined;
  const errors = checkBody({
    title: local ? titleWords.join(" ") : (env.PR_TITLE ?? ""),
    body: local ? readFileSync(bodyFile, "utf8") : (env.PR_BODY ?? ""),
    files: (local
      ? execFileSync("git", ["diff", "--name-only", "-z", "origin/main...HEAD"], {
          encoding: "utf8",
        })
      : readFileSync(0, "utf8")
    )
      .split("\0")
      .filter(Boolean),
  });
  if (errors.length === 0) {
    console.log("Valid pull request description");
    return 0;
  }
  const warnsOnly = env.PR_AUTHOR_TYPE === "Bot";
  console.error(
    warnsOnly
      ? "Pull request description, warnings only for a bot:"
      : "Invalid pull request description. Editing it on the pull request reruns this check:",
  );
  for (const { message } of errors) console.error(`- ${message}`);
  return warnsOnly ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exitCode = main(process.argv.slice(2), process.env);
}
