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

Keep the template's `## Screenshots` heading. Reference each file by its basename so GitHub CLI can replace it with the uploaded asset URL:

```markdown
## Screenshots

| Before | After |
| --- | --- |
| ![Deck before](./deck-phone-before.png) | ![Deck after](./deck-phone-after.png) |
```

For a new surface or a change where comparison adds no value, use one labelled image instead of an empty table cell. Remove the section only when the diff has no rendered UI effect.

## Attach with GitHub CLI

GitHub CLI 2.100 and later uploads images with `--attach` and rewrites a local Markdown reference only when the attach path matches it exactly. Run `gh` from the screenshot folder with bare filenames; an absolute or folder-prefixed path leaves `./file.png` broken and appends the uploads to the end of the body. That folder is not the repository, so pass `-R` and `--head`:

```bash
cd "$SCREENSHOT_DIR"
gh pr create \
  -R <owner>/<repo> \
  --head <branch> \
  --base main \
  --title "feat(web): describe the outcome" \
  --body-file "$PR_BODY_FILE" \
  --attach "deck-phone-before.png#Deck before" \
  --attach "deck-phone-after.png#Deck after"
```

Use `gh pr edit <number> -R <owner>/<repo> --attach ...` the same way when updating an existing PR. Run `gh pr create --help` first if the installed CLI may be older than 2.100.

Read the PR body back after the upload and search it for `](./`. Completion requires every local reference to have become a `https://github.com/user-attachments/assets/` URL in its table cell. If the uploads were appended instead, move those URLs into the table and replace the body with `gh pr edit <number> --body-file`. If capture or upload fails, retain the files, report the exact failure, and leave the PR blocked instead of silently omitting screenshots.
