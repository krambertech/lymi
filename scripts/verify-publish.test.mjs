import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  collect,
  fitComment,
  LIMIT,
  leaksKey,
  marker,
  overall,
  postedLength,
  render,
  resolveSha,
  upsert,
} from "../.agents/skills/verify/scripts/publish.mjs";

const sha = "f82f0b4afbab1da4b42b3dd1bd2a4f8ff300d6a9";

function evidence(features) {
  const dir = mkdtempSync(join(tmpdir(), "verify-publish-test-"));
  for (const { folder, verdict, shots } of features) {
    mkdirSync(join(dir, folder));
    writeFileSync(join(dir, folder, "verdict.json"), JSON.stringify(verdict));
    writeFileSync(
      join(dir, folder, "verdict.md"),
      `# ${verdict.title}: ${verdict.ok ? "PASS" : "FAIL"}\n`,
    );
    for (const shot of shots) writeFileSync(join(dir, folder, shot), "png");
  }
  return dir;
}

const review = {
  folder: "review-local-f82f0b4a",
  shots: ["01-open-today.png", "02-start-the-review.png"],
  verdict: {
    feature: "review",
    title: "Review",
    ok: true,
    steps: [
      { action: "Open Today", ok: true },
      { action: "Start the review", ok: true },
    ],
    problems: [],
  },
};
const addCard = {
  folder: "add-card-preview-lymi-app-pr-7-f82f0b4a",
  shots: ["01-open-lezione-12.png", "02-fill-the-term.png"],
  verdict: {
    feature: "add-card",
    title: "Add a card",
    ok: false,
    steps: [
      { action: "Open Lezione 12 from Library", ok: true },
      { action: "Fill the term", ok: false, error: "expect(locator).toBeVisible() failed" },
    ],
    problems: [],
  },
};

test("a run's features are read from the folders of its commit only", () => {
  const dir = evidence([review, addCard, { ...review, folder: "review-local-0123abcd" }]);
  try {
    const features = collect(dir, sha);
    assert.deepEqual(
      features.map((f) => [f.feature, f.where, f.screenshots.length]),
      [
        ["add-card", "preview-lymi-app-pr-7", 2],
        ["review", "local", 2],
      ],
    );
    assert.match(features[1].markdown, /# Review: PASS/);
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("a failing step makes the comment FAIL and names the step and its error", () => {
  const dir = evidence([review, addCard]);
  try {
    const features = collect(dir, sha);
    const body = render({ features, sha });
    assert.ok(body.startsWith(marker));
    assert.match(body, /## Verify: FAIL at `f82f0b4a`/);
    assert.match(body, /\| Add a card \| preview-lymi-app-pr-7 \| \*\*FAIL\*\* at step 2 \|/);
    assert.match(body, /\| Review \| local \| PASS \|/);
    assert.match(body, /\*\*Add a card\*\* failed at step 2, Fill the term:/);
    assert.match(body, /toBeVisible\(\) failed/);
    assert.match(body, /# Review: PASS/);
    assert.match(body, /\]\(\.\/review-local-02-start-the-review\.png\)/);
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("a compact comment keeps the failing step's screenshot, or the last one", () => {
  const dir = evidence([review, addCard]);
  try {
    const body = render({ features: collect(dir, sha), sha, compact: true });
    const shots = [...body.matchAll(/\]\(\.\/([^)]+)\)/g)].map((m) => m[1]);
    assert.deepEqual(shots, [
      "add-card-preview-lymi-app-pr-7-02-fill-the-term.png",
      "review-local-02-start-the-review.png",
    ]);
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("console errors on a passing run make it PASS+NOTES", () => {
  assert.equal(overall([{ ok: true, problems: [] }]), "PASS");
  assert.equal(overall([{ ok: true, problems: ["console: boom"] }]), "PASS+NOTES");
  assert.equal(
    overall([
      { ok: true, problems: [] },
      { ok: false, problems: [] },
    ]),
    "FAIL",
  );
});

test("a preview key in the comment is refused", () => {
  assert.equal(leaksKey("[preview](https://x.workers.dev/_preview?key=abc)"), true);
  assert.equal(leaksKey("[preview](https://x.workers.dev/_preview)"), false);
});

function fakeGh(comments) {
  const calls = [];
  const api = (args) => {
    calls.push(args);
    if (args[1] === "user") return "kateryna\n";
    if (args.includes("--paginate")) return JSON.stringify([comments]);
    return JSON.stringify({ html_url: "https://github.com/o/r/pull/7#issuecomment-9" });
  };
  return { api, calls };
}

test("a later run edits the author's verify comment instead of adding one", () => {
  const { api, calls } = fakeGh([
    { id: 1, user: { login: "someone" }, body: `${marker}\n## Verify: PASS` },
    { id: 2, user: { login: "kateryna" }, body: `${marker}\n## Verify: FAIL`, html_url: "u2" },
  ]);
  assert.deepEqual(upsert({ repo: "o/r", pr: "7", bodyFile: "/tmp/b.md", api }), {
    action: "edited",
    url: "u2",
  });
  assert.deepEqual(calls.at(-1), [
    "api",
    "-X",
    "PATCH",
    "repos/o/r/issues/comments/2",
    "-F",
    "body=@/tmp/b.md",
  ]);
});

test("the first run creates the comment", () => {
  const { api, calls } = fakeGh([{ id: 1, user: { login: "someone" }, body: `${marker}\nx` }]);
  assert.equal(upsert({ repo: "o/r", pr: "7", bodyFile: "/tmp/b.md", api }).action, "created");
  assert.deepEqual(calls.at(-1), ["api", "repos/o/r/issues/7/comments", "-F", "body=@/tmp/b.md"]);
});

test("the size check counts each screenshot's full link, so a body that fits only before upload goes compact", () => {
  const media = { repo: "krambertech/lymi", folder: "kateryna/some-branch" };
  const shots = Array.from({ length: 30 }, (_, i) => `${String(i + 1).padStart(2, "0")}-step.png`);
  const features = Array.from({ length: 16 }, (_, i) => ({
    feature: `feature-${i}`,
    title: `Feature ${i}`,
    where: "local",
    ok: true,
    steps: shots.map(() => ({ action: "step", ok: true })),
    problems: [],
    markdown: "# ok\n",
    screenshots: shots,
  }));
  const full = render({ features, sha });
  assert.ok(full.length <= LIMIT, "the full body fits before upload");
  assert.ok(postedLength(full, media) > LIMIT, "and not once its links are written out");
  const posted = fitComment({ features, sha, ...media });
  assert.equal([...posted.matchAll(/\]\(\.\//g)].length, features.length);
  assert.ok(postedLength(posted, media) <= LIMIT);
});

test("a short --sha resolves to the full commit the pull request's head is compared with", () => {
  const rev = (ref) => (ref === "f82f0b4a" || ref === "HEAD" ? sha : null);
  assert.equal(resolveSha("f82f0b4a", rev), sha);
  assert.equal(resolveSha(undefined, rev), sha);
});
