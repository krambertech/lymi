#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { parseArgs as parseNodeArgs } from "node:util";
import { parseRepository } from "./pr-media.mjs";

export const CATEGORY = "agent-friction";
const OCCURRENCE = "**Occurred again.**";
const QUESTIONS = {
  happened: "What happened",
  expected: "What the agent expected",
  prevention: "What would have prevented it",
};

const USAGE = `Usage:
  pnpm friction search <words>...
  pnpm friction file --title <title> --happened <text> --expected <text> --prevention <text>
  pnpm friction plus <number> --note <text>

Searches, files and records occurrences in the repository's Agent friction discussions.`;

export function parseArgs(argv) {
  const [command, ...rest] = argv;
  const { values, positionals } = parseNodeArgs({
    args: rest,
    allowPositionals: true,
    options: {
      title: { type: "string" },
      happened: { type: "string" },
      expected: { type: "string" },
      prevention: { type: "string" },
      note: { type: "string" },
    },
  });
  if (command === "search" && positionals.length > 0)
    return { command, words: positionals.join(" ") };
  if (command === "file") {
    const missing = ["title", ...Object.keys(QUESTIONS)].filter((key) => !values[key]?.trim());
    if (missing.length > 0)
      throw new Error(`file needs ${missing.map((key) => `--${key}`).join(", ")}`);
    return { command, ...values };
  }
  if (command === "plus") {
    const number = Number(positionals[0]);
    if (!Number.isInteger(number) || number < 1) throw new Error("plus needs a discussion number");
    if (!values.note?.trim()) throw new Error("plus needs --note");
    return { command, number, note: values.note };
  }
  throw new Error(USAGE);
}

export function frictionBody(answers) {
  return Object.entries(QUESTIONS)
    .map(([key, question]) => `### ${question}\n\n${answers[key].trim()}`)
    .join("\n\n");
}

export function occurrences(discussion) {
  const again = discussion.comments.nodes.filter((comment) => comment.body.startsWith(OCCURRENCE));
  return 1 + again.length;
}

export async function findCategory(graphql, repository) {
  const [owner, name] = repository.split("/");
  const data = await graphql(
    `query($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        id
        discussionCategories(first: 50) { nodes { id slug } }
      }
    }`,
    { owner, name },
  );
  const category = data.repository.discussionCategories.nodes.find(
    (node) => node.slug === CATEGORY,
  );
  if (!category) {
    throw new Error(
      `${repository} has no discussion category with the slug ${CATEGORY}; create an "Agent friction" category in its Discussions settings`,
    );
  }
  return { repositoryId: data.repository.id, categoryId: category.id };
}

export async function search(graphql, repository, words) {
  await findCategory(graphql, repository);
  const data = await graphql(
    `query($query: String!) {
      search(type: DISCUSSION, query: $query, first: 20) {
        nodes {
          ... on Discussion {
            number title url upvoteCount
            category { slug }
            comments(first: 100) { nodes { body } }
          }
        }
      }
    }`,
    { query: `repo:${repository} is:open ${words}` },
  );
  const found = data.search.nodes.filter((node) => node.category?.slug === CATEGORY);
  if (found.length === 0) return `No open friction matches "${words}"; file a new one.`;
  return found
    .map(
      (node) =>
        `#${node.number} ${node.title} (occurrences ${occurrences(node)}, upvotes ${node.upvoteCount})\n  ${node.url}`,
    )
    .join("\n");
}

export async function file(graphql, repository, options) {
  const { repositoryId, categoryId } = await findCategory(graphql, repository);
  const data = await graphql(
    `mutation($input: CreateDiscussionInput!) {
      createDiscussion(input: $input) { discussion { number url } }
    }`,
    {
      input: { repositoryId, categoryId, title: options.title.trim(), body: frictionBody(options) },
    },
  );
  const { number, url } = data.createDiscussion.discussion;
  return `Filed #${number}: ${url}`;
}

export async function plus(graphql, repository, { number, note }) {
  const [owner, name] = repository.split("/");
  const data = await graphql(
    `query($owner: String!, $name: String!, $number: Int!) {
      repository(owner: $owner, name: $name) {
        discussion(number: $number) {
          id url viewerCanUpvote viewerHasUpvoted
          category { slug }
        }
      }
    }`,
    { owner, name, number },
  );
  const discussion = data.repository.discussion;
  if (discussion?.category.slug !== CATEGORY)
    throw new Error(`#${number} is not an agent friction discussion`);
  // Every agent signs in as the same account, which GitHub lets upvote once, so the comment is what counts.
  if (discussion.viewerCanUpvote && !discussion.viewerHasUpvoted) {
    await graphql(
      `mutation($id: ID!) { addUpvote(input: { subjectId: $id }) { clientMutationId } }`,
      { id: discussion.id },
    );
  }
  await graphql(
    `mutation($id: ID!, $body: String!) {
      addDiscussionComment(input: { discussionId: $id, body: $body }) { clientMutationId }
    }`,
    { id: discussion.id, body: `${OCCURRENCE} ${note.trim()}` },
  );
  return `Recorded another occurrence on ${discussion.url}`;
}

function gh(query, variables) {
  const output = execFileSync("gh", ["api", "graphql", "--input", "-"], {
    input: JSON.stringify({ query, variables }),
    encoding: "utf8",
    stdio: ["pipe", "pipe", "inherit"],
  });
  return JSON.parse(output).data;
}

export async function main(argv, { graphql = gh, repository } = {}) {
  const options = parseArgs(argv);
  const repo =
    repository ??
    parseRepository(execFileSync("git", ["remote", "get-url", "origin"], { encoding: "utf8" }));
  if (options.command === "search") return search(graphql, repo, options.words);
  if (options.command === "file") return file(graphql, repo, options);
  return plus(graphql, repo, options);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    console.log(await main(process.argv.slice(2)));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
