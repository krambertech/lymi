import assert from "node:assert/strict";
import test from "node:test";
import { frictionBody, main, parseArgs } from "./friction.mjs";

const repository = "krambertech/lymi";
const categories = [
  { id: "C-ideas", slug: "ideas" },
  { id: "C-devex", slug: "developer-experience" },
];

function fakeGh(responses = {}, nodes = categories) {
  const calls = [];
  const graphql = async (query, variables) => {
    const operation = query.match(
      /(discussionCategories|search|createDiscussion|discussion\(|addUpvote|addDiscussionComment)/,
    )[1];
    calls.push({ operation, variables });
    if (operation === "discussionCategories") {
      return { repository: { id: "R-lymi", discussionCategories: { nodes } } };
    }
    return responses[operation];
  };
  return { graphql, calls };
}

const discussion = (overrides = {}) => ({
  repository: {
    discussion: {
      id: "D-12",
      url: "https://github.com/krambertech/lymi/discussions/12",
      viewerCanUpvote: true,
      viewerHasUpvoted: false,
      category: { slug: "developer-experience" },
      ...overrides,
    },
  },
});

test("reads the three commands", () => {
  assert.deepEqual(parseArgs(["search", "route", "tree"]), {
    command: "search",
    words: "route tree",
  });
  assert.deepEqual(parseArgs(["plus", "12", "--note", "hit it again"]), {
    command: "plus",
    number: 12,
    note: "hit it again",
  });
  assert.throws(
    () => parseArgs(["file", "--title", "x", "--happened", "y"]),
    /--expected, --prevention/,
  );
  assert.throws(() => parseArgs(["plus", "twelve", "--note", "x"]), /discussion number/);
  assert.throws(() => parseArgs(["plus", "12"]), /--note/);
  assert.throws(() => parseArgs(["search"]), /Usage/);
});

test("writes the body under the form's three questions", () => {
  assert.equal(
    frictionBody({ happened: " a ", expected: "b", prevention: "c" }),
    "### What happened\n\na\n\n### What the agent expected\n\nb\n\n### What would have prevented it\n\nc",
  );
});

test("says to create the category when it is missing", async () => {
  const gh = fakeGh({}, [{ id: "C-ideas", slug: "ideas" }]);
  await assert.rejects(
    main(["search", "route"], { graphql: gh.graphql, repository }),
    /no discussion category with the slug developer-experience; create an "Developer experience" category/,
  );
});

test("searches open discussions and keeps only friction, counting marked comments", async () => {
  const gh = fakeGh({
    search: {
      search: {
        nodes: [
          {
            number: 12,
            title: "verify:changed typechecks against a stale route tree",
            url: "https://github.com/krambertech/lymi/discussions/12",
            upvoteCount: 1,
            category: { slug: "developer-experience" },
            comments: {
              nodes: [{ body: "**Occurred again.** worktree from June" }, { body: "Agreed." }],
            },
          },
          {
            number: 3,
            title: "An idea",
            url: "u",
            upvoteCount: 9,
            category: { slug: "ideas" },
            comments: { nodes: [] },
          },
        ],
      },
    },
  });
  const said = await main(["search", "route", "tree"], { graphql: gh.graphql, repository });
  assert.equal(
    said,
    "#12 verify:changed typechecks against a stale route tree (occurrences 2, upvotes 1)\n  https://github.com/krambertech/lymi/discussions/12",
  );
  assert.deepEqual(gh.calls[1].variables, { query: "repo:krambertech/lymi is:open route tree" });
});

test("reports no match so the agent files a new one", async () => {
  const gh = fakeGh({ search: { search: { nodes: [] } } });
  assert.match(
    await main(["search", "flaky"], { graphql: gh.graphql, repository }),
    /No open friction matches "flaky"/,
  );
});

test("files in the Developer experience category with the form's body", async () => {
  const gh = fakeGh({
    createDiscussion: { createDiscussion: { discussion: { number: 12, url: "https://x/12" } } },
  });
  const said = await main(
    [
      "file",
      "--title",
      "Stale route tree",
      "--happened",
      "a",
      "--expected",
      "b",
      "--prevention",
      "c",
    ],
    { graphql: gh.graphql, repository },
  );
  assert.equal(said, "Filed #12: https://x/12");
  assert.deepEqual(gh.calls[1].variables.input, {
    repositoryId: "R-lymi",
    categoryId: "C-devex",
    title: "Stale route tree",
    body: frictionBody({ happened: "a", expected: "b", prevention: "c" }),
  });
});

test("records an occurrence with an upvote and a marked comment", async () => {
  const gh = fakeGh({ "discussion(": discussion(), addUpvote: {}, addDiscussionComment: {} });
  const said = await main(["plus", "12", "--note", "worktree from June"], {
    graphql: gh.graphql,
    repository,
  });
  assert.equal(
    said,
    "Recorded another occurrence on https://github.com/krambertech/lymi/discussions/12",
  );
  assert.deepEqual(
    gh.calls.map((call) => call.operation),
    ["discussion(", "addUpvote", "addDiscussionComment"],
  );
  assert.deepEqual(gh.calls[2].variables, {
    id: "D-12",
    body: "**Occurred again.** worktree from June",
  });
});

test("still comments when the account has already upvoted", async () => {
  const gh = fakeGh({
    "discussion(": discussion({ viewerHasUpvoted: true }),
    addDiscussionComment: {},
  });
  await main(["plus", "12", "--note", "again"], { graphql: gh.graphql, repository });
  assert.deepEqual(
    gh.calls.map((call) => call.operation),
    ["discussion(", "addDiscussionComment"],
  );
});

test("refuses to record on a discussion outside the Developer experience category", async () => {
  const gh = fakeGh({ "discussion(": discussion({ category: { slug: "ideas" } }) });
  await assert.rejects(
    main(["plus", "12", "--note", "x"], { graphql: gh.graphql, repository }),
    /not in the Developer experience discussions/,
  );
});
