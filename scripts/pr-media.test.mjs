import assert from "node:assert/strict";
import test from "node:test";
import {
  mediaFolder,
  mediaKind,
  mediaUrl,
  parseArgs,
  parseRepository,
  rewriteBody,
} from "./pr-media.mjs";

const image = {
  name: "deck-after.png",
  kind: "image",
  alt: "deck-after",
  url: "https://github.com/o/r/blob/abc/b/deck-after.png?raw=true",
};
const video = {
  name: "review.webm",
  kind: "video",
  alt: "review",
  url: "https://github.com/o/r/blob/abc/b/review.webm?raw=true",
  previewUrl: "https://github.com/o/r/blob/abc/b/review.gif?raw=true",
};

test("reads files with optional alt text and the body option", () => {
  assert.deepEqual(parseArgs(["--body", "pr.md", "a.png#Deck after", "b.png"]), {
    body: "pr.md",
    dryRun: false,
    files: [
      { path: "a.png", alt: "Deck after" },
      { path: "b.png", alt: undefined },
    ],
  });
  assert.throws(() => parseArgs(["--body"]), /needs a file/);
  assert.throws(() => parseArgs([]), /at least one/);
  assert.throws(() => parseArgs(["--attach", "a.png"]), /Unknown option/);
});

test("accepts only media GitHub can show", () => {
  assert.equal(mediaKind("a.PNG"), "image");
  assert.equal(mediaKind("/tmp/flow.webm"), "video");
  assert.throws(() => mediaKind("notes.pdf"), /not an image or video/);
});

test("files media under a folder named for the branch", () => {
  assert.equal(mediaFolder("kateryna/review toast"), "kateryna/review-toast");
  assert.equal(mediaFolder("claude/fix..//x/"), "claude/fix../x");
  assert.throws(() => mediaFolder(""), /check out a branch/);
});

test("finds the repository from https and ssh remotes", () => {
  assert.equal(parseRepository("https://github.com/krambertech/lymi\n"), "krambertech/lymi");
  assert.equal(parseRepository("git@github.com:krambertech/lymi.git"), "krambertech/lymi");
  assert.throws(() => parseRepository("https://gitlab.com/a/b"), /not a GitHub repository/);
});

test("pins links to the media commit", () => {
  assert.equal(
    mediaUrl("o/r", "abc", "kateryna/x/deck after.png"),
    "https://github.com/o/r/blob/abc/kateryna/x/deck%20after.png?raw=true",
  );
});

test("rewrites local references in place and keeps their alt text", () => {
  const body = [
    "| Before | After |",
    "| --- | --- |",
    "| ![Deck before](https://example.com/old.png) | ![Deck after](./deck-after.png) |",
    "",
    '<img src="/tmp/shots/deck-after.png" width="320">',
  ].join("\n");

  const result = rewriteBody(body, [image]);

  assert.match(
    result.body,
    /!\[Deck after\]\(https:\/\/github\.com\/o\/r\/blob\/abc\/b\/deck-after\.png\?raw=true\)/,
  );
  assert.match(
    result.body,
    /<img src="https:\/\/github\.com\/o\/r\/blob\/abc\/b\/deck-after\.png\?raw=true"/,
  );
  assert.match(result.body, /https:\/\/example\.com\/old\.png/);
  assert.deepEqual(result.unreferenced, []);
  assert.deepEqual(result.unresolved, []);
});

test("turns a video reference into a GIF that links to the recording", () => {
  const result = rewriteBody("![Grading a card](./review.webm)", [video]);

  assert.equal(result.body, `[![Grading a card](${video.previewUrl})](${video.url})`);
});

test("reports uploads the body never mentions and local files it still needs", () => {
  const result = rewriteBody("![Other](./other.png)", [image]);

  assert.deepEqual(result.unreferenced, [image]);
  assert.deepEqual(result.unresolved, ["./other.png"]);
});
