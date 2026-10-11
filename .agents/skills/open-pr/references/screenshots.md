# Visual evidence for UI PRs

[`AGENTS.md`](../../../../AGENTS.md) requires attached visual evidence for every rendered UI change. This file is how to capture and attach it.

## Choose the evidence

- Capture one after screenshot per affected surface. Add a before image when the surface already existed, because a reviewer cannot see a change without the old state.
- Capture the viewports, themes, and states the [`review-ui` coverage tree](../../review-ui/SKILL.md#choose-the-coverage) selects for the diff, and no others.
- Use local or sanitized data. Keep private content, tokens, email addresses, account identifiers, and production data out of screenshots and filenames.

## Save files

- Use the available browser or visual-verification tools to reach the real state, then explicitly save each image to a PNG file outside the repository. A screenshot returned only inside a browser-tool result cannot be uploaded later.
- Prefer a browser tool that returns a local path. Otherwise use Playwright's `page.screenshot({ path })` against the already-running local app. Use a temporary directory and descriptive filenames such as `deck-phone-after.png`.
- Confirm every expected file exists and is a valid non-empty image before creating the PR.

## Fill the template

Keep the template's `## Screenshots` heading. Reference each file as `./<basename>` so the upload can replace it in place:

```markdown
## Screenshots

| Before | After |
| --- | --- |
| ![Deck before](./deck-phone-before.png) | ![Deck after](./deck-phone-after.png) |
```

For a new surface or a change where comparison adds no value, use one labelled image instead of an empty table cell. A recording referenced as `![Grading a card](./review.webm)` on its own paragraph becomes a video player locally, or an inline GIF linking to the video in a cloud session. Remove the section only when the diff has no rendered UI effect.

## Upload

Pick the path by environment: a cloud session has `CLAUDE_CODE_REMOTE=true`.

### Local session: GitHub CLI

GitHub CLI 2.99 and later uploads to GitHub's own attachment storage with `--attach`, which also gives a recording a video player. It rewrites a local reference only when the attach path matches it exactly, so run `gh` from the screenshot folder with bare filenames; that folder is not the repository, so pass `-R` and `--head`:

```bash
cd "$SCREENSHOT_DIR"
gh pr create \
  -R krambertech/lymi \
  --head <branch> \
  --base main \
  --title "feat(web): describe the outcome" \
  --body-file "$PR_BODY_FILE" \
  --attach "deck-phone-before.png#Deck before" \
  --attach "deck-phone-after.png#Deck after"
```

Use `gh pr edit <number> -R krambertech/lymi --attach ...` the same way for an existing PR. When the installed CLI is older than 2.99, use the cloud path instead.

### Cloud session: `pnpm pr:media`

The session's GitHub proxy refuses `gh pr create`, `gh pr edit` and `--attach`, so upload from the repository first:

```bash
pnpm pr:media --body "$PR_BODY_FILE" "$SCREENSHOT_DIR"/deck-phone-before.png "$SCREENSHOT_DIR"/deck-phone-after.png
```

It pushes the files to the shared `pr-media` branch under a folder named for the current branch, and rewrites each `./<basename>` reference in the body file to a link pinned to that commit; a video becomes an inline GIF that links to the recording. This push is the one push outside your own branch that the repository authorises; never create a separate screenshot branch. Without `--body` it prints a Markdown line per file, and it exits non-zero when the body still points at a local file. Then create or update the pull request with the GitHub tools and the rewritten body.

### Confirm

Read the PR body back and confirm no `](./` reference remains: each screenshot is a `https://github.com/user-attachments/assets/` URL (local) or a `https://github.com/krambertech/lymi/blob/<sha>/...` link (cloud) in its table cell. If `gh` appended uploads instead of rewriting them, move those URLs into the table and replace the body with `gh pr edit <number> --body-file`. If capture or upload fails, retain the files, report the exact failure, and leave the PR blocked instead of silently omitting screenshots.
