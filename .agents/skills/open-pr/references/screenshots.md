# Visual evidence for UI PRs

Every rendered UI change needs attached visual evidence. Evidence stays proportional to the affected experience rather than becoming a fixed matrix.

## Choose the evidence

- Capture at least one after screenshot. Show before and after when an existing surface changed enough for comparison to matter.
- Cover the viewports, themes, and states the change can affect. Do not capture unaffected combinations merely to fill a table.
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

GitHub CLI 2.100 and later uploads images with `--attach` and rewrites matching local Markdown references in the PR body:

```bash
gh pr create \
  --base main \
  --title "feat(web): describe the outcome" \
  --body-file "$PR_BODY_FILE" \
  --attach "$SCREENSHOT_DIR/deck-phone-before.png#Deck before" \
  --attach "$SCREENSHOT_DIR/deck-phone-after.png#Deck after"
```

Use `gh pr edit <number> --attach ...` when updating an existing PR. Run `gh pr create --help` or `gh pr edit --help` first if the installed CLI may be older.

Read the PR body back after the upload. Completion requires every local reference to have become an uploaded GitHub asset reference and every intended image to render. If capture or upload fails, retain the files, report the exact failure, and leave the PR blocked instead of silently omitting screenshots.
